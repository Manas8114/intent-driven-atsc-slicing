"""
ai_engine.py - AI Decision Engine with Human Approval Integration

This engine computes encoder-ready configurations and submits them for human approval.
AI recommendations do NOT directly deploy - they go through the approval workflow.

IMPORTANT: This system acts as a control and optimization layer.
It does NOT generate RF waveforms or transmit on licensed spectrum.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import numpy as np

router = APIRouter()


# ============================================================================
# API Models
# ============================================================================

class DecisionRequest(BaseModel):
    policy: Dict[str, Any] = Field(..., description="Policy dict derived from intent, e.g., {\"type\": \"ensure_emergency_reliability\", \"target\": 0.99}")


class DecisionResponse(BaseModel):
    status: str = Field(..., description="Result status: 'awaiting_approval', 'emergency_deployed', or 'error'")
    action: Dict[str, Any] = Field(..., description="Recommended ATSC configuration (NOT deployed until approved)")
    explanation: str = Field(..., description="Human‑readable explanation of the recommendation")
    approval_id: Optional[str] = Field(None, description="ID of the approval record for tracking")
    risk_level: Optional[str] = Field(None, description="Risk assessment level: low, medium, high")


# ============================================================================
# Risk Assessment & Impact Calculation
# ============================================================================

def calculate_risk_assessment(
    action: Dict[str, Any],
    env_state: Any,
    grid_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculate risk assessment for a proposed configuration change.
    
    Risk factors considered:
    - Modulation robustness (lower = more robust = lower risk)
    - Power level changes
    - Environmental conditions
    - Coverage impact
    """
    risk_factors = []
    risk_score = 0.0
    
    # Modulation risk (higher order = higher risk)
    mod = action.get("modulation", "QPSK")
    mod_risk_map = {"QPSK": 0.1, "16QAM": 0.3, "64QAM": 0.5, "256QAM": 0.8}
    mod_risk = mod_risk_map.get(mod, 0.5)
    risk_score += mod_risk * 0.3
    if mod_risk > 0.5:
        risk_factors.append(f"High-order modulation ({mod}) is sensitive to interference")
    
    # Power level risk
    power = action.get("power_dbm", 35)
    if power > 42:
        risk_score += 0.2
        risk_factors.append("Power level exceeds typical operating range")
    elif power < 30:
        risk_score += 0.15
        risk_factors.append("Low power may reduce coverage reliability")
    
    # Environmental risk
    if env_state.is_emergency_active:
        risk_factors.append("Emergency mode active - reliability is critical")
    
    if env_state.channel_gain_impairment > 3.0:
        risk_score += 0.2
        risk_factors.append(f"High channel impairment ({env_state.channel_gain_impairment:.1f}dB)")
    
    if env_state.noise_floor_dbm > -95:
        risk_score += 0.15
        risk_factors.append("Elevated noise floor detected")
    
    # Coverage risk
    coverage = grid_metrics.get("coverage_percent", 0)
    if coverage < 80:
        risk_score += 0.25
        risk_factors.append(f"Coverage below target ({coverage:.1f}%)")
    
    # Determine risk level
    if risk_score < 0.25:
        risk_level = "low"
    elif risk_score < 0.5:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    return {
        "level": risk_level,
        "score": round(risk_score, 2),
        "factors": risk_factors,
        "recommendation": "Proceed with caution" if risk_level == "high" else "Normal operation"
    }


def calculate_expected_impact(
    action: Dict[str, Any],
    grid_metrics: Dict[str, Any],
    optimized_slices: list
) -> Dict[str, Any]:
    """
    Calculate expected impact of deploying this configuration.
    """
    return {
        "expected_coverage_percent": round(grid_metrics.get("coverage_percent", 0), 1),
        "expected_avg_snr_db": round(grid_metrics.get("avg_snr_db", 0), 1),
        "expected_min_snr_db": round(grid_metrics.get("min_snr_db", 0), 1),
        "spectral_efficiency": f"{action.get('modulation', 'QPSK')} {action.get('coding_rate', '5/15')}",
        "power_allocation": {
            s.get("name", f"Slice_{i}"): round(s.get("power_dbm", 0), 1)
            for i, s in enumerate(optimized_slices)
        },
        "bandwidth_allocation": {
            s.get("name", f"Slice_{i}"): round(s.get("bandwidth_mhz", 0), 2)
            for i, s in enumerate(optimized_slices)
        }
    }


def compare_configs(
    previous: Optional[Dict[str, Any]],
    proposed: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compare proposed configuration with the previously approved configuration.
    """
    if previous is None:
        return {
            "has_previous": False,
            "note": "No previous configuration - this is the first recommendation"
        }
    
    changes = []
    
    # Compare modulation
    if previous.get("modulation") != proposed.get("modulation"):
        changes.append({
            "field": "modulation",
            "from": previous.get("modulation"),
            "to": proposed.get("modulation")
        })
    
    # Compare coding rate
    if previous.get("coding_rate") != proposed.get("coding_rate"):
        changes.append({
            "field": "coding_rate",
            "from": previous.get("coding_rate"),
            "to": proposed.get("coding_rate")
        })
    
    # Compare power (significant change > 1dB)
    prev_power = previous.get("power_dbm", 0)
    prop_power = proposed.get("power_dbm", 0)
    if abs(prev_power - prop_power) > 1.0:
        changes.append({
            "field": "power_dbm",
            "from": prev_power,
            "to": prop_power,
            "delta": round(prop_power - prev_power, 1)
        })
    
    # Compare bandwidth
    prev_bw = previous.get("bandwidth_mhz", 0)
    prop_bw = proposed.get("bandwidth_mhz", 0)
    if abs(prev_bw - prop_bw) > 0.1:
        changes.append({
            "field": "bandwidth_mhz",
            "from": prev_bw,
            "to": prop_bw,
            "delta": round(prop_bw - prev_bw, 2)
        })
    
    return {
        "has_previous": True,
        "change_count": len(changes),
        "changes": changes,
        "is_significant": len(changes) > 0
    }


# ============================================================================
# Main Decision Endpoint
# ============================================================================

@router.post("/decision", response_model=DecisionResponse)
async def make_decision(request: DecisionRequest):
    """
    AI Decision Engine - Generates encoder-ready configuration RECOMMENDATIONS.
    
    IMPORTANT: This endpoint does NOT deploy configurations directly.
    All recommendations go through the human approval workflow unless
    emergency mode is active.
    
    Process:
    1. RL Agent (PPO) adjusts optimization weights based on learned QoS policy
    2. Convex Optimization (Water-filling) calculates Power/BW allocation
    3. Spatial Grid Simulation validates coverage across the digital twin
    4. Risk assessment and impact analysis are calculated
    5. Recommendation is submitted to approval engine
    """
    from .optimizer import SpectrumOptimizer
    from .rl_agent import RLController
    from .environment import get_env_state
    from .simulation_state import get_simulation_state
    from .approval_engine import approval_engine

    # 0. Get Environment Context
    env = get_env_state()

    # 1. Translate Intent to Base Weights (considering Environment)
    policy_type = request.policy.get("type", "maximize_coverage")
    target = request.policy.get("target", 0.95)
    
    # Emergency Override - AI escalates but still logs through approval engine
    is_emergency = env.is_emergency_active
    if is_emergency:
        policy_type = "ensure_emergency_reliability"
        target = 0.99

    # Base configuration from Intent
    if policy_type == "ensure_emergency_reliability":
        base_weights = [3.0, 0.5]  # [Emergency, Standard] - Heavily skewed
    elif policy_type == "maximize_coverage":
        base_weights = [1.0, 1.5]
    elif policy_type == "optimize_spectrum":
        base_weights = [1.0, 1.0]  # Balanced
    else:
        base_weights = [1.0, 1.0]

    # Adjust for Traffic Surge Hurdle
    if env.traffic_load_level > 1.5 and policy_type != "ensure_emergency_reliability":
        base_weights[1] *= 1.5

    # 2. RL Agent Adjustment (The "AI" Brain)
    try:
        rl = RLController()
        
        est_snr = 20.0 - (env.noise_floor_dbm + 100.0) - env.channel_gain_impairment
        est_coverage = 85.0
        if est_snr < 10:
            est_coverage = 60.0
        
        obs = np.array([est_coverage, est_snr, base_weights[0], base_weights[1]], dtype=np.float32)
        weight_delta = rl.suggest_weights(obs)
        
        adjusted_weights = [
            max(0.1, float(base_weights[0] + weight_delta[0])),
            max(0.1, float(base_weights[1] + weight_delta[1]))
        ]
    except Exception as e:
        print(f"RL Agent failed, using base weights: {e}")
        weight_delta = np.array([0.0, 0.0])
        adjusted_weights = list(base_weights)

    slices_config = [
        {'name': 'Emergency', 'weight': float(adjusted_weights[0]), 'channel_gain': 0.8},
        {'name': 'Standard', 'weight': float(adjusted_weights[1]), 'channel_gain': 1.0},
        {'name': 'Background', 'weight': 0.5, 'channel_gain': 1.0}
    ]

    # 3. Run Optimization (Constrained by Environment)
    optimizer = SpectrumOptimizer(total_power_dbm=40, total_bandwidth_mhz=env.available_bandwidth_mhz)
    optimized_slices = optimizer.optimize_allocation(slices_config)

    # 4. Spatial Validation (The "Digital Twin")
    target_slice = optimized_slices[0] if policy_type == "ensure_emergency_reliability" else optimized_slices[1]

    sim_state = get_simulation_state()
    grid = sim_state.grid

    grid_metrics = grid.calculate_grid_metrics(
        tx_power_dbm=target_slice['power_dbm'],
        frequency_mhz=600.0,
        min_snr_db=15.0,
        noise_floor_dbm=env.noise_floor_dbm,
        channel_impairment_db=env.channel_gain_impairment
    )

    avg_snr_db = grid_metrics['avg_snr_db']
    mod, code = optimizer.map_snr_to_mcs(avg_snr_db)

    # Build the recommended configuration (NOT deployed yet)
    recommended_config = {
        "plp": 0,
        "modulation": mod,
        "coding_rate": code,
        "power_dbm": round(target_slice['power_dbm'], 2),
        "bandwidth_mhz": round(target_slice['bandwidth_mhz'], 2),
        "priority": "high" if policy_type == "ensure_emergency_reliability" else "medium",
        "env_context": env.active_hurdle,
        "all_slices": [
            {
                "name": s.get("name"),
                "power_dbm": round(s.get("power_dbm", 0), 2),
                "bandwidth_mhz": round(s.get("bandwidth_mhz", 0), 2)
            }
            for s in optimized_slices
        ]
    }

    # 5. Calculate Risk Assessment and Expected Impact
    risk_assessment = calculate_risk_assessment(recommended_config, env, grid_metrics)
    expected_impact = calculate_expected_impact(recommended_config, grid_metrics, optimized_slices)
    
    # Get previous config for comparison
    previous_config = approval_engine.get_last_deployed_config()
    comparison = compare_configs(previous_config, recommended_config)

    # Build human-readable explanation
    env_note = f" [Env: {env.active_hurdle}]" if env.active_hurdle else ""
    explanation = (
        f"RL adjusted w=[{adjusted_weights[0]:.1f}, {adjusted_weights[1]:.1f}]{env_note}. "
        f"Recommending {mod} {code} for SNR={avg_snr_db:.1f}dB. "
        f"Expected coverage: {grid_metrics['coverage_percent']:.1f}%. "
        f"Risk level: {risk_assessment['level']}."
    )

    # 6. Submit to Approval Engine (NOT direct deployment)
    approval_id = approval_engine.submit_recommendation(
        recommended_config=recommended_config,
        risk_assessment=risk_assessment,
        expected_impact=expected_impact,
        comparison_with_previous=comparison,
        human_readable_summary=explanation,
        is_emergency=is_emergency
    )

    # Update simulation state with recommendation (for display, not deployment)
    sim_state.last_action = recommended_config

    # Determine status based on emergency mode
    if is_emergency:
        status = "emergency_deployed"
        explanation += " [EMERGENCY: Auto-deployed with logging]"
    else:
        status = "awaiting_approval"
        explanation += " [Awaiting engineer approval]"

    return DecisionResponse(
        status=status,
        action=recommended_config,
        explanation=explanation,
        approval_id=approval_id,
        risk_level=risk_assessment['level']
    )
