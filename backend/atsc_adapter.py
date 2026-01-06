"""
atsc_adapter.py - ATSC 3.0 Protocol Adapter

This module provides ATSC 3.0 A/330, A/331, A/322 compliant operations:
- PLP (Physical Layer Pipe) configuration and validation
- SLT (Service List Table) XML generation
- LLS (Low-Level Signaling) XML generation
- Full spec validation against ATSC 3.0 constraints

References:
- ATSC A/330: Link Layer Protocol
- ATSC A/331: Signaling, Delivery, Synchronization, and Error Protection
- ATSC A/322: Physical Layer Protocol
"""

import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum, IntEnum


# ============================================================================
# ATSC 3.0 A/330 PLP Constraints
# ============================================================================

class PLPFECType(Enum):
    """Valid FEC types from A/322"""
    BCH = "BCH"
    LDPC_16K = "LDPC_16K"
    LDPC_64K = "LDPC_64K"


class PLPCodeRate(Enum):
    """Valid LDPC code rates from A/322"""
    CR_2_15 = "2/15"
    CR_3_15 = "3/15"
    CR_4_15 = "4/15"
    CR_5_15 = "5/15"
    CR_6_15 = "6/15"
    CR_7_15 = "7/15"
    CR_8_15 = "8/15"
    CR_9_15 = "9/15"
    CR_10_15 = "10/15"
    CR_11_15 = "11/15"
    CR_12_15 = "12/15"
    CR_13_15 = "13/15"


class ServiceCategory(IntEnum):
    """Service categories from A/331 Table 6.4"""
    ATSC_RESERVED = 0
    LINEAR_AV_SERVICE = 1
    LINEAR_AUDIO_ONLY = 2
    APP_BASED_SERVICE = 3
    ESG_SERVICE = 4
    EAS_SERVICE = 5


class SLSProtocol(IntEnum):
    """SLS Protocol values from A/331"""
    ATSC_RESERVED = 0
    ROUTE = 1
    MMTP = 2


# Full PLP constraints from A/330 and A/322
PLP_CONSTRAINTS = {
    # Maximum number of PLPs per ATSC 3.0 frame
    "max_plps_per_frame": 64,
    
    # Valid modulation types
    "valid_modulations": ["QPSK", "16QAM", "64QAM", "256QAM"],
    
    # Valid coding rates (LDPC)
    "valid_coding_rates": [
        "2/15", "3/15", "4/15", "5/15", "6/15", "7/15",
        "8/15", "9/15", "10/15", "11/15", "12/15", "13/15"
    ],
    
    # Legacy coding rates for backward compatibility
    "legacy_coding_rates": ["1/2", "2/3", "3/4", "5/6", "7/8"],
    
    # Valid FEC types
    "valid_fec_types": ["BCH", "LDPC_16K", "LDPC_64K"],
    
    # Valid time interleaver depths (symbols)
    "valid_interleaver_depths": [0, 16, 32, 64, 128, 256, 512, 1024],
    
    # Max FEC block sizes (bits)
    "max_fec_block_size_16k": 16200,
    "max_fec_block_size_64k": 64800,
    
    # Channel bandwidth options (MHz)
    "valid_bandwidths_mhz": [6.0, 7.0, 8.0],
    
    # Power limits (dBm EIRP)
    "max_power_dbm": 57.0,  # FCC limit for LPTV
    "min_power_dbm": -10.0,
    
    # PLP ID range
    "min_plp_id": 0,
    "max_plp_id": 63,
    
    # L1 signaling constraints
    "max_l1b_size_bytes": 2048,
    "max_l1d_size_bytes": 8192,
    
    # Bootstrap constraints
    "valid_fft_sizes": [8192, 16384, 32768],
    "valid_guard_intervals": ["1/16", "1/32", "1/64", "1/128", "1/256"],
}


@dataclass
class PLPConfig:
    """Complete PLP configuration structure"""
    plp_id: int
    modulation: str
    coding_rate: str
    power_dbm: float
    bandwidth_mhz: float
    priority: str
    fec_type: str = "LDPC_64K"
    time_interleaver_depth: int = 0
    layer: int = 0  # For LDM (Layered Division Multiplexing)
    layer_power_ratio: float = 0.0  # dB for LDM
    service_id: Optional[int] = None
    description: str = ""


# ============================================================================
# Validation Functions
# ============================================================================

def validate_plp_config(plp_config: Dict[str, Any]) -> None:
    """
    Validate that a PLP configuration conforms to ATSC 3.0 constraints.
    
    Performs basic validation (modulation and coding rate only).
    For comprehensive validation, use validate_plp_config_full().

    Raises:
        ValueError: If any parameter is out of the allowed range.
    """
    mod = plp_config.get("modulation")
    cr = plp_config.get("coding_rate")
    
    # Check modulation
    if mod not in PLP_CONSTRAINTS["valid_modulations"]:
        raise ValueError(
            f"Invalid modulation '{mod}'. "
            f"Must be one of {PLP_CONSTRAINTS['valid_modulations']}"
        )
    
    # Check coding rate (support both new and legacy formats)
    all_valid_rates = (
        PLP_CONSTRAINTS["valid_coding_rates"] + 
        PLP_CONSTRAINTS["legacy_coding_rates"]
    )
    if cr not in all_valid_rates:
        raise ValueError(
            f"Invalid coding rate '{cr}'. "
            f"Must be one of {PLP_CONSTRAINTS['valid_coding_rates']}"
        )


def validate_plp_config_full(plp_config: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Comprehensive PLP configuration validation against ATSC 3.0 A/330 constraints.
    
    Args:
        plp_config: PLP configuration dictionary
        
    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []
    
    # PLP ID validation
    plp_id = plp_config.get("plp_id", 0)
    if not isinstance(plp_id, int):
        errors.append(f"PLP ID must be an integer, got {type(plp_id)}")
    elif plp_id < PLP_CONSTRAINTS["min_plp_id"] or plp_id > PLP_CONSTRAINTS["max_plp_id"]:
        errors.append(
            f"PLP ID {plp_id} out of range. "
            f"Must be {PLP_CONSTRAINTS['min_plp_id']}-{PLP_CONSTRAINTS['max_plp_id']}"
        )
    
    # Modulation validation
    mod = plp_config.get("modulation")
    if mod not in PLP_CONSTRAINTS["valid_modulations"]:
        errors.append(
            f"Invalid modulation '{mod}'. "
            f"Valid options: {PLP_CONSTRAINTS['valid_modulations']}"
        )
    
    # Coding rate validation
    cr = plp_config.get("coding_rate")
    all_valid_rates = (
        PLP_CONSTRAINTS["valid_coding_rates"] + 
        PLP_CONSTRAINTS["legacy_coding_rates"]
    )
    if cr not in all_valid_rates:
        errors.append(
            f"Invalid coding rate '{cr}'. "
            f"Valid options: {PLP_CONSTRAINTS['valid_coding_rates']}"
        )
    
    # Power validation
    power = plp_config.get("power_dbm", 0)
    if power > PLP_CONSTRAINTS["max_power_dbm"]:
        errors.append(
            f"Power {power} dBm exceeds maximum {PLP_CONSTRAINTS['max_power_dbm']} dBm"
        )
    if power < PLP_CONSTRAINTS["min_power_dbm"]:
        errors.append(
            f"Power {power} dBm below minimum {PLP_CONSTRAINTS['min_power_dbm']} dBm"
        )
    
    # Bandwidth validation
    bw = plp_config.get("bandwidth_mhz", 6.0)
    if bw not in PLP_CONSTRAINTS["valid_bandwidths_mhz"]:
        errors.append(
            f"Invalid bandwidth {bw} MHz. "
            f"Valid options: {PLP_CONSTRAINTS['valid_bandwidths_mhz']}"
        )
    
    # FEC type validation
    fec = plp_config.get("fec_type", "LDPC_64K")
    if fec and fec not in PLP_CONSTRAINTS["valid_fec_types"]:
        errors.append(
            f"Invalid FEC type '{fec}'. "
            f"Valid options: {PLP_CONSTRAINTS['valid_fec_types']}"
        )
    
    # Time interleaver depth validation
    ti_depth = plp_config.get("time_interleaver_depth", 0)
    if ti_depth not in PLP_CONSTRAINTS["valid_interleaver_depths"]:
        errors.append(
            f"Invalid time interleaver depth {ti_depth}. "
            f"Valid options: {PLP_CONSTRAINTS['valid_interleaver_depths']}"
        )
    
    # Priority validation
    priority = plp_config.get("priority", "medium")
    if priority not in ["high", "medium", "low"]:
        errors.append(f"Invalid priority '{priority}'. Must be high/medium/low")
    
    return len(errors) == 0, errors


def validate_multiple_plps(plp_configs: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    """
    Validate a set of PLP configurations for consistency.
    
    Checks for:
    - Duplicate PLP IDs
    - Total number of PLPs
    - Total bandwidth allocation
    
    Args:
        plp_configs: List of PLP configurations
        
    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []
    
    # Check total count
    if len(plp_configs) > PLP_CONSTRAINTS["max_plps_per_frame"]:
        errors.append(
            f"Too many PLPs ({len(plp_configs)}). "
            f"Maximum is {PLP_CONSTRAINTS['max_plps_per_frame']}"
        )
    
    # Check for duplicate IDs
    plp_ids = [p.get("plp_id", i) for i, p in enumerate(plp_configs)]
    seen_ids = set()
    for plp_id in plp_ids:
        if plp_id in seen_ids:
            errors.append(f"Duplicate PLP ID: {plp_id}")
        seen_ids.add(plp_id)
    
    # Validate each PLP
    for i, config in enumerate(plp_configs):
        is_valid, plp_errors = validate_plp_config_full(config)
        for err in plp_errors:
            errors.append(f"PLP {i}: {err}")
    
    # Check total bandwidth (should not exceed channel width)
    total_bw = sum(p.get("bandwidth_mhz", 0) for p in plp_configs)
    channel_bw = max(p.get("bandwidth_mhz", 6.0) for p in plp_configs) if plp_configs else 6.0
    if total_bw > channel_bw * 1.1:  # Allow 10% overhead
        errors.append(
            f"Total bandwidth ({total_bw:.2f} MHz) exceeds channel capacity"
        )
    
    return len(errors) == 0, errors


# ============================================================================
# PLP Configuration
# ============================================================================

def configure_plp(
    plp_id: int,
    modulation: str,
    coding_rate: str,
    power_dbm: float,
    bandwidth_mhz: float,
    priority: str,
    fec_type: str = "LDPC_64K",
    time_interleaver_depth: int = 0,
    validate: bool = True,
) -> Dict[str, Any]:
    """
    Create a PLP configuration dictionary after validation.
    
    Args:
        plp_id: PLP identifier (0-63)
        modulation: Modulation type (QPSK, 16QAM, 64QAM, 256QAM)
        coding_rate: LDPC code rate (e.g., "5/15")
        power_dbm: Transmit power in dBm
        bandwidth_mhz: Bandwidth allocation in MHz
        priority: Priority level (high/medium/low)
        fec_type: FEC type (BCH, LDPC_16K, LDPC_64K)
        time_interleaver_depth: Time interleaver depth in symbols
        validate: Whether to validate the configuration
        
    Returns:
        PLP configuration dictionary
        
    Raises:
        ValueError: If validation fails and validate=True
    """
    config = {
        "plp_id": plp_id,
        "modulation": modulation,
        "coding_rate": coding_rate,
        "power_dbm": power_dbm,
        "bandwidth_mhz": bandwidth_mhz,
        "priority": priority,
        "fec_type": fec_type,
        "time_interleaver_depth": time_interleaver_depth,
    }
    
    if validate:
        is_valid, errors = validate_plp_config_full(config)
        if not is_valid:
            raise ValueError(f"Invalid PLP configuration: {'; '.join(errors)}")
    
    return config


def configure_emergency_plp(
    plp_id: int = 0,
    power_dbm: float = 40.0,
    bandwidth_mhz: float = 0.5,
) -> Dict[str, Any]:
    """
    Configure a PLP optimized for emergency alerts.
    
    Uses robust modulation (QPSK) and low code rate for maximum reliability.
    
    Returns:
        Emergency-optimized PLP configuration
    """
    return configure_plp(
        plp_id=plp_id,
        modulation="QPSK",
        coding_rate="2/15",  # Most robust code rate
        power_dbm=power_dbm,
        bandwidth_mhz=bandwidth_mhz,
        priority="high",
        fec_type="LDPC_64K",
        time_interleaver_depth=128,  # Maximum interleaving for robustness
    )


# ============================================================================
# XML Generation
# ============================================================================

def generate_slt_xml(plp_config: Dict[str, Any]) -> str:
    """
    Generate a Service List Table (SLT) XML snippet for a given PLP.
    
    The structure follows ATSC A/331 specifications.
    
    Args:
        plp_config: PLP configuration dictionary
        
    Returns:
        SLT XML string
    """
    slt = ET.Element("SLT")
    slt.set("xmlns", "tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/SLT/1.0/")
    slt.set("bsid", str(plp_config.get("bsid", 1)))
    
    service = ET.SubElement(slt, "Service")
    service.set("serviceId", str(plp_config.get("service_id", 1000 + plp_config["plp_id"])))
    service.set("serviceCategory", str(plp_config.get("service_category", 1)))
    service.set("shortServiceName", plp_config.get("service_name", f"Service_{plp_config['plp_id']}"))
    
    # PLP element with configuration
    plp_elem = ET.SubElement(service, "PLP")
    plp_elem.set("id", str(plp_config["plp_id"]))
    ET.SubElement(plp_elem, "Modulation").text = plp_config["modulation"]
    ET.SubElement(plp_elem, "CodingRate").text = plp_config["coding_rate"]
    ET.SubElement(plp_elem, "PowerDbm").text = str(plp_config["power_dbm"])
    ET.SubElement(plp_elem, "BandwidthMhz").text = str(plp_config["bandwidth_mhz"])
    ET.SubElement(plp_elem, "Priority").text = plp_config["priority"]
    
    if "fec_type" in plp_config:
        ET.SubElement(plp_elem, "FECType").text = plp_config["fec_type"]
    if "time_interleaver_depth" in plp_config:
        ET.SubElement(plp_elem, "TimeInterleaverDepth").text = str(plp_config["time_interleaver_depth"])
    
    return ET.tostring(slt, encoding="unicode")


def generate_slt_xml_compliant(
    bsid: int,
    services: List[Dict[str, Any]],
) -> str:
    """
    Generate a fully A/331 compliant SLT XML.
    
    Args:
        bsid: Broadcast Stream ID
        services: List of service configurations
        
    Returns:
        Compliant SLT XML string
    """
    slt = ET.Element("SLT")
    slt.set("xmlns", "tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/SLT/1.0/")
    slt.set("bsid", str(bsid))
    
    for svc in services:
        service = ET.SubElement(slt, "Service")
        service.set("serviceId", str(svc.get("service_id", 1000)))
        service.set("globalServiceID", svc.get("global_service_id", f"urn:atsc:serviceid:svc_{svc.get('service_id', 1000)}"))
        service.set("majorChannelNo", str(svc.get("major_channel", 10)))
        service.set("minorChannelNo", str(svc.get("minor_channel", 1)))
        service.set("serviceCategory", str(svc.get("category", ServiceCategory.LINEAR_AV_SERVICE)))
        service.set("shortServiceName", svc.get("name", "Service"))
        service.set("sltSvcSeqNum", str(svc.get("seq_num", 0)))
        
        # Broadcast service signaling
        bss = ET.SubElement(service, "BroadcastSvcSignaling")
        bss.set("slsProtocol", str(svc.get("sls_protocol", SLSProtocol.MMTP)))
        bss.set("slsDestinationIpAddress", svc.get("dest_ip", "239.255.10.1"))
        bss.set("slsDestinationUdpPort", str(svc.get("dest_port", 51001)))
        bss.set("slsSourceIpAddress", svc.get("source_ip", "172.16.200.1"))
    
    return ET.tostring(slt, encoding="unicode")


def generate_lls_xml(plp_config: Dict[str, Any]) -> str:
    """
    Generate a Low-Level Signalling (LLS) XML snippet for a PLP.
    
    Args:
        plp_config: PLP configuration dictionary
        
    Returns:
        LLS XML string
    """
    lls = ET.Element("LLS")
    lls.set("xmlns", "tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/LLS/1.0/")
    
    service_elem = ET.SubElement(lls, "Service")
    service_elem.set("plpId", str(plp_config["plp_id"]))
    ET.SubElement(service_elem, "ServiceName").text = plp_config.get(
        "service_name", 
        f"Service_{plp_config['plp_id']}"
    )
    ET.SubElement(service_elem, "Priority").text = plp_config["priority"]
    ET.SubElement(service_elem, "Modulation").text = plp_config["modulation"]
    ET.SubElement(service_elem, "CodingRate").text = plp_config["coding_rate"]
    
    return ET.tostring(lls, encoding="unicode")


# ============================================================================
# Explanation Functions
# ============================================================================

def explain_action(action: Dict[str, Any]) -> str:
    """
    Return a human-readable explanation of an ATSC configuration action.
    
    Args:
        action: Action dictionary from the AI engine
        
    Returns:
        Human-readable explanation string
    """
    parts = []
    
    if "plp" in action or "plp_id" in action:
        plp_id = action.get("plp", action.get("plp_id", 0))
        parts.append(f"Configured PLP {plp_id}")
    
    if "modulation" in action:
        parts.append(f"with {action['modulation']} modulation")
    
    if "coding_rate" in action:
        parts.append(f"coding rate {action['coding_rate']}")
    
    if "power_dbm" in action:
        parts.append(f"power {action['power_dbm']:.1f} dBm")
    
    if "bandwidth_mhz" in action:
        parts.append(f"bandwidth {action['bandwidth_mhz']:.2f} MHz")
    
    if "priority" in action:
        parts.append(f"priority {action['priority']}")
    
    if "fec_type" in action:
        parts.append(f"FEC {action['fec_type']}")
    
    if not parts:
        return "No configuration changes."
    
    return ", ".join(parts) + "."


def get_plp_constraints() -> Dict[str, Any]:
    """Return a copy of the PLP constraints dictionary."""
    return PLP_CONSTRAINTS.copy()


# ============================================================================
# Module Test
# ============================================================================

if __name__ == "__main__":
    print("PLP Constraints:")
    for key, value in PLP_CONSTRAINTS.items():
        print(f"  {key}: {value}")
    
    print("\nCreating test PLP configuration...")
    try:
        plp = configure_plp(
            plp_id=0,
            modulation="QPSK",
            coding_rate="5/15",
            power_dbm=35.0,
            bandwidth_mhz=6.0,
            priority="high",
        )
        print(f"  Created: {plp}")
        
        # Generate XML
        slt_xml = generate_slt_xml(plp)
        print(f"\nSLT XML:\n{slt_xml}")
        
        # Test explanation
        print(f"\nExplanation: {explain_action(plp)}")
        
    except ValueError as e:
        print(f"  Error: {e}")
    
    print("\nCreating emergency PLP...")
    emergency_plp = configure_emergency_plp()
    print(f"  Emergency PLP: {emergency_plp}")

