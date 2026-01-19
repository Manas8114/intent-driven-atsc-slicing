"""
broadcast_data_loader.py - Load Real FCC Broadcast Data for Simulation

This module integrates REAL FCC broadcast station data into the simulation,
replacing synthetic data with actual:
- Transmitter locations
- Power levels (ERP)
- Antenna heights (HAAT)
- Frequencies

This adds REALISM to the simulation by anchoring it to actual
broadcast infrastructure.

Usage:
    from data.broadcast_data_loader import BroadcastDataLoader
    
    loader = BroadcastDataLoader()
    stations = loader.get_stations_near(lat=40.7128, lon=-74.0060, radius_km=50)
"""

import csv
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import math


@dataclass
class RealBroadcastStation:
    """Real FCC-licensed broadcast station."""
    call_sign: str
    frequency_mhz: float
    service_type: str  # FM, AM, TV
    city: str
    state: str
    erp_kw: float  # Effective Radiated Power
    haat_m: float  # Height Above Average Terrain
    latitude: float
    longitude: float
    licensee: str
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "call_sign": self.call_sign,
            "frequency_mhz": self.frequency_mhz,
            "service_type": self.service_type,
            "city": self.city,
            "state": self.state,
            "erp_kw": self.erp_kw,
            "erp_dbm": self.erp_dbm,
            "haat_m": self.haat_m,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "licensee": self.licensee
        }
    
    @property
    def erp_dbm(self) -> float:
        """Convert ERP from kW to dBm for simulation."""
        if self.erp_kw <= 0:
            return 30.0  # Default 1W
        # kW to W, then to dBm: 10 * log10(P_watts * 1000)
        return 10 * math.log10(self.erp_kw * 1000 * 1000)  # kW to mW
    
    @property
    def erp_dbw(self) -> float:
        """Convert ERP from kW to dBW."""
        if self.erp_kw <= 0:
            return 0.0
        return 10 * math.log10(self.erp_kw * 1000)  # kW to W


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points in kilometers.
    Uses Haversine formula for spherical Earth approximation.
    """
    R = 6371.0  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


class BroadcastDataLoader:
    """
    Loads and queries REAL FCC broadcast station data.
    
    This replaces synthetic simulation data with actual licensed
    transmitter information.
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize loader.
        
        Args:
            data_dir: Path to data directory containing broadcast_stations_fm.csv
        """
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            # Default to same directory as this file
            self.data_dir = Path(__file__).parent
        
        self.stations: List[RealBroadcastStation] = []
        self._load_data()
    
    def _load_data(self):
        """Load broadcast station data from CSV files."""
        # Load FM stations (full dataset)
        fm_file = self.data_dir / 'broadcast_stations_fm.csv'
        if fm_file.exists():
            fm_count = self._load_fm_csv(fm_file)
            print(f"[BroadcastDataLoader] Loaded {fm_count} FM stations")
        
        # Load AM stations
        am_file = self.data_dir / 'broadcast_stations_am.csv'
        if am_file.exists():
            am_count = self._load_am_csv(am_file)
            print(f"[BroadcastDataLoader] Loaded {am_count} AM stations")
        
        # Load TV stations
        tv_file = self.data_dir / 'broadcast_stations_tv.csv'
        if tv_file.exists():
            tv_count = self._load_tv_csv(tv_file)
            print(f"[BroadcastDataLoader] Loaded {tv_count} TV stations")
        
        print(f"[BroadcastDataLoader] Total: {len(self.stations)} stations loaded")
    
    def _load_fm_csv(self, filepath: Path) -> int:
        """Load FM stations from CSV file."""
        count = 0
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    station = RealBroadcastStation(
                        call_sign=row['call_sign'],
                        frequency_mhz=float(row['frequency_mhz']),
                        service_type=row.get('service_type', 'FM'),
                        city=row.get('city', 'UNKNOWN'),
                        state=row.get('state', 'XX'),
                        erp_kw=float(row.get('erp_kw', 0)),
                        haat_m=float(row.get('haat_m', 30)),
                        latitude=float(row['latitude']),
                        longitude=float(row['longitude']),
                        licensee=row.get('licensee', 'UNKNOWN')
                    )
                    if station.latitude != 0.0 and station.longitude != 0.0:
                        self.stations.append(station)
                        count += 1
                except (ValueError, KeyError):
                    continue
        return count
    
    def _load_am_csv(self, filepath: Path) -> int:
        """Load AM stations from CSV file."""
        count = 0
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # AM frequencies are in kHz, convert to MHz for consistency
                    freq_khz = float(row.get('frequency_khz', 0))
                    freq_mhz = freq_khz / 1000.0  # Convert kHz to MHz
                    
                    station = RealBroadcastStation(
                        call_sign=row['call_sign'],
                        frequency_mhz=freq_mhz,
                        service_type='AM',
                        city=row.get('city', 'UNKNOWN'),
                        state=row.get('state', 'XX'),
                        erp_kw=float(row.get('power_kw', 0)),
                        haat_m=100.0,  # AM typically uses tall towers
                        latitude=float(row['latitude']),
                        longitude=float(row['longitude']),
                        licensee=row.get('licensee', 'UNKNOWN')
                    )
                    if station.latitude != 0.0 and station.longitude != 0.0:
                        self.stations.append(station)
                        count += 1
                except (ValueError, KeyError):
                    continue
        return count
    
    def _load_tv_csv(self, filepath: Path) -> int:
        """Load TV stations from CSV file."""
        count = 0
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # TV uses channel numbers, approximate frequency
                    channel = int(row.get('channel', 0))
                    # UHF channels 14-36 are 470-608 MHz
                    # VHF channels 2-13 are 54-216 MHz (with gaps)
                    if channel >= 14:
                        freq_mhz = 470 + (channel - 14) * 6.0
                    elif channel >= 7:
                        freq_mhz = 174 + (channel - 7) * 6.0
                    elif channel >= 2:
                        freq_mhz = 54 + (channel - 2) * 6.0
                    else:
                        freq_mhz = 600.0  # Default to UHF
                    
                    # Support both power_kw and erp_kw field names
                    power = float(row.get('erp_kw', row.get('power_kw', 0)))
                    haat = float(row.get('haat_m', 300.0))
                    
                    station = RealBroadcastStation(
                        call_sign=row['call_sign'],
                        frequency_mhz=freq_mhz,
                        service_type=row.get('service_type', 'TV'),
                        city=row.get('city', 'UNKNOWN'),
                        state=row.get('state', 'XX'),
                        erp_kw=power,
                        haat_m=haat if haat > 0 else 300.0,  # Default to 300m for TV
                        latitude=float(row['latitude']),
                        longitude=float(row['longitude']),
                        licensee=row.get('licensee', 'UNKNOWN')
                    )
                    if station.latitude != 0.0 and station.longitude != 0.0:
                        self.stations.append(station)
                        count += 1
                except (ValueError, KeyError):
                    continue
        return count
    
    def _load_csv(self, filepath: Path):
        """Legacy method - load FM stations from CSV file."""
        self._load_fm_csv(filepath)
    
    def get_all_stations(self) -> List[RealBroadcastStation]:
        """Return all loaded stations."""
        return self.stations
    
    def get_stations_near(
        self, 
        lat: float, 
        lon: float, 
        radius_km: float = 50.0
    ) -> List[Tuple[RealBroadcastStation, float]]:
        """
        Get stations within radius of a point.
        
        Args:
            lat: Center latitude
            lon: Center longitude
            radius_km: Search radius in kilometers
            
        Returns:
            List of (station, distance_km) tuples, sorted by distance
        """
        results = []
        
        for station in self.stations:
            dist = haversine_distance(lat, lon, station.latitude, station.longitude)
            if dist <= radius_km:
                results.append((station, dist))
        
        # Sort by distance
        results.sort(key=lambda x: x[1])
        return results
    
    def get_stations_by_state(self, state: str) -> List[RealBroadcastStation]:
        """Get all stations in a state."""
        return [s for s in self.stations if s.state.upper() == state.upper()]
    
    def get_stations_by_frequency_range(
        self, 
        min_mhz: float, 
        max_mhz: float
    ) -> List[RealBroadcastStation]:
        """Get stations within a frequency range."""
        return [s for s in self.stations if min_mhz <= s.frequency_mhz <= max_mhz]
    
    def get_high_power_stations(self, min_erp_kw: float = 50.0) -> List[RealBroadcastStation]:
        """Get high-power stations (typically regional coverage)."""
        return [s for s in self.stations if s.erp_kw >= min_erp_kw]
    
    def get_station_for_simulation(
        self, 
        lat: float, 
        lon: float
    ) -> Optional[RealBroadcastStation]:
        """
        Get the most suitable station for simulation at a location.
        
        Prioritizes:
        1. Proximity
        2. Power level (higher = better coverage data)
        
        Returns:
            Best matching station or None
        """
        nearby = self.get_stations_near(lat, lon, radius_km=100)
        
        if not nearby:
            return None
        
        # Score by proximity and power
        scored = []
        for station, dist in nearby:
            # Proximity score (closer = better)
            prox_score = 1.0 / (dist + 1)
            # Power score (higher = better)
            power_score = math.log10(station.erp_kw + 1) if station.erp_kw > 0 else 0
            # Combined score
            score = prox_score * 0.7 + power_score * 0.3
            scored.append((station, score))
        
        scored.sort(key=lambda x: -x[1])
        return scored[0][0] if scored else None
    
    def to_simulation_config(
        self, 
        stations: List[RealBroadcastStation]
    ) -> List[Dict]:
        """
        Convert stations to simulation configuration format.
        
        Compatible with the broadcast simulation's transmitter config.
        """
        return [
            {
                "id": f"fcc_{s.call_sign}",
                "call_sign": s.call_sign,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "power_dbm": s.erp_dbm,
                "power_kw": s.erp_kw,
                "antenna_height_m": max(s.haat_m, 30.0),  # Minimum 30m
                "frequency_mhz": s.frequency_mhz,
                "service_type": s.service_type,
                "source": "FCC_LICENSE_DATA",
                "is_real_data": True
            }
            for s in stations
        ]
    
    def get_coverage_statistics(self) -> Dict:
        """Get statistics about loaded broadcast data."""
        if not self.stations:
            return {"error": "No stations loaded"}
        
        states = {}
        total_power = 0.0
        max_power = 0.0
        
        for s in self.stations:
            states[s.state] = states.get(s.state, 0) + 1
            total_power += s.erp_kw
            max_power = max(max_power, s.erp_kw)
        
        return {
            "total_stations": len(self.stations),
            "states_covered": len(states),
            "average_erp_kw": round(total_power / len(self.stations), 2),
            "max_erp_kw": max_power,
            "data_source": "FCC License Database",
            "is_real_data": True,
            "disclaimer": "This data is derived from FCC public records and represents actual licensed broadcast stations."
        }


# Convenience function for quick access
def get_nearby_transmitters(lat: float, lon: float, radius_km: float = 50.0) -> List[Dict]:
    """
    Quick access to nearby real transmitter data.
    
    Usage:
        from data.broadcast_data_loader import get_nearby_transmitters
        transmitters = get_nearby_transmitters(40.7128, -74.0060)
    """
    loader = BroadcastDataLoader()
    nearby = loader.get_stations_near(lat, lon, radius_km)
    stations = [station for station, _ in nearby]
    return loader.to_simulation_config(stations)


if __name__ == "__main__":
    # Demo usage
    print("=" * 60)
    print("Broadcast Data Loader Demo")
    print("=" * 60)
    
    loader = BroadcastDataLoader()
    stats = loader.get_coverage_statistics()
    
    print(f"\nData Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    # Example: Find stations near New York City
    print(f"\n\nStations near New York City (50km radius):")
    nyc_stations = loader.get_stations_near(40.7128, -74.0060, 50)
    for station, dist in nyc_stations[:10]:
        print(f"  {station.call_sign}: {station.frequency_mhz} MHz, {station.erp_kw} kW, {dist:.1f} km")
    
    print(f"\n  ... and {len(nyc_stations) - 10} more stations")
    
    # Example: High power stations
    print(f"\n\nHigh Power Stations (>100 kW):")
    high_power = loader.get_high_power_stations(100.0)
    for s in high_power[:10]:
        print(f"  {s.call_sign} ({s.city}, {s.state}): {s.erp_kw} kW")
    
    print(f"\n  Total high-power stations: {len(high_power)}")
