"""
environment_router.py - Environment Control API

Provides endpoints for:
- Triggering hurdles/stress tests
- Demo mode controls
- Simulation speed adjustment
- Environment reset

Demo Usage:
1. Enable demo mode: POST /env/demo-mode {"enabled": true}
2. Trigger hurdle: POST /env/hurdle {"hurdle": "cellular_congestion"}
3. Change speed: POST /env/speed {"speed": 2.0}
4. Reset: POST /env/reset
"""

from fastapi import APIRouter, Body
from typing import Dict, Any

from .environment import (
    get_env_state, apply_hurdle, reset_env_state,
    set_demo_mode, set_simulation_speed, get_demo_events
)

router = APIRouter()


@router.get("/state")
def get_state():
    """
    Get current environment state.
    
    Returns all physics parameters, traffic context, and demo mode status.
    
    Output:
    - noise_floor_dbm: Current noise floor
    - path_loss_exponent: Path loss model exponent
    - available_bandwidth_mhz: Available spectrum
    - traffic_load_level: Traffic multiplier
    - is_emergency_active: Emergency mode flag
    - cellular_congestion_level: Cellular load (0-1)
    - mobile_user_ratio: Mobile users (0-1)
    - demo_mode_enabled: Demo mode flag
    - simulation_speed: Speed multiplier
    - active_hurdle: Currently active hurdle name
    """
    return get_env_state()


@router.post("/hurdle")
def trigger_hurdle(hurdle: str = Body(..., embed=True)):
    """
    Trigger a specific system hurdle/stress-test.
    
    Available hurdles:
    - coverage_drop: Simulate rural shadowing/fading (10dB loss)
    - interference: Inject noise (-85dBm floor)
    - spectrum_reduction: Limit to 4MHz
    - traffic_surge: 300% public service load
    - emergency_escalation: Trigger AEAT override
    - cellular_congestion: 85% cellular load (triggers offloading)
    - mobility_surge: 60% mobile users at 75 km/h
    - reset: Return to baseline
    
    Demo Usage:
        POST /env/hurdle
        Body: {"hurdle": "cellular_congestion"}
    """
    explanation = apply_hurdle(hurdle)
    return {
        "status": "active" if hurdle != "reset" else "reset",
        "hurdle": hurdle,
        "environment_change": explanation,
        "state": get_env_state()
    }


@router.post("/reset")
def reset_system():
    """
    Reset environment to baseline state.
    
    Clears all hurdles and returns to default parameters.
    Demo mode and speed settings are preserved.
    """
    reset_env_state()
    return {"status": "reset", "state": get_env_state()}


@router.post("/demo-mode")
def toggle_demo_mode(enabled: bool = Body(..., embed=True)):
    """
    Enable or disable demo mode.
    
    When enabled:
    - Demo annotations visible
    - Event log active
    - Hurdle triggers logged
    
    Demo Usage:
        POST /env/demo-mode
        Body: {"enabled": true}
    """
    set_demo_mode(enabled)
    return {
        "demo_mode": enabled,
        "state": get_env_state()
    }


@router.post("/speed")
def set_speed(speed: float = Body(..., embed=True)):
    """
    Set simulation speed.
    
    Speed values:
    - 0.5: Slow (half speed)
    - 1.0: Normal
    - 2.0: Fast
    - 4.0: Maximum
    
    Demo Usage:
        POST /env/speed
        Body: {"speed": 2.0}
    """
    set_simulation_speed(speed)
    return {
        "speed": speed,
        "state": get_env_state()
    }


@router.get("/demo-events")
def get_events():
    """
    Get recent demo events log.
    
    Returns the last 20 events (hurdle triggers, resets, mode changes).
    Useful for demo annotation and audit trail.
    """
    return {
        "events": [e.dict() for e in get_demo_events()],
        "count": len(get_demo_events())
    }
