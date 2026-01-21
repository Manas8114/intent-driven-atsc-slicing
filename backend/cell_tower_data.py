"""
cell_tower_data.py - Real-World Cell Tower Data Integration

Integrates OpenCellID cell tower dataset with the Digital Twin simulation
to provide realistic cellular interference patterns for ATSC 3.0 broadcasting.

Features:
- Efficient loading of large CSV datasets with filtering
- Geographic region selection by MCC (Mobile Country Code)
- Interferer proximity analysis for broadcast tower locations
- Integration with SpatialGrid for interference modeling

Data Source:
- OpenCellID database (https://opencellid.org)
- Format: radio,mcc,net,area,cell,unit,lon,lat,range,samples,changeable,created,updated,averageSignal

Author: AI-Native Broadcast Intelligence Platform
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Iterator
from pathlib import Path
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# MCC (Mobile Country Code) lookup for common countries
MCC_COUNTRY_MAP = {
    202: "Greece",
    208: "France", 
    214: "Spain",
    234: "United Kingdom",
    238: "Denmark",
    242: "Norway",
    262: "Germany",
    270: "Luxembourg",
    310: "United States",
    404: "India",
    405: "India",
    460: "China",
    440: "Japan",
    450: "South Korea"
}


@dataclass
class CellTower:
    """Represents a single cell tower."""
    radio: str          # GSM, LTE, UMTS, CDMA, NR
    mcc: int            # Mobile Country Code
    net: int            # Mobile Network Code
    area: int           # Location Area Code
    cell: int           # Cell ID
    lon: float          # Longitude
    lat: float          # Latitude
    range_m: int        # Estimated range in meters
    samples: int        # Number of measurements
    average_signal: int # Average signal strength (dBm)
    
    @property
    def range_km(self) -> float:
        """Range in kilometers."""
        return self.range_m / 1000.0
    
    def distance_to(self, lat: float, lon: float) -> float:
        """
        Calculate approximate distance to another point (km).
        Uses Haversine formula for accuracy.
        """
        R = 6371  # Earth's radius in km
        lat1, lon1 = np.radians(self.lat), np.radians(self.lon)
        lat2, lon2 = np.radians(lat), np.radians(lon)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return R * c


@dataclass
class CellTowerDataset:
    """
    Manager for large-scale cell tower datasets.
    
    Optimized for the 5M+ row OpenCellID database with lazy loading
    and geographic filtering capabilities.
    """
    data_path: Path
    _df: Optional[pd.DataFrame] = field(default=None, repr=False)
    _loaded_mcc: Optional[int] = field(default=None, repr=False)
    _sample_size: int = field(default=10000, repr=False)
    
    def __post_init__(self):
        self.data_path = Path(self.data_path)
        if not self.data_path.exists():
            logger.warning(f"Cell tower data file not found: {self.data_path}")
    
    @property
    def is_available(self) -> bool:
        """Check if the dataset file exists."""
        return self.data_path.exists()
    
    def get_file_info(self) -> Dict:
        """Get information about the dataset file."""
        if not self.is_available:
            return {"available": False, "path": str(self.data_path)}
        
        size_mb = self.data_path.stat().st_size / (1024 * 1024)
        return {
            "available": True,
            "path": str(self.data_path),
            "size_mb": round(size_mb, 2),
            "format": "OpenCellID CSV"
        }
    
    def load_sample(self, n: int = 10000, mcc: Optional[int] = None) -> pd.DataFrame:
        """
        Load a random sample of towers for quick analysis.
        
        Args:
            n: Number of towers to sample
            mcc: Optional MCC filter (country code)
        
        Returns:
            DataFrame with sampled towers
        """
        if not self.is_available:
            return pd.DataFrame()
        
        # For large files, read in chunks
        chunks = []
        total_rows = 0
        
        for chunk in pd.read_csv(self.data_path, chunksize=100000):
            if mcc is not None:
                chunk = chunk[chunk['mcc'] == mcc]
            
            chunks.append(chunk)
            total_rows += len(chunk)
            
            if total_rows >= n * 10:  # Get enough for sampling
                break
        
        if not chunks:
            return pd.DataFrame()
        
        df = pd.concat(chunks, ignore_index=True)
        
        if len(df) > n:
            df = df.sample(n=n, random_state=42)
        
        return df
    
    def load_region(
        self, 
        center_lat: float, 
        center_lon: float, 
        radius_km: float = 50,
        max_towers: int = 500
    ) -> List[CellTower]:
        """
        Load cell towers within a radius of a center point.
        
        This is the primary method for integration with the Digital Twin,
        loading towers that could potentially interfere with broadcasts.
        
        Args:
            center_lat: Latitude of broadcast tower
            center_lon: Longitude of broadcast tower  
            radius_km: Search radius in kilometers
            max_towers: Maximum number of towers to return
        
        Returns:
            List of CellTower objects within the radius
        """
        if not self.is_available:
            return []
        
        # Approximate degree bounds for faster filtering
        lat_range = radius_km / 111  # ~111 km per degree latitude
        lon_range = radius_km / (111 * np.cos(np.radians(center_lat)))
        
        lat_min, lat_max = center_lat - lat_range, center_lat + lat_range
        lon_min, lon_max = center_lon - lon_range, center_lon + lon_range
        
        towers = []
        
        for chunk in pd.read_csv(self.data_path, chunksize=100000):
            # Filter by bounding box first (fast)
            mask = (
                (chunk['lat'] >= lat_min) & (chunk['lat'] <= lat_max) &
                (chunk['lon'] >= lon_min) & (chunk['lon'] <= lon_max)
            )
            nearby = chunk[mask]
            
            for _, row in nearby.iterrows():
                tower = CellTower(
                    radio=row['radio'],
                    mcc=int(row['mcc']),
                    net=int(row['net']),
                    area=int(row['area']),
                    cell=int(row['cell']),
                    lon=float(row['lon']),
                    lat=float(row['lat']),
                    range_m=int(row['range']),
                    samples=int(row['samples']),
                    average_signal=int(row.get('averageSignal', 0))
                )
                
                # Precise distance filter
                if tower.distance_to(center_lat, center_lon) <= radius_km:
                    towers.append(tower)
                    
                    if len(towers) >= max_towers:
                        return towers
        
        return towers
    
    def get_statistics(self, sample_size: int = 50000) -> Dict:
        """
        Compute statistics about the dataset.
        
        Args:
            sample_size: Number of rows to sample for statistics
        
        Returns:
            Dictionary with dataset statistics
        """
        df = self.load_sample(n=sample_size)
        
        if df.empty:
            return {"available": False}
        
        return {
            "available": True,
            "sampled_rows": len(df),
            "radio_types": df['radio'].value_counts().to_dict(),
            "countries": {
                str(mcc): {
                    "name": MCC_COUNTRY_MAP.get(mcc, "Unknown"),
                    "count": int(count)
                }
                for mcc, count in df['mcc'].value_counts().head(10).items()
            },
            "lat_range": [float(df['lat'].min()), float(df['lat'].max())],
            "lon_range": [float(df['lon'].min()), float(df['lon'].max())],
            "avg_range_m": float(df['range'].mean()),
            "avg_samples": float(df['samples'].mean())
        }


class CellularInterferenceModel:
    """
    Models cellular interference for ATSC 3.0 broadcast simulation.
    
    Integrates real cell tower data to compute realistic interference
    patterns based on:
    - Tower density in the coverage area
    - Radio technology (GSM, LTE, etc.)
    - Frequency proximity (simulated)
    - Tower range and signal strength
    """
    
    def __init__(self, dataset: CellTowerDataset):
        self.dataset = dataset
        self._cached_towers: List[CellTower] = []
        self._cache_center: Optional[Tuple[float, float]] = None
    
    def load_interferers(
        self, 
        broadcast_lat: float, 
        broadcast_lon: float,
        radius_km: float = 30
    ) -> int:
        """
        Load potential interfering towers around a broadcast location.
        
        Args:
            broadcast_lat: Broadcast tower latitude
            broadcast_lon: Broadcast tower longitude
            radius_km: Radius to search for interferers
        
        Returns:
            Number of interfering towers loaded
        """
        self._cached_towers = self.dataset.load_region(
            broadcast_lat, broadcast_lon, radius_km
        )
        self._cache_center = (broadcast_lat, broadcast_lon)
        
        logger.info(f"Loaded {len(self._cached_towers)} potential interferers")
        return len(self._cached_towers)
    
    def compute_interference_at_point(
        self, 
        point_lat: float, 
        point_lon: float,
        frequency_mhz: float = 600.0
    ) -> Dict:
        """
        Compute aggregate cellular interference at a point.
        
        Args:
            point_lat: Receiver latitude
            point_lon: Receiver longitude
            frequency_mhz: Broadcast frequency (for proximity calculation)
        
        Returns:
            Dict with interference metrics
        """
        if not self._cached_towers:
            return {
                "total_interference_db": 0.0,
                "tower_count": 0,
                "nearest_tower_km": None,
                "interference_sources": []
            }
        
        interference_sources = []
        total_power = 0.0
        nearest_distance = float('inf')
        
        for tower in self._cached_towers:
            distance_km = tower.distance_to(point_lat, point_lon)
            
            if distance_km < nearest_distance:
                nearest_distance = distance_km
            
            # Simple path loss model for interference
            # Using free space path loss with adjustments
            if distance_km > 0.01:  # Avoid division by zero
                # Interference power decreases with distance
                # and is stronger for closer frequency bands
                freq_factor = self._frequency_coupling(tower.radio, frequency_mhz)
                path_loss_db = 20 * np.log10(distance_km) + 20 * np.log10(frequency_mhz) + 32.44
                
                # Estimate received interference power
                tx_power_dbm = self._estimate_tx_power(tower.radio)
                interference_dbm = tx_power_dbm - path_loss_db + 10 * np.log10(freq_factor)
                
                interference_sources.append({
                    "radio": tower.radio,
                    "distance_km": round(distance_km, 2),
                    "interference_dbm": round(interference_dbm, 1)
                })
                
                # Sum powers in linear scale
                total_power += 10 ** (interference_dbm / 10)
        
        # Convert total back to dB
        total_interference_db = 10 * np.log10(total_power) if total_power > 0 else -120.0
        
        return {
            "total_interference_db": round(total_interference_db, 1),
            "tower_count": len(self._cached_towers),
            "nearest_tower_km": round(nearest_distance, 2) if nearest_distance < float('inf') else None,
            "interference_sources": sorted(
                interference_sources, 
                key=lambda x: x['interference_dbm'],
                reverse=True
            )[:10]  # Top 10 interferers
        }
    
    def _estimate_tx_power(self, radio_type: str) -> float:
        """Estimate typical transmit power for radio technology."""
        power_map = {
            "GSM": 43.0,   # ~20W
            "UMTS": 43.0,  # ~20W
            "LTE": 46.0,   # ~40W
            "CDMA": 43.0,  # ~20W
            "NR": 46.0     # ~40W (5G)
        }
        return power_map.get(radio_type, 43.0)
    
    def _frequency_coupling(self, radio_type: str, broadcast_freq_mhz: float) -> float:
        """
        Estimate frequency coupling factor (interference leakage).
        
        Returns a factor [0-1] indicating how much interference
        couples into the broadcast band.
        """
        # Typical frequency bands
        bands = {
            "GSM": 900.0,
            "UMTS": 2100.0,
            "LTE": 700.0,   # Close to ATSC 3.0!
            "CDMA": 850.0,
            "NR": 3500.0
        }
        
        cell_freq = bands.get(radio_type, 900.0)
        
        # Frequency separation factor
        # LTE 700 MHz is very close to ATSC 3.0 (470-698 MHz)
        separation = abs(cell_freq - broadcast_freq_mhz)
        
        if separation < 50:
            return 0.1    # High coupling (adjacent band)
        elif separation < 200:
            return 0.01   # Moderate coupling
        else:
            return 0.001  # Low coupling (well separated)
    
    def get_interference_summary(self) -> Dict:
        """Get summary of loaded interference environment."""
        if not self._cached_towers:
            return {
                "loaded": False,
                "tower_count": 0,
                "radio_breakdown": {},
                "coverage_center": None
            }
        
        radio_counts = {}
        for tower in self._cached_towers:
            radio_counts[tower.radio] = radio_counts.get(tower.radio, 0) + 1
        
        avg_range = np.mean([t.range_km for t in self._cached_towers])
        
        return {
            "loaded": True,
            "tower_count": len(self._cached_towers),
            "radio_breakdown": radio_counts,
            "coverage_center": self._cache_center,
            "avg_tower_range_km": round(avg_range, 2)
        }


# ============================================================================
# Global Dataset Instance (Lazy Loaded)
# ============================================================================

_dataset_instance: Optional[CellTowerDataset] = None

def get_cell_tower_dataset() -> CellTowerDataset:
    """
    Get the global cell tower dataset instance.
    
    Lazily loads the dataset from the default path.
    """
    global _dataset_instance
    
    if _dataset_instance is None:
        # Default path relative to project root
        default_path = Path(__file__).parent.parent / "data" / "cell_towers_2026-01-12-T000000.csv"
        _dataset_instance = CellTowerDataset(default_path)
    
    return _dataset_instance


def get_interference_model(
    broadcast_lat: float = 52.52,  # Default: Berlin
    broadcast_lon: float = 13.405,
    radius_km: float = 30
) -> CellularInterferenceModel:
    """
    Get an interference model initialized for a broadcast location.
    
    Args:
        broadcast_lat: Broadcast tower latitude
        broadcast_lon: Broadcast tower longitude
        radius_km: Search radius for interferers
    
    Returns:
        Initialized CellularInterferenceModel
    """
    dataset = get_cell_tower_dataset()
    model = CellularInterferenceModel(dataset)
    model.load_interferers(broadcast_lat, broadcast_lon, radius_km)
    return model
