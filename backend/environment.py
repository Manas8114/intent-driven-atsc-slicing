from typing import Optional, Dict, Any
from pydantic import BaseModel

class EnvironmentState(BaseModel):
    # Physics parameters
    noise_floor_dbm: float = -100.0
    path_loss_exponent: float = 3.0
    available_bandwidth_mhz: float = 6.0
    channel_gain_impairment: float = 0.0 # dB reduction (shadowing)
    
    # Traffic/Context parameters
    traffic_load_level: float = 1.0 # 1.0 = Normal, 2.0 = Surge
    is_emergency_active: bool = False
    
    # Active Hurdle Name (for UI/Logging)
    active_hurdle: Optional[str] = None

# Global Singleton
_env_state = EnvironmentState()

def get_env_state() -> EnvironmentState:
    return _env_state

def update_env_state(updates: Dict[str, Any]):
    global _env_state
    current_data = _env_state.dict()
    current_data.update(updates)
    _env_state = EnvironmentState(**current_data)

def reset_env_state():
    global _env_state
    _env_state = EnvironmentState()

def apply_hurdle(hurdle_name: str) -> str:
    """
    Applies the specific physics/logic changes for a named hurdle.
    Returns a description of what changed in the environment.
    """
    reset_env_state()
    update_env_state({"active_hurdle": hurdle_name})
    
    if hurdle_name == "coverage_drop":
        # Simulate rural shadowing (Shadowing)
        current_loss = get_env_state().path_loss_exponent
        # Increase path loss exponent slightly or add gain impairment
        update_env_state({
            "channel_gain_impairment": 10.0, # 10dB drop
            "path_loss_exponent": 3.5
        })
        return "Increased path loss exponent to 3.5 and added 10dB shadowing loss."

    elif hurdle_name == "interference":
        # Inject Interference
        update_env_state({
            "noise_floor_dbm": -85.0 # Significant jump from -100
        })
        return "Raised noise floor to -85dBm (Severe Interference)."

    elif hurdle_name == "spectrum_reduction":
        # Regulatory Constraint
        update_env_state({
            "available_bandwidth_mhz": 4.0
        })
        return "Capped available bandwidth to 4.0 MHz."

    elif hurdle_name == "traffic_surge":
        # Public Load Spike
        update_env_state({
            "traffic_load_level": 3.0 # 300% load
        })
        return "Public service traffic load increased to 300%."

    elif hurdle_name == "emergency_escalation":
        # Critical Hurdle
        update_env_state({
            "is_emergency_active": True
        })
        return "Emergency Alert System triggered. Priority set to CRITICAL."
    
    return "Unknown hurdle applied."
