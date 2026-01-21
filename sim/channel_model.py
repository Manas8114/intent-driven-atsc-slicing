import numpy as np
from typing import Tuple, Union, Optional, Dict
import os
import logging

# Configure logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

try:
    import shapefile
    from scipy.interpolate import griddata, interpn
except ImportError:
    # These will be flagged if used when not available
    shapefile = None
    griddata = None
    interpn = None


def hata_path_loss(frequency_mhz: float, distance_km: Union[float, np.ndarray], tx_height_m: float = 30.0, rx_height_m: float = 1.5) -> Union[float, np.ndarray]:
    """Calculate simplified Hata model path loss for rural environments.

    Args:
        frequency_mhz: Carrier frequency in MHz (e.g., 600 for UHF).
        distance_km: Distance between transmitter and receiver in kilometers (float or numpy array).
        tx_height_m: Transmitter antenna height (default 30 m).
        rx_height_m: Receiver antenna height (default 1.5 m).

    Returns:
        Path loss in dB.
    """
    if frequency_mhz <= 0:
        raise ValueError("Frequency must be positive")
        
    # Hata model for rural area
    a_hr = (1.1 * np.log10(frequency_mhz) - 0.7) * rx_height_m - (1.56 * np.log10(frequency_mhz) - 0.8)
    loss = (69.55 + 26.16 * np.log10(frequency_mhz) - 13.82 * np.log10(tx_height_m) - a_hr +
            (44.9 - 6.55 * np.log10(tx_height_m)) * np.log10(distance_km))
    return loss


def received_power(tx_power_dbm: float, frequency_mhz: float, distance_km: Union[float, np.ndarray], tx_height_m: float = 30.0, rx_height_m: float = 1.5) -> Union[float, np.ndarray]:
    """Estimate received signal power (dBm) using Hata path loss.
    """
    path_loss = hata_path_loss(frequency_mhz, distance_km, tx_height_m, rx_height_m)
    return tx_power_dbm - path_loss


# Global cache for terrain data to avoid repeated file I/O
_terrain_data: Optional[Dict] = None


def _load_terrain_grid(data_path: Optional[str] = None) -> Optional[Dict]:
    """
    Load terrain elevation data from SRTM shapefile and create an interpolation grid.
    Caches the result in memory.
    """
    global _terrain_data
    if _terrain_data is not None:
        return _terrain_data

    if shapefile is None or griddata is None:
        # This condition is logged once at startup if libraries are missing.
        return None

    if data_path is None:
        # Default path relative to this file's location
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, "data", "srtm.shp")

    if not os.path.exists(data_path):
        logging.warning(f"Terrain data not found at {data_path}. Falling back to Hata model.")
        return None

    try:
        sf = shapefile.Reader(data_path)
        shapes = sf.shapes()
        records = sf.records()

        points = np.array([s.points[0] for s in shapes])
        elevations = np.array([r[2] for r in records])

        lons = np.unique(points[:, 0])
        lats = np.unique(points[:, 1])

        grid_lon, grid_lat = np.meshgrid(lons, lats)
        grid_elevation = griddata(points, elevations, (grid_lon, grid_lat), method='linear')

        # Handle NaNs from gridding by filling with the mean elevation
        mean_elevation = np.nanmean(grid_elevation)
        grid_elevation[np.isnan(grid_elevation)] = mean_elevation

        _terrain_data = {
            "lons": lons,
            "lats": lats,
            "elevation_grid": grid_elevation,
            "bounds": {
                "lon_min": lons.min(), "lon_max": lons.max(),
                "lat_min": lats.min(), "lat_max": lats.max()
            }
        }
        logging.info("Terrain data loaded and interpolated successfully.")
        return _terrain_data
    except Exception as e:
        logging.error(f"Error loading terrain data: {e}")
        return None


def get_path_loss_db(
    frequency_mhz: float,
    tx_lat: float, tx_lon: float, tx_height_m: float,
    rx_lat: float, rx_lon: float, rx_height_m: float
) -> float:
    """
    Calculate path loss using bilinear interpolation on a terrain grid.
    Falls back to the Hata model if terrain data is unavailable.
    """
    terrain = _load_terrain_grid()

    # Fallback condition
    if terrain is None or interpn is None:
        distance_km = np.hypot((tx_lat - rx_lat) * 111.32, (tx_lon - rx_lon) * 111.32 * np.cos(np.radians(tx_lat)))
        return hata_path_loss(frequency_mhz, max(0.1, distance_km), tx_height_m, rx_height_m)

    bounds = terrain['bounds']
    if not (bounds['lon_min'] <= tx_lon <= bounds['lon_max'] and
            bounds['lat_min'] <= tx_lat <= bounds['lat_max'] and
            bounds['lon_min'] <= rx_lon <= bounds['lon_max'] and
            bounds['lat_min'] <= rx_lat <= bounds['lat_max']):
        distance_km = np.hypot((tx_lat - rx_lat) * 111.32, (tx_lon - rx_lon) * 111.32 * np.cos(np.radians(tx_lat)))
        return hata_path_loss(frequency_mhz, max(0.1, distance_km), tx_height_m, rx_height_m)

    num_points = 100
    lats_path = np.linspace(tx_lat, rx_lat, num_points)
    lons_path = np.linspace(tx_lon, rx_lon, num_points)
    path_points = np.vstack((lats_path, lons_path)).T

    path_elevation = interpn(
        (terrain['lats'], terrain['lons']),
        terrain['elevation_grid'],
        path_points,
        method='linear',
        bounds_error=False,
        fill_value=np.mean(terrain['elevation_grid'])  # Use mean elevation for out-of-bounds
    )

    tx_terrain_elev = path_elevation[0]
    rx_terrain_elev = path_elevation[-1]

    tx_eff_h = tx_height_m + tx_terrain_elev
    rx_eff_h = rx_height_m + rx_terrain_elev

    line_of_sight = np.linspace(tx_eff_h, rx_eff_h, num_points)
    is_obstructed = np.any(path_elevation > line_of_sight)

    distance_km = np.hypot((tx_lat - rx_lat) * 111.32, (tx_lon - rx_lon) * 111.32 * np.cos(np.radians(tx_lat)))
    fspl = 20 * np.log10(max(0.1, distance_km)) + 20 * np.log10(frequency_mhz) + 32.44

    # Add a penalty for obstructed paths, but no reward for LoS
    obstruction_loss_db = 20.0 if is_obstructed else 0.0

    return fspl + obstruction_loss_db


if __name__ == "__main__":
    # Simple sanity check
    print(f"Path loss @ 600 MHz, 10 km: {hata_path_loss(600, 10):.2f} dB")
    print(f"Received power @ 30 dBm TX: {received_power(30, 600, 10):.2f} dBm")
