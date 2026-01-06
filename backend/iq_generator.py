"""
iq_generator.py - Simulated I/Q Sample Generation for Visualization

This module generates SIMPLIFIED I/Q samples for visualization purposes only.
It uses basic OFDM math to create representative signal patterns.

CRITICAL LIMITATIONS:
❌ NOT RF-accurate - simplified mathematical model only
❌ NOT suitable for actual transmission
❌ Does NOT include real ATSC 3.0 physical layer processing
❌ Does NOT generate compliant broadcast signals

✅ WHAT IT DOES:
- Creates constellation diagram visualizations
- Generates spectrum envelope displays
- Provides educational/demonstration I/Q patterns
- Enables UI visualization of signal characteristics

The I/Q samples here are for UI demonstration, not RF accuracy.
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


# ============================================================================
# Constants
# ============================================================================

# Simplified OFDM parameters (not production-accurate)
DEFAULT_FFT_SIZE = 1024
DEFAULT_NUM_SUBCARRIERS = 512
SAMPLE_RATE_HZ = 6_912_000  # ~6.912 MHz (ATSC 3.0 approximate)


class ConstellationType(str, Enum):
    """Constellation diagram types."""
    QPSK = "QPSK"
    QAM16 = "16QAM"
    QAM64 = "64QAM"
    QAM256 = "256QAM"


# ============================================================================
# Constellation Mapping
# ============================================================================

@dataclass
class ConstellationPoint:
    """A single point in the I/Q constellation."""
    i: float  # In-phase component
    q: float  # Quadrature component
    symbol_index: int = 0
    bits: str = ""


def get_constellation_map(modulation: ConstellationType) -> List[ConstellationPoint]:
    """
    Generate constellation map for given modulation.
    
    Returns list of ideal constellation points for visualization.
    These are normalized constellation diagrams, not calibrated RF values.
    """
    if modulation == ConstellationType.QPSK:
        # 4 points
        scale = 1.0 / np.sqrt(2)
        return [
            ConstellationPoint(i=scale, q=scale, symbol_index=0, bits="00"),
            ConstellationPoint(i=-scale, q=scale, symbol_index=1, bits="01"),
            ConstellationPoint(i=-scale, q=-scale, symbol_index=2, bits="11"),
            ConstellationPoint(i=scale, q=-scale, symbol_index=3, bits="10"),
        ]
    
    elif modulation == ConstellationType.QAM16:
        # 16 points (4x4 grid)
        points = []
        levels = [-3, -1, 1, 3]
        scale = 1.0 / np.sqrt(10)  # Normalization for average power = 1
        idx = 0
        for q in reversed(levels):
            for i in levels:
                points.append(ConstellationPoint(
                    i=i * scale,
                    q=q * scale,
                    symbol_index=idx,
                    bits=format(idx, '04b')
                ))
                idx += 1
        return points
    
    elif modulation == ConstellationType.QAM64:
        # 64 points (8x8 grid)
        points = []
        levels = [-7, -5, -3, -1, 1, 3, 5, 7]
        scale = 1.0 / np.sqrt(42)
        idx = 0
        for q in reversed(levels):
            for i in levels:
                points.append(ConstellationPoint(
                    i=i * scale,
                    q=q * scale,
                    symbol_index=idx,
                    bits=format(idx, '06b')
                ))
                idx += 1
        return points
    
    elif modulation == ConstellationType.QAM256:
        # 256 points (16x16 grid)
        points = []
        levels = list(range(-15, 16, 2))  # -15, -13, ..., 13, 15
        scale = 1.0 / np.sqrt(170)
        idx = 0
        for q in reversed(levels):
            for i in levels:
                points.append(ConstellationPoint(
                    i=i * scale,
                    q=q * scale,
                    symbol_index=idx,
                    bits=format(idx, '08b')
                ))
                idx += 1
        return points
    
    return []


# ============================================================================
# I/Q Sample Generation (Simulation Only)
# ============================================================================

def generate_iq_samples(
    config: Dict[str, Any],
    num_symbols: int = 128,
    add_noise: bool = True,
    snr_db: float = 20.0
) -> np.ndarray:
    """
    Generate simulated I/Q samples for visualization.
    
    Args:
        config: Configuration from AI engine (contains modulation, etc.)
        num_symbols: Number of OFDM symbols to generate
        add_noise: Whether to add AWGN noise
        snr_db: Signal-to-noise ratio in dB
        
    Returns:
        Complex numpy array of I/Q samples
        
    WARNING: These are SIMULATED samples for visualization only.
    They are NOT RF-accurate and NOT suitable for transmission.
    """
    modulation = config.get("modulation", "QPSK")
    
    try:
        mod_type = ConstellationType(modulation)
    except ValueError:
        mod_type = ConstellationType.QPSK
    
    # Get constellation points
    constellation = get_constellation_map(mod_type)
    num_points = len(constellation)
    
    # Number of subcarriers per symbol
    num_subcarriers = DEFAULT_NUM_SUBCARRIERS
    
    # Generate random symbol indices
    np.random.seed(42)  # Repeatable for demo
    symbol_indices = np.random.randint(0, num_points, size=(num_symbols, num_subcarriers))
    
    # Map to I/Q
    freq_domain = np.zeros((num_symbols, DEFAULT_FFT_SIZE), dtype=complex)
    
    for sym_idx in range(num_symbols):
        for sc_idx in range(num_subcarriers):
            pt = constellation[symbol_indices[sym_idx, sc_idx]]
            # Center the used subcarriers
            fft_idx = (DEFAULT_FFT_SIZE // 2 - num_subcarriers // 2) + sc_idx
            freq_domain[sym_idx, fft_idx] = complex(pt.i, pt.q)
    
    # Apply IFFT to get time domain (simplified OFDM)
    time_domain = np.fft.ifft(freq_domain, axis=1) * np.sqrt(DEFAULT_FFT_SIZE)
    
    # Flatten to continuous I/Q stream
    iq_samples = time_domain.flatten()
    
    # Add noise if requested
    if add_noise:
        signal_power = np.mean(np.abs(iq_samples) ** 2)
        noise_power = signal_power / (10 ** (snr_db / 10))
        noise = np.sqrt(noise_power / 2) * (np.random.randn(len(iq_samples)) + 1j * np.random.randn(len(iq_samples)))
        iq_samples = iq_samples + noise
    
    return iq_samples


def generate_constellation_points(
    config: Dict[str, Any],
    num_samples: int = 500,
    snr_db: float = 25.0
) -> List[Dict[str, float]]:
    """
    Generate constellation diagram points for UI visualization.
    
    Args:
        config: Configuration with modulation type
        num_samples: Number of points to generate
        snr_db: SNR for noise simulation
        
    Returns:
        List of {i, q} points for plotting
        
    These points represent received symbols with simulated noise,
    suitable for constellation diagram display.
    """
    modulation = config.get("modulation", "QPSK")
    
    try:
        mod_type = ConstellationType(modulation)
    except ValueError:
        mod_type = ConstellationType.QPSK
    
    constellation = get_constellation_map(mod_type)
    num_points = len(constellation)
    
    # Random symbol selection
    np.random.seed(None)  # Random for each call
    indices = np.random.randint(0, num_points, size=num_samples)
    
    # Add noise based on SNR
    noise_std = 10 ** (-snr_db / 20) * 0.5  # Simplified noise model
    
    points = []
    for idx in indices:
        pt = constellation[idx]
        noisy_i = pt.i + np.random.randn() * noise_std
        noisy_q = pt.q + np.random.randn() * noise_std
        points.append({
            "i": round(float(noisy_i), 4),
            "q": round(float(noisy_q), 4),
            "ideal_i": round(pt.i, 4),
            "ideal_q": round(pt.q, 4)
        })
    
    return points


def generate_spectrum_envelope(
    config: Dict[str, Any],
    num_points: int = 256
) -> Dict[str, Any]:
    """
    Generate spectrum envelope data for visualization.
    
    Args:
        config: Configuration with bandwidth settings
        num_points: Number of frequency bins
        
    Returns:
        Dict with frequency and magnitude arrays
        
    This generates a representative spectrum shape, not accurate PSD.
    """
    bandwidth_mhz = config.get("bandwidth_mhz", 6.0)
    center_freq = 0  # Baseband representation
    
    # Create frequency axis
    freq_mhz = np.linspace(-bandwidth_mhz/2, bandwidth_mhz/2, num_points)
    
    # Generate simplified spectrum envelope
    # OFDM spectrum is approximately rectangular with some roll-off
    
    # Main lobe (flat top)
    in_band = np.abs(freq_mhz) < (bandwidth_mhz / 2) * 0.9
    magnitude = np.zeros(num_points)
    magnitude[in_band] = 0  # 0 dB reference
    
    # Roll-off edges
    edge_region = (np.abs(freq_mhz) >= (bandwidth_mhz / 2) * 0.9) & (np.abs(freq_mhz) < bandwidth_mhz / 2)
    magnitude[edge_region] = -5 - 20 * (np.abs(freq_mhz[edge_region]) - (bandwidth_mhz / 2) * 0.9) / ((bandwidth_mhz / 2) * 0.1)
    
    # Out of band (strong attenuation)
    out_band = np.abs(freq_mhz) >= bandwidth_mhz / 2
    magnitude[out_band] = -60  # Strong attenuation
    
    # Add some noise for realism
    magnitude += np.random.randn(num_points) * 0.5
    
    return {
        "frequency_mhz": freq_mhz.tolist(),
        "magnitude_db": magnitude.tolist(),
        "bandwidth_mhz": bandwidth_mhz,
        "note": "Simulated spectrum envelope for visualization only"
    }


# ============================================================================
# API-Ready Functions
# ============================================================================

def get_visualization_data(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get all visualization data for frontend display.
    
    Combines constellation, spectrum, and signal quality metrics.
    """
    snr = 25.0  # Default good SNR for visualization
    
    return {
        "constellation": generate_constellation_points(config, num_samples=200, snr_db=snr),
        "spectrum": generate_spectrum_envelope(config),
        "config_summary": {
            "modulation": config.get("modulation", "QPSK"),
            "bandwidth_mhz": config.get("bandwidth_mhz", 6.0),
            "power_dbm": config.get("power_dbm", 35),
        },
        "disclaimer": "SIMULATED visualization data. Not RF-accurate."
    }
