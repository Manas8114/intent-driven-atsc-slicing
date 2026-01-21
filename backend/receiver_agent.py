import threading
import time
import random
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from .broadcast_telemetry import calculate_receiver_metrics
from .simulation_state import get_simulation_state

# Configuration
SIM_PROCESSING_DELAY_MIN = 0.05
SIM_PROCESSING_DELAY_MAX = 0.2


class ReceiverAgent:
    """
    Background agent that simulates continuous receiver feedback.
    
    This agent runs in a separate thread to prevent blocking the main
    event loop (solving the "stuck loop" issue). It continuously
    simulates packet reception and updates the system state with
    real-time receiver metrics.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.running = False
        self.thread = None
        self.latest_metrics = {}
        self.packet_loss_history = []
        self.last_update = datetime.now()
        
    def start(self):
        """Start the receiver agent in a background thread."""
        with self._lock:
            if self.running:
                return
            
            self.running = True
            self.thread = threading.Thread(target=self._run_loop, daemon=True)
            self.thread.start()
            print("📡 Receiver Agent started (Background Thread)")
            
    def stop(self):
        """Stop the receiver agent."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            
    def _run_loop(self):
        """Main receiver loop."""
        print("📡 Receiver Agent: Connected to broadcast stream")
        
        while self.running:
            try:
                # 1. Get current broadcast configuration
                # 1. Get current broadcast configuration & Environment Context
                sim_state = get_simulation_state()
                from .environment import get_env_state
                env_state = get_env_state()
                
                config = sim_state.last_action or {"modulation": "QPSK"}
                is_emergency = sim_state.is_emergency_mode or env_state.is_emergency_active
                
                # 2. Simulate packet reception
                # Add some "stutter" variation to simulate real network jitter
                processing_time = random.uniform(SIM_PROCESSING_DELAY_MIN, SIM_PROCESSING_DELAY_MAX)
                time.sleep(processing_time) 
                
                # 3. Calculate metrics
                # 🔗 REALISM LINK: Use the environment's path loss and noise floor!
                # If Chaos Director sets noise floor to -85dBm, we USE it here.
                
                # Base Power - Path Loss - Shadows
                path_loss = 20 * env_state.path_loss_exponent # Simplified log distance
                shadowing = env_state.channel_gain_impairment
                rx_power = config.get("power_dbm", 35) - path_loss - shadowing
                
                # Calculate SNR using the environment's noise floor
                noise_floor = env_state.noise_floor_dbm
                current_snr = rx_power - noise_floor + random.gauss(0, 1) # Add slight thermal noise variance
                
                metrics = calculate_receiver_metrics(config, snr_db=current_snr, is_emergency=is_emergency)
                
                # 4. Update internal state
                self.latest_metrics = {m.name: m.value for m in metrics}
                self.last_update = datetime.now()
                
                # 5. Feedback loop (Optional: could trigger re-optimization if SNR drops too low)
                # For now, we just log occasionally
                if random.random() < 0.05:
                   pass # print(f"📡 Receiver Update: SNR={current_snr:.1f}dB, Acquisition={(self.latest_metrics.get('receiver_service_acquisition_success_ratio', 0)*100):.1f}%")

            except Exception as e:
                print(f"❌ Receiver Agent Error: {e}")
                time.sleep(1.0) # Backoff on error
                
    def get_metrics(self) -> Dict[str, Any]:
        """Get the latest receiver metrics safely."""
        return self.latest_metrics

# Global accessor
def get_receiver_agent() -> ReceiverAgent:
    return ReceiverAgent()
