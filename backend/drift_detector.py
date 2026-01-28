"""
drift_detector.py - Sim-to-Real Drift Detection and Safety Freeze System

This module implements the "Epistemic Humility" layer of the AI system.
It continuously compares the Digital Twin's latent state predictions against 
measured ground truth (from the Receiver/Physics engine).

If the error residuals exceed a safety threshold, it triggers a "DRIFT_DETECTED"
state which freezes the AI control loop, preventing the agent from optimizing
based on a hallucinated reality.
"""

from dataclasses import dataclass, field
from collections import deque
import numpy as np
import time
from typing import Dict, List, Optional, Tuple, Any

@dataclass
class DriftMetrics:
    """Snapshot of current drift status."""
    coverage_error: float
    snr_residual: float
    reward_drift: float
    is_drifting: bool
    confidence: float
    timestamp: float = field(default_factory=time.time)

class DriftDetector:
    """
    Detects when the simulation model diverges from reality.
    
    Uses CUSUM-like logic on rolling windows of prediction errors.
    """
    
    def __init__(self, window_size: int = 50, drift_threshold: float = 0.3):
        self.window_size = window_size
        self.threshold = drift_threshold
        
        # Rolling error windows
        self.coverage_errors: deque = deque(maxlen=window_size)
        self.snr_errors: deque = deque(maxlen=window_size)
        self.reward_errors: deque = deque(maxlen=window_size)
        
        # Baselines (calibrated from normal operation)
        self.baseline_coverage_error = 0.05  # 5% acceptable error
        self.baseline_snr_error = 2.0        # 2dB acceptable error
        self.baseline_reward_error = 0.1     # 0.1 reward unit drift
        
        # Artificial drift injection (for Demo purposes only)
        self._artificial_drift_offset = 0.0
    
    def inject_drift(self, magnitude: float = 1.0):
        """
        FOR DEMO ONLY: Artificially inject drift to demonstrate safety freeze.
        
        Args:
            magnitude: 0.0 (off) to 1.0 (max drift)
        """
        self._artificial_drift_offset = magnitude
        
    def reset(self):
        """Reset drift history."""
        self.coverage_errors.clear()
        self.snr_errors.clear()
        self.reward_errors.clear()
        self._artificial_drift_offset = 0.0

    def update(self, predicted: Dict[str, float], actual: Dict[str, float]):
        """
        Update detector with new prediction vs actual pair.
        
        Args:
            predicted: {'coverage': 0.9, 'avg_snr': 22.0, 'reward': 0.8}
            actual:    {'coverage': 0.85, 'avg_snr': 20.0, 'reward': 0.75}
        """
        # Calculate residuals
        c_err = abs(predicted.get("coverage", 0) - actual.get("coverage", 0))
        s_err = abs(predicted.get("avg_snr", 0) - actual.get("avg_snr", 0))
        r_err = abs(predicted.get("reward", 0) - actual.get("reward", 0))
        
        # Apply artificial drift (Demo Feature)
        # We bias the error upwards if drift is injected
        if self._artificial_drift_offset > 0:
            c_err += self._artificial_drift_offset * 0.2  # +20% coverage error
            s_err += self._artificial_drift_offset * 5.0  # +5dB SNR error
            r_err += self._artificial_drift_offset * 0.3  # +0.3 reward error
            
        self.coverage_errors.append(c_err)
        self.snr_errors.append(s_err)
        self.reward_errors.append(r_err)
        
    def detect_drift(self) -> DriftMetrics:
        """
        Check for drift based on recent history.
        
        Returns:
            DriftMetrics object
        """
        # Need minimum samples to be confident
        if len(self.coverage_errors) < 5:
            return DriftMetrics(0.0, 0.0, 0.0, False, 0.0)
            
        # Get recent averages (last 10 samples or all if <10)
        window = 10
        rec_cov = list(self.coverage_errors)[-window:]
        rec_snr = list(self.snr_errors)[-window:]
        rec_rew = list(self.reward_errors)[-window:]
        
        avg_cov_err = np.mean(rec_cov)
        avg_snr_err = np.mean(rec_snr)
        avg_rew_err = np.mean(rec_rew)
        
        # Calculate drift scores (normalized against baselines)
        # Score > 1.0 means we exceeded the baseline significantly
        
        # Coverage drift: >10% absolute diff is bad
        cov_score = (avg_cov_err - self.baseline_coverage_error) / 0.1 
        
        # SNR drift: >4dB absolute diff is bad
        snr_score = (avg_snr_err - self.baseline_snr_error) / 4.0
        
        # Reward drift: >0.2 diff is bad
        rew_score = (avg_rew_err - self.baseline_reward_error) / 0.2
        
        # Composite score
        raw_score = max(cov_score, snr_score, rew_score)
        
        # Map raw score to confidence (0-1)
        # If raw_score > threshold, we are strictly drifting
        is_drifting = raw_score > self.threshold
        
        # Confidence is probability that drift is real
        # Sigmoid-like mapping
        confidence = min(1.0, max(0.0, raw_score / (self.threshold * 2)))
        
        return DriftMetrics(
            coverage_error=float(avg_cov_err),
            snr_residual=float(avg_snr_err),
            reward_drift=float(avg_rew_err),
            is_drifting=is_drifting,
            confidence=confidence
        )
        
    def get_status(self) -> Dict[str, Any]:
        """Get status dict for API/Dashboard."""
        metrics = self.detect_drift()
        
        if metrics.is_drifting:
            status = "DRIFT_DETECTED"
            action = "AI_FROZEN"
            msg = f"Model drift detected (Conf: {metrics.confidence:.0%}). Human review required."
        else:
            status = "NOMINAL"
            action = "AI_ACTIVE"
            msg = "Simulation tracking reality within tolerances."
            
        return {
            "status": status,
            "action_taken": action,
            "message": msg,
            "metrics": {
                "coverage_error": round(metrics.coverage_error, 3),
                "snr_residual_db": round(metrics.snr_residual, 2),
                "reward_drift": round(metrics.reward_drift, 3),
                "confidence": round(metrics.confidence, 2)
            },
            "is_artificial_injection": self._artificial_drift_offset > 0
        }

# Singleton instance
drift_detector = DriftDetector()
