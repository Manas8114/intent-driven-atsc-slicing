import math
from typing import Dict

# Import simulation helpers
from sim.channel_model import received_power
from sim.plp_success import plp_success_probability
from sim.emergency_scenarios import compute_alert_reliability, generate_emergency_alerts
from .atsc_adapter import configure_plp, explain_action

# Constants for simulation
FREQUENCY_MHZ = 600.0  # Typical UHF channel for ATSC 3.0
DISTANCE_KM = 10.0     # Representative rural distance
NOISE_FLOOR_DBM = -100.0  # Assumed thermal noise floor

def evaluate_action(action: Dict[str, any]) -> Dict[str, float]:
    """Evaluate a proposed ATSC configuration action using the digital‑twin.

    The function estimates the following KPIs:
    * coverage – probability that a UE receives the PLP correctly (based on SNR & PLP success model)
    * alert_reliability – probability that an emergency alert is delivered (using repeated transmissions)
    * latency – fixed nominal latency for broadcast (simplified)
    * spectral_efficiency – bits/s/Hz derived from modulation & coding rate

    Args:
        action: Dictionary containing at least the keys ``plp``, ``modulation``, ``coding_rate``,
                ``power_dbm``, ``bandwidth_mhz``, and ``priority`` as produced by the AI engine.

    Returns:
        A dict with KPI names and float values.
    """
    # 1. Compute received power and SNR for the given PLP configuration
    tx_power = action.get("power_dbm", 30.0)
    rx_power = received_power(tx_power, FREQUENCY_MHZ, DISTANCE_KM)
    snr_db = rx_power - NOISE_FLOOR_DBM

    # 2. Estimate coverage probability using PLP success model
    coverage = plp_success_probability(action, snr_db)

    # 3. Emergency alert reliability – assume alerts are transmitted on the same PLP
    alerts = generate_emergency_alerts(duration_seconds=60, interval_seconds=0.5)
    # Use the same success probability as per‑packet success for each alert transmission
    alert_reliability = compute_alert_reliability(coverage, alerts)

    # 4. Latency – simplified constant (could be refined with scheduling model)
    latency_ms = 50.0

    # 5. Spectral efficiency – modulation bits per symbol * coding rate
    modulation_bits = {
        "QPSK": 2,
        "16QAM": 4,
        "64QAM": 6,
        "256QAM": 8,
    }.get(action.get("modulation"), 2)
    coding_rate = {
        "1/2": 0.5,
        "2/3": 2/3,
        "3/4": 0.75,
        "5/6": 5/6,
        "7/8": 7/8,
    }.get(action.get("coding_rate"), 0.5)
    spectral_efficiency = modulation_bits * coding_rate

    return {
        "coverage": coverage,
        "alert_reliability": alert_reliability,
        "latency_ms": latency_ms,
        "spectral_efficiency": spectral_efficiency,
    }

# Example usage for quick sanity check (executed when run as script)
if __name__ == "__main__":
    sample_action = configure_plp(
        plp_id=0,
        modulation="QPSK",
        coding_rate="1/2",
        power_dbm=30,
        bandwidth_mhz=6,
        priority="high",
    )
    kpis = evaluate_action(sample_action)
    print("Evaluated KPIs:")
    for k, v in kpis.items():
        print(f"  {k}: {v:.4f}")
    print("Explanation:", explain_action(sample_action))
