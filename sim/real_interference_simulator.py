"""
real_interference_simulator.py - Realistic interference simulation using FCC data

Uses real broadcast station data to model:
- Co-channel interference (same frequency)
- Adjacent-channel interference (nearby frequencies)
- Aggregate interference from multiple sources
- Protection ratio analysis
"""

import sys
import os
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data.broadcast_data_loader import BroadcastDataLoader, RealBroadcastStation, haversine_distance
from sim.channel_model import received_power


@dataclass
class InterferenceSource:
    """Details of a single interfering station."""
    station: RealBroadcastStation
    distance_km: float
    received_power_dbm: float
    frequency_offset_mhz: float
    interference_type: str  # co-channel, adjacent, second-adjacent
    interference_power_dbm: float  # Power after selectivity rejection


@dataclass 
class InterferenceAnalysis:
    """Complete interference analysis at a location."""
    location_lat: float
    location_lon: float
    target_frequency_mhz: float
    channel_width_mhz: float
    
    # Primary signal
    desired_station: Optional[RealBroadcastStation]
    desired_power_dbm: float
    
    # Interference
    total_interference_dbm: float
    noise_floor_dbm: float
    
    # Quality metrics
    sinr_db: float  # Signal-to-Interference-plus-Noise Ratio
    carrier_to_interference_db: float  # C/I ratio
    coverage_probability: float
    
    # Source breakdown
    co_channel_sources: List[InterferenceSource]
    adjacent_channel_sources: List[InterferenceSource]


class RealInterferenceSimulator:
    """
    Interference simulator using real FCC broadcast data.
    
    Models co-channel and adjacent-channel interference based on:
    - Actual transmitter locations and powers
    - Standard protection ratios
    - Receiver selectivity models
    """
    
    # Protection ratios (dB) - based on ATSC 3.0 and FM standards
    PROTECTION_RATIOS = {
        'co-channel': 20.0,      # C/I required for same frequency
        'first-adjacent': 10.0,  # C/I for ±200 kHz (FM) or ±6 MHz (TV)
        'second-adjacent': 0.0,  # Minimal protection needed
    }
    
    # Receiver selectivity (rejection in dB for off-tune signals)
    SELECTIVITY = {
        'co-channel': 0.0,       # No rejection
        'first-adjacent': 25.0,  # 25 dB rejection for adjacent channel
        'second-adjacent': 50.0, # 50 dB rejection
    }
    
    NOISE_FLOOR_DBM = -100.0
    
    def __init__(self, data_dir: Optional[str] = None):
        """Initialize with FCC broadcast data."""
        self.loader = BroadcastDataLoader(data_dir)
        print(f"[RealInterferenceSimulator] Initialized with {len(self.loader.stations)} stations")
    
    def classify_interference(
        self, 
        target_freq: float, 
        interferer_freq: float,
        channel_width: float = 0.2  # MHz (FM default)
    ) -> str:
        """Classify the type of interference based on frequency separation."""
        freq_diff = abs(target_freq - interferer_freq)
        
        if freq_diff < channel_width * 0.1:
            return 'co-channel'
        elif freq_diff < channel_width * 1.5:
            return 'first-adjacent'
        elif freq_diff < channel_width * 3.0:
            return 'second-adjacent'
        else:
            return 'negligible'
    
    def calculate_interference_power(
        self,
        station: RealBroadcastStation,
        receiver_lat: float,
        receiver_lon: float,
        receiver_height_m: float = 1.5
    ) -> Tuple[float, float]:
        """
        Calculate received power from an interfering station.
        
        Returns:
            Tuple of (received_power_dbm, distance_km)
        """
        distance_km = haversine_distance(
            station.latitude, station.longitude,
            receiver_lat, receiver_lon
        )
        
        if distance_km < 0.1:
            distance_km = 0.1
        
        tx_power_dbm = station.erp_dbm
        frequency_mhz = station.frequency_mhz
        tx_height_m = max(station.haat_m, 10.0)
        
        rx_power = received_power(
            tx_power_dbm,
            frequency_mhz,
            distance_km,
            tx_height_m,
            receiver_height_m
        )
        
        return (rx_power, distance_km)
    
    def analyze_interference(
        self,
        receiver_lat: float,
        receiver_lon: float,
        target_frequency_mhz: float,
        channel_width_mhz: float = 0.2,
        service_type: Optional[str] = None,
        max_radius_km: float = 200.0
    ) -> InterferenceAnalysis:
        """
        Comprehensive interference analysis at a location.
        
        Args:
            receiver_lat: Receiver latitude
            receiver_lon: Receiver longitude
            target_frequency_mhz: Desired signal frequency
            channel_width_mhz: Channel bandwidth (0.2 for FM, 6.0 for TV)
            service_type: Optional filter for 'FM', 'AM', or 'TV'
            max_radius_km: Maximum search radius for interferers
            
        Returns:
            Complete interference analysis
        """
        # Get potentially interfering stations
        search_range = channel_width_mhz * 3  # Look ±3 channel widths
        min_freq = target_frequency_mhz - search_range
        max_freq = target_frequency_mhz + search_range
        
        all_stations = self.loader.get_stations_by_frequency_range(min_freq, max_freq)
        
        if service_type:
            all_stations = [s for s in all_stations if s.service_type == service_type.upper()]
        
        # Find desired signal (closest station on target frequency)
        desired_station = None
        desired_power = -200.0
        
        co_channel_sources = []
        adjacent_sources = []
        
        for station in all_stations:
            rx_power, distance = self.calculate_interference_power(
                station, receiver_lat, receiver_lon
            )
            
            if distance > max_radius_km:
                continue
            
            freq_offset = station.frequency_mhz - target_frequency_mhz
            interf_type = self.classify_interference(
                target_frequency_mhz, 
                station.frequency_mhz,
                channel_width_mhz
            )
            
            if interf_type == 'negligible':
                continue
            
            # Apply selectivity rejection
            selectivity = self.SELECTIVITY.get(interf_type, 0.0)
            interference_power = rx_power - selectivity
            
            source = InterferenceSource(
                station=station,
                distance_km=distance,
                received_power_dbm=rx_power,
                frequency_offset_mhz=freq_offset,
                interference_type=interf_type,
                interference_power_dbm=interference_power
            )
            
            # For co-channel: closest station with strong signal is desired
            if interf_type == 'co-channel':
                if rx_power > desired_power:
                    # This could be our desired station OR strongest interferer
                    if desired_station is not None:
                        # Move old desired to interferers
                        old_source = InterferenceSource(
                            station=desired_station,
                            distance_km=0,  # Will be recalculated
                            received_power_dbm=desired_power,
                            frequency_offset_mhz=0,
                            interference_type='co-channel',
                            interference_power_dbm=desired_power
                        )
                        co_channel_sources.append(old_source)
                    
                    desired_station = station
                    desired_power = rx_power
                else:
                    co_channel_sources.append(source)
            else:
                adjacent_sources.append(source)
        
        # Calculate aggregate interference
        all_interference = co_channel_sources + adjacent_sources
        
        if all_interference:
            # Sum interference powers (linear)
            interf_powers_linear = [10**(s.interference_power_dbm / 10) for s in all_interference]
            total_interf_linear = sum(interf_powers_linear)
            total_interf_dbm = 10 * np.log10(total_interf_linear) if total_interf_linear > 0 else -200
        else:
            total_interf_dbm = -200.0
        
        # Calculate SINR
        noise_linear = 10**(self.NOISE_FLOOR_DBM / 10)
        interf_plus_noise_linear = 10**(total_interf_dbm / 10) + noise_linear
        interf_plus_noise_dbm = 10 * np.log10(interf_plus_noise_linear)
        
        sinr_db = desired_power - interf_plus_noise_dbm if desired_power > -150 else -50
        
        # Carrier-to-Interference ratio
        ci_db = desired_power - total_interf_dbm if total_interf_dbm > -150 else 100
        
        # Coverage probability based on SINR
        coverage_prob = 1.0 / (1.0 + np.exp(-(sinr_db - 15.0) / 3.0))
        
        return InterferenceAnalysis(
            location_lat=receiver_lat,
            location_lon=receiver_lon,
            target_frequency_mhz=target_frequency_mhz,
            channel_width_mhz=channel_width_mhz,
            desired_station=desired_station,
            desired_power_dbm=round(desired_power, 1),
            total_interference_dbm=round(total_interf_dbm, 1),
            noise_floor_dbm=self.NOISE_FLOOR_DBM,
            sinr_db=round(sinr_db, 1),
            carrier_to_interference_db=round(ci_db, 1),
            coverage_probability=round(coverage_prob, 4),
            co_channel_sources=co_channel_sources,
            adjacent_channel_sources=adjacent_sources
        )
    
    def find_interference_free_frequencies(
        self,
        receiver_lat: float,
        receiver_lon: float,
        freq_min: float,
        freq_max: float,
        channel_width: float = 0.2,
        service_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Find frequencies with minimal interference at a location.
        
        Returns list of candidate frequencies sorted by interference level.
        """
        candidates = []
        
        # Sample frequencies across the range
        num_samples = int((freq_max - freq_min) / channel_width)
        
        for i in range(num_samples):
            freq = freq_min + (i * channel_width) + (channel_width / 2)
            
            analysis = self.analyze_interference(
                receiver_lat, receiver_lon,
                freq, channel_width, service_type
            )
            
            candidates.append({
                'frequency_mhz': round(freq, 1),
                'sinr_db': analysis.sinr_db,
                'total_interference_dbm': analysis.total_interference_dbm,
                'co_channel_count': len(analysis.co_channel_sources),
                'adjacent_count': len(analysis.adjacent_channel_sources),
                'coverage_probability': analysis.coverage_probability
            })
        
        # Sort by SINR (higher is better)
        candidates.sort(key=lambda x: -x['sinr_db'])
        
        return candidates
    
    def get_interference_map(
        self,
        center_lat: float,
        center_lon: float,
        target_frequency_mhz: float,
        grid_size_km: float = 50.0,
        resolution_km: float = 5.0,
        channel_width: float = 0.2
    ) -> Dict:
        """
        Generate interference map for visualization.
        """
        half_size = grid_size_km / 2.0
        n_points = int(grid_size_km / resolution_km) + 1
        
        km_per_deg_lat = 111.0
        km_per_deg_lon = 111.0 * np.cos(np.radians(center_lat))
        
        lat_min = center_lat - half_size / km_per_deg_lat
        lat_max = center_lat + half_size / km_per_deg_lat
        lon_min = center_lon - half_size / km_per_deg_lon
        lon_max = center_lon + half_size / km_per_deg_lon
        
        lats = np.linspace(lat_min, lat_max, n_points)
        lons = np.linspace(lon_min, lon_max, n_points)
        
        sinr_grid = np.zeros((n_points, n_points))
        ci_grid = np.zeros((n_points, n_points))
        
        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                analysis = self.analyze_interference(
                    lat, lon, target_frequency_mhz, channel_width
                )
                sinr_grid[i, j] = analysis.sinr_db
                ci_grid[i, j] = analysis.carrier_to_interference_db
        
        return {
            "center": {"lat": center_lat, "lon": center_lon},
            "target_frequency_mhz": target_frequency_mhz,
            "bounds": {
                "lat_min": lat_min, "lat_max": lat_max,
                "lon_min": lon_min, "lon_max": lon_max
            },
            "latitudes": lats.tolist(),
            "longitudes": lons.tolist(),
            "sinr_db": sinr_grid.tolist(),
            "ci_db": ci_grid.tolist(),
            "data_source": "FCC License Database",
            "is_real_data": True
        }


if __name__ == "__main__":
    print("=" * 60)
    print("Real Interference Simulator Demo")
    print("=" * 60)
    
    sim = RealInterferenceSimulator()
    
    # Analyze interference in NYC area for a specific FM frequency
    print("\n\nInterference Analysis - NYC @ 97.1 MHz (WQHT)")
    analysis = sim.analyze_interference(
        receiver_lat=40.7128,
        receiver_lon=-74.0060,
        target_frequency_mhz=97.1,
        channel_width_mhz=0.2,
        service_type='FM'
    )
    
    print(f"  Target frequency: {analysis.target_frequency_mhz} MHz")
    print(f"  Desired station: {analysis.desired_station.call_sign if analysis.desired_station else 'None'}")
    print(f"  Desired power: {analysis.desired_power_dbm} dBm")
    print(f"  Total interference: {analysis.total_interference_dbm} dBm")
    print(f"  SINR: {analysis.sinr_db} dB")
    print(f"  C/I ratio: {analysis.carrier_to_interference_db} dB")
    print(f"  Coverage probability: {analysis.coverage_probability:.2%}")
    print(f"  Co-channel interferers: {len(analysis.co_channel_sources)}")
    print(f"  Adjacent interferers: {len(analysis.adjacent_channel_sources)}")
    
    # Find interference-free frequencies
    print("\n\nFinding low-interference frequencies in NYC (FM band):")
    candidates = sim.find_interference_free_frequencies(
        receiver_lat=40.7128,
        receiver_lon=-74.0060,
        freq_min=88.0,
        freq_max=108.0,
        channel_width=0.2,
        service_type='FM'
    )
    
    print("  Top 5 lowest interference frequencies:")
    for c in candidates[:5]:
        print(f"    {c['frequency_mhz']} MHz - SINR: {c['sinr_db']:.1f} dB, Interferers: {c['co_channel_count'] + c['adjacent_count']}")
