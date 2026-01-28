
import pytest
from unittest.mock import MagicMock
from ai_engine import generate_narrative_explanation

class MockEnvState:
    def __init__(self, is_emergency=False, hurdle=None, load=1.0):
        self.is_emergency_active = is_emergency
        self.active_hurdle = hurdle
        self.traffic_load_level = load

class MockDeliveryDecision:
    def __init__(self, mode="broadcast", reasoning="default"):
        self.mode = mode
        self.reasoning = reasoning

def test_generate_narrative_monsoon():
    env = MockEnvState(hurdle="monsoon")
    action = {"modulation": "QPSK", "power_dbm": 40}
    metrics = {"coverage_percent": 95.0}
    decision = MockDeliveryDecision()
    
    explanation = generate_narrative_explanation(
        intent="mitigate_monsoon",
        env_state=env,
        action=action,
        metrics=metrics,
        delivery_decision=decision
    )
    
    assert "ciptation" in explanation or "precipitation" in explanation
    assert "QPSK" in explanation
    assert "95.0%" in explanation

def test_generate_narrative_emergency():
    env = MockEnvState(is_emergency=True)
    action = {"modulation": "QPSK", "power_dbm": 42}
    metrics = {"coverage_percent": 99.9}
    decision = MockDeliveryDecision(mode="broadcast", reasoning="alert reliability")
    
    explanation = generate_narrative_explanation(
        intent="ensure_emergency_reliability",
        env_state=env,
        action=action,
        metrics=metrics,
        delivery_decision=decision
    )
    
    assert "EMERGENCY" in explanation
    assert "BROADCAST" in explanation
