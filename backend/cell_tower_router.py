"""
cell_tower_router.py - API endpoints for cell tower data access

Provides REST API access to the cell tower dataset for:
- Dataset statistics and availability checking
- Geographic region queries
- Interference analysis at specific points
- Integration with front-end visualizations

Author: AI-Native Broadcast Intelligence Platform
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import logging

from .cell_tower_data import (
    get_cell_tower_dataset,
    get_interference_model,
    CellTowerDataset,
    CellularInterferenceModel,
    MCC_COUNTRY_MAP
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# Response Models
# ============================================================================

class DatasetInfoResponse(BaseModel):
    """Information about the cell tower dataset."""
    available: bool
    path: Optional[str] = None
    size_mb: Optional[float] = None
    format: Optional[str] = None


class DatasetStatsResponse(BaseModel):
    """Statistics computed from the dataset."""
    available: bool
    sampled_rows: Optional[int] = None
    radio_types: Optional[Dict[str, int]] = None
    countries: Optional[Dict[str, Dict[str, Any]]] = None
    lat_range: Optional[List[float]] = None
    lon_range: Optional[List[float]] = None
    avg_range_m: Optional[float] = None
    avg_samples: Optional[float] = None


class TowerInfo(BaseModel):
    """Information about a single cell tower."""
    radio: str
    mcc: int
    net: int
    lat: float
    lon: float
    range_km: float
    samples: int


class RegionQueryResponse(BaseModel):
    """Response for region-based tower query."""
    center_lat: float
    center_lon: float
    radius_km: float
    tower_count: int
    towers: List[TowerInfo]
    radio_breakdown: Dict[str, int]


class InterferenceAnalysisResponse(BaseModel):
    """Response for interference analysis at a point."""
    point_lat: float
    point_lon: float
    total_interference_db: float
    tower_count: int
    nearest_tower_km: Optional[float]
    interference_sources: List[Dict[str, Any]]
    lte_risk: str  # "high", "medium", "low"


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/status", response_model=DatasetInfoResponse)
async def get_dataset_status():
    """
    Check if the cell tower dataset is available.
    
    Returns information about the dataset file including
    availability, size, and format.
    """
    dataset = get_cell_tower_dataset()
    info = dataset.get_file_info()
    return DatasetInfoResponse(**info)


@router.get("/statistics", response_model=DatasetStatsResponse)
async def get_dataset_statistics(
    sample_size: int = Query(default=50000, ge=1000, le=100000)
):
    """
    Compute statistics from the cell tower dataset.
    
    Samples the dataset to provide:
    - Radio technology breakdown (GSM, LTE, etc.)
    - Country distribution (by MCC)
    - Geographic coverage
    - Average tower range and sample counts
    """
    dataset = get_cell_tower_dataset()
    
    if not dataset.is_available:
        return DatasetStatsResponse(available=False)
    
    stats = dataset.get_statistics(sample_size=sample_size)
    return DatasetStatsResponse(**stats)


@router.get("/region", response_model=RegionQueryResponse)
async def query_towers_in_region(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(default=30, ge=1, le=100, description="Search radius in km"),
    max_towers: int = Query(default=200, ge=10, le=1000, description="Maximum towers to return")
):
    """
    Query cell towers within a geographic region.
    
    Use this to find cellular infrastructure near a broadcast location
    for interference analysis.
    """
    dataset = get_cell_tower_dataset()
    
    if not dataset.is_available:
        raise HTTPException(
            status_code=404,
            detail="Cell tower dataset not found. Please ensure the data file is in the data/ directory."
        )
    
    towers = dataset.load_region(lat, lon, radius_km, max_towers)
    
    # Build response
    tower_infos = [
        TowerInfo(
            radio=t.radio,
            mcc=t.mcc,
            net=t.net,
            lat=t.lat,
            lon=t.lon,
            range_km=t.range_km,
            samples=t.samples
        )
        for t in towers
    ]
    
    # Count by radio type
    radio_breakdown = {}
    for t in towers:
        radio_breakdown[t.radio] = radio_breakdown.get(t.radio, 0) + 1
    
    return RegionQueryResponse(
        center_lat=lat,
        center_lon=lon,
        radius_km=radius_km,
        tower_count=len(towers),
        towers=tower_infos,
        radio_breakdown=radio_breakdown
    )


@router.get("/interference", response_model=InterferenceAnalysisResponse)
async def analyze_interference(
    broadcast_lat: float = Query(..., description="Broadcast tower latitude"),
    broadcast_lon: float = Query(..., description="Broadcast tower longitude"),
    receiver_lat: float = Query(..., description="Receiver point latitude"),
    receiver_lon: float = Query(..., description="Receiver point longitude"),
    radius_km: float = Query(default=30, ge=5, le=100, description="Search radius for interferers"),
    frequency_mhz: float = Query(default=600.0, ge=470, le=698, description="ATSC 3.0 broadcast frequency")
):
    """
    Analyze cellular interference at a specific receiver location.
    
    This endpoint:
    1. Loads cell towers near the broadcast location
    2. Computes aggregate interference at the receiver point
    3. Identifies the strongest interferers
    4. Assesses LTE risk (700 MHz band proximity)
    """
    dataset = get_cell_tower_dataset()
    
    if not dataset.is_available:
        raise HTTPException(
            status_code=404,
            detail="Cell tower dataset not found."
        )
    
    # Create interference model
    model = CellularInterferenceModel(dataset)
    model.load_interferers(broadcast_lat, broadcast_lon, radius_km)
    
    # Analyze at receiver point
    analysis = model.compute_interference_at_point(
        receiver_lat, receiver_lon, frequency_mhz
    )
    
    # Assess LTE risk (700 MHz band is adjacent to ATSC 3.0)
    summary = model.get_interference_summary()
    lte_count = summary.get("radio_breakdown", {}).get("LTE", 0)
    total_count = summary.get("tower_count", 1)
    
    lte_ratio = lte_count / max(total_count, 1)
    if lte_ratio > 0.3:
        lte_risk = "high"
    elif lte_ratio > 0.1:
        lte_risk = "medium"
    else:
        lte_risk = "low"
    
    return InterferenceAnalysisResponse(
        point_lat=receiver_lat,
        point_lon=receiver_lon,
        total_interference_db=analysis["total_interference_db"],
        tower_count=analysis["tower_count"],
        nearest_tower_km=analysis["nearest_tower_km"],
        interference_sources=analysis["interference_sources"],
        lte_risk=lte_risk
    )


@router.get("/countries")
async def get_supported_countries():
    """
    Get list of countries (MCC codes) in the dataset.
    
    Returns the MCC to country name mapping for reference.
    """
    return {
        "mcc_country_map": MCC_COUNTRY_MAP,
        "note": "Use MCC codes to filter data by country"
    }


@router.get("/summary")
async def get_integration_summary():
    """
    Get a summary of the cell tower data integration.
    
    Provides overall status and capabilities of the
    cellular interference modeling system.
    """
    dataset = get_cell_tower_dataset()
    
    return {
        "integration": "Cell Tower Interference Modeling",
        "purpose": "Provide realistic cellular interference for ATSC 3.0 broadcast simulation",
        "dataset_available": dataset.is_available,
        "capabilities": [
            "Load 5M+ cell tower records efficiently",
            "Geographic region queries with Haversine distance",
            "Multi-radio interference modeling (GSM, LTE, UMTS)",
            "LTE 700MHz adjacency risk assessment",
            "Integration with Digital Twin spatial simulation"
        ],
        "data_source": "OpenCellID (https://opencellid.org)",
        "key_endpoints": {
            "/cell-towers/status": "Check dataset availability",
            "/cell-towers/statistics": "Get dataset statistics",
            "/cell-towers/region": "Query towers in geographic area",
            "/cell-towers/interference": "Compute interference at receiver point"
        }
    }
