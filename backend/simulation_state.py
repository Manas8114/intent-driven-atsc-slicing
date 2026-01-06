from typing import Optional, Dict, Any
from sim.spatial_model import SpatialGrid

class SimulationState:
    _instance = None
    
    def __init__(self):
        # Initialize with standard size
        self.grid = SpatialGrid(size_km=10.0, num_users=100)
        
        # Default last action configuration
        self.last_action: Dict[str, Any] = {
            "plp": 0,
            "modulation": "QPSK",
            "coding_rate": "1/2",
            "power_dbm": 30.0,
            "bandwidth_mhz": 6.0,
            "priority": "medium",
            "env_context": None
        }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

def get_simulation_state() -> SimulationState:
    return SimulationState.get_instance()
