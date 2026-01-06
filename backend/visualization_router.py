"""
visualization_router.py - API Endpoints for Signal Visualization

Provides endpoints for constellation diagrams, spectrum displays,
and baseband frame visualization data.

All data is SIMULATED for visualization purposes only.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

from .iq_generator import (
    generate_constellation_points,
    generate_spectrum_envelope,
    get_visualization_data
)
from .baseband_interface import baseband_interface
from .simulation_state import get_simulation_state

router = APIRouter()


class VisualizationRequest(BaseModel):
    """Request for visualization data."""
    modulation: Optional[str] = None
    snr_db: Optional[float] = 25.0
    num_points: Optional[int] = 200


@router.get("/constellation")
async def get_constellation(modulation: str = "QPSK", snr_db: float = 25.0, num_points: int = 200):
    """
    Get constellation diagram points.
    
    Args:
        modulation: QPSK, 16QAM, 64QAM, or 256QAM
        snr_db: SNR for noise simulation
        num_points: Number of points to generate
        
    Returns:
        List of I/Q points for plotting
        
    NOTE: Simulated data for visualization only.
    """
    config = {"modulation": modulation}
    points = generate_constellation_points(config, num_samples=num_points, snr_db=snr_db)
    
    return {
        "modulation": modulation,
        "snr_db": snr_db,
        "num_points": len(points),
        "points": points,
        "note": "Simulated constellation for visualization"
    }


@router.get("/spectrum")
async def get_spectrum(bandwidth_mhz: float = 6.0, num_bins: int = 256):
    """
    Get spectrum envelope data.
    
    Args:
        bandwidth_mhz: Signal bandwidth
        num_bins: Number of frequency bins
        
    Returns:
        Frequency and magnitude arrays for spectrum plot
    """
    config = {"bandwidth_mhz": bandwidth_mhz}
    spectrum = generate_spectrum_envelope(config, num_points=num_bins)
    
    return spectrum


@router.get("/baseband-frame")
async def get_baseband_frame(include_fec: bool = False):
    """
    Get symbolic baseband frame structure.
    
    Returns encoder-ready configuration format.
    This is NOT actual baseband data.
    """
    # Get current config from simulation state
    sim_state = get_simulation_state()
    config = sim_state.last_action or {
        "modulation": "QPSK",
        "coding_rate": "5/15",
        "power_dbm": 35,
        "bandwidth_mhz": 6,
        "all_slices": []
    }
    
    frame = baseband_interface.generate_baseband_frame(config, include_fec_detail=include_fec)
    
    return frame.to_encoder_format()


@router.get("/current")
async def get_current_visualization():
    """
    Get all visualization data for current configuration.
    
    Returns constellation, spectrum, and config summary.
    """
    sim_state = get_simulation_state()
    config = sim_state.last_action or {
        "modulation": "QPSK",
        "coding_rate": "5/15",
        "power_dbm": 35,
        "bandwidth_mhz": 6
    }
    
    return get_visualization_data(config)


@router.post("/validate")
async def validate_config(config: Dict[str, Any]):
    """
    Validate configuration against ATSC A/322 constraints.
    """
    result = baseband_interface.validate_configuration(config)
    return result


@router.get("/capabilities")
async def get_visualization_capabilities():
    """
    Get information about visualization capabilities and limitations.
    """
    return {
        "capabilities": {
            "constellation_diagram": {
                "enabled": True,
                "modulations": ["QPSK", "16QAM", "64QAM", "256QAM"],
                "description": "I/Q constellation visualization with simulated noise"
            },
            "spectrum_envelope": {
                "enabled": True,
                "description": "Approximate spectrum shape for display"
            },
            "baseband_frame": {
                "enabled": True,
                "description": "Symbolic frame structure, encoder-ready format"
            }
        },
        "limitations": {
            "rf_accuracy": False,
            "description": "All visualization data is SIMULATED. Not suitable for RF accuracy testing.",
            "note": "Visualization is for educational/demonstration purposes only."
        }
    }
