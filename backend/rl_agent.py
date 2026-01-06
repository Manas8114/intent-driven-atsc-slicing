import gymnasium as gym
from gymnasium import spaces
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
import os

# Import our simulations
from sim.spatial_model import SpatialGrid
from backend.optimizer import SpectrumOptimizer

class ATSCSlicingEnv(gym.Env):
    """
    Custom Gymnasium Environment for ATSC 3.0 Slicing.
    
    State: [Avg SNR, Coverage %, Current Weight Emergency, Current Weight Coverage]
    Action: Adjust weights for Emergency/Coverage slices [Delta_Emerg, Delta_Cov]
    Reward: +Throughput - Penalty(Violation)
    """
    
    def __init__(self):
        super(ATSCSlicingEnv, self).__init__()
        
        # Action: Continuous adjustment to weights [-0.5, 0.5]
        self.action_space = spaces.Box(low=-0.5, high=0.5, shape=(2,), dtype=np.float32)
        
        # Observation: [Coverage %, Avg SNR, W_Emg, W_Cov]
        # Normalized ranges approx [0-100, -10 to 40, 0-5, 0-5]
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(4,), dtype=np.float32)
        
        self.grid = SpatialGrid()
        self.optimizer = SpectrumOptimizer()
        
        # Initial State
        self.current_weights = np.array([1.5, 1.0]) # [Emergency, Coverage]
        self.state = np.zeros(4)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.grid = SpatialGrid() # New user distribution
        self.current_weights = np.array([1.5, 1.0]) 
        self.state = self._get_observation()
        return self.state, {}

    def step(self, action):
        # 1. Apply Action (Adjust Weights)
        self.current_weights += action
        self.current_weights = np.clip(self.current_weights, 0.1, 5.0)
        
        # 2. Run Optimization with new weights
        slices = [
            {'name': 'Emergency', 'weight': float(self.current_weights[0]), 'channel_gain': 0.8},
            {'name': 'Coverage', 'weight': float(self.current_weights[1]), 'channel_gain': 0.5}
        ]
        results = self.optimizer.optimize_allocation(slices)
        
        # 3. Simulate Physics (Resulting Coverage)
        # Assume Emergency slice (index 0) defines system reliability
        emerg_config = results[0]
        metrics = self.grid.calculate_grid_metrics(
            tx_power_dbm=emerg_config['power_dbm'],
            frequency_mhz=600.0,
            min_snr_db=15.0 # High threshold for 64QAM
        )
        
        # 4. Calculate Reward
        # Goal: Maximize Coverage while keeping Emergency Weight reasonable
        coverage = metrics['coverage_percent']
        reward = coverage / 10.0 # Base reward
        
        # Penalty for low coverage (< 80%)
        if coverage < 80.0:
            reward -= 10.0
            
        # 5. Update State
        self.state = np.array([
            coverage,
            metrics['avg_snr_db'],
            self.current_weights[0],
            self.current_weights[1]
        ], dtype=np.float32)
        
        terminated = False
        truncated = False
        info = {"coverage": coverage}
        
        return self.state, reward, terminated, truncated, info

    def _get_observation(self):
        # Initial observation (dummy simulation)
        return np.array([0.0, 0.0, self.current_weights[0], self.current_weights[1]], dtype=np.float32)

class RLController:
    """Interface to train/use the PPO Agent"""
    
    def __init__(self, model_path="ppo_atsc_slicing"):
        self.model_path = model_path
        self.env = ATSCSlicingEnv()
        self.model = None

    def train(self, timesteps=1000):
        print("Training PPO Agent...")
        try:
            self.model = PPO("MlpPolicy", self.env, verbose=1, device='cpu')
            self.model.learn(total_timesteps=timesteps)
            self.model.save(self.model_path)
            print("Training Complete.")
        except Exception as e:
            print(f"Training Failed: {e}")

    def suggest_weights(self, current_observation):
        """Predict optimal weight adjustment"""
        # Ensure observation is a numpy array with correct dtype
        obs = np.array(current_observation, dtype=np.float32)
        
        if not os.path.exists(self.model_path + ".zip") and self.model is None:
            self.train(timesteps=500) # Quick train if no model
            
        if self.model is None:
            # Load with CPU device to avoid CUDA issues
            self.model = PPO.load(self.model_path, device='cpu')
             
        action, _ = self.model.predict(obs, deterministic=True)
        return action
