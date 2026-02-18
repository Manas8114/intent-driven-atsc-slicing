"""
Simulation Router - Demo Mode Endpoints

These endpoints generate SIMULATED data for hackathon demonstrations.
They are NOT connected to real AI inference or RF hardware.
This module is architecturally separated to make the simulation boundary clear.
"""

from fastapi import APIRouter
import random
import uuid

router = APIRouter(prefix="/demo", tags=["Demo Mode (Simulated)"])


@router.post("/quick-start")
async def quick_start_demo():
    """
    One-click demo setup. Seeds synthetic learning data and activates a chaos scenario.

    WARNING: This generates SIMULATED data. It does not reflect real AI training.
    """
    from .learning_loop import get_learning_tracker
    from .environment import get_env_state
    from .broadcast_telemetry import control_plane_metrics

    tracker = get_learning_tracker()
    env = get_env_state()

    # Seed experiences with improving rewards (simulates learning curve)
    experiences_added = 0
    for i in range(30):
        decision_id = f"sim-{uuid.uuid4().hex[:6]}"

        base_reward = 0.4 + (i / 30) * 0.5
        noise = random.gauss(0, 0.05)
        reward = min(1.0, max(0.0, base_reward + noise))

        predicted_kpis = {
            "coverage": 0.7 + (i / 30) * 0.2,
            "alert_reliability": 0.85 + (i / 30) * 0.1,
        }

        actual_kpis = {
            "coverage": predicted_kpis["coverage"] + random.gauss(0.02, 0.01),
            "alert_reliability": predicted_kpis["alert_reliability"] + random.gauss(0, 0.01),
            "mobile_stability": 0.8 + (i / 30) * 0.15,
        }

        action = {
            "modulation": ["QPSK", "16QAM", "64QAM"][min(2, i // 10)],
            "coding_rate": "5/15" if i < 15 else "7/15",
            "power_dbm": 33 + (i / 30) * 5,
            "delivery_mode": "broadcast",
        }

        tracker.record_decision_outcome(
            decision_id=decision_id,
            intent="maximize_coverage" if i < 15 else "balanced",
            action=action,
            predicted_kpis=predicted_kpis,
            actual_kpis=actual_kpis,
        )
        experiences_added += 1

    # Activate monsoon chaos scenario
    env.active_hurdle = "monsoon"
    env.hurdle_intensity = 0.7

    # Seed control plane metrics
    control_plane_metrics._initialize()
    for _ in range(196):
        control_plane_metrics.record_recommendation(accepted=True)
    for _ in range(4):
        control_plane_metrics.record_recommendation(accepted=False)
    for _ in range(12):
        control_plane_metrics.record_safety_override()
    for _ in range(3):
        control_plane_metrics.record_emergency_override()

    return {
        "status": "DEMO MODE ACTIVE (Simulated)",
        "experiences_added": experiences_added,
        "total_experiences": tracker.total_decisions,
        "active_scenario": "monsoon",
        "message": "Simulated AI learning curve and monsoon scenario activated.",
        "next_steps": [
            "Open Learning Timeline to see simulated improvement curve",
            "Open Thinking Trace to see AI decisions",
            "Watch constellation diagram scatter under stress",
        ],
    }


@router.post("/reset")
async def reset_demo():
    """Reset demo state to normal operation."""
    from .environment import get_env_state

    env = get_env_state()
    env.active_hurdle = None
    env.hurdle_intensity = 0.0

    return {
        "status": "Demo reset",
        "active_scenario": None,
        "message": "System returned to normal operation",
    }
