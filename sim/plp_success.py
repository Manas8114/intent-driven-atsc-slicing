from typing import Dict
import math

# Mapping of modulation to spectral efficiency (bits/s/Hz) for typical coding rates.
# This is a simplified lookup; real values depend on coding rate and channel conditions.
MODULATION_EFFICIENCY = {
    "QPSK": 2.0,
    "16QAM": 4.0,
    "64QAM": 6.0,
    "256QAM": 8.0,
}

# Simplified mapping of coding rate strings to numeric values.
CODING_RATE_VALUES = {
    "1/2": 0.5,
    "2/3": 0.6667,
    "3/4": 0.75,
    "5/6": 0.8333,
    "7/8": 0.875,
}

def plp_success_probability(plp_config: Dict[str, any], snr_db: float) -> float:
    """Estimate the success probability for a given PLP configuration.

    Args:
        plp_config: Dictionary containing at least ``modulation`` and ``coding_rate``.
        snr_db: Signal‑to‑noise ratio in dB at the receiver for this PLP.

    Returns:
        Probability (0.0‑1.0) that a packet is correctly received.
    """
    modulation = plp_config.get("modulation")
    coding_rate = plp_config.get("coding_rate")
    if modulation not in MODULATION_EFFICIENCY or coding_rate not in CODING_RATE_VALUES:
        raise ValueError("Unsupported modulation or coding rate")

    # Simplified model: required SNR threshold = base + margin based on modulation order.
    # These thresholds are illustrative; real values come from ATSC spec tables.
    base_threshold = 5.0  # dB for QPSK 1/2
    modulation_factor = {
        "QPSK": 0.0,
        "16QAM": 4.0,
        "64QAM": 8.0,
        "256QAM": 12.0,
    }[modulation]
    coding_margin = (1.0 - CODING_RATE_VALUES[coding_rate]) * 3.0
    required_snr = base_threshold + modulation_factor + coding_margin

    # Logistic function to map SNR gap to probability.
    gap = snr_db - required_snr
    prob = 1 / (1 + math.exp(-gap))
    # Clamp to [0,1]
    return max(0.0, min(1.0, prob))
