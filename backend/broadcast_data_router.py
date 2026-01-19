"""
broadcast_data_router.py - API endpoints for real FCC broadcast station data

Provides REST API access to:
- Real broadcast station data from FCC license database
- Coverage analysis at specific locations
- Coverage grid generation for heatmaps
- Station search by location, frequency, or service type
"""

import os
import sys
from typing import Optional, List
from functools import lru_cache
from fastapi import APIRouter, Query, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data.broadcast_data_loader import BroadcastDataLoader
from sim.real_broadcast_channel import RealBroadcastChannel, CoverageResult

router = APIRouter()

# Initialize data loader and channel model (singleton pattern)
_loader: Optional[BroadcastDataLoader] = None
_channel: Optional[RealBroadcastChannel] = None


def get_loader() -> BroadcastDataLoader:
    """Get or create singleton data loader."""
    global _loader
    if _loader is None:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        _loader = BroadcastDataLoader(data_dir)
    return _loader


def get_channel() -> RealBroadcastChannel:
    """Get or create singleton channel model."""
    global _channel
    if _channel is None:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        _channel = RealBroadcastChannel(data_dir)
    return _channel


# ============================================================================
# Pydantic Models
# ============================================================================

class StationResponse(BaseModel):
    """Response model for a broadcast station."""
    call_sign: str
    frequency_mhz: float
    service_type: str
    city: str
    state: str
    erp_kw: float
    haat_m: float
    latitude: float
    longitude: float
    licensee: str
    distance_km: Optional[float] = None


class CoverageResponse(BaseModel):
    """Response model for coverage analysis."""
    latitude: float
    longitude: float
    strongest_station: Optional[str]
    received_power_dbm: float
    snr_db: float
    distance_km: float
    coverage_probability: float
    stations_in_range: int
    data_source: str = "FCC License Database"
    is_real_data: bool = True


class CoverageGridResponse(BaseModel):
    """Response model for coverage grid data."""
    center: dict
    bounds: dict
    grid_size_km: float
    resolution_km: float
    latitudes: List[float]
    longitudes: List[float]
    coverage: List[List[float]]
    power_dbm: List[List[float]]
    data_source: str
    is_real_data: bool


class StatsResponse(BaseModel):
    """Response model for broadcast data statistics."""
    total_stations: int
    states_covered: int
    average_erp_kw: float
    max_erp_kw: float
    data_source: str
    is_real_data: bool
    disclaimer: str
    channel_model: str = "Hata Rural Path Loss"
    noise_floor_dbm: float = -100.0
    coverage_threshold_snr_db: float = 15.0


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/statistics", response_model=StatsResponse)
async def get_statistics():
    """
    Get statistics about the loaded broadcast data.
    
    Returns summary statistics including:
    - Total number of stations (FM, AM, TV)
    - States/provinces covered
    - Power level statistics
    - Data source information
    """
    channel = get_channel()
    stats = channel.get_statistics()
    return StatsResponse(**stats)


@router.get("/stations/nearby", response_model=List[StationResponse])
async def get_nearby_stations(
    lat: float = Query(..., description="Latitude of center point"),
    lon: float = Query(..., description="Longitude of center point"),
    radius_km: float = Query(50.0, description="Search radius in kilometers"),
    service_type: Optional[str] = Query(None, description="Filter by service type: FM, AM, or TV"),
    limit: int = Query(100, description="Maximum number of stations to return")
):
    """
    Get broadcast stations near a specific location.
    
    Returns stations sorted by distance from the specified point.
    """
    loader = get_loader()
    nearby = loader.get_stations_near(lat, lon, radius_km)
    
    # Filter by service type if specified
    if service_type:
        nearby = [(s, d) for s, d in nearby if s.service_type == service_type.upper()]
    
    # Limit results
    nearby = nearby[:limit]
    
    return [
        StationResponse(
            call_sign=s.call_sign,
            frequency_mhz=s.frequency_mhz,
            service_type=s.service_type,
            city=s.city,
            state=s.state,
            erp_kw=s.erp_kw,
            haat_m=s.haat_m,
            latitude=s.latitude,
            longitude=s.longitude,
            licensee=s.licensee,
            distance_km=round(d, 2)
        )
        for s, d in nearby
    ]


@router.get("/stations/by-state", response_model=List[StationResponse])
async def get_stations_by_state(
    state: str = Query(..., description="Two-letter state code (e.g., CA, NY, TX)"),
    service_type: Optional[str] = Query(None, description="Filter by service type: FM, AM, or TV"),
    limit: int = Query(100, description="Maximum number of stations to return")
):
    """
    Get broadcast stations in a specific state.
    """
    loader = get_loader()
    stations = loader.get_stations_by_state(state)
    
    # Filter by service type if specified
    if service_type:
        stations = [s for s in stations if s.service_type == service_type.upper()]
    
    # Limit results
    stations = stations[:limit]
    
    return [
        StationResponse(
            call_sign=s.call_sign,
            frequency_mhz=s.frequency_mhz,
            service_type=s.service_type,
            city=s.city,
            state=s.state,
            erp_kw=s.erp_kw,
            haat_m=s.haat_m,
            latitude=s.latitude,
            longitude=s.longitude,
            licensee=s.licensee
        )
        for s in stations
    ]


@router.get("/stations/high-power", response_model=List[StationResponse])
async def get_high_power_stations(
    min_power_kw: float = Query(100.0, description="Minimum power in kW"),
    limit: int = Query(50, description="Maximum number of stations to return")
):
    """
    Get high-power broadcast stations (regional coverage).
    """
    loader = get_loader()
    stations = loader.get_high_power_stations(min_power_kw)[:limit]
    
    return [
        StationResponse(
            call_sign=s.call_sign,
            frequency_mhz=s.frequency_mhz,
            service_type=s.service_type,
            city=s.city,
            state=s.state,
            erp_kw=s.erp_kw,
            haat_m=s.haat_m,
            latitude=s.latitude,
            longitude=s.longitude,
            licensee=s.licensee
        )
        for s in stations
    ]


@router.get("/coverage/point", response_model=CoverageResponse)
async def get_coverage_at_point(
    lat: float = Query(..., description="Latitude of point to analyze"),
    lon: float = Query(..., description="Longitude of point to analyze"),
    service_type: Optional[str] = Query(None, description="Filter by service type: FM, AM, or TV")
):
    """
    Analyze broadcast coverage at a specific location.
    
    Returns:
    - Strongest station and its parameters
    - Received signal power and SNR
    - Coverage probability
    - Number of stations in range
    """
    channel = get_channel()
    result = channel.calculate_coverage_at(lat, lon, service_type)
    
    return CoverageResponse(
        latitude=result.latitude,
        longitude=result.longitude,
        strongest_station=result.strongest_station.call_sign if result.strongest_station else None,
        received_power_dbm=round(result.received_power_dbm, 1),
        snr_db=round(result.snr_db, 1),
        distance_km=round(result.distance_km, 2),
        coverage_probability=round(result.coverage_probability, 4),
        stations_in_range=result.stations_in_range
    )


@router.get("/coverage/grid", response_model=CoverageGridResponse)
async def get_coverage_grid(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    size_km: float = Query(50.0, description="Grid size in km (total width/height)"),
    resolution_km: float = Query(5.0, description="Grid resolution in km"),
    service_type: Optional[str] = Query(None, description="Filter by service type: FM, AM, or TV")
):
    """
    Generate a coverage grid for heatmap visualization.
    
    Returns a grid of coverage probabilities and power levels
    that can be used to create a coverage map.
    
    Note: Large grids with fine resolution may take longer to compute.
    """
    # Limit grid size to prevent excessive computation
    if size_km > 200:
        raise HTTPException(status_code=400, detail="Grid size cannot exceed 200 km")
    if resolution_km < 1.0:
        raise HTTPException(status_code=400, detail="Resolution cannot be finer than 1 km")
    
    channel = get_channel()
    
    # Run heavy computation in threadpool to avoid blocking
    grid_data = await run_in_threadpool(
        channel.generate_coverage_grid,
        lat,
        lon,
        size_km,
        resolution_km,
        service_type
    )
    
    return CoverageGridResponse(**grid_data)


@router.get("/stations/search")
async def search_stations(
    query: str = Query(..., description="Search query (call sign or city)"),
    limit: int = Query(20, description="Maximum number of results")
):
    """
    Search for stations by call sign or city name.
    """
    loader = get_loader()
    query_upper = query.upper()
    
    results = []
    for station in loader.get_all_stations():
        if query_upper in station.call_sign or query_upper in station.city:
            results.append({
                "call_sign": station.call_sign,
                "frequency_mhz": station.frequency_mhz,
                "service_type": station.service_type,
                "city": station.city,
                "state": station.state,
                "erp_kw": station.erp_kw,
                "latitude": station.latitude,
                "longitude": station.longitude
            })
            if len(results) >= limit:
                break
    
    return {
        "query": query,
        "results_count": len(results),
        "results": results
    }


@router.get("/interference/analysis")
async def analyze_interference(
    lat: float = Query(..., description="Receiver latitude"),
    lon: float = Query(..., description="Receiver longitude"),
    frequency_mhz: float = Query(..., description="Center frequency in MHz"),
    channel_width_mhz: float = Query(6.0, description="Channel bandwidth in MHz")
):
    """
    Analyze potential interference at a location for a given frequency.
    
    Finds stations on the same or adjacent channels that could cause interference.
    """
    loader = get_loader()
    channel = get_channel()
    
    # Define frequency range for potential interferers
    min_freq = frequency_mhz - (channel_width_mhz * 1.5)
    max_freq = frequency_mhz + (channel_width_mhz * 1.5)
    
    # Get all stations in the frequency range
    interferers = loader.get_stations_by_frequency_range(min_freq, max_freq)
    
    # Calculate interference from each station
    interference_sources = []
    for station in interferers:
        rx_power, distance = channel.calculate_received_power(station, lat, lon)
        
        # Classify interference type
        freq_diff = abs(station.frequency_mhz - frequency_mhz)
        if freq_diff < 0.1:
            interference_type = "co-channel"
        elif freq_diff < channel_width_mhz:
            interference_type = "adjacent-channel"
        else:
            interference_type = "second-adjacent"
        
        interference_sources.append({
            "call_sign": station.call_sign,
            "frequency_mhz": station.frequency_mhz,
            "service_type": station.service_type,
            "city": station.city,
            "state": station.state,
            "distance_km": round(distance, 2),
            "received_power_dbm": round(rx_power, 1),
            "interference_type": interference_type
        })
    
    # Sort by received power (strongest first)
    interference_sources.sort(key=lambda x: -x["received_power_dbm"])
    
    return {
        "target_frequency_mhz": frequency_mhz,
        "channel_width_mhz": channel_width_mhz,
        "location": {"lat": lat, "lon": lon},
        "total_interferers": len(interference_sources),
        "interference_sources": interference_sources[:20],  # Limit to top 20
        "data_source": "FCC License Database",
        "is_real_data": True
    }
