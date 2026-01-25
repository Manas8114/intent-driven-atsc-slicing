"""
ble_adapter.py - BLE Broadcasting Demo Adapter

This module encodes AI cognitive state into compact BLE packets for demonstration.
Used to show how AI-optimized configurations propagate to receivers.

DEMO FRAMING:
"Bluetooth is used as a control-plane signaling demo to show how AI-optimized
broadcast configurations would propagate to receivers. This is NOT RF transmission."

BLE Packet Structure (20 bytes):
[0]     Version (uint8)
[1]     Delivery Mode (uint8): 0=unicast, 1=multicast, 2=broadcast
[2]     Coverage % (uint8): 0-100
[3]     SNR dB (int8): stored as uint8 with offset 128
[4]     Modulation (uint8): 0=QPSK, 1=16QAM, 2=64QAM, 3=256QAM
[5]     Power dBm (int8): stored as uint8 with offset 128
[6]     Coding Rate (uint8): 0=5/15, 1=7/15, 2=9/15, 3=11/15
[7]     Emergency Flag (uint8): 0=normal, 1=emergency
[8-9]   Timestamp (uint16): seconds since epoch % 65536
[10-11] Hurdle Code (uint16): encoded active hurdle
[12-19] Reserved (zero-padded)
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import struct
import time
import binascii

router = APIRouter()

# Version for BLE packet format
BLE_PACKET_VERSION = 1
BLE_PACKET_SIZE = 20

# Service UUID for BLE advertising (custom UUID for this demo)
BLE_SERVICE_UUID = "12345678-1234-5678-1234-56789ABCDEF0"
BLE_CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789ABCDEF1"

# Encoding maps
DELIVERY_MODE_MAP = {"unicast": 0, "multicast": 1, "broadcast": 2}
MODULATION_MAP = {"QPSK": 0, "16QAM": 1, "64QAM": 2, "256QAM": 3}
CODING_RATE_MAP = {"5/15": 0, "7/15": 1, "9/15": 2, "11/15": 3}
HURDLE_MAP = {
    None: 0, "reset": 0,
    "coverage_drop": 1, "interference": 2, "spectrum_reduction": 3,
    "traffic_surge": 4, "emergency_escalation": 5, "cellular_congestion": 6,
    "mobility_surge": 7, "monsoon": 8, "flash_crowd": 9, "tower_failure": 10
}

# Operator Intent Map - The GOAL, not the configuration
# This is what gets broadcast - receivers auto-adjust based on intent
INTENT_MAP = {
    "maximize_coverage": 0,      # Reach as many users as possible
    "maximize_throughput": 1,    # High data rate priority
    "minimize_latency": 2,       # Real-time applications
    "emergency_response": 3,     # Emergency broadcast priority
    "power_efficient": 4,        # Battery/power conservation
    "rural_priority": 5,         # Focus on underserved areas
    "urban_dense": 6,            # High-density urban optimization
    "balanced": 7,               # Default balanced mode
}

# Reverse maps for decoding
DELIVERY_MODE_REVERSE = {v: k for k, v in DELIVERY_MODE_MAP.items()}
MODULATION_REVERSE = {v: k for k, v in MODULATION_MAP.items()}
CODING_RATE_REVERSE = {v: k for k, v in CODING_RATE_MAP.items()}
HURDLE_REVERSE = {v: k if k else "none" for k, v in HURDLE_MAP.items()}
INTENT_REVERSE = {v: k for k, v in INTENT_MAP.items()}


class BLEPacket(BaseModel):
    """BLE packet representation."""
    hex_string: str
    base64: str
    size_bytes: int
    version: int
    decoded: Dict[str, Any]
    service_uuid: str = BLE_SERVICE_UUID
    characteristic_uuid: str = BLE_CHARACTERISTIC_UUID


class AIStateForBLE(BaseModel):
    """AI state structure for BLE encoding."""
    delivery_mode: str = "broadcast"
    coverage_percent: float = 85.0
    snr_db: float = 18.0
    modulation: str = "QPSK"
    power_dbm: float = 35.0
    coding_rate: str = "5/15"
    is_emergency: bool = False
    active_hurdle: Optional[str] = None


def encode_ai_state(state: AIStateForBLE) -> bytes:
    """
    Encode AI state into a 20-byte BLE packet.
    
    Uses struct packing for efficient binary encoding.
    All values are normalized to fit within byte ranges.
    """
    # Clamp and convert values
    coverage = max(0, min(100, int(state.coverage_percent)))
    snr = max(-128, min(127, int(state.snr_db))) + 128  # Offset to unsigned
    power = max(-128, min(127, int(state.power_dbm))) + 128  # Offset to unsigned
    timestamp = int(time.time()) % 65536
    
    delivery_mode = DELIVERY_MODE_MAP.get(state.delivery_mode, 2)
    modulation = MODULATION_MAP.get(state.modulation, 0)
    coding_rate = CODING_RATE_MAP.get(state.coding_rate, 0)
    hurdle = HURDLE_MAP.get(state.active_hurdle, 0)
    emergency = 1 if state.is_emergency else 0
    
    # Pack into binary format
    # Format: 8 bytes of data + 2 bytes timestamp + 2 bytes hurdle + 6 bytes reserved + 2 bytes CRC
    # Reserved reduced to 6 bytes to make room for CRC
    
    # 1. Pack the Data and Header (First 12 Bytes)
    header_data = struct.pack(
        '>BBBBBBBBHH',  # Big-endian, 8 uint8, 2 uint16
        BLE_PACKET_VERSION,     # [0] Version
        delivery_mode,          # [1] Delivery mode
        coverage,               # [2] Coverage %
        snr,                    # [3] SNR (offset)
        modulation,             # [4] Modulation
        power,                  # [5] Power (offset)
        coding_rate,            # [6] Coding rate
        emergency,              # [7] Emergency flag
        timestamp,              # [8-9] Timestamp
        hurdle,                 # [10-11] Hurdle code
    )
    
    # 2. Calculate CRC16-CCITT (0xFFFF init, 0x1021 poly)
    crc = 0xFFFF
    for byte in header_data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc = crc << 1
            crc &= 0xFFFF
            
    # 3. Final Packet = Header + Reserved(6) + CRC(2)
    packet = header_data + (b'\x00' * 6) + struct.pack('>H', crc)
    
    return packet


def decode_ble_packet(packet: bytes) -> Dict[str, Any]:
    """
    Decode a 20-byte BLE packet back to AI state.
    """
    if len(packet) < 12:
        raise ValueError(f"Packet too short: {len(packet)} bytes (need at least 12)")
    
    # Unpack the packet
    unpacked = struct.unpack('>BBBBBBBBHH', packet[:12])
    
    version = unpacked[0]
    delivery_mode = DELIVERY_MODE_REVERSE.get(unpacked[1], "unknown")
    coverage = unpacked[2]
    snr = unpacked[3] - 128  # Remove offset
    modulation = MODULATION_REVERSE.get(unpacked[4], "unknown")
    power = unpacked[5] - 128  # Remove offset
    coding_rate = CODING_RATE_REVERSE.get(unpacked[6], "unknown")
    is_emergency = unpacked[7] == 1
    timestamp = unpacked[8]
    hurdle_code = unpacked[9]
    hurdle = HURDLE_REVERSE.get(hurdle_code, "unknown")
    
    return {
        "version": version,
        "delivery_mode": delivery_mode,
        "coverage_percent": coverage,
        "snr_db": snr,
        "modulation": modulation,
        "power_dbm": power,
        "coding_rate": coding_rate,
        "is_emergency": is_emergency,
        "timestamp_offset": timestamp,
        "active_hurdle": hurdle if hurdle != "none" else None
    }


def get_current_ai_state() -> AIStateForBLE:
    """
    Get current AI cognitive state from the system.
    """
    try:
        from .environment import get_env_state
        from .simulation_state import get_simulation_state
        
        env = get_env_state()
        sim = get_simulation_state()
        
        last_action = sim.last_action or {}
        
        return AIStateForBLE(
            delivery_mode=last_action.get("delivery_mode", "broadcast"),
            coverage_percent=last_action.get("expected_coverage", 85.0),
            snr_db=last_action.get("avg_snr_db", 18.0),
            modulation=last_action.get("modulation", "QPSK"),
            power_dbm=last_action.get("power_dbm", 35.0),
            coding_rate=last_action.get("coding_rate", "5/15"),
            is_emergency=env.is_emergency_active,
            active_hurdle=env.active_hurdle
        )
    except Exception as e:
        # Fallback to defaults if modules not available
        print(f"BLE Adapter: Using defaults ({e})")
        return AIStateForBLE()


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/packet", response_model=BLEPacket)
async def get_ble_packet():
    """
    Get the current AI state encoded as a BLE packet.
    
    Returns:
    - hex_string: Hexadecimal representation of the packet
    - base64: Base64 encoded packet (for mobile apps)
    - decoded: Human-readable decoded values
    - service_uuid: BLE service UUID to advertise
    - characteristic_uuid: BLE characteristic UUID
    
    Use this endpoint to get data for BLE advertising.
    """
    import base64
    
    state = get_current_ai_state()
    packet = encode_ai_state(state)
    decoded = decode_ble_packet(packet)
    
    return BLEPacket(
        hex_string=binascii.hexlify(packet).decode('ascii').upper(),
        base64=base64.b64encode(packet).decode('ascii'),
        size_bytes=len(packet),
        version=BLE_PACKET_VERSION,
        decoded=decoded
    )


@router.get("/state")
async def get_ble_state():
    """
    Get the current AI cognitive state for BLE broadcasting.
    
    Returns the state in a format suitable for display on mobile receivers.
    """
    state = get_current_ai_state()
    
    return {
        "delivery_mode": state.delivery_mode,
        "coverage_percent": round(state.coverage_percent, 1),
        "snr_db": round(state.snr_db, 1),
        "modulation": state.modulation,
        "power_dbm": round(state.power_dbm, 1),
        "coding_rate": state.coding_rate,
        "is_emergency": state.is_emergency,
        "active_hurdle": state.active_hurdle,
        "timestamp": int(time.time()),
        "framing_note": "BLE is used as control-plane signaling demo, not RF transmission"
    }


@router.get("/config")
async def get_ble_config():
    """
    Get BLE configuration for mobile apps.
    
    Returns UUIDs and settings needed to set up BLE advertising/scanning.
    """
    return {
        "service_uuid": BLE_SERVICE_UUID,
        "characteristic_uuid": BLE_CHARACTERISTIC_UUID,
        "packet_size": BLE_PACKET_SIZE,
        "packet_version": BLE_PACKET_VERSION,
        "broadcast_interval_ms": 2000,
        "scan_interval_ms": 1000,
        "encoding": {
            "delivery_modes": list(DELIVERY_MODE_MAP.keys()),
            "modulations": list(MODULATION_MAP.keys()),
            "coding_rates": list(CODING_RATE_MAP.keys()),
            "hurdles": list(HURDLE_MAP.keys())
        },
        "demo_framing": {
            "title": "Control-Plane Signaling Demo",
            "description": "BLE simulates how AI-optimized configurations propagate to broadcast receivers",
            "disclaimer": "This is NOT RF transmission - it's a visual demonstration of the AI layer"
        }
    }


@router.post("/decode")
async def decode_packet(hex_string: str):
    """
    Decode a BLE packet from hex string.
    
    Useful for debugging and verification.
    """
    try:
        packet = binascii.unhexlify(hex_string)
        decoded = decode_ble_packet(packet)
        return {"status": "success", "decoded": decoded}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_current_intent() -> str:
    """
    Determine current operator intent based on system state.
    Intent = the GOAL, not the configuration.
    """
    try:
        from .environment import get_env_state
        env = get_env_state()
        
        # Map system state to operator intent
        if env.is_emergency_active:
            return "emergency_response"
        elif env.active_hurdle in ["flash_crowd", "traffic_surge"]:
            return "maximize_throughput"
        elif env.active_hurdle in ["coverage_drop", "tower_failure"]:
            return "maximize_coverage"
        elif env.active_hurdle in ["monsoon", "interference"]:
            return "rural_priority"
        elif env.active_hurdle == "cellular_congestion":
            return "urban_dense"
        else:
            return "balanced"
    except Exception:
        return "balanced"


def get_intent_adjustments(intent: str) -> dict:
    """
    Get automatic adjustments receivers should make based on intent.
    """
    adjustments = {
        "maximize_coverage": {
            "priority": "COVERAGE",
            "power_mode": "MAXIMUM",
            "modulation": "ROBUST (QPSK)",
            "behavior": "Extend reach to all users"
        },
        "maximize_throughput": {
            "priority": "SPEED",
            "power_mode": "ADAPTIVE",
            "modulation": "HIGH-ORDER (256QAM)",
            "behavior": "Prioritize data rate"
        },
        "minimize_latency": {
            "priority": "LATENCY",
            "power_mode": "STANDARD",
            "modulation": "BALANCED (64QAM)",
            "behavior": "Real-time optimization"
        },
        "emergency_response": {
            "priority": "EMERGENCY",
            "power_mode": "MAXIMUM",
            "modulation": "ROBUST (QPSK)",
            "behavior": "Override all - emergency broadcast"
        },
        "power_efficient": {
            "priority": "EFFICIENCY",
            "power_mode": "MINIMUM",
            "modulation": "ADAPTIVE",
            "behavior": "Conserve power resources"
        },
        "rural_priority": {
            "priority": "RURAL",
            "power_mode": "MAXIMUM",
            "modulation": "ROBUST (QPSK)",
            "behavior": "Focus on underserved areas"
        },
        "urban_dense": {
            "priority": "URBAN",
            "power_mode": "ADAPTIVE",
            "modulation": "HIGH-ORDER (256QAM)",
            "behavior": "High-density optimization"
        },
        "balanced": {
            "priority": "BALANCED",
            "power_mode": "STANDARD",
            "modulation": "BALANCED (64QAM)",
            "behavior": "Normal operation"
        }
    }
    return adjustments.get(intent, adjustments["balanced"])


@router.get("/intent")
async def get_operator_intent():
    """
    Get the current operator intent - the GOAL being broadcast.
    
    Intent tells receivers what the network is trying to achieve.
    Receivers automatically adjust their priorities to match.
    
    This is the key concept: broadcast the GOAL, not the configuration.
    """
    intent = get_current_intent()
    adjustments = get_intent_adjustments(intent)
    
    return {
        "intent": intent,
        "intent_code": INTENT_MAP.get(intent, 7),
        "display_name": intent.replace("_", " ").upper(),
        "description": adjustments["behavior"],
        "auto_adjustments": adjustments,
        "timestamp": int(time.time()),
        "concept": "Intent = the GOAL. Receivers auto-adjust based on this intent."
    }

