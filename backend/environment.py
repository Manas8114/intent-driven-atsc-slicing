"""
environment.py - Environment State for Digital Twin Simulation

Manages physics parameters, traffic context, and demo controls.
Used for hurdle/stress testing and live demonstrations.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime


class DemoEvent(BaseModel):
    """Represents a demo event for logging."""
    timestamp: str
    event_type: str
    description: str


class EnvironmentState(BaseModel):
    """
    Global environment state for the digital twin simulation.
    
    Includes physics parameters, traffic context, and demo controls.
    """
    # Physics parameters
    noise_floor_dbm: float = -100.0
    path_loss_exponent: float = 3.0
    available_bandwidth_mhz: float = 6.0
    channel_gain_impairment: float = 0.0  # dB reduction (shadowing)
    
    # Traffic/Context parameters
    traffic_load_level: float = 1.0  # 1.0 = Normal, 2.0 = Surge
    is_emergency_active: bool = False
    
    # Cellular/Mobility parameters (for offloading demo)
    cellular_congestion_level: float = 0.3  # 0.0-1.0
    mobile_user_ratio: float = 0.2  # 0.0-1.0
    average_velocity_kmh: float = 45.0  # km/h
    
    # Demo Mode controls
    demo_mode_enabled: bool = False
    simulation_speed: float = 1.0  # 0.5 = Slow, 1.0 = Normal, 2.0 = Fast
    
    # Active Hurdle Name (for UI/Logging)
    active_hurdle: Optional[str] = None


# Global Singleton
_env_state = EnvironmentState()

# Demo Event Log (circular buffer of last 20 events)
_demo_events: List[DemoEvent] = []
MAX_EVENTS = 20


def get_env_state() -> EnvironmentState:
    """Get current environment state."""
    return _env_state


def get_demo_events() -> List[DemoEvent]:
    """Get the demo event log."""
    return _demo_events


def log_demo_event(event_type: str, description: str):
    """Log a demo event."""
    global _demo_events
    event = DemoEvent(
        timestamp=datetime.now().isoformat(),
        event_type=event_type,
        description=description
    )
    _demo_events.append(event)
    if len(_demo_events) > MAX_EVENTS:
        _demo_events = _demo_events[-MAX_EVENTS:]


def update_env_state(updates: Dict[str, Any]):
    """Update environment state with new values."""
    global _env_state
    current_data = _env_state.dict()
    current_data.update(updates)
    _env_state = EnvironmentState(**current_data)


def reset_env_state():
    """Reset environment to baseline."""
    global _env_state, _demo_events
    _env_state = EnvironmentState()
    log_demo_event("reset", "Environment reset to baseline")


def set_demo_mode(enabled: bool):
    """Toggle demo mode."""
    update_env_state({"demo_mode_enabled": enabled})
    log_demo_event("demo_mode", f"Demo mode {'enabled' if enabled else 'disabled'}")


def set_simulation_speed(speed: float):
    """
    Set simulation speed.
    
    Args:
        speed: 0.5 = Slow, 1.0 = Normal, 2.0 = Fast
    """
    speed = max(0.25, min(4.0, speed))  # Clamp to valid range
    update_env_state({"simulation_speed": speed})
    log_demo_event("speed_change", f"Simulation speed set to {speed}x")


def apply_hurdle(hurdle_name: str) -> str:
    """
    Applies the specific physics/logic changes for a named hurdle.
    
    Returns a description of what changed in the environment.
    
    Available hurdles:
    - coverage_drop: Simulate rural shadowing/fading
    - interference: Inject noise into channel
    - spectrum_reduction: Limit bandwidth to 4MHz
    - traffic_surge: 300% public service load
    - emergency_escalation: Trigger AEAT override
    - cellular_congestion: Spike cellular network load
    - mobility_surge: Increase mobile users and velocity
    """
    # Reset first to ensure clean state
    if hurdle_name != "reset":
        # Keep demo mode state
        demo_mode = get_env_state().demo_mode_enabled
        sim_speed = get_env_state().simulation_speed
        reset_env_state()
        update_env_state({
            "demo_mode_enabled": demo_mode,
            "simulation_speed": sim_speed,
            "active_hurdle": hurdle_name
        })
    
    if hurdle_name == "reset":
        demo_mode = get_env_state().demo_mode_enabled
        sim_speed = get_env_state().simulation_speed
        reset_env_state()
        update_env_state({
            "demo_mode_enabled": demo_mode,
            "simulation_speed": sim_speed
        })
        return "Environment reset to baseline."
    
    elif hurdle_name == "coverage_drop":
        update_env_state({
            "channel_gain_impairment": 10.0,
            "path_loss_exponent": 3.5
        })
        desc = "Increased path loss to 3.5 and added 10dB shadowing loss."
        log_demo_event("hurdle", f"Coverage Drop: {desc}")
        return desc

    elif hurdle_name == "interference":
        update_env_state({
            "noise_floor_dbm": -85.0
        })
        desc = "Raised noise floor to -85dBm (Severe Interference)."
        log_demo_event("hurdle", f"Interference Spike: {desc}")
        return desc

    elif hurdle_name == "spectrum_reduction":
        update_env_state({
            "available_bandwidth_mhz": 4.0
        })
        desc = "Capped available bandwidth to 4.0 MHz."
        log_demo_event("hurdle", f"Spectrum Crunch: {desc}")
        return desc

    elif hurdle_name == "traffic_surge":
        update_env_state({
            "traffic_load_level": 3.0
        })
        desc = "Public service traffic load increased to 300%."
        log_demo_event("hurdle", f"Traffic Surge: {desc}")
        return desc

    elif hurdle_name == "emergency_escalation":
        update_env_state({
            "is_emergency_active": True
        })
        desc = "Emergency Alert System triggered. Priority set to CRITICAL."
        log_demo_event("hurdle", f"Emergency Escalation: {desc}")
        return desc
    
    elif hurdle_name == "cellular_congestion":
        update_env_state({
            "cellular_congestion_level": 0.85,
            "traffic_load_level": 2.5
        })
        desc = "Cellular network congestion spiked to 85%. Offloading recommended."
        log_demo_event("hurdle", f"Cellular Congestion: {desc}")
        return desc
    
    elif hurdle_name == "mobility_surge":
        update_env_state({
            "mobile_user_ratio": 0.6,
            "average_velocity_kmh": 75.0
        })
        desc = "Mobile users increased to 60% at 75 km/h average speed."
        log_demo_event("hurdle", f"Mobility Surge: {desc}")
        return desc
    
    log_demo_event("hurdle", f"Unknown hurdle: {hurdle_name}")
    return "Unknown hurdle applied."
