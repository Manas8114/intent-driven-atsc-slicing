"""
kpi_engine.py - KPI Dashboard Engine for ATSC 3.0 Broadcasting

This module provides:
- Time-series KPI storage and retrieval
- Real-time packet statistics from ATSC 3.0 protocol layer
- Integration with libatsc3 bridge for protocol-level telemetry

KPIs tracked:
- Coverage percentage
- Alert reliability
- Latency (ms)
- Spectral efficiency (bits/s/Hz)
- Packet statistics (loss rate, throughput, etc.)
"""

import sqlite3
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

DB_PATH = Path(__file__).parent / "kpis.db"


# ============================================================================
# Database Initialization
# ============================================================================

def init_db() -> None:
    """Initialize the SQLite database with KPI and packet statistics tables."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Main KPI table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS kpis (
            timestamp INTEGER PRIMARY KEY,
            coverage REAL,
            alert_reliability REAL,
            latency_ms REAL,
            spectral_efficiency REAL
        )
        """
    )
    
    # Packet statistics table (new for libatsc3 integration)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS packet_stats (
            timestamp INTEGER PRIMARY KEY,
            total_packets_received INTEGER DEFAULT 0,
            lls_packets_received INTEGER DEFAULT 0,
            lls_packets_parsed INTEGER DEFAULT 0,
            lls_slt_updates INTEGER DEFAULT 0,
            mmtp_packets_received INTEGER DEFAULT 0,
            mmtp_packets_missing INTEGER DEFAULT 0,
            mmt_mpu_count INTEGER DEFAULT 0,
            alc_packets_received INTEGER DEFAULT 0,
            alc_packets_parsed INTEGER DEFAULT 0,
            packet_loss_rate REAL DEFAULT 0.0,
            throughput_mbps REAL DEFAULT 0.0
        )
        """
    )
    
    conn.commit()
    conn.close()


# Ensure DB exists on import
init_db()


# ============================================================================
# Pydantic Models
# ============================================================================

class KPIRecord(BaseModel):
    """Standard KPI record for time-series data."""
    timestamp: int
    coverage: float
    alert_reliability: float
    latency_ms: float
    spectral_efficiency: float


class PacketStatsRecord(BaseModel):
    """Packet statistics record for protocol-level telemetry."""
    timestamp: int
    total_packets_received: int = 0
    lls_packets_received: int = 0
    lls_packets_parsed: int = 0
    lls_slt_updates: int = 0
    mmtp_packets_received: int = 0
    mmtp_packets_missing: int = 0
    mmt_mpu_count: int = 0
    alc_packets_received: int = 0
    alc_packets_parsed: int = 0
    packet_loss_rate: float = 0.0
    throughput_mbps: float = 0.0


class LiveKPIResponse(BaseModel):
    """Combined live KPI response with all metrics."""
    timestamp: int
    # Core KPIs
    coverage: float = Field(..., description="Coverage percentage (0-100)")
    alert_reliability: float = Field(..., description="Emergency alert reliability (0-1)")
    latency_ms: float = Field(..., description="End-to-end latency in milliseconds")
    spectral_efficiency: float = Field(..., description="Spectral efficiency in bits/s/Hz")
    # Packet statistics
    packet_loss_rate: float = Field(default=0.0, description="Packet loss rate (0-1)")
    throughput_mbps: float = Field(default=0.0, description="Current throughput in Mbps")
    total_packets: int = Field(default=0, description="Total packets received")
    # Protocol counters
    lls_updates: int = Field(default=0, description="LLS SLT update count")
    mmtp_missing: int = Field(default=0, description="Missing MMTP packets")


# ============================================================================
# Real-Time KPI Engine
# ============================================================================

@dataclass
class RealTimeKPIEngine:
    """
    Real-time KPI engine with protocol-level packet statistics.
    
    Provides:
    - Live metrics from simulation or libatsc3 bridge
    - Historical data storage
    - Aggregated statistics
    """
    
    # Core KPIs (simulated or from simulator)
    coverage: float = 0.0
    alert_reliability: float = 0.0
    latency_ms: float = 0.0
    spectral_efficiency: float = 0.0
    
    # Packet statistics (from libatsc3 bridge)
    total_packets_received: int = 0
    lls_packets_received: int = 0
    lls_packets_parsed: int = 0
    lls_slt_updates: int = 0
    mmtp_packets_received: int = 0
    mmtp_packets_missing: int = 0
    mmt_mpu_count: int = 0
    alc_packets_received: int = 0
    alc_packets_parsed: int = 0
    
    # Computed metrics
    packet_loss_rate: float = 0.0
    throughput_mbps: float = 0.0
    
    # Internal state
    _last_update: float = field(default_factory=time.time)
    _sample_window_packets: int = 0
    
    def update_from_bridge(self) -> None:
        """
        Update statistics from libatsc3 bridge.
        
        Attempts to read from native library, falls back to ReceiverAgent,
        then to pure random simulation if neither are available.
        """
        from .libatsc3_bridge import ATSC3Bridge
        
        bridge_active = False
        try:
            bridge = ATSC3Bridge()
            
            if bridge.is_native_available():
                stats = bridge.get_packet_statistics()
                self.total_packets_received = stats.total_packets_received
                self.lls_packets_received = stats.lls_packets_received
                self.lls_packets_parsed = stats.lls_packets_parsed
                self.lls_slt_updates = stats.lls_slt_updates
                self.mmtp_packets_received = stats.mmtp_packets_received
                self.mmtp_packets_missing = stats.mmtp_packets_missing
                self.alc_packets_received = stats.alc_packets_received
                self.alc_packets_parsed = stats.alc_packets_parsed
                self.packet_loss_rate = stats.packet_loss_rate
                bridge_active = True
        except Exception as e:
            # Use fallback if bridge error
            print(f"ATSC3Bridge Unavailable: {e}")
            pass
            
        # If no native bridge, use ReceiverAgent (The "Real" Simulation)
        if not bridge_active:
            try:
                from .receiver_agent import get_receiver_agent
                agent = get_receiver_agent()
                metrics = agent.get_metrics()
                
                # If agent has data, use it
                if metrics:
                    # Map agent metrics to packet stats
                    # Simulating packet counts based on time running for realism
                    # In a real app these would be monotonic counters from the receiver
                    
                    self.packet_loss_rate = 1.0 - metrics.get("service_acquisition_success_ratio", 1.0)
                    
                    # Synthesize packet counters based on loss rate
                    if self.packet_loss_rate > 0.9:
                         # Total loss
                         pass 
                    else:
                         self.mmtp_packets_received += 10 # Increment counter
                         if self.packet_loss_rate > 0:
                             self.mmtp_packets_missing += int(10 * self.packet_loss_rate)
                    
                    # Also update core KPIs if they are being simulated here
                    self.coverage = metrics.get("service_acquisition_success_ratio", 0.0) * 100.0
                    
            except Exception as e:
                # print(f"Receiver agent fallback failed: {e}")
                pass
        
        # Calculate packet loss rate
        if self.mmtp_packets_received > 0:
            self.packet_loss_rate = (
                self.mmtp_packets_missing / self.mmtp_packets_received
            )
        
        self._last_update = time.time()
    
    def update_from_simulator(self, kpis: Dict[str, Any]) -> None:
        """
        Update KPIs from simulator output.
        
        Args:
            kpis: Dictionary with coverage, alert_reliability, latency_ms, spectral_efficiency
        """
        self.coverage = kpis.get('coverage', self.coverage)
        self.alert_reliability = kpis.get('alert_reliability', self.alert_reliability)
        self.latency_ms = kpis.get('latency_ms', self.latency_ms)
        self.spectral_efficiency = kpis.get('spectral_efficiency', self.spectral_efficiency)
        
        # Update throughput estimate
        bandwidth_mhz = kpis.get('bandwidth_mhz', 6.0)
        self.throughput_mbps = bandwidth_mhz * self.spectral_efficiency
        
        self._last_update = time.time()
    
    def increment_packet_counts(
        self,
        total: int = 0,
        lls: int = 0,
        mmtp: int = 0,
        mmtp_missing: int = 0,
        alc: int = 0,
    ) -> None:
        """Increment packet counters."""
        self.total_packets_received += total
        self.lls_packets_received += lls
        self.mmtp_packets_received += mmtp
        self.mmtp_packets_missing += mmtp_missing
        self.alc_packets_received += alc
        
        # Update loss rate
        if self.mmtp_packets_received > 0:
            self.packet_loss_rate = (
                self.mmtp_packets_missing / self.mmtp_packets_received
            )
    
    def get_live_kpis(self) -> Dict[str, Any]:
        """Get current live KPI values."""
        return {
            'timestamp': int(time.time()),
            'coverage': self.coverage,
            'alert_reliability': self.alert_reliability,
            'latency_ms': self.latency_ms,
            'spectral_efficiency': self.spectral_efficiency,
            'packet_loss_rate': self.packet_loss_rate,
            'throughput_mbps': self.throughput_mbps,
            'total_packets': self.total_packets_received,
            'lls_updates': self.lls_slt_updates,
            'mmtp_missing': self.mmtp_packets_missing,
        }
    
    def get_packet_stats(self) -> Dict[str, Any]:
        """Get detailed packet statistics."""
        return {
            'timestamp': int(time.time()),
            'total_packets_received': self.total_packets_received,
            'lls_packets_received': self.lls_packets_received,
            'lls_packets_parsed': self.lls_packets_parsed,
            'lls_slt_updates': self.lls_slt_updates,
            'mmtp_packets_received': self.mmtp_packets_received,
            'mmtp_packets_missing': self.mmtp_packets_missing,
            'mmt_mpu_count': self.mmt_mpu_count,
            'alc_packets_received': self.alc_packets_received,
            'alc_packets_parsed': self.alc_packets_parsed,
            'packet_loss_rate': self.packet_loss_rate,
            'throughput_mbps': self.throughput_mbps,
        }
    
    def save_to_db(self) -> None:
        """Save current stats to database."""
        ts = int(time.time())
        conn = None
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            
            # Save KPIs
            cur.execute(
                """INSERT OR REPLACE INTO kpis 
                   (timestamp, coverage, alert_reliability, latency_ms, spectral_efficiency) 
                   VALUES (?,?,?,?,?)""",
                (ts, self.coverage, self.alert_reliability, 
                 self.latency_ms, self.spectral_efficiency)
            )
            
            # Save packet stats
            cur.execute(
                """INSERT OR REPLACE INTO packet_stats 
                   (timestamp, total_packets_received, lls_packets_received,
                    lls_packets_parsed, lls_slt_updates, mmtp_packets_received,
                    mmtp_packets_missing, mmt_mpu_count, alc_packets_received,
                    alc_packets_parsed, packet_loss_rate, throughput_mbps)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (ts, self.total_packets_received, self.lls_packets_received,
                 self.lls_packets_parsed, self.lls_slt_updates, self.mmtp_packets_received,
                 self.mmtp_packets_missing, self.mmt_mpu_count, self.alc_packets_received,
                 self.alc_packets_parsed, self.packet_loss_rate, self.throughput_mbps)
            )
            
            conn.commit()
        except sqlite3.Error as e:
            # Log the error but don't crash - KPI saving is not critical
            print(f"Warning: Failed to save KPIs to database: {e}")
        finally:
            if conn:
                conn.close()
    
    def reset(self) -> None:
        """Reset all counters and metrics."""
        self.coverage = 0.0
        self.alert_reliability = 0.0
        self.latency_ms = 0.0
        self.spectral_efficiency = 0.0
        self.total_packets_received = 0
        self.lls_packets_received = 0
        self.lls_packets_parsed = 0
        self.lls_slt_updates = 0
        self.mmtp_packets_received = 0
        self.mmtp_packets_missing = 0
        self.mmt_mpu_count = 0
        self.alc_packets_received = 0
        self.alc_packets_parsed = 0
        self.packet_loss_rate = 0.0
        self.throughput_mbps = 0.0


# Global KPI engine instance
_kpi_engine: Optional[RealTimeKPIEngine] = None


def get_kpi_engine() -> RealTimeKPIEngine:
    """Get or create the global KPI engine instance."""
    global _kpi_engine
    if _kpi_engine is None:
        _kpi_engine = RealTimeKPIEngine()
    return _kpi_engine


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/", response_model=List[KPIRecord])
async def get_kpis(limit: int = 100) -> List[Dict[str, Any]]:
    """Return the most recent KPI records (up to *limit*)."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM kpis ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


@router.post("/record", status_code=201)
async def record_kpi(record: KPIRecord) -> Dict[str, str]:
    """Insert a new KPI measurement into the database.

    In a full system the simulator would call this endpoint after each evaluated action.
    """
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO kpis (timestamp, coverage, alert_reliability, latency_ms, spectral_efficiency) VALUES (?,?,?,?,?)",
                (
                    record.timestamp,
                    record.coverage,
                    record.alert_reliability,
                    record.latency_ms,
                    record.spectral_efficiency,
                ),
            )
            conn.commit()
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Connection closes automatically here
    return {"status": "recorded"}


@router.get("/live", response_model=LiveKPIResponse)
async def get_live_kpis() -> Dict[str, Any]:
    """Get real-time KPI values including packet statistics."""
    engine = get_kpi_engine()
    engine.update_from_bridge()  # Try to update from native library
    return engine.get_live_kpis()


@router.get("/packets", response_model=PacketStatsRecord)
async def get_packet_stats() -> Dict[str, Any]:
    """Get detailed packet statistics from protocol layer."""
    engine = get_kpi_engine()
    return engine.get_packet_stats()


@router.get("/packets/history", response_model=List[PacketStatsRecord])
async def get_packet_stats_history(limit: int = 100) -> List[Dict[str, Any]]:
    """Get historical packet statistics."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM packet_stats ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        rows = cur.fetchall()
    return [dict(row) for row in rows]


@router.post("/update")
async def update_kpis(kpis: Dict[str, Any]) -> Dict[str, str]:
    """Update live KPIs from simulator output."""
    engine = get_kpi_engine()
    engine.update_from_simulator(kpis)
    return {"status": "updated"}


@router.post("/save")
async def save_kpis() -> Dict[str, str]:
    """Save current live KPIs to database."""
    engine = get_kpi_engine()
    engine.save_to_db()
    return {"status": "saved"}


@router.post("/reset")
async def reset_kpis() -> Dict[str, str]:
    """Reset all KPI counters."""
    engine = get_kpi_engine()
    engine.reset()
    return {"status": "reset"}

