"""
rf_adapter.py - RF Front-End Abstraction Layer

This module provides abstraction for RF hardware integration.
It prepares the system architecture for future hardware connections
while enforcing safe simulation-only operation today.

TRANSMISSION MODES:
    SIMULATION: ✅ ENABLED (Default) - All operations are simulated
    SDR_LAB: ⚠️ STUBBED - Future: USRP, LimeSDR, etc.
    COMMERCIAL_ENCODER: ⚠️ STUBBED - Future: Broadcast exciters

CRITICAL SAFETY NOTES:
❌ This system does NOT transmit RF signals
❌ This system does NOT interface with real broadcast hardware (currently)
❌ This system does NOT have FCC/regulatory approval for transmission

The RF adapter is an ARCHITECTURAL PLACEHOLDER that:
- Provides clear integration points for future hardware
- Enforces simulation-only mode with warnings
- Documents the path from control plane to physical transmission
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
import warnings
import numpy as np


# ============================================================================
# Transmission Mode Definitions
# ============================================================================

class TransmissionMode(str, Enum):
    """
    RF transmission mode.
    
    Currently only SIMULATION is implemented.
    Other modes are architectural placeholders.
    """
    SIMULATION = "simulation"           # ✅ Enabled - Default and only active mode
    SDR_LAB = "sdr_lab"                 # ⚠️ Stubbed - Future SDR integration
    COMMERCIAL_ENCODER = "encoder"      # ⚠️ Stubbed - Future broadcast encoder integration


class TransmissionStatus(str, Enum):
    """Status of a transmission request."""
    SIMULATED = "simulated"             # Successfully simulated (no RF)
    BLOCKED = "blocked"                 # Blocked due to safety/mode restrictions
    HARDWARE_NOT_AVAILABLE = "hardware_not_available"
    ERROR = "error"


# ============================================================================
# Hardware Stubs
# ============================================================================

@dataclass
class HardwareStub:
    """Placeholder for future hardware integration."""
    name: str
    mode: TransmissionMode
    is_implemented: bool = False
    implementation_notes: str = ""
    required_dependencies: List[str] = field(default_factory=list)


# Known hardware targets (all stubbed)
HARDWARE_STUBS = {
    TransmissionMode.SDR_LAB: HardwareStub(
        name="Software Defined Radio (Lab)",
        mode=TransmissionMode.SDR_LAB,
        is_implemented=False,
        implementation_notes="Future integration with USRP, LimeSDR, HackRF for lab testing",
        required_dependencies=["uhd", "soapysdr", "gnuradio"]
    ),
    TransmissionMode.COMMERCIAL_ENCODER: HardwareStub(
        name="Commercial Broadcast Encoder",
        mode=TransmissionMode.COMMERCIAL_ENCODER,
        is_implemented=False,
        implementation_notes="Future integration with professional broadcast encoders/exciters",
        required_dependencies=["vendor_sdk", "snmp", "nmos"]
    ),
}


# ============================================================================
# Terrain Interface (SPLAT! Integration Stub)
# ============================================================================

@dataclass
class TerrainData:
    """Container for terrain/propagation data from SPLAT! or similar tools."""
    source: str = "simulated"  # 'simulated', 'splat', 'srtm'
    path_loss_grid: Optional[np.ndarray] = None  # 2D grid of path loss values in dB
    grid_resolution_m: float = 100.0  # Grid cell size in meters
    origin_x: float = 0.0  # Origin X coordinate (UTM or local)
    origin_y: float = 0.0  # Origin Y coordinate (UTM or local)
    transmitter_height_m: float = 100.0  # Transmitter antenna height
    frequency_mhz: float = 600.0  # Frequency used for propagation calculation


class TerrainInterface:
    """
    Interface for terrain-based propagation data.
    
    This is a STUB for future SPLAT! integration. SPLAT! generates:
    - .sdf files: SPLAT! Data Files with terrain elevation
    - .ppm files: Coverage maps showing signal strength
    - .txt files: Path loss reports between points
    
    FUTURE INTEGRATION:
    1. User runs SPLAT! with transmitter location and generates .ppm/.txt output
    2. This interface reads the output and provides path_loss(x, y) queries
    3. The spatial model uses this for realistic coverage calculations
    
    CURRENT STATE: Returns simulated path loss based on distance only.
    """
    
    def __init__(self, data_path: Optional[str] = None):
        """
        Initialize terrain interface.
        
        Args:
            data_path: Path to SPLAT! output directory (optional, currently unused)
        """
        self.data_path = data_path
        self.terrain_data = TerrainData()
        self._is_loaded = False
        
        if data_path:
            self._try_load_splat_data(data_path)
    
    def _try_load_splat_data(self, data_path: str) -> bool:
        """
        Attempt to load SPLAT! output data.
        
        STUB: Currently just logs a message. Future implementation will:
        - Parse .ppm coverage maps
        - Extract path loss values
        - Build interpolation grid
        """
        import os
        
        if not os.path.exists(data_path):
            return False
        
        # Look for SPLAT! output files
        ppm_files = [f for f in os.listdir(data_path) if f.endswith('.ppm')]
        txt_files = [f for f in os.listdir(data_path) if 'path_loss' in f.lower()]
        
        if ppm_files or txt_files:
            print(f"[TerrainInterface] Found SPLAT! output files in {data_path}")
            print(f"[TerrainInterface] PPM files: {ppm_files}")
            print(f"[TerrainInterface] TXT files: {txt_files}")
            # TODO: Parse these files and populate terrain_data
            self._is_loaded = True
            self.terrain_data.source = "splat"
            return True
        
        return False
    
    def get_path_loss_db(self, x_km: float, y_km: float, 
                          tx_power_dbm: float = 35.0,
                          frequency_mhz: float = 600.0) -> float:
        """
        Get path loss at a given location.
        
        Args:
            x_km: X coordinate in km (relative to transmitter at origin)
            y_km: Y coordinate in km (relative to transmitter at origin)
            tx_power_dbm: Transmitter power in dBm
            frequency_mhz: Carrier frequency in MHz
            
        Returns:
            Path loss in dB
        """
        if self._is_loaded and self.terrain_data.path_loss_grid is not None:
            # Interpolate from loaded data
            # TODO: Implement bilinear interpolation from grid
            pass
        
        # Fallback: Free-space path loss model
        distance_km = max(0.1, np.sqrt(x_km**2 + y_km**2))
        # Free-space path loss: FSPL = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
        fspl_db = 20 * np.log10(distance_km * 1000) + 20 * np.log10(frequency_mhz * 1e6) - 147.55
        
        return fspl_db
    
    def get_status(self) -> Dict[str, Any]:
        """Get terrain interface status."""
        return {
            "loaded": self._is_loaded,
            "source": self.terrain_data.source,
            "data_path": self.data_path,
            "note": "SPLAT! integration is a future feature. Currently using free-space model."
        }


# Global terrain interface instance (singleton pattern)
_terrain_interface: Optional[TerrainInterface] = None


def get_terrain_interface(data_path: Optional[str] = None) -> TerrainInterface:
    """Get or create the global terrain interface instance."""
    global _terrain_interface
    if _terrain_interface is None:
        _terrain_interface = TerrainInterface(data_path)
    return _terrain_interface



# ============================================================================
# Transmission Result
# ============================================================================

@dataclass
class TransmissionResult:
    """Result of a transmission request."""
    status: TransmissionStatus
    mode: TransmissionMode
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    samples_processed: int = 0
    power_simulated_dbm: float = 0.0
    frequency_mhz: float = 0.0
    message: str = ""
    
    # Simulation-specific metrics
    simulation_duration_ms: float = 0.0
    
    # Safety flags
    was_hardware_attempted: bool = False
    safety_block_reason: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to API-friendly dictionary."""
        return {
            "status": self.status.value,
            "mode": self.mode.value,
            "timestamp": self.timestamp.isoformat(),
            "samples_processed": self.samples_processed,
            "power_simulated_dbm": self.power_simulated_dbm,
            "frequency_mhz": self.frequency_mhz,
            "message": self.message,
            "simulation_duration_ms": self.simulation_duration_ms,
            "was_hardware_attempted": self.was_hardware_attempted,
            "safety_block_reason": self.safety_block_reason
        }


# ============================================================================
# RF Adapter Class
# ============================================================================

class RFAdapter:
    """
    RF Front-End Abstraction Layer.
    
    This class provides a clean interface for RF operations while
    enforcing simulation-only mode for safety.
    
    ARCHITECTURE POSITION:
    ```
    [ Human Engineer ]
            ↓
    [ AI Control Plane ] ← We are here
            ↓
    [ RFAdapter ] ← This module
            ↓
    [ Encoder / Exciter ] ← Vendor hardware (NOT connected)
            ↓
    [ RF Hardware ] ← Licensed transmission (NOT implemented)
    ```
    
    This system replaces manual engineering decisions,
    NOT certified RF hardware.
    """
    
    _instance = None
    
    def __new__(cls, mode: TransmissionMode = TransmissionMode.SIMULATION):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, mode: TransmissionMode = TransmissionMode.SIMULATION):
        if self._initialized:
            return
        
        # Force simulation mode with warning for other modes
        if mode != TransmissionMode.SIMULATION:
            warnings.warn(
                f"⚠️ Mode '{mode.value}' is NOT IMPLEMENTED. "
                f"RF transmission is not enabled in this system. "
                f"Falling back to SIMULATION mode for safety.",
                UserWarning
            )
            self._requested_mode = mode
            self._active_mode = TransmissionMode.SIMULATION
        else:
            self._requested_mode = mode
            self._active_mode = mode
        
        self._transmission_log: List[TransmissionResult] = []
        self._initialized = True
    
    @property
    def mode(self) -> TransmissionMode:
        """Current active transmission mode (always SIMULATION)."""
        return self._active_mode
    
    @property
    def is_simulation_only(self) -> bool:
        """Whether the adapter is in simulation-only mode."""
        return self._active_mode == TransmissionMode.SIMULATION
    
    def get_mode_info(self) -> Dict[str, Any]:
        """Get information about current mode and available modes."""
        return {
            "active_mode": self._active_mode.value,
            "requested_mode": self._requested_mode.value,
            "is_simulation_only": self.is_simulation_only,
            "available_modes": {
                TransmissionMode.SIMULATION.value: {
                    "status": "enabled",
                    "description": "Simulated transmission for testing and visualization"
                },
                TransmissionMode.SDR_LAB.value: {
                    "status": "stubbed",
                    "description": HARDWARE_STUBS[TransmissionMode.SDR_LAB].implementation_notes
                },
                TransmissionMode.COMMERCIAL_ENCODER.value: {
                    "status": "stubbed",
                    "description": HARDWARE_STUBS[TransmissionMode.COMMERCIAL_ENCODER].implementation_notes
                }
            },
            "safety_notice": "This system does NOT transmit RF signals. All operations are simulated."
        }
    
    def transmit(
        self,
        iq_samples: np.ndarray,
        frequency_mhz: float = 600.0,
        power_dbm: float = 35.0,
        config: Optional[Dict[str, Any]] = None
    ) -> TransmissionResult:
        """
        Process a transmission request.
        
        In SIMULATION mode (the only enabled mode), this:
        - Validates the I/Q samples
        - Logs the simulated transmission
        - Returns success without actual RF output
        
        Args:
            iq_samples: Complex I/Q samples (numpy array)
            frequency_mhz: Target frequency
            power_dbm: Target power level
            config: Additional configuration
            
        Returns:
            TransmissionResult with status and metrics
            
        NOTE: This does NOT generate actual RF transmission.
        """
        import time
        start_time = time.time()
        
        # Validate samples
        if not isinstance(iq_samples, np.ndarray):
            return TransmissionResult(
                status=TransmissionStatus.ERROR,
                mode=self._active_mode,
                message="Invalid I/Q samples: must be numpy array"
            )
        
        num_samples = len(iq_samples)
        
        # Simulation mode processing
        if self._active_mode == TransmissionMode.SIMULATION:
            # Calculate metrics from samples
            avg_power = np.mean(np.abs(iq_samples) ** 2) if num_samples > 0 else 0
            
            # Simulate processing time
            duration_ms = (time.time() - start_time) * 1000
            
            result = TransmissionResult(
                status=TransmissionStatus.SIMULATED,
                mode=TransmissionMode.SIMULATION,
                samples_processed=num_samples,
                power_simulated_dbm=power_dbm,
                frequency_mhz=frequency_mhz,
                message=f"Simulated transmission of {num_samples} samples. No RF output.",
                simulation_duration_ms=round(duration_ms, 2),
                was_hardware_attempted=False
            )
        else:
            # Should not reach here, but safety block anyway
            result = TransmissionResult(
                status=TransmissionStatus.BLOCKED,
                mode=self._active_mode,
                samples_processed=0,
                message="Transmission blocked: hardware mode not implemented",
                was_hardware_attempted=False,
                safety_block_reason="Non-simulation modes are not implemented"
            )
        
        # Log the transmission
        self._transmission_log.append(result)
        
        return result
    
    def get_transmission_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent transmission log entries."""
        recent = self._transmission_log[-limit:]
        return [r.to_dict() for r in recent]
    
    def check_hardware_status(self) -> Dict[str, Any]:
        """
        Check status of hardware interfaces.
        
        All hardware is currently stubbed/not connected.
        This method documents what would be required for real integration.
        """
        return {
            "overall_status": "simulation_only",
            "hardware": {
                mode.value: {
                    "name": stub.name,
                    "connected": False,
                    "implemented": stub.is_implemented,
                    "notes": stub.implementation_notes,
                    "required_deps": stub.required_dependencies
                }
                for mode, stub in HARDWARE_STUBS.items()
            },
            "safety_message": (
                "Hardware transmission is intentionally disabled. "
                "This system is a control and optimization layer, "
                "not a certified broadcast transmitter."
            )
        }
    
    def validate_for_transmission(
        self,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate configuration before (simulated) transmission.
        
        Checks power limits, frequency validity, etc.
        """
        warnings_list = []
        errors = []
        
        # Power check
        power = config.get("power_dbm", 35)
        if power > 50:
            warnings_list.append(f"Power {power}dBm exceeds typical broadcast limits")
        if power < 10:
            warnings_list.append(f"Power {power}dBm is unusually low")
        
        # Frequency check
        freq = config.get("frequency_mhz", 600)
        # UHF TV band check (simplified)
        if freq < 470 or freq > 698:
            warnings_list.append(f"Frequency {freq}MHz is outside typical UHF TV band")
        
        # Bandwidth check
        bw = config.get("bandwidth_mhz", 6)
        if bw > 8:
            errors.append(f"Bandwidth {bw}MHz exceeds maximum")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings_list,
            "mode": self._active_mode.value,
            "transmission_enabled": False,  # Always false - simulation only
            "note": "Validation passed but transmission is simulated only"
        }


# ============================================================================
# API Router
# ============================================================================

from fastapi import APIRouter

router = APIRouter()

# Global singleton
rf_adapter = RFAdapter()


@router.get("/status")
async def get_rf_status():
    """Get RF adapter status and mode information."""
    return rf_adapter.get_mode_info()


@router.get("/hardware")
async def get_hardware_status():
    """Get hardware connection status (all stubbed)."""
    return rf_adapter.check_hardware_status()


@router.get("/transmission-log")
async def get_transmission_log(limit: int = 50):
    """Get recent transmission log."""
    return {
        "log": rf_adapter.get_transmission_log(limit),
        "note": "All transmissions are simulated. No RF output."
    }


@router.post("/validate")
async def validate_config(config: Dict[str, Any]):
    """Validate configuration for (simulated) transmission."""
    return rf_adapter.validate_for_transmission(config)
