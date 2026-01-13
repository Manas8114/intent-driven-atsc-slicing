"""
demand_predictor.py - Demand & Context Awareness Module

This module predicts when, where, and what to broadcast based on:
- Time of day patterns
- Mobility levels
- Past demand history
- Emergency likelihood

PURPOSE:
- Predict broadcast demand before it happens
- Provide scheduling hints for pre-emptive slice preparation
- Enable proactive rather than reactive broadcasting

This is a key differentiator for AI-native networks:
Traditional broadcast: React to load
AI-native broadcast: Anticipate and prepare
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
import math

router = APIRouter()


# ============================================================================
# Data Models
# ============================================================================

class DemandLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SURGE = "surge"


class ContentCategory(str, Enum):
    NEWS = "news"
    EMERGENCY = "emergency"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    AUTOMOTIVE = "automotive"  # Connected vehicle data


class SchedulingHint(BaseModel):
    """A recommendation for broadcast scheduling."""
    time_window: str  # e.g., "next_15_min", "next_hour"
    recommended_action: str
    priority: int  # 1 (highest) to 5 (lowest)
    reasoning: str
    confidence: float  # 0-1


class DemandForecast(BaseModel):
    """Predicted demand for broadcast resources."""
    timestamp: datetime
    demand_level: DemandLevel
    predicted_load_pct: float  # 0-100
    peak_expected_in_minutes: int
    mobility_forecast: str  # "stable", "increasing", "decreasing"
    emergency_likelihood: float  # 0-1
    recommended_mode: str  # "broadcast", "multicast", "unicast"
    confidence: float  # 0-1
    reasoning: str


class ContextSnapshot(BaseModel):
    """Current context for demand prediction."""
    current_hour: int
    is_peak_hour: bool
    is_weekend: bool
    current_mobility_ratio: float
    current_congestion: float
    recent_emergency_activity: bool
    weather_factor: float  # 1.0 = normal, higher = worse conditions


# ============================================================================
# Demand Predictor Class
# ============================================================================

class DemandPredictor:
    """
    Predicts broadcast demand and provides scheduling recommendations.
    
    Uses a combination of:
    - Time-based patterns (learned from historical data)
    - Current context (mobility, congestion)
    - Emergency indicators
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize predictor with baseline patterns."""
        # Time-of-day demand patterns (24 hours)
        # Higher values = higher expected demand
        self.hourly_demand_pattern = [
            0.2, 0.1, 0.1, 0.1, 0.2, 0.3,  # 00:00 - 05:00 (night)
            0.5, 0.7, 0.8, 0.7, 0.6, 0.7,  # 06:00 - 11:00 (morning)
            0.8, 0.7, 0.6, 0.7, 0.8, 0.9,  # 12:00 - 17:00 (afternoon)
            1.0, 0.95, 0.9, 0.8, 0.6, 0.4  # 18:00 - 23:00 (evening peak)
        ]
        
        # Mobility patterns by hour
        self.hourly_mobility_pattern = [
            0.1, 0.05, 0.05, 0.05, 0.1, 0.2,  # Night - low mobility
            0.5, 0.8, 0.7, 0.5, 0.4, 0.5,    # Morning commute
            0.6, 0.5, 0.5, 0.6, 0.8, 0.9,    # Afternoon -> evening commute
            0.7, 0.5, 0.4, 0.3, 0.2, 0.15    # Evening -> night
        ]
        
        # History for learning
        self.demand_history: List[Dict] = []
        self.prediction_accuracy: List[float] = []
        
        # Emergency baseline probability
        self.base_emergency_prob = 0.02  # 2% baseline
    
    def get_context(self, 
                    current_mobility: float = 0.0,
                    current_congestion: float = 0.0,
                    recent_emergency: bool = False) -> ContextSnapshot:
        """Build current context snapshot."""
        now = datetime.now()
        hour = now.hour
        is_weekend = now.weekday() >= 5
        
        # Peak hours: 7-9 AM and 5-9 PM on weekdays
        is_peak = not is_weekend and (7 <= hour <= 9 or 17 <= hour <= 21)
        
        return ContextSnapshot(
            current_hour=hour,
            is_peak_hour=is_peak,
            is_weekend=is_weekend,
            current_mobility_ratio=current_mobility,
            current_congestion=current_congestion,
            recent_emergency_activity=recent_emergency,
            weather_factor=1.0  # Could be enhanced with real weather data
        )
    
    def predict_demand(self,
                       current_mobility: float = 0.0,
                       current_congestion: float = 0.0,
                       recent_emergency: bool = False,
                       lookahead_minutes: int = 30) -> DemandForecast:
        """
        Predict broadcast demand for the near future.
        
        Args:
            current_mobility: Current mobile user ratio (0-1)
            current_congestion: Current network congestion (0-1)
            recent_emergency: Whether there's been recent emergency activity
            lookahead_minutes: How far ahead to predict
            
        Returns:
            DemandForecast with prediction and recommendations
        """
        context = self.get_context(current_mobility, current_congestion, recent_emergency)
        now = datetime.now()
        
        # Base demand from time pattern
        current_base = self.hourly_demand_pattern[context.current_hour]
        future_hour = (context.current_hour + lookahead_minutes // 60) % 24
        future_base = self.hourly_demand_pattern[future_hour]
        
        # Adjust for mobility
        mobility_factor = 1.0 + (current_mobility * 0.3)  # High mobility adds 30% demand
        
        # Adjust for congestion
        congestion_factor = 1.0 + (current_congestion * 0.4)  # Congestion indicates demand
        
        # Weekend adjustment
        weekend_factor = 0.7 if context.is_weekend else 1.0
        
        # Calculate predicted load
        predicted_load = min(100, (current_base * mobility_factor * 
                                    congestion_factor * weekend_factor * 100))
        
        # Determine demand level
        if predicted_load < 30:
            demand_level = DemandLevel.LOW
        elif predicted_load < 60:
            demand_level = DemandLevel.MODERATE
        elif predicted_load < 85:
            demand_level = DemandLevel.HIGH
        else:
            demand_level = DemandLevel.SURGE
        
        # Forecast peak timing
        peak_hour = self.hourly_demand_pattern.index(max(self.hourly_demand_pattern))
        hours_to_peak = (peak_hour - context.current_hour) % 24
        peak_minutes = hours_to_peak * 60
        
        # Mobility forecast
        current_mobility_pattern = self.hourly_mobility_pattern[context.current_hour]
        next_mobility_pattern = self.hourly_mobility_pattern[(context.current_hour + 1) % 24]
        if next_mobility_pattern > current_mobility_pattern + 0.1:
            mobility_forecast = "increasing"
        elif next_mobility_pattern < current_mobility_pattern - 0.1:
            mobility_forecast = "decreasing"
        else:
            mobility_forecast = "stable"
        
        # Emergency likelihood
        emergency_likelihood = self.base_emergency_prob
        if recent_emergency:
            emergency_likelihood += 0.15  # Elevated if recent activity
        if context.weather_factor > 1.2:
            emergency_likelihood += 0.1  # Bad weather increases risk
        emergency_likelihood = min(1.0, emergency_likelihood)
        
        # Recommended delivery mode
        if emergency_likelihood > 0.3:
            recommended_mode = "broadcast"  # Most reliable for emergencies
            reasoning = "Emergency likelihood elevated - broadcast mode ensures maximum reach"
        elif current_congestion > 0.7:
            recommended_mode = "broadcast"  # Offload congestion
            reasoning = "High cellular congestion - broadcast offloading recommended"
        elif current_mobility > 0.4:
            recommended_mode = "multicast"  # Good for mobile groups
            reasoning = "High mobility scenario - multicast suits moving user clusters"
        elif predicted_load < 40:
            recommended_mode = "unicast"  # Low demand, personalized
            reasoning = "Low demand period - unicast enables personalization"
        else:
            recommended_mode = "broadcast"
            reasoning = "Standard demand - broadcast provides best spectral efficiency"
        
        # Confidence based on prediction stability
        confidence = 0.7 + (len(self.demand_history) / 1000) * 0.2
        confidence = min(0.95, confidence)
        
        # Record for learning
        self.demand_history.append({
            "timestamp": now.isoformat(),
            "predicted_load": predicted_load,
            "context": context.dict()
        })
        if len(self.demand_history) > 500:
            self.demand_history.pop(0)
        
        return DemandForecast(
            timestamp=now,
            demand_level=demand_level,
            predicted_load_pct=predicted_load,
            peak_expected_in_minutes=peak_minutes,
            mobility_forecast=mobility_forecast,
            emergency_likelihood=emergency_likelihood,
            recommended_mode=recommended_mode,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def get_scheduling_hints(self,
                             current_intent: str = "balanced",
                             lookahead_hours: int = 2) -> List[SchedulingHint]:
        """
        Get proactive scheduling hints for broadcast planning.
        
        Returns actionable recommendations for pre-emptive slice preparation.
        """
        hints = []
        now = datetime.now()
        
        # Check upcoming demand changes
        for offset in range(0, lookahead_hours * 60, 15):  # Every 15 minutes
            future_hour = (now.hour + offset // 60) % 24
            current_demand = self.hourly_demand_pattern[now.hour]
            future_demand = self.hourly_demand_pattern[future_hour]
            
            # Detect significant demand increases
            if future_demand > current_demand * 1.3:
                time_window = f"in_{offset}_minutes"
                hints.append(SchedulingHint(
                    time_window=time_window,
                    recommended_action="prepare_high_capacity_slice",
                    priority=2,
                    reasoning=f"Demand expected to increase by {int((future_demand/current_demand - 1) * 100)}%",
                    confidence=0.75
                ))
                break  # Only report first significant change
        
        # Check mobility patterns
        current_mobility = self.hourly_mobility_pattern[now.hour]
        if current_mobility < 0.3:
            next_high_mobility = None
            for i in range(1, 6):
                if self.hourly_mobility_pattern[(now.hour + i) % 24] > 0.5:
                    next_high_mobility = i
                    break
            if next_high_mobility:
                hints.append(SchedulingHint(
                    time_window=f"in_{next_high_mobility * 60}_minutes",
                    recommended_action="prepare_mobility_robust_modcod",
                    priority=3,
                    reasoning="Mobility surge expected - prepare robust modulation",
                    confidence=0.7
                ))
        
        # Emergency preparedness hint
        peak_hours = [17, 18, 19, 20]  # Evening peak
        if now.hour in [h - 1 for h in peak_hours]:
            hints.append(SchedulingHint(
                time_window="next_hour",
                recommended_action="reserve_emergency_capacity",
                priority=1,
                reasoning="Approaching peak hours - ensure emergency slice has reserved capacity",
                confidence=0.85
            ))
        
        # Default hint if no specific recommendations
        if not hints:
            hints.append(SchedulingHint(
                time_window="current",
                recommended_action="maintain_current_configuration",
                priority=5,
                reasoning="No significant changes predicted - current configuration optimal",
                confidence=0.8
            ))
        
        return sorted(hints, key=lambda h: h.priority)
    
    def estimate_emergency_likelihood(self) -> Dict:
        """
        Estimate current emergency likelihood with explanation.
        """
        now = datetime.now()
        
        # Base factors
        base_prob = self.base_emergency_prob
        
        # Time-based adjustments
        # Slightly higher during evening (people home watching news)
        time_factor = 1.0
        if 17 <= now.hour <= 21:
            time_factor = 1.2
        
        # Weather would add more here in a real system
        weather_factor = 1.0
        
        # Calculate final probability
        final_prob = min(1.0, base_prob * time_factor * weather_factor)
        
        # Determine level
        if final_prob < 0.05:
            level = "minimal"
            action = "standard_monitoring"
        elif final_prob < 0.15:
            level = "low"
            action = "enhanced_monitoring"
        elif final_prob < 0.30:
            level = "elevated"
            action = "prepare_emergency_override"
        else:
            level = "high"
            action = "activate_emergency_protocols"
        
        return {
            "probability": final_prob,
            "level": level,
            "recommended_action": action,
            "factors": {
                "base_probability": base_prob,
                "time_factor": time_factor,
                "weather_factor": weather_factor
            },
            "timestamp": now.isoformat()
        }


# ============================================================================
# Global accessor
# ============================================================================

def get_demand_predictor() -> DemandPredictor:
    """Get the singleton demand predictor instance."""
    return DemandPredictor()


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/demand/current")
async def get_current_demand(
    mobility: float = 0.0,
    congestion: float = 0.0,
    recent_emergency: bool = False
):
    """
    Get current demand prediction.
    
    Returns AI-predicted demand level, recommended delivery mode,
    and reasoning for the recommendation.
    """
    predictor = get_demand_predictor()
    forecast = predictor.predict_demand(
        current_mobility=mobility,
        current_congestion=congestion,
        recent_emergency=recent_emergency
    )
    return forecast.dict()


@router.get("/demand/forecast")
async def get_demand_forecast(
    lookahead_minutes: int = 60,
    mobility: float = 0.0,
    congestion: float = 0.0
):
    """
    Get demand forecast for specified lookahead period.
    
    Useful for proactive slice preparation.
    """
    predictor = get_demand_predictor()
    forecast = predictor.predict_demand(
        current_mobility=mobility,
        current_congestion=congestion,
        lookahead_minutes=lookahead_minutes
    )
    return {
        "forecast": forecast.dict(),
        "lookahead_minutes": lookahead_minutes,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/demand/schedule-hints")
async def get_scheduling_hints(
    current_intent: str = "balanced",
    lookahead_hours: int = 2
):
    """
    Get proactive scheduling hints for broadcast planning.
    
    Returns actionable recommendations for pre-emptive slice preparation,
    sorted by priority.
    """
    predictor = get_demand_predictor()
    hints = predictor.get_scheduling_hints(
        current_intent=current_intent,
        lookahead_hours=lookahead_hours
    )
    return {
        "hints": [h.dict() for h in hints],
        "current_intent": current_intent,
        "lookahead_hours": lookahead_hours
    }


@router.get("/demand/emergency-likelihood")
async def get_emergency_likelihood():
    """
    Get current emergency likelihood estimate.
    
    Useful for proactive emergency preparedness.
    """
    predictor = get_demand_predictor()
    return predictor.estimate_emergency_likelihood()


@router.get("/demand/patterns")
async def get_demand_patterns():
    """
    Get learned demand patterns for visualization.
    
    Returns hourly demand and mobility patterns.
    """
    predictor = get_demand_predictor()
    return {
        "hourly_demand": predictor.hourly_demand_pattern,
        "hourly_mobility": predictor.hourly_mobility_pattern,
        "history_size": len(predictor.demand_history),
        "description": "24-hour demand/mobility patterns (index = hour)"
    }
