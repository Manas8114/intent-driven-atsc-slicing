from typing import Optional, Dict, Any
from sim.spatial_model import SpatialGrid
from sim.unicast_network_model import get_unicast_model, UnicastMetrics

class SimulationState:
    _instance = None
    
    def __init__(self):
        # Initialize with standard size and mobile users
        self.grid = SpatialGrid(size_km=10.0, num_users=80, num_mobile=20, 
                                mobile_speed_range=(30.0, 80.0))
        
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
        
        # Emergency mode flag
        self.is_emergency_mode: bool = False
        
        # === Traffic Offloading State ===
        self.unicast_congestion_level: float = 0.3  # [0.0 - 1.0] start with some load
        self.offload_ratio: float = 0.0  # Current broadcast offload ratio
        self.unicast_latency_ms: float = 25.0  # Estimated unicast latency
        self.packet_loss_probability: float = 0.01  # Unicast packet loss
        
        # === Mobility State ===
        self.mobile_user_ratio: float = 0.2  # 20% mobile users
        self.average_velocity_kmh: float = 45.0  # Average mobile user velocity
        self.mobile_coverage_success_rate: float = 0.92  # Coverage for mobile users
        self.handover_frequency: float = 0.5  # Simulated handovers per second
        
        # Unicast network model
        self._unicast_model = get_unicast_model()
        
    def update_unicast_metrics(self):
        """Update unicast congestion metrics from the network model."""
        metrics = self._unicast_model.calculate_congestion(
            mobile_user_ratio=self.mobile_user_ratio
        )
        self.unicast_congestion_level = metrics.congestion_level
        self.unicast_latency_ms = metrics.estimated_latency_ms
        self.packet_loss_probability = metrics.packet_loss_probability
        return metrics
        
    def get_offload_recommendation(self) -> float:
        """Get recommended offload ratio based on current congestion."""
        metrics = UnicastMetrics(
            congestion_level=self.unicast_congestion_level,
            estimated_latency_ms=self.unicast_latency_ms,
            packet_loss_probability=self.packet_loss_probability,
            active_users=100,
            bandwidth_utilization=self.unicast_congestion_level * 0.95
        )
        return self._unicast_model.recommend_offload_ratio(metrics)

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

def get_simulation_state() -> SimulationState:
    return SimulationState.get_instance()
