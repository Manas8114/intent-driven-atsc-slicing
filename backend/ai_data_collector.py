"""
ai_data_collector.py - Broadcast Knowledge Store (AI-Native Data Generation Layer)

This module implements continuous data collection and knowledge aggregation from the
Digital Twin simulation, making the system self-supervised and data-generating.

PURPOSE:
- Aggregate synthetic feedback from receivers via Digital Twin
- Collect: SNR maps, user density, mobility patterns, service outcomes
- Continuously update a Broadcast Knowledge Store
- Enable the AI layer to learn from broadcast feedback

This makes the system:
- Self-supervised (learns from its own actions)
- Data-generating (not dependent on static datasets)
- Truly AI-native (continuous learning loop)
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import threading
import time

router = APIRouter()


# ============================================================================
# Data Models
# ============================================================================

class SNRObservation(BaseModel):
    """Single SNR measurement observation."""
    timestamp: datetime
    grid_x: int
    grid_y: int
    snr_db: float
    is_mobile: bool = False
    velocity_kmh: float = 0.0


class DensityObservation(BaseModel):
    """User density observation at a grid location."""
    timestamp: datetime
    grid_x: int
    grid_y: int
    user_count: int
    mobile_count: int


class MobilityPattern(BaseModel):
    """Learned mobility pattern."""
    timestamp: datetime
    avg_velocity_kmh: float
    mobile_ratio: float
    direction_distribution: Dict[str, float]  # e.g., {"north": 0.3, "south": 0.2, ...}
    clustering_factor: float  # 0-1, how clustered are mobile users


class ServiceOutcome(BaseModel):
    """Outcome of a broadcast decision."""
    timestamp: datetime
    decision_id: str
    intent: str
    delivery_mode: str
    coverage_achieved: float
    target_coverage: float
    success: bool
    modcod_used: str
    power_dbm: float


class KnowledgeState(BaseModel):
    """Current state of the Broadcast Knowledge Store."""
    total_observations: int
    time_span_seconds: float
    avg_snr_db: float
    avg_coverage: float
    avg_mobility_ratio: float
    dominant_delivery_mode: str
    success_rate: float
    last_updated: datetime
    learning_maturity: str  # "initializing", "learning", "mature"


class HeatmapData(BaseModel):
    """Heatmap data for visualization."""
    grid_size: int
    snr_map: List[List[float]]  # 2D grid of average SNR values
    density_map: List[List[int]]  # 2D grid of user counts
    coverage_map: List[List[float]]  # 2D grid of coverage probability
    generated_at: datetime
    observation_count: int


class KnowledgeHistory(BaseModel):
    """Historical knowledge snapshots."""
    snapshots: List[Dict[str, Any]]
    patterns_learned: List[str]
    improvement_trend: float  # -1 to 1 indicating learning direction


# ============================================================================
# Broadcast Knowledge Store (Singleton)
# ============================================================================

class BroadcastKnowledgeStore:
    """
    Central store for all broadcast knowledge learned from the Digital Twin.
    
    This is the "brain" of the cognitive broadcasting system - it:
    - Collects observations from every simulation step
    - Aggregates patterns over time
    - Provides insights for AI decision-making
    - Tracks learning progress
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
        """Initialize the knowledge store."""
        self.start_time = datetime.now()
        
        # Raw observations (time-series data)
        self.snr_observations: List[Dict] = []
        self.density_observations: List[Dict] = []
        self.mobility_patterns: List[Dict] = []
        self.service_outcomes: List[Dict] = []
        
        # Aggregated knowledge (learned patterns)
        self.snr_heatmap = np.zeros((10, 10))  # 10x10 grid
        self.snr_observation_count = np.zeros((10, 10))
        self.density_heatmap = np.zeros((10, 10))
        self.coverage_probability = np.zeros((10, 10))
        
        # Learned patterns
        self.learned_patterns: Dict[str, Any] = {
            "optimal_modcod_by_zone": {},
            "congestion_time_patterns": [],
            "mobility_surge_indicators": [],
            "coverage_failure_zones": [],
        }
        
        # Learning metrics
        self.total_decisions = 0
        self.successful_decisions = 0
        self.observation_count = 0
        
        # Historical snapshots for timeline
        self.history_snapshots: List[Dict] = []
        self.snapshot_interval_seconds = 30
        self.last_snapshot_time = datetime.now()
    
    def record_snr_observation(self, x_km: float, y_km: float, snr_db: float, 
                                is_mobile: bool = False, velocity_kmh: float = 0.0):
        """Record a single SNR measurement from the Digital Twin."""
        # Convert km to grid indices (assuming 10x10 grid over 10km)
        grid_x = min(9, max(0, int(x_km)))
        grid_y = min(9, max(0, int(y_km)))
        
        observation = {
            "timestamp": datetime.now().isoformat(),
            "grid_x": grid_x,
            "grid_y": grid_y,
            "snr_db": snr_db,
            "is_mobile": is_mobile,
            "velocity_kmh": velocity_kmh
        }
        
        # Keep last 1000 observations in memory
        if len(self.snr_observations) > 1000:
            self.snr_observations.pop(0)
        self.snr_observations.append(observation)
        
        # Update heatmap with running average
        count = self.snr_observation_count[grid_x, grid_y]
        current_avg = self.snr_heatmap[grid_x, grid_y]
        new_avg = (current_avg * count + snr_db) / (count + 1)
        self.snr_heatmap[grid_x, grid_y] = new_avg
        self.snr_observation_count[grid_x, grid_y] = count + 1
        
        self.observation_count += 1
        self._maybe_take_snapshot()
    
    def record_density_observation(self, grid_metrics: Dict):
        """Record user density from grid simulation."""
        observation = {
            "timestamp": datetime.now().isoformat(),
            "total_users": grid_metrics.get("total_users", 0),
            "mobile_users": grid_metrics.get("mobile_users", 0),
            "user_distribution": grid_metrics.get("user_distribution", []),
        }
        
        if len(self.density_observations) > 100:
            self.density_observations.pop(0)
        self.density_observations.append(observation)
        
        # Update density heatmap
        user_dist = grid_metrics.get("user_distribution", [])
        for user in user_dist[:100]:  # Limit to first 100
            if isinstance(user, dict) and "x" in user and "y" in user:
                gx = min(9, max(0, int(user["x"])))
                gy = min(9, max(0, int(user["y"])))
                self.density_heatmap[gx, gy] += 1
    
    def record_mobility_pattern(self, mobility_metrics: Dict):
        """Record mobility statistics."""
        pattern = {
            "timestamp": datetime.now().isoformat(),
            "avg_velocity_kmh": mobility_metrics.get("average_velocity_kmh", 0),
            "mobile_ratio": mobility_metrics.get("mobile_user_ratio", 0),
            "max_velocity_kmh": mobility_metrics.get("max_velocity_kmh", 0),
        }
        
        if len(self.mobility_patterns) > 100:
            self.mobility_patterns.pop(0)
        self.mobility_patterns.append(pattern)
        
        # Learn surge patterns
        if pattern["mobile_ratio"] > 0.3:
            self.learned_patterns["mobility_surge_indicators"].append({
                "time": pattern["timestamp"],
                "ratio": pattern["mobile_ratio"],
                "velocity": pattern["avg_velocity_kmh"]
            })
            # Keep only last 20 surge indicators
            if len(self.learned_patterns["mobility_surge_indicators"]) > 20:
                self.learned_patterns["mobility_surge_indicators"].pop(0)
    
    def record_service_outcome(self, decision_id: str, intent: str, delivery_mode: str,
                                coverage_achieved: float, target_coverage: float,
                                modcod: str, power_dbm: float):
        """Record the outcome of a broadcast decision for learning."""
        success = coverage_achieved >= target_coverage * 0.95  # 5% tolerance
        
        outcome = {
            "timestamp": datetime.now().isoformat(),
            "decision_id": decision_id,
            "intent": intent,
            "delivery_mode": delivery_mode,
            "coverage_achieved": coverage_achieved,
            "target_coverage": target_coverage,
            "success": success,
            "modcod_used": modcod,
            "power_dbm": power_dbm
        }
        
        if len(self.service_outcomes) > 200:
            self.service_outcomes.pop(0)
        self.service_outcomes.append(outcome)
        
        self.total_decisions += 1
        if success:
            self.successful_decisions += 1
        
        # Update coverage probability map
        if success:
            self.coverage_probability = np.clip(
                self.coverage_probability * 0.95 + 0.05, 0, 1
            )
        
        # Learn optimal ModCod by intent
        if intent not in self.learned_patterns["optimal_modcod_by_zone"]:
            self.learned_patterns["optimal_modcod_by_zone"][intent] = {}
        
        if success:
            self.learned_patterns["optimal_modcod_by_zone"][intent][modcod] = \
                self.learned_patterns["optimal_modcod_by_zone"][intent].get(modcod, 0) + 1
    
    def _maybe_take_snapshot(self):
        """Take a historical snapshot if interval has passed."""
        now = datetime.now()
        if (now - self.last_snapshot_time).total_seconds() >= self.snapshot_interval_seconds:
            snapshot = {
                "timestamp": now.isoformat(),
                "observation_count": self.observation_count,
                "avg_snr": float(np.mean(self.snr_heatmap[self.snr_observation_count > 0])) 
                          if np.any(self.snr_observation_count > 0) else 0.0,
                "success_rate": self.successful_decisions / max(1, self.total_decisions),
                "total_decisions": self.total_decisions,
            }
            
            if len(self.history_snapshots) > 100:
                self.history_snapshots.pop(0)
            self.history_snapshots.append(snapshot)
            self.last_snapshot_time = now
    
    def get_knowledge_state(self) -> Dict:
        """Get current state of the knowledge store."""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        # Determine learning maturity
        if self.observation_count < 50:
            maturity = "initializing"
        elif self.observation_count < 500:
            maturity = "learning"
        else:
            maturity = "mature"
        
        # Calculate dominant delivery mode
        mode_counts = {}
        for outcome in self.service_outcomes[-50:]:
            mode = outcome.get("delivery_mode", "broadcast")
            mode_counts[mode] = mode_counts.get(mode, 0) + 1
        dominant_mode = max(mode_counts, key=mode_counts.get) if mode_counts else "broadcast"
        
        avg_snr = float(np.mean(self.snr_heatmap[self.snr_observation_count > 0])) \
                  if np.any(self.snr_observation_count > 0) else 0.0
        
        return {
            "total_observations": self.observation_count,
            "time_span_seconds": elapsed,
            "avg_snr_db": avg_snr,
            "avg_coverage": float(np.mean(self.coverage_probability)),
            "avg_mobility_ratio": np.mean([p.get("mobile_ratio", 0) 
                                            for p in self.mobility_patterns[-20:]]) if self.mobility_patterns else 0.0,
            "dominant_delivery_mode": dominant_mode,
            "success_rate": self.successful_decisions / max(1, self.total_decisions),
            "last_updated": datetime.now().isoformat(),
            "learning_maturity": maturity,
            "patterns_learned": len(self.learned_patterns["optimal_modcod_by_zone"]),
            "mobility_surges_detected": len(self.learned_patterns["mobility_surge_indicators"]),
        }
    
    def get_heatmap_data(self) -> Dict:
        """Get heatmap data for visualization."""
        return {
            "grid_size": 10,
            "snr_map": self.snr_heatmap.tolist(),
            "density_map": self.density_heatmap.tolist(),
            "coverage_map": self.coverage_probability.tolist(),
            "observation_count_map": self.snr_observation_count.tolist(),
            "generated_at": datetime.now().isoformat(),
            "observation_count": self.observation_count,
            "label": "Generated by AI from Broadcast Feedback"
        }
    
    def get_history(self) -> Dict:
        """Get historical knowledge for timeline visualization."""
        # Calculate improvement trend
        if len(self.history_snapshots) >= 2:
            recent_success = np.mean([s["success_rate"] for s in self.history_snapshots[-5:]])
            older_success = np.mean([s["success_rate"] for s in self.history_snapshots[:5]])
            trend = recent_success - older_success
        else:
            trend = 0.0
        
        return {
            "snapshots": self.history_snapshots[-50:],
            "patterns_learned": list(self.learned_patterns["optimal_modcod_by_zone"].keys()),
            "improvement_trend": trend,
            "total_history_points": len(self.history_snapshots),
            "mobility_surge_count": len(self.learned_patterns["mobility_surge_indicators"]),
        }
    
    def get_recent_outcomes(self, limit: int = 20) -> List[Dict]:
        """Get recent service outcomes for display."""
        return self.service_outcomes[-limit:]
    
    def reset(self):
        """Reset the knowledge store (for demo purposes)."""
        self._initialize()


# ============================================================================
# Global accessor
# ============================================================================

def get_knowledge_store() -> BroadcastKnowledgeStore:
    """Get the singleton knowledge store instance."""
    return BroadcastKnowledgeStore()


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/knowledge/state")
async def get_knowledge_state():
    """
    Get current state of the Broadcast Knowledge Store.
    
    Returns aggregated intelligence about:
    - Observation counts and learning maturity
    - Average SNR and coverage
    - Dominant delivery modes
    - Success rate of AI decisions
    """
    store = get_knowledge_store()
    return store.get_knowledge_state()


@router.get("/knowledge/heatmap")
async def get_knowledge_heatmap():
    """
    Get heatmap data for visualization.
    
    Returns 2D grids for:
    - SNR distribution (learned from Digital Twin feedback)
    - User density (aggregated from observations)
    - Coverage probability (success-based learning)
    
    Label: "Generated by AI from Broadcast Feedback"
    """
    store = get_knowledge_store()
    return store.get_heatmap_data()


@router.get("/knowledge/history")
async def get_knowledge_history():
    """
    Get historical knowledge snapshots for learning timeline.
    
    Returns:
    - Time-series snapshots of knowledge state
    - Learned patterns (intents, ModCods)
    - Improvement trend over time
    """
    store = get_knowledge_store()
    return store.get_history()


@router.get("/knowledge/outcomes")
async def get_recent_outcomes(limit: int = 20):
    """
    Get recent service outcomes for decision analysis.
    """
    store = get_knowledge_store()
    return {"outcomes": store.get_recent_outcomes(limit)}


@router.post("/knowledge/reset")
async def reset_knowledge():
    """
    Reset the knowledge store (demo mode).
    
    Clears all learned knowledge to demonstrate learning from scratch.
    """
    store = get_knowledge_store()
    store.reset()
    return {"status": "reset", "message": "Knowledge store cleared - learning will restart"}


# ============================================================================
# Integration Helper
# ============================================================================

def record_simulation_feedback(grid_metrics: Dict, action: Dict, kpis: Dict):
    """
    Helper function to record feedback from a simulation step.
    
    Called by the AI engine after each decision/simulation cycle.
    """
    store = get_knowledge_store()
    
    # Record SNR observations from grid
    avg_snr = grid_metrics.get("avg_snr_db", 0)
    coverage_pct = grid_metrics.get("coverage_percent", 0)
    
    # Simulate multiple observation points
    for i in range(10):
        for j in range(10):
            # Add some noise to simulate real measurements
            snr_with_noise = avg_snr + np.random.normal(0, 3)
            store.record_snr_observation(
                x_km=float(i),
                y_km=float(j),
                snr_db=snr_with_noise,
                is_mobile=np.random.random() < grid_metrics.get("mobile_user_ratio", 0)
            )
    
    # Record density
    store.record_density_observation(grid_metrics)
    
    # Record mobility
    store.record_mobility_pattern({
        "average_velocity_kmh": grid_metrics.get("average_velocity_kmh", 0),
        "mobile_user_ratio": grid_metrics.get("mobile_user_ratio", 0),
        "max_velocity_kmh": grid_metrics.get("max_velocity_kmh", 0),
    })
    
    # Record service outcome
    store.record_service_outcome(
        decision_id=action.get("decision_id", f"decision_{int(time.time())}"),
        intent=action.get("intent", "balanced"),
        delivery_mode=action.get("delivery_mode", "broadcast"),
        coverage_achieved=coverage_pct / 100.0,
        target_coverage=action.get("target_coverage", 0.90),
        modcod=action.get("modulation", "QPSK") + "_" + action.get("coding_rate", "1/2"),
        power_dbm=action.get("power_dbm", 30.0)
    )
