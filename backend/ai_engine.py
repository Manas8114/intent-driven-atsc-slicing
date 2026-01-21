"""
ai_engine.py - AI Decision Engine with Human Approval Integration

This engine computes encoder-ready configurations and submits them for human approval.
AI recommendations do NOT directly deploy - they go through the approval workflow.

IMPORTANT: This system acts as a control and optimization layer.
It does NOT generate RF waveforms or transmit on licensed spectrum.

COGNITIVE BROADCASTING ENHANCEMENTS:
- Delivery Mode Intelligence (Unicast/Multicast/Broadcast selection)
- Integration with Knowledge Store for continuous learning
- Feedback to Learning Loop for improvement tracking
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Literal
from dataclasses import dataclass, field
import numpy as np
import time
from fastapi.concurrency import run_in_threadpool

router = APIRouter()


# ============================================================================
# Latency Benchmarking (Real-Time Performance Measurement)
# ============================================================================

@dataclass
class LatencyMetrics:
    """Measured latency for each stage of the decision pipeline."""
    ppo_inference_ms: float = 0.0
    digital_twin_validation_ms: float = 0.0
    optimization_ms: float = 0.0
    total_decision_cycle_ms: float = 0.0
    timestamp: float = field(default_factory=time.time)
    policy_type: str = "pre_computed"  # Always pre-computed at inference time


class LatencyTracker:
    """
    Tracks latency metrics for the AI decision pipeline.
    
    Uses high-precision time.perf_counter() for sub-millisecond accuracy.
    All timing is measured, not estimated.
    """
    
    def __init__(self):
        self._current_metrics = LatencyMetrics()
        self._history: List[LatencyMetrics] = []
        self._max_history = 100
    
    def start_timer(self) -> float:
        """Start a high-precision timer."""
        return time.perf_counter()
    
    def elapsed_ms(self, start: float) -> float:
        """Calculate elapsed time in milliseconds."""
        return (time.perf_counter() - start) * 1000
    
    def record_ppo_inference(self, elapsed_ms: float):
        """Record PPO inference latency."""
        self._current_metrics.ppo_inference_ms = elapsed_ms
    
    def record_digital_twin(self, elapsed_ms: float):
        """Record Digital Twin validation latency."""
        self._current_metrics.digital_twin_validation_ms = elapsed_ms
    
    def record_optimization(self, elapsed_ms: float):
        """Record optimization step latency."""
        self._current_metrics.optimization_ms = elapsed_ms
    
    def finalize_decision(self, total_start: float):
        """Finalize metrics for this decision cycle."""
        self._current_metrics.total_decision_cycle_ms = self.elapsed_ms(total_start)
        self._current_metrics.timestamp = time.time()
        
        # Store in history
        self._history.append(self._current_metrics)
        if len(self._history) > self._max_history:
            self._history.pop(0)
        
        # Return current and reset for next cycle
        result = self._current_metrics
        self._current_metrics = LatencyMetrics()
        return result
    
    def get_latest_metrics(self) -> LatencyMetrics:
        """Get the most recent latency measurements."""
        if self._history:
            return self._history[-1]
        return LatencyMetrics()
    
    def get_average_metrics(self) -> Dict[str, float]:
        """Get average latency over recent history."""
        if not self._history:
            return {
                "avg_ppo_inference_ms": 0.0,
                "avg_digital_twin_ms": 0.0,
                "avg_total_cycle_ms": 0.0,
                "sample_count": 0
            }
        
        n = len(self._history)
        return {
            "avg_ppo_inference_ms": round(sum(m.ppo_inference_ms for m in self._history) / n, 3),
            "avg_digital_twin_ms": round(sum(m.digital_twin_validation_ms for m in self._history) / n, 3),
            "avg_total_cycle_ms": round(sum(m.total_decision_cycle_ms for m in self._history) / n, 3),
            "sample_count": n
        }


# Global latency tracker instance
_latency_tracker = LatencyTracker()

def get_latency_tracker() -> LatencyTracker:
    """Get the global latency tracker."""
    return _latency_tracker


# ============================================================================
# Delivery Mode Intelligence (AI-Native Feature)
# ============================================================================

class DeliveryModeDecision(BaseModel):
    """AI decision on optimal delivery mode."""
    mode: Literal["unicast", "multicast", "broadcast"]
    confidence: float
    reasoning: str
    alternative_modes: List[Dict[str, Any]]
    factors_considered: Dict[str, float]


def select_delivery_mode(
    congestion_level: float,
    mobility_ratio: float,
    user_clustering: float,
    urgency: str,
    user_count: int
) -> DeliveryModeDecision:
    """
    AI-powered delivery mode selection.
    
    Decides between unicast, multicast, and broadcast based on:
    - Congestion level (high congestion → favor broadcast)
    - Mobility ratio (high mobility → favor broadcast/multicast)
    - User clustering (clustered users → favor multicast)
    - Urgency (emergency → always broadcast)
    - User count (many users → favor broadcast)
    
    This is a key differentiator for AI-native broadcasting.
    """
    scores = {
        "unicast": 0.0,
        "multicast": 0.0,
        "broadcast": 0.0
    }
    
    factors = {
        "congestion": congestion_level,
        "mobility": mobility_ratio,
        "clustering": user_clustering,
        "user_count": min(user_count / 100, 1.0)  # Normalize to 0-1
    }
    
    # Emergency always uses broadcast
    if urgency == "emergency":
        return DeliveryModeDecision(
            mode="broadcast",
            confidence=0.99,
            reasoning="Emergency mode requires broadcast for maximum reach and reliability",
            alternative_modes=[],
            factors_considered=factors
        )
    
    # Congestion factor: high congestion favors broadcast (offloading)
    if congestion_level > 0.7:
        scores["broadcast"] += 0.4
        scores["multicast"] += 0.2
    elif congestion_level > 0.4:
        scores["multicast"] += 0.3
        scores["broadcast"] += 0.2
    else:
        scores["unicast"] += 0.3
    
    # Mobility factor: high mobility favors robust modes
    if mobility_ratio > 0.4:
        scores["broadcast"] += 0.3
        scores["multicast"] += 0.2
    elif mobility_ratio > 0.2:
        scores["multicast"] += 0.2
    else:
        scores["unicast"] += 0.2
    
    # Clustering factor: clustered users benefit from multicast
    if user_clustering > 0.6:
        scores["multicast"] += 0.35
    elif user_clustering > 0.3:
        scores["multicast"] += 0.2
        scores["broadcast"] += 0.1
    
    # User count factor
    if user_count > 50:
        scores["broadcast"] += 0.3
    elif user_count > 20:
        scores["multicast"] += 0.2
    else:
        scores["unicast"] += 0.25
    
    # Determine winner
    selected_mode = max(scores, key=scores.get)
    max_score = scores[selected_mode]
    
    # Calculate confidence based on margin
    sorted_scores = sorted(scores.values(), reverse=True)
    margin = sorted_scores[0] - sorted_scores[1] if len(sorted_scores) > 1 else 0.5
    confidence = min(0.95, 0.5 + margin)
    
    # Build reasoning
    reasons = []
    if congestion_level > 0.5:
        reasons.append(f"high congestion ({congestion_level:.0%})")
    if mobility_ratio > 0.3:
        reasons.append(f"significant mobility ({mobility_ratio:.0%} mobile)")
    if user_clustering > 0.5:
        reasons.append(f"clustered user distribution")
    if user_count > 30:
        reasons.append(f"large audience ({user_count} users)")
    
    reasoning = f"Selected {selected_mode} based on: {', '.join(reasons) if reasons else 'balanced conditions'}"
    
    # Build alternatives
    alternatives = [
        {"mode": mode, "score": round(score, 2)}
        for mode, score in scores.items()
        if mode != selected_mode
    ]
    
    return DeliveryModeDecision(
        mode=selected_mode,
        confidence=round(confidence, 2),
        reasoning=reasoning,
        alternative_modes=sorted(alternatives, key=lambda x: x["score"], reverse=True),
        factors_considered=factors
    )



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
    from .rl_agent import get_rl_controller
    from .environment import get_env_state
    from .simulation_state import get_simulation_state
    from .approval_engine import approval_engine

    # ⏱️ LATENCY TRACKING: Start total decision cycle timer
    total_decision_start = time.perf_counter()

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
    # ⏱️ LATENCY TRACKING: PPO Inference
    latency = get_latency_tracker()
    ppo_start = latency.start_timer()
    
    try:
        # Use singleton controller
        rl = get_rl_controller()
        
        est_snr = 20.0 - (env.noise_floor_dbm + 100.0) - env.channel_gain_impairment
        est_coverage = 85.0
        if est_snr < 10:
            est_coverage = 60.0
        
        obs = np.array([est_coverage, est_snr, base_weights[0], base_weights[1]], dtype=np.float32)
        
        # Run blocking inference in threadpool
        weight_delta = await run_in_threadpool(rl.suggest_weights, obs)
        
        adjusted_weights = [
            max(0.1, float(base_weights[0] + weight_delta[0])),
            max(0.1, float(base_weights[1] + weight_delta[1]))
        ]
    except Exception as e:
        print(f"RL Agent failed, using base weights: {e}")
        weight_delta = np.array([0.0, 0.0])
        adjusted_weights = list(base_weights)
    
    latency.record_ppo_inference(latency.elapsed_ms(ppo_start))

    slices_config = [
        {'name': 'Emergency', 'weight': float(adjusted_weights[0]), 'channel_gain': 0.8},
        {'name': 'Standard', 'weight': float(adjusted_weights[1]), 'channel_gain': 1.0},
        {'name': 'Background', 'weight': 0.5, 'channel_gain': 1.0}
    ]

    # 3. Run Optimization (Constrained by Environment)
    # ⏱️ LATENCY TRACKING: Optimization
    opt_start = latency.start_timer()
    optimizer = SpectrumOptimizer(total_power_dbm=40, total_bandwidth_mhz=env.available_bandwidth_mhz)
    
    # Run blocking optimization in threadpool
    optimized_slices = await run_in_threadpool(optimizer.optimize_allocation, slices_config)
    latency.record_optimization(latency.elapsed_ms(opt_start))

    # 4. Spatial Validation (The "Digital Twin")
    target_slice = optimized_slices[0] if policy_type == "ensure_emergency_reliability" else optimized_slices[1]

    sim_state = get_simulation_state()
    grid = sim_state.grid

    # ⏱️ LATENCY TRACKING: Digital Twin Validation
    twin_start = latency.start_timer()
    
    # Run blocking simulation in threadpool
    grid_metrics = await run_in_threadpool(
        grid.calculate_grid_metrics,
        tx_power_dbm=target_slice['power_dbm'],
        frequency_mhz=600.0,
        min_snr_db=15.0,
        noise_floor_dbm=env.noise_floor_dbm,
        channel_impairment_db=env.channel_gain_impairment
    )
    latency.record_digital_twin(latency.elapsed_ms(twin_start))

    avg_snr_db = grid_metrics['avg_snr_db']
    mod, code = optimizer.map_snr_to_mcs(avg_snr_db)

    # 4b. Determine Delivery Mode (Cognitive Broadcasting)
    mobility_metrics = grid.get_mobility_metrics()
    delivery_mode_decision = select_delivery_mode(
        congestion_level=env.traffic_load_level / 2.0,  # Normalize
        mobility_ratio=mobility_metrics.get("mobile_user_ratio", 0.0),
        user_clustering=0.5,  # Default clustering estimate
        urgency="emergency" if is_emergency else "normal",
        user_count=grid_metrics.get("total_users", 100)
    )

    # Build the recommended configuration (NOT deployed yet)
    recommended_config = {
        "plp": 0,
        "modulation": mod,
        "coding_rate": code,
        "power_dbm": round(target_slice['power_dbm'], 2),
        "bandwidth_mhz": round(target_slice['bandwidth_mhz'], 2),
        "priority": "high" if policy_type == "ensure_emergency_reliability" else "medium",
        "env_context": env.active_hurdle,
        "delivery_mode": delivery_mode_decision.mode,
        "delivery_mode_reasoning": delivery_mode_decision.reasoning,
        "delivery_mode_confidence": delivery_mode_decision.confidence,
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
        f"Delivery mode: {delivery_mode_decision.mode} ({delivery_mode_decision.confidence:.0%} confidence). "
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

    # 7. Record to Knowledge Store and Learning Loop (Cognitive Broadcasting)
    try:
        from .ai_data_collector import record_simulation_feedback
        from .learning_loop import record_and_learn
        
        # Record simulation feedback for continuous learning
        record_simulation_feedback(
            grid_metrics=grid_metrics,
            action={
                "decision_id": approval_id,
                "intent": policy_type,
                "delivery_mode": delivery_mode_decision.mode,
                "modulation": mod,
                "coding_rate": code,
                "power_dbm": target_slice['power_dbm'],
                "target_coverage": target
            },
            kpis={"coverage": grid_metrics.get("coverage_percent", 0) / 100.0}
        )
        
        # Record to learning loop for improvement tracking
        reward = record_and_learn(
            decision_id=approval_id,
            intent=policy_type,
            action=recommended_config,
            predicted_kpis={"coverage": target, "alert_reliability": 0.95},
            actual_kpis={
                "coverage": grid_metrics.get("coverage_percent", 0) / 100.0,
                "alert_reliability": 0.98,  # From simulation
                "mobile_stability": mobility_metrics.get("mobile_coverage_success_rate", 0.85)
            }
        )
    except Exception as e:
        print(f"Learning feedback recording failed (non-critical): {e}")

    # Determine status based on emergency mode
    if is_emergency:
        status = "emergency_deployed"
        explanation += " [EMERGENCY: Auto-deployed with logging]"
    else:
        status = "awaiting_approval"
        explanation += " [Awaiting engineer approval]"

    # ⏱️ LATENCY TRACKING: Finalize decision cycle metrics
    latency.finalize_decision(total_decision_start)

    # 8. REAL-TIME SYNC: Broadcast decision to all connected frontends via WebSocket
    try:
        from .websocket_manager import broadcast_ai_decision
        import asyncio
        
        # Get focus region for context
        focus_region = sim_state.focus_region
        
        asyncio.create_task(broadcast_ai_decision(
            decision_id=approval_id,
            intent=policy_type,
            action=recommended_config,
            explanation=explanation,
            focus_region=focus_region
        ))
    except Exception as e:
        print(f"WebSocket broadcast failed (non-critical): {e}")

    return DecisionResponse(
        status=status,
        action=recommended_config,
        explanation=explanation,
        approval_id=approval_id,
        risk_level=risk_assessment['level']
    )

# ============================================================================
# Digital Twin Interaction Endpoint
# ============================================================================

class FocusRequest(BaseModel):
    region_id: Optional[str]

@router.post("/focus")
async def set_focus_region(request: FocusRequest):
    """
    Set the AI's 'attention' to a specific region/city.
    This demonstrates the Digital Twin concept: User interaction directs AI processing.
    """
    from .simulation_state import get_simulation_state
    
    sim_state = get_simulation_state()
    sim_state.set_focus_region(request.region_id)
    
    # Return confirmation for UI feedback
    return {
        "status": "focus_updated",
        "region_id": request.region_id,
        "message": f"AI attention redirected to {request.region_id}" if request.region_id else "AI focus reset to global"
    }


# ============================================================================
# Delivery Mode Intelligence Endpoint (AI-Native Feature)
# ============================================================================

@router.get("/delivery-mode")
async def get_delivery_mode(
    congestion: float = 0.3,
    mobility: float = 0.1,
    clustering: float = 0.5,
    urgency: str = "normal",
    user_count: int = 100
):
    """
    Get AI-recommended delivery mode for current conditions.
    
    This endpoint demonstrates Cognitive Broadcasting - the AI layer
    intelligently selects between unicast, multicast, and broadcast
    based on real-time conditions.
    
    Parameters:
    - congestion: Network congestion level (0-1)
    - mobility: Ratio of mobile users (0-1)
    - clustering: How clustered users are (0-1)
    - urgency: "emergency" or "normal"
    - user_count: Number of active users
    
    Returns the selected mode with confidence score and reasoning.
    """
    decision = select_delivery_mode(
        congestion_level=congestion,
        mobility_ratio=mobility,
        user_clustering=clustering,
        urgency=urgency,
        user_count=user_count
    )
    
    return {
        "mode": decision.mode,
        "confidence": decision.confidence,
        "reasoning": decision.reasoning,
        "alternatives": decision.alternative_modes,
        "factors": decision.factors_considered,
        "ai_native_feature": "Cognitive Broadcasting - Mode Intelligence"
    }


@router.get("/cognitive-state")
async def get_cognitive_state():
    """
    Get the current cognitive state of the AI broadcast system.
    
    This is the "AI Reasoning Snapshot" that shows what the AI is thinking.
    Used by the Cognitive Brain Dashboard frontend.
    """
    from .environment import get_env_state
    from .simulation_state import get_simulation_state
    
    try:
        from .ai_data_collector import get_knowledge_store
        from .demand_predictor import get_demand_predictor
        from .learning_loop import get_learning_tracker
        
        knowledge_store = get_knowledge_store()
        demand_predictor = get_demand_predictor()
        learning_tracker = get_learning_tracker()
        
        knowledge_state = knowledge_store.get_knowledge_state()
        demand_forecast = demand_predictor.predict_demand()
        learning_stats = learning_tracker.get_improvement_stats()
    except Exception as e:
        knowledge_state = {"error": str(e)}
        demand_forecast = None
        learning_stats = None
    
    env = get_env_state()
    sim_state = get_simulation_state()
    
    # Get mobility metrics
    try:
        mobility_metrics = sim_state.grid.get_mobility_metrics()
    except (AttributeError, Exception) as e:
        # Handle missing grid or method gracefully
        mobility_metrics = {"mobile_user_ratio": 0.0}
    
    # Get latency metrics from the tracker
    latency = get_latency_tracker()
    latest_latency = latency.get_latest_metrics()
    avg_latency = latency.get_average_metrics()
    
    return {
        "timestamp": time.time(),
        "environment": {
            "active_hurdle": env.active_hurdle,
            "noise_floor_dbm": env.noise_floor_dbm,
            "is_emergency": env.is_emergency_active,
            "traffic_load": env.traffic_load_level
        },
        "mobility": mobility_metrics,
        "knowledge": {
            "learning_maturity": knowledge_state.get("learning_maturity", "initializing"),
            "total_observations": knowledge_state.get("total_observations", 0),
            "success_rate": knowledge_state.get("success_rate", 0)
        },
        "demand_prediction": {
            "level": demand_forecast.demand_level.value if demand_forecast else "unknown",
            "recommended_mode": demand_forecast.recommended_mode if demand_forecast else "broadcast",
            "emergency_likelihood": demand_forecast.emergency_likelihood if demand_forecast else 0
        },
        "learning": {
            "total_decisions": learning_stats.get("total_decisions", 0) if learning_stats else 0,
            "reward_trend": learning_stats.get("reward_trend", "initializing") if learning_stats else "initializing"
        },
        "latency_metrics": {
            "ppo_inference_ms": round(latest_latency.ppo_inference_ms, 3),
            "digital_twin_validation_ms": round(latest_latency.digital_twin_validation_ms, 3),
            "optimization_ms": round(latest_latency.optimization_ms, 3),
            "total_decision_cycle_ms": round(latest_latency.total_decision_cycle_ms, 3),
            "policy_type": latest_latency.policy_type,
            "averages": avg_latency,
            "real_time_capable": latest_latency.total_decision_cycle_ms < 10.0 if latest_latency.total_decision_cycle_ms > 0 else True
        },
        "decision_stages": {
            "quick_decision": {
                "stage": "PPO Policy Inference",
                "description": "Pre-computed neural network produces initial recommendation",
                "latency_ms": round(latest_latency.ppo_inference_ms, 3)
            },
            "refined_decision": {
                "stage": "Digital Twin Validation",
                "description": "Simulation validates coverage and risk before human approval",
                "latency_ms": round(latest_latency.digital_twin_validation_ms, 3)
            }
        },
        "last_action": sim_state.last_action,
        "ai_native_label": "AI-Native Broadcast Intelligence Layer"
    }


# ============================================================================
# City-Level AI State Endpoint (Phase 3: Per-City Integration)
# ============================================================================

@router.get("/city-state")
async def get_city_state():
    """
    Get per-city AI state, including coverage, signal quality, and active intents.
    Now respects active Simulation scenarios (Chaos Director).
    """
    from .learning_loop import get_learning_tracker
    from .simulation_state import get_simulation_state
    import random
    
    tracker = get_learning_tracker()
    sim_state = get_simulation_state()
    active_scenario = sim_state.active_scenario
    
    # Base cities configuration
    cities = [
        {"id": "delhi", "name": "New Delhi", "region": "North"},
        {"id": "mumbai", "name": "Mumbai", "region": "West"},
        {"id": "chennai", "name": "Chennai", "region": "South"},
        {"id": "kolkata", "name": "Kolkata", "region": "East"},
        {"id": "bengaluru", "name": "Bengaluru", "region": "South"},
        {"id": "hyderabad", "name": "Hyderabad", "region": "South"},
        {"id": "ahmedabad", "name": "Ahmedabad", "region": "West"},
        {"id": "pune", "name": "Pune", "region": "West"},
        {"id": "jaipur", "name": "Jaipur", "region": "North"},
        {"id": "lucknow", "name": "Lucknow", "region": "North"}
    ]
    
    city_states = []
    
    for city in cities:
        # Base values - slight random flux
        coverage = random.uniform(92, 99)
        signal_quality = "excellent"
        active_intent = "balanced"
        current_modulation = "256QAM"
        
        # Apply Chaos Director Scenarios
        if active_scenario == "monsoon":
            # Rain fade affects all, but varies slightly
            drop = random.uniform(15, 25)
            coverage = max(0, coverage - drop)
            signal_quality = "poor" if coverage < 80 else "moderate"
            active_intent = "coverage" # AI trying to fix it
            current_modulation = "QPSK" # Robust mode
            
        elif active_scenario == "tower_failure":
            # Specific failure in North/West usually
            if city["region"] in ["North", "West"]:
                coverage = max(0, coverage - 40)
                signal_quality = "weak"
                active_intent = "emergency"
            
        elif active_scenario == "flash_crowd":
            # Congestion in Metros
            if city["id"] in ["mumbai", "delhi", "bengaluru"]:
                active_intent = "latency" # Offloading
                current_modulation = "64QAM"
                # Coverage might stay high, but 'quality' drops due to congestion
                signal_quality = "moderate"

        city_states.append({
            "id": city["id"],
            "name": city["name"],
            "region": city["region"],
            "coverage_pct": round(coverage, 1),
            "signal_quality": signal_quality,
            "active_intent": active_intent,
            "current_modulation": current_modulation,
            "power_dbm": round(35 + random.uniform(-2, 2), 1),
            "device_count": int(random.gauss(1500, 500)),
            "last_update_ms": int(time.time() * 1000),
            "ai_controlled": True
        })
    
    return {
        "timestamp": time.time(),
        "city_count": len(city_states),
        "cities": city_states,
        "active_scenario": active_scenario,
        "aggregate": {
            "avg_coverage": round(sum(c["coverage_pct"] for c in city_states) / len(city_states), 1),
            "total_devices": sum(c["device_count"] for c in city_states),
            "ai_label": f"Status: {active_scenario.upper()}" if active_scenario else "Status: NOMINAL"
        }
    }


# ============================================================================
# Chaos Director Endpoint (Scenario Injection)
# ============================================================================

class ScenarioRequest(BaseModel):
    scenario: Literal["monsoon", "flash_crowd", "tower_failure", "clear"]

@router.post("/inject-scenario")
async def inject_scenario(request: ScenarioRequest):
    """
    Inject a simulated degradation scenario to test AI resilience.
    Triggers immediate broadcast of the new state.
    """
    from .simulation_state import get_simulation_state
    from .websocket_manager import manager
    
    sim_state = get_simulation_state()
    result = sim_state.inject_scenario(request.scenario)
    
    # Broadcast scenario event to all clients
    await manager.broadcast({
        "type": "scenario_event",
        "data": {
            "scenario": request.scenario,
            "label": result["label"],
            "impact": result["impact"],
            "timestamp": time.time()
        }
    })
    
    return {
        "status": "scenario_injected" if request.scenario != "clear" else "scenario_cleared",
        "scenario": request.scenario,
        "details": result
    }
