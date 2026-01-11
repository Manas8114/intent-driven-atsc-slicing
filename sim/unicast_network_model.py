"""
unicast_network_model.py - Cellular/Unicast Network Congestion Simulator

This module simulates cellular network congestion to enable AI-driven
traffic offloading decisions from unicast (cellular) to broadcast (ATSC 3.0).

PURPOSE:
- Models unicast network load and congestion levels
- Simulates time-of-day traffic patterns (peak hours)
- Handles emergency surge scenarios
- Provides metrics for AI offloading decisions

IMPORTANT:
- This is a SIMULATION for decision-making purposes
- Does not interface with real cellular infrastructure
- Congestion levels inform AI optimization, not actual network control
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Tuple
from datetime import datetime


@dataclass
class UnicastMetrics:
    """Metrics describing current unicast network state."""
    congestion_level: float  # [0.0 - 1.0] where 1.0 = severe congestion
    estimated_latency_ms: float  # Estimated packet latency
    packet_loss_probability: float  # Probability of packet loss
    active_users: int  # Number of active unicast users
    bandwidth_utilization: float  # [0.0 - 1.0] bandwidth usage
    

class UnicastNetworkModel:
    """
    Simulates cellular/unicast network conditions for traffic offloading decisions.
    
    The model considers:
    - Time-of-day traffic patterns
    - Emergency event surges
    - Mobility-induced load (handovers)
    - Random fluctuations
    
    Used by the AI engine to decide when to offload traffic to broadcast.
    """
    
    def __init__(
        self,
        base_load: float = 0.3,
        capacity_users: int = 1000,
        peak_hours: Tuple[int, int] = (17, 21),  # 5 PM - 9 PM
    ):
        """
        Initialize the unicast network model.
        
        Args:
            base_load: Baseline network load [0.0 - 1.0]
            capacity_users: Maximum users the network can handle efficiently
            peak_hours: Tuple of (start_hour, end_hour) for peak traffic
        """
        self.base_load = base_load
        self.capacity_users = capacity_users
        self.peak_hours = peak_hours
        
        # State variables
        self.current_users = int(capacity_users * base_load)
        self.emergency_active = False
        self.mobility_surge = False
        self.external_congestion_factor = 0.0
        
    def set_emergency_mode(self, active: bool):
        """Enable/disable emergency surge mode."""
        self.emergency_active = active
        
    def set_mobility_surge(self, active: bool):
        """Enable/disable mobility-induced surge (e.g., rush hour, events)."""
        self.mobility_surge = active
        
    def set_external_congestion(self, factor: float):
        """
        Set external congestion factor for hurdle simulation.
        
        Args:
            factor: Additional congestion [0.0 - 1.0]
        """
        self.external_congestion_factor = np.clip(factor, 0.0, 1.0)
        
    def _get_time_of_day_factor(self, hour: int = None) -> float:
        """
        Calculate traffic multiplier based on time of day.
        
        Peak hours (typically evening) have higher load.
        """
        if hour is None:
            hour = datetime.now().hour
            
        start, end = self.peak_hours
        
        if start <= hour < end:
            # Peak hours: gradual ramp up to peak at middle of window
            mid = (start + end) / 2
            distance_from_peak = abs(hour - mid)
            max_distance = (end - start) / 2
            return 1.0 + 0.5 * (1 - distance_from_peak / max_distance)
        elif 6 <= hour < 9:
            # Morning commute
            return 1.2
        elif 0 <= hour < 6:
            # Night hours: low traffic
            return 0.5
        else:
            # Regular daytime
            return 1.0
            
    def calculate_congestion(
        self,
        current_hour: int = None,
        mobile_user_ratio: float = 0.0,
    ) -> UnicastMetrics:
        """
        Calculate current unicast network congestion and related metrics.
        
        Args:
            current_hour: Hour of day (0-23), uses system time if None
            mobile_user_ratio: Ratio of mobile users [0.0 - 1.0]
            
        Returns:
            UnicastMetrics with congestion data
        """
        # Base load with time-of-day adjustment
        time_factor = self._get_time_of_day_factor(current_hour)
        load = self.base_load * time_factor
        
        # Emergency surge: sudden spike in demand
        if self.emergency_active:
            load += 0.4  # 40% surge during emergencies
            
        # Mobility surge: high handover rate increases load
        if self.mobility_surge:
            load += 0.2
            
        # Mobile users contribute to handover overhead
        handover_overhead = mobile_user_ratio * 0.15
        load += handover_overhead
        
        # External congestion (from hurdle controls)
        load += self.external_congestion_factor
        
        # Add realistic random fluctuation
        noise = np.random.normal(0, 0.05)
        load += noise
        
        # Clamp to valid range
        congestion_level = np.clip(load, 0.0, 1.0)
        
        # Calculate derived metrics
        # Latency increases exponentially with congestion (queuing theory)
        base_latency = 20.0  # ms at no congestion
        estimated_latency = base_latency * (1 + np.exp(3 * (congestion_level - 0.5)))
        estimated_latency = min(estimated_latency, 2000.0)  # Cap at 2 seconds
        
        # Packet loss follows similar pattern
        if congestion_level < 0.5:
            packet_loss = congestion_level * 0.02  # Low loss at low congestion
        else:
            # Exponential increase above 50% congestion
            packet_loss = 0.01 + 0.2 * (congestion_level - 0.5) ** 2
        packet_loss = min(packet_loss, 0.3)  # Cap at 30%
        
        # Active users estimation
        active_users = int(self.capacity_users * congestion_level)
        
        return UnicastMetrics(
            congestion_level=round(congestion_level, 3),
            estimated_latency_ms=round(estimated_latency, 1),
            packet_loss_probability=round(packet_loss, 4),
            active_users=active_users,
            bandwidth_utilization=round(congestion_level * 0.95, 3),
        )
        
    def recommend_offload_ratio(self, metrics: UnicastMetrics) -> float:
        """
        Recommend how much traffic should be offloaded to broadcast.
        
        This is a heuristic baseline; the RL agent will learn optimal policy.
        
        Args:
            metrics: Current unicast network metrics
            
        Returns:
            Recommended offload ratio [0.0 - 1.0]
        """
        congestion = metrics.congestion_level
        
        if congestion < 0.3:
            # Low congestion: no offload needed
            return 0.0
        elif congestion < 0.5:
            # Moderate: gradual offload
            return (congestion - 0.3) * 2.5  # 0 to 0.5
        elif congestion < 0.7:
            # High: aggressive offload
            return 0.5 + (congestion - 0.5) * 2.0  # 0.5 to 0.9
        else:
            # Critical: maximum offload
            return 0.9 + (congestion - 0.7) * 0.33  # 0.9 to 1.0
            
    def get_offload_benefit(
        self,
        current_metrics: UnicastMetrics,
        offload_ratio: float,
    ) -> Dict[str, float]:
        """
        Calculate the benefit of offloading traffic to broadcast.
        
        Args:
            current_metrics: Current network state
            offload_ratio: Proposed offload ratio [0.0 - 1.0]
            
        Returns:
            Dict with projected improvements
        """
        # Offloading reduces effective load
        effective_congestion = current_metrics.congestion_level * (1 - offload_ratio * 0.7)
        effective_congestion = max(0.1, effective_congestion)  # Minimum baseline
        
        # Calculate improvements
        latency_improvement = (
            current_metrics.estimated_latency_ms - 
            20.0 * (1 + np.exp(3 * (effective_congestion - 0.5)))
        )
        
        loss_improvement = current_metrics.packet_loss_probability - (
            effective_congestion * 0.02 if effective_congestion < 0.5 
            else 0.01 + 0.2 * (effective_congestion - 0.5) ** 2
        )
        
        return {
            "projected_congestion": round(effective_congestion, 3),
            "latency_reduction_ms": round(max(0, latency_improvement), 1),
            "packet_loss_reduction": round(max(0, loss_improvement), 4),
            "users_offloaded": int(current_metrics.active_users * offload_ratio),
        }


# Singleton instance for global access
_unicast_model_instance = None

def get_unicast_model() -> UnicastNetworkModel:
    """Get the global UnicastNetworkModel instance."""
    global _unicast_model_instance
    if _unicast_model_instance is None:
        _unicast_model_instance = UnicastNetworkModel()
    return _unicast_model_instance


# Quick test when run directly
if __name__ == "__main__":
    model = UnicastNetworkModel()
    
    print("=== Unicast Network Congestion Simulator ===\n")
    
    # Normal conditions
    metrics = model.calculate_congestion()
    print(f"Normal conditions:")
    print(f"  Congestion: {metrics.congestion_level:.1%}")
    print(f"  Latency: {metrics.estimated_latency_ms:.0f}ms")
    print(f"  Packet Loss: {metrics.packet_loss_probability:.2%}")
    print(f"  Recommended Offload: {model.recommend_offload_ratio(metrics):.1%}\n")
    
    # Emergency mode
    model.set_emergency_mode(True)
    metrics_emerg = model.calculate_congestion()
    print(f"Emergency mode:")
    print(f"  Congestion: {metrics_emerg.congestion_level:.1%}")
    print(f"  Latency: {metrics_emerg.estimated_latency_ms:.0f}ms")
    print(f"  Recommended Offload: {model.recommend_offload_ratio(metrics_emerg):.1%}\n")
    
    # Peak hours with mobility
    model.set_emergency_mode(False)
    model.set_mobility_surge(True)
    metrics_peak = model.calculate_congestion(current_hour=18, mobile_user_ratio=0.4)
    print(f"Peak hours + mobility surge:")
    print(f"  Congestion: {metrics_peak.congestion_level:.1%}")
    print(f"  Latency: {metrics_peak.estimated_latency_ms:.0f}ms")
    print(f"  Recommended Offload: {model.recommend_offload_ratio(metrics_peak):.1%}")
    
    # Offload benefit
    benefit = model.get_offload_benefit(metrics_peak, offload_ratio=0.6)
    print(f"  With 60% offload: {benefit}")
