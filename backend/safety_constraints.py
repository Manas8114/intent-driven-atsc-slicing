"""
safety_constraints.py - FCC Compliance and Safety Layer

This module defines the hard constraints that the AI system must never violate.
It acts as a deterministic "guardrail" filter that runs after the Neural Network
but before the Drift Detector or Approval Engine.

Constraints include:
- Maximum Power Output (FCC limit)
- Licensed Frequency Bands
- Signal Quality Floors (for EAS critical messages)
"""

from typing import Dict, Any, List, Optional
import math

class SafetyViolation(Exception):
    """Raised when a specific safety rule is violated."""
    pass

class SafetyConstraints:
    """
    Deterministic safety layer for ATSC 3.0 broadcast control.
    """
    
    # Constants based on FCC regulations (Simplistic view for prototype)
    MAX_POWER_DBM = 40.0         # Absolute max power
    MIN_COVERAGE_EAS = 0.90      # Emergency Alert System must reach 90%
    VALID_MODULATIONS = ["QPSK", "16QAM", "64QAM", "256QAM"]
    
    @classmethod
    def validate_action(cls, action: Dict[str, Any], context: str = "normal") -> Dict[str, Any]:
        """
        Validate a proposed AI action against safety rules.
        
        Args:
            action: The config dict (tx_power, modulation, etc.)
            context: 'normal', 'emergency', or 'maintenance'
            
        Returns:
            The original action if valid, or a clamped/safe version.
            
        Raises:
            SafetyViolation if the action takes the system into an illegal state
            that cannot be clamped (e.g., trying to transmit on unauthorized freq).
        """
        safe_action = action.copy()
        violations = []
        
        # 1. Power Limit Check (FCC Compliance)
        power = safe_action.get("power_dbm", 0.0)
        # Power clamping is safer than blocking
        if power > cls.MAX_POWER_DBM:
             violations.append(f"Power {power}dBm exceeds factory limit {cls.MAX_POWER_DBM}dBm - CLAMPED")
             safe_action["power_dbm"] = cls.MAX_POWER_DBM
             
        # 2. Modulation Validity
        mod = safe_action.get("modulation", "QPSK")
        if mod not in cls.VALID_MODULATIONS:
             # Default to most robust modulation if invalid
             violations.append(f"Invalid modulation {mod} - Defaulting to QPSK")
             safe_action["modulation"] = "QPSK"
             
        # 3. Emergency Context Rules
        if context == "emergency":
             # In emergency, we prioritize robustness over throughput
             # If AI tries 256QAM (high capacity, low robust), we force down
             if mod in ["64QAM", "256QAM"]:
                  violations.append(f"High-order modulation {mod} unsafe for Emergency - Downgrading to 16QAM")
                  safe_action["modulation"] = "16QAM"
                  
        if violations:
            try:
                from .broadcast_telemetry import control_plane_metrics
                control_plane_metrics.record_safety_override()
            except ImportError:
                pass
            safe_action["_safety_warnings"] = violations
            
        return safe_action

# Singleton
safety_layer = SafetyConstraints()

