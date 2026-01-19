"""
real_broadcast_channel.py - Channel model using real FCC broadcast station data

This module integrates the parsed FCC data into the simulation's channel model,
allowing for propagation calculations based on REAL transmitter characteristics:
- Actual transmitter locations (from FCC license data)
- Real power levels (ERP in kW)
- Real antenna heights (HAAT)
- Actual operating frequencies

Usage:
    from sim.real_broadcast_channel import RealBroadcastChannel
    
    channel = RealBroadcastChannel()
    coverage = channel.calculate_coverage_at(lat=40.7128, lon=-74.0060)
"""

import sys
import os
import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data.broadcast_data_loader import BroadcastDataLoader, RealBroadcastStation, haversine_distance
from sim.channel_model import hata_path_loss, received_power


@dataclass
class CoverageResult:
    """Results from coverage analysis at a point."""
    latitude: float
    longitude: float
    strongest_station: Optional[RealBroadcastStation]
    received_power_dbm: float
    snr_db: float
    distance_km: float
    coverage_probability: float
    stations_in_range: int


class RealBroadcastChannel:
    """
    Channel model using real FCC broadcast station data.
    
    Combines:
    - Real transmitter locations, power, and antenna heights from FCC data
    - Hata path loss model for propagation
    - Coverage probability calculations
    """
    
    NOISE_FLOOR_DBM = -100.0  # Thermal noise floor
    COVERAGE_THRESHOLD_DB = 15.0  # Minimum SNR for reliable reception
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize with FCC broadcast data.
        
        Args:
            data_dir: Path to directory containing broadcast CSV files.
                      If None, uses default data directory.
        """
        self.loader = BroadcastDataLoader(data_dir)
        print(f"[RealBroadcastChannel] Initialized with {len(self.loader.stations)} stations")
    
    def get_stations_near(
        self, 
        lat: float, 
        lon: float, 
        radius_km: float = 100.0
    ) -> List[Tuple[RealBroadcastStation, float]]:
        """Get stations within radius of a point."""
        return self.loader.get_stations_near(lat, lon, radius_km)
    
    def calculate_received_power(
        self,
        station: RealBroadcastStation,
        receiver_lat: float,
        receiver_lon: float,
        receiver_height_m: float = 1.5
    ) -> Tuple[float, float]:
        """
        Calculate received power from a station at a receiver location.
        
        Returns:
            Tuple of (received_power_dbm, distance_km)
        """
        # Calculate distance
        distance_km = haversine_distance(
            station.latitude, station.longitude,
            receiver_lat, receiver_lon
        )
        
        # Avoid division by zero for very close receivers
        if distance_km < 0.1:
            distance_km = 0.1
        
        # Get transmitter parameters
        tx_power_dbm = station.erp_dbm  # Convert ERP kW to dBm
        frequency_mhz = station.frequency_mhz
        tx_height_m = max(station.haat_m, 10.0)  # Minimum 10m tower
        
        # Calculate received power using Hata model
        rx_power = received_power(
            tx_power_dbm,
            frequency_mhz,
            distance_km,
            tx_height_m,
            receiver_height_m
        )
        
        return (rx_power, distance_km)
    
    def calculate_snr(self, received_power_dbm: float) -> float:
        """Calculate Signal-to-Noise Ratio in dB."""
        return received_power_dbm - self.NOISE_FLOOR_DBM
    
    def calculate_coverage_probability(self, snr_db: float) -> float:
        """
        Calculate probability of reliable reception based on SNR.
        
        Uses a sigmoid function to model the transition from
        no coverage to full coverage.
        """
        # Sigmoid centered at threshold, with 5 dB transition width
        return 1.0 / (1.0 + np.exp(-(snr_db - self.COVERAGE_THRESHOLD_DB) / 3.0))
    
    def calculate_coverage_at(
        self, 
        lat: float, 
        lon: float,
        service_type: Optional[str] = None,
        max_radius_km: float = 150.0
    ) -> CoverageResult:
        """
        Calculate broadcast coverage at a specific location.
        
        Args:
            lat: Receiver latitude
            lon: Receiver longitude
            service_type: Optional filter for 'FM', 'AM', or 'TV'
            max_radius_km: Maximum search radius for stations
            
        Returns:
            CoverageResult with strongest station and coverage metrics
        """
        # Get nearby stations
        nearby = self.get_stations_near(lat, lon, max_radius_km)
        
        if service_type:
            nearby = [(s, d) for s, d in nearby if s.service_type == service_type]
        
        if not nearby:
            return CoverageResult(
                latitude=lat,
                longitude=lon,
                strongest_station=None,
                received_power_dbm=-120.0,
                snr_db=-20.0,
                distance_km=0.0,
                coverage_probability=0.0,
                stations_in_range=0
            )
        
        # Find strongest signal
        best_power = -200.0
        best_station = None
        best_distance = 0.0
        
        for station, dist in nearby:
            rx_power, _ = self.calculate_received_power(station, lat, lon)
            if rx_power > best_power:
                best_power = rx_power
                best_station = station
                best_distance = dist
        
        snr = self.calculate_snr(best_power)
        coverage_prob = self.calculate_coverage_probability(snr)
        
        return CoverageResult(
            latitude=lat,
            longitude=lon,
            strongest_station=best_station,
            received_power_dbm=best_power,
            snr_db=snr,
            distance_km=best_distance,
            coverage_probability=coverage_prob,
            stations_in_range=len(nearby)
        )
    
    def generate_coverage_grid(
        self,
        center_lat: float,
        center_lon: float,
        grid_size_km: float = 50.0,
        resolution_km: float = 2.0,
        service_type: Optional[str] = None
    ) -> Dict:
        """
        Generate a coverage grid for visualization.
        
        Args:
            center_lat: Center latitude of grid
            center_lon: Center longitude of grid
            grid_size_km: Size of grid (total width/height)
            resolution_km: Resolution of grid cells
            service_type: Optional filter for 'FM', 'AM', or 'TV'
            
        Returns:
            Dict with grid data for heatmap visualization
        """
        # Calculate grid dimensions
        half_size = grid_size_km / 2.0
        n_points = int(grid_size_km / resolution_km) + 1
        
        # Approximate conversion (at mid-latitudes)
        km_per_deg_lat = 111.0
        km_per_deg_lon = 111.0 * np.cos(np.radians(center_lat))
        
        lat_min = center_lat - half_size / km_per_deg_lat
        lat_max = center_lat + half_size / km_per_deg_lat
        lon_min = center_lon - half_size / km_per_deg_lon
        lon_max = center_lon + half_size / km_per_deg_lon
        
        lats = np.linspace(lat_min, lat_max, n_points)
        lons = np.linspace(lon_min, lon_max, n_points)
        
        # Calculate coverage at each point
        coverage_grid = np.zeros((n_points, n_points))
        power_grid = np.zeros((n_points, n_points))
        
        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                result = self.calculate_coverage_at(lat, lon, service_type)
                coverage_grid[i, j] = result.coverage_probability
                power_grid[i, j] = result.received_power_dbm
        
        return {
            "center": {"lat": center_lat, "lon": center_lon},
            "bounds": {
                "lat_min": lat_min,
                "lat_max": lat_max,
                "lon_min": lon_min,
                "lon_max": lon_max
            },
            "grid_size_km": grid_size_km,
            "resolution_km": resolution_km,
            "latitudes": lats.tolist(),
            "longitudes": lons.tolist(),
            "coverage": coverage_grid.tolist(),
            "power_dbm": power_grid.tolist(),
            "data_source": "FCC License Database",
            "is_real_data": True
        }
    
    def get_station_coverage_radius(
        self,
        station: RealBroadcastStation,
        target_snr_db: float = 15.0
    ) -> float:
        """
        Estimate the coverage radius of a station for a given SNR threshold.
        
        Uses binary search to find the distance at which SNR drops below threshold.
        """
        min_dist = 0.1
        max_dist = 200.0  # km
        
        # Binary search for coverage edge
        while max_dist - min_dist > 0.5:
            mid_dist = (min_dist + max_dist) / 2
            
            # Calculate at a point at mid_dist from station
            test_lat = station.latitude + (mid_dist / 111.0)  # Approximate
            rx_power, _ = self.calculate_received_power(station, test_lat, station.longitude)
            snr = self.calculate_snr(rx_power)
            
            if snr > target_snr_db:
                min_dist = mid_dist
            else:
                max_dist = mid_dist
        
        return (min_dist + max_dist) / 2
    
    def get_statistics(self) -> Dict:
        """Get statistics about the loaded broadcast data."""
        stats = self.loader.get_coverage_statistics()
        
        # Add channel model info
        stats["channel_model"] = "Hata Rural Path Loss"
        stats["noise_floor_dbm"] = self.NOISE_FLOOR_DBM
        stats["coverage_threshold_snr_db"] = self.COVERAGE_THRESHOLD_DB
        
        return stats


# Convenience function for quick coverage check
def get_broadcast_coverage(lat: float, lon: float, service_type: Optional[str] = None) -> Dict:
    """
    Quick coverage check at a location.
    
    Usage:
        from sim.real_broadcast_channel import get_broadcast_coverage
        result = get_broadcast_coverage(40.7128, -74.0060)
    """
    channel = RealBroadcastChannel()
    result = channel.calculate_coverage_at(lat, lon, service_type)
    
    return {
        "location": {"lat": lat, "lon": lon},
        "coverage_probability": result.coverage_probability,
        "snr_db": result.snr_db,
        "received_power_dbm": result.received_power_dbm,
        "stations_in_range": result.stations_in_range,
        "strongest_station": result.strongest_station.call_sign if result.strongest_station else None,
        "distance_to_station_km": result.distance_km,
        "data_source": "FCC License Database",
        "is_real_data": True
    }


if __name__ == "__main__":
    print("=" * 60)
    print("Real Broadcast Channel Model Demo")
    print("=" * 60)
    
    channel = RealBroadcastChannel()
    stats = channel.get_statistics()
    
    print(f"\nData Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Example: Coverage in NYC
    print(f"\n\nCoverage Analysis - New York City:")
    result = channel.calculate_coverage_at(40.7128, -74.0060)
    print(f"  Strongest station: {result.strongest_station.call_sign if result.strongest_station else 'None'}")
    print(f"  Received power: {result.received_power_dbm:.1f} dBm")
    print(f"  SNR: {result.snr_db:.1f} dB")
    print(f"  Coverage probability: {result.coverage_probability:.2%}")
    print(f"  Stations in range: {result.stations_in_range}")
    
    # Example: Coverage in rural area (Montana)
    print(f"\n\nCoverage Analysis - Rural Montana:")
    result = channel.calculate_coverage_at(47.0, -110.5)
    print(f"  Strongest station: {result.strongest_station.call_sign if result.strongest_station else 'None'}")
    print(f"  Received power: {result.received_power_dbm:.1f} dBm")
    print(f"  SNR: {result.snr_db:.1f} dB")
    print(f"  Coverage probability: {result.coverage_probability:.2%}")
    print(f"  Stations in range: {result.stations_in_range}")
    
    # FM-only coverage
    print(f"\n\nFM-Only Coverage - Los Angeles:")
    result = channel.calculate_coverage_at(34.0522, -118.2437, service_type='FM')
    print(f"  Strongest FM station: {result.strongest_station.call_sign if result.strongest_station else 'None'}")
    print(f"  Coverage probability: {result.coverage_probability:.2%}")
    print(f"  FM stations in range: {result.stations_in_range}")
