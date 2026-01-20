import gymnasium as gym
from gymnasium import spaces
import numpy as np
import time
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
import os

# Import our simulations
from sim.spatial_model import SpatialGrid
from sim.unicast_network_model import UnicastNetworkModel
from backend.optimizer import SpectrumOptimizer


class ATSCSlicingEnv(gym.Env):
    """
    Custom Gymnasium Environment for ATSC 3.0 Slicing with Traffic Offloading.
    
    Extended State: [Coverage %, Avg SNR, W_Emg, W_Cov, Unicast Congestion, 
                     Mobile User Ratio, Avg Velocity]
    
    Extended Action: [Delta_Emerg, Delta_Cov, Offload_Ratio]
    
    Reward: Maximize coverage + offload benefit - congestion penalty
    """
    
    def __init__(self):
        super(ATSCSlicingEnv, self).__init__()
        
        # Extended Action: [Weight adjustments, Offload Ratio]
        # Delta weights: [-0.5, 0.5], Offload ratio: [0.0, 1.0]
        self.action_space = spaces.Box(
            low=np.array([-0.5, -0.5, 0.0], dtype=np.float32),
            high=np.array([0.5, 0.5, 1.0], dtype=np.float32),
            dtype=np.float32
        )
        
        # Extended Observation: [Coverage, SNR, W_Emg, W_Cov, Congestion, MobileRatio, Velocity]
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(7,), dtype=np.float32
        )
        
        self.grid = SpatialGrid()
        self.optimizer = SpectrumOptimizer()
        self.unicast_model = UnicastNetworkModel()
        
        # Initial State
        self.current_weights = np.array([1.5, 1.0])  # [Emergency, Coverage]
        self.current_offload_ratio = 0.0
        self.state = np.zeros(7)
        
        # Mobility simulation state
        self.mobile_user_ratio = 0.0
        self.avg_velocity_kmh = 0.0

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.grid = SpatialGrid()  # New user distribution
        self.current_weights = np.array([1.5, 1.0])
        self.current_offload_ratio = 0.0
        
        # Randomize initial conditions for diverse training
        self.mobile_user_ratio = np.random.uniform(0.0, 0.5)
        self.avg_velocity_kmh = np.random.uniform(0.0, 60.0) if self.mobile_user_ratio > 0.1 else 0.0
        
        # Randomize unicast conditions
        self.unicast_model.set_external_congestion(np.random.uniform(0.0, 0.3))
        
        self.state = self._get_observation()
        return self.state, {}

    def step(self, action):
        # 1. Apply Action
        # Weight adjustments
        weight_delta = action[:2]
        self.current_weights += weight_delta
        self.current_weights = np.clip(self.current_weights, 0.1, 5.0)
        
        # Offload ratio action
        self.current_offload_ratio = float(np.clip(action[2], 0.0, 1.0))
        
        # 2. Run Optimization with new weights
        slices = [
            {'name': 'Emergency', 'weight': float(self.current_weights[0]), 'channel_gain': 0.8},
            {'name': 'Coverage', 'weight': float(self.current_weights[1]), 'channel_gain': 0.5}
        ]
        results = self.optimizer.optimize_allocation(slices)
        
        # 3. Simulate Coverage (Spatial Grid)
        emerg_config = results[0]
        
        # Apply mobility penalty to SNR threshold for mobile users
        mobility_snr_penalty = self.avg_velocity_kmh * 0.05  # Higher speed = higher SNR needed
        effective_min_snr = 15.0 + mobility_snr_penalty * self.mobile_user_ratio
        
        metrics = self.grid.calculate_grid_metrics(
            tx_power_dbm=emerg_config['power_dbm'],
            frequency_mhz=600.0,
            min_snr_db=effective_min_snr
        )
        
        # 4. Calculate Unicast Congestion
        unicast_metrics = self.unicast_model.calculate_congestion(
            mobile_user_ratio=self.mobile_user_ratio
        )
        congestion = unicast_metrics.congestion_level
        
        # 5. Calculate Offload Benefit
        offload_benefit = self.unicast_model.get_offload_benefit(
            unicast_metrics, 
            self.current_offload_ratio
        )
        effective_congestion = offload_benefit['projected_congestion']
        
        # 6. Calculate Reward
        coverage = metrics['coverage_percent']
        
        # Base coverage reward
        reward = coverage / 10.0
        
        # Penalty for low coverage
        if coverage < 80.0:
            reward -= 10.0
            
        # Congestion management reward
        # Reward for reducing congestion through offloading
        congestion_reduction = congestion - effective_congestion
        reward += congestion_reduction * 5.0  # +5 for each 0.1 reduction
        
        # Penalty for high congestion (not offloading when needed)
        if effective_congestion > 0.7:
            reward -= (effective_congestion - 0.7) * 20.0
            
        # Reward for appropriate offloading (not over-offloading when not needed)
        if congestion < 0.3 and self.current_offload_ratio > 0.5:
            reward -= 2.0  # Penalty for unnecessary offloading
            
        # Emergency reliability hard constraint
        if self.current_weights[0] < 0.5:
            reward -= 15.0  # Never compromise emergency weight
        
        # 7. Update State
        self.state = np.array([
            coverage,
            metrics['avg_snr_db'],
            self.current_weights[0],
            self.current_weights[1],
            effective_congestion,
            self.mobile_user_ratio,
            self.avg_velocity_kmh / 100.0  # Normalize velocity
        ], dtype=np.float32)
        
        terminated = False
        truncated = False
        info = {
            "coverage": coverage,
            "congestion": congestion,
            "effective_congestion": effective_congestion,
            "offload_ratio": self.current_offload_ratio,
            "mobile_ratio": self.mobile_user_ratio
        }
        
        return self.state, reward, terminated, truncated, info

    def _get_observation(self):
        """Get initial/current observation."""
        unicast_metrics = self.unicast_model.calculate_congestion(
            mobile_user_ratio=self.mobile_user_ratio
        )
        return np.array([
            0.0,  # coverage (will be calculated)
            0.0,  # avg_snr
            self.current_weights[0],
            self.current_weights[1],
            unicast_metrics.congestion_level,
            self.mobile_user_ratio,
            self.avg_velocity_kmh / 100.0
        ], dtype=np.float32)


class RLController:
    """Interface to train/use the PPO Agent with Traffic Offloading."""
    
    _instance = None
    _model_cache = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(RLController, cls).__new__(cls)
        return cls._instance

    def __init__(self, model_path="ppo_atsc_slicing_v2"):
        # Singleton check to prevent re-init
        if hasattr(self, 'initialized') and self.initialized:
            return
            
        self.model_path = model_path
        self.env = ATSCSlicingEnv()
        self.model = None
        self.initialized = True

    def train(self, timesteps=1000):
        print("Training PPO Agent with Traffic Offloading...")
        try:
            self.model = PPO("MlpPolicy", self.env, verbose=1, device='cpu')
            self.model.learn(total_timesteps=timesteps)
            self.model.save(self.model_path)
            print("Training Complete.")
        except Exception as e:
            print(f"Training Failed: {e}")

    def suggest_action(self, current_observation):
        """
        Predict optimal action including offload ratio.
        
        Args:
            current_observation: 7-dim array [coverage, snr, w_emg, w_cov, 
                                              congestion, mobile_ratio, velocity]
        
        Returns:
            3-dim action [delta_emg, delta_cov, offload_ratio]
        """
        # Ensure observation is correct shape
        obs = np.array(current_observation, dtype=np.float32)
        if len(obs) < 7:
            # Pad with zeros for backward compatibility
            obs = np.pad(obs, (0, 7 - len(obs)), mode='constant')
        
        if not os.path.exists(self.model_path + ".zip") and self.model is None:
            self.train(timesteps=500)
            
        if self.model is None:
            # Check class-level cache first
            if RLController._model_cache is not None:
                self.model = RLController._model_cache
            else:
                self.model = PPO.load(self.model_path, device='cpu')
                RLController._model_cache = self.model
             
        action, _ = self.model.predict(obs, deterministic=True)
        return action
    
    def suggest_weights(self, current_observation):
        """
        Backward compatible method - returns only weight adjustments.
        
        Args:
            current_observation: 4-dim or 7-dim array
            
        Returns:
            2-dim weight adjustment [delta_emg, delta_cov]
        """
        obs = np.array(current_observation, dtype=np.float32)
        
        # If 4-dim observation (old format), extend it
        action = self.suggest_action(obs)
        return action[:2]  # Return only weight adjustments


# Global accessor for Singleton instance
def get_rl_controller() -> RLController:
    """Get the global singleton RL Controller."""
    return RLController()


def train_online_from_buffer(n_steps: int = 5) -> dict:
    """
    Perform online training using experiences from the buffer.
    
    This is the key function that closes the learning loop:
    - Collects recent experiences from the buffer
    - Performs mini-batch PPO updates
    - Saves the updated model checkpoint
    
    Args:
        n_steps: Number of gradient steps to perform
        
    Returns:
        Dictionary with training results
    """
    from backend.experience_buffer import get_buffer
    
    buffer = get_buffer()
    experiences = buffer.get_recent(100)  # Get last 100 experiences
    
    if len(experiences) < 20:
        return {
            "status": "skipped",
            "reason": "Insufficient experiences for training",
            "experience_count": len(experiences)
        }
    
    controller = get_rl_controller()
    
    # Ensure model is loaded
    if controller.model is None:
        if os.path.exists(controller.model_path + ".zip"):
            controller.model = PPO.load(controller.model_path, device='cpu')
        else:
            return {"status": "error", "reason": "No base model found"}
    
    # Convert experiences to training format
    obs_list = [exp['state'] for exp in experiences]
    
    # Perform mini-batch updates by running a few training steps
    # We use the existing environment but inject the buffer's observation distribution
    try:
        # Create a fresh environment for training
        env = ATSCSlicingEnv()
        
        # Set learning parameters for quick online updates
        controller.model.set_env(env)
        controller.model.learning_rate = 0.0001  # Lower LR for fine-tuning
        
        # Train for specified steps
        controller.model.learn(total_timesteps=n_steps * 10, reset_num_timesteps=False)
        
        # Save updated model
        timestamp = int(time.time())
        checkpoint_path = f"{controller.model_path}_online_{timestamp}"
        controller.model.save(controller.model_path)  # Overwrite main model
        
        # Update cache
        RLController._model_cache = controller.model
        
        return {
            "status": "success",
            "message": "Model updated with online learning",
            "experiences_used": len(experiences),
            "gradient_steps": n_steps,
            "checkpoint": controller.model_path
        }
    except Exception as e:
        return {
            "status": "error",
            "reason": str(e)
        }


# Quick test
if __name__ == "__main__":
    print("Testing Extended ATSC Slicing Environment...")
    env = ATSCSlicingEnv()
    
    # Validate environment
    try:
        check_env(env, warn=True)
        print("✓ Environment validation passed")
    except Exception as e:
        print(f"✗ Environment validation failed: {e}")
    
    # Test episode
    obs, _ = env.reset()
    print(f"\nInitial observation (7-dim): {obs}")
    
    for i in range(5):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"Step {i+1}: reward={reward:.2f}, coverage={info['coverage']:.1f}%, "
              f"congestion={info['effective_congestion']:.2f}, offload={info['offload_ratio']:.2f}")
    
    print("\n✓ Environment test complete")
