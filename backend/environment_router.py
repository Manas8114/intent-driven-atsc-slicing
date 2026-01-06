from fastapi import APIRouter, Body
from typing import Dict, Any

from .environment import get_env_state, apply_hurdle, reset_env_state

router = APIRouter()

@router.get("/state")
def get_state():
    return get_env_state()

@router.post("/hurdle")
def trigger_hurdle(hurdle: str = Body(..., embed=True)):
    """
    Triggers a specific system hurdle/stress-test.
    """
    explanation = apply_hurdle(hurdle)
    return {
        "status": "active",
        "hurdle": hurdle,
        "environment_change": explanation,
        "state": get_env_state()
    }

@router.post("/reset")
def reset_system():
    reset_env_state()
    return {"status": "reset", "state": get_env_state()}
