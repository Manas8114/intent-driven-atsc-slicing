"""
spatial_model.py - Pre-Deployment Validation Layer (Digital Twin)

This simulation provides RISK REDUCTION before real broadcast changes:

PURPOSE:
- Models UHF propagation across a 10km x 10km rural coverage grid
- Validates coverage metrics before actual deployment
- Enables "what-if" analysis without touching real infrastructure
- Provides feedback to the AI optimization loop

IMPORTANT NOTES:
- This is a SIMULATION for validation purposes
- Results inform configuration decisions but do NOT directly control hardware
- Coverage metrics are estimates based on simplified propagation models
- Real-world performance may vary due to terrain, multipath, and other factors

The simulation is part of the closed-loop control system:
    Intent → AI Engine → Spatial Validation (HERE) → Approval → (simulated) Deployment
"""

import numpy as np
from typing import List, Dict, Tuple
from .channel_model import received_power

class SpatialGrid:
    """
    Simulates a 10km x 10km area with distributed User Equipments (UEs).
    
    This is the "Digital Twin" component that validates proposed configurations
    before they would be deployed to real broadcast infrastructure.
    
    Used to calculate 'Coverage' as a spatial metric (percentage of area served)
    rather than a single point metric. Results are used by the AI engine to
    evaluate configuration quality and by engineers for approval decisions.
    """

    def __init__(self, size_km: float = 10.0, num_users: int = 100):
        self.size_km = size_km
        self.num_users = num_users
        # Generate random UE locations (x, y) relative to tower at (0,0)
        # Uniform distribution in the square
        self.ue_locations = np.random.uniform(-size_km/2, size_km/2, (num_users, 2))
        
        # Calculate distances once (static users for now)
        self.distances = np.linalg.norm(self.ue_locations, axis=1)
        # Avoid distance 0
        self.distances = np.maximum(self.distances, 0.1)

    def calculate_grid_metrics(self, tx_power_dbm: float, frequency_mhz: float, min_snr_db: float, 
                             noise_floor_dbm: float = -100.0, channel_impairment_db: float = 0.0) -> Dict[str, float]:
        """
        Calculate coverage statistics for the grid.
        
        Args:
            tx_power_dbm: Transmission power.
            frequency_mhz: Carrier frequency.
            min_snr_db: SNR threshold for successful reception.
            noise_floor_dbm: Thermal noise floor (default -100).
            channel_impairment_db: Additional loss (shadowing) to subtract from Rx power.
            
        Returns:
            Dict with 'coverage_percent', 'avg_snr_db', 'min_snr_db'
        """
        snr_values = []
        
        for d in self.distances:
            rx_pwr = received_power(tx_power_dbm, frequency_mhz, d)
            # Apple environmental impairment
            rx_pwr -= channel_impairment_db
            
            snr = rx_pwr - noise_floor_dbm
            snr_values.append(snr)
            
        snr_values = np.array(snr_values)
        
        # Coverage: Fraction of users with SNR >= min_snr_db
        covered_users = np.sum(snr_values >= min_snr_db)
        coverage_pct = (covered_users / self.num_users) * 100.0
        
        return {
            "coverage_percent": float(coverage_pct),
            "avg_snr_db": float(np.mean(snr_values)),
            "min_snr_db": float(np.min(snr_values)),
            "std_snr_db": float(np.std(snr_values))
        }

    def get_ue_statuses(self, tx_power_dbm: float, frequency_mhz: float, min_snr_db: float, 
                        noise_floor_dbm: float = -100.0, channel_impairment_db: float = 0.0) -> List[Dict]:
        """
        Get detailed status for each UE.
        """
        statuses = []
        for i, (loc, dist) in enumerate(zip(self.ue_locations, self.distances)):
            rx_pwr = received_power(tx_power_dbm, frequency_mhz, dist)
            rx_pwr -= channel_impairment_db
            snr = rx_pwr - noise_floor_dbm
            
            is_connected = snr >= min_snr_db
            
            # Simple video state simulation based on SNR
            video_state = "No Signal"
            if snr >= 25:
                video_state = "4K UHD"
            elif snr >= 15:
                video_state = "1080p HD"
            elif snr >= 10:
                video_state = "720p HD"
            elif snr >= min_snr_db:
                video_state = "SD Stream"
            
            statuses.append({
                "id": i,
                "x_km": float(loc[0]),
                "y_km": float(loc[1]),
                "distance_km": float(dist),
                "rx_power_dbm": float(rx_pwr),
                "snr_db": float(snr),
                "connected": bool(is_connected),
                "video_state": video_state
            })
        return statuses
