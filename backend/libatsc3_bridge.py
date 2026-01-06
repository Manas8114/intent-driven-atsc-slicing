"""
libatsc3_bridge.py - Python bindings to libatsc3 for real ATSC 3.0 protocol handling.

This module provides:
1. Ctypes bindings to the libatsc3 C library for native protocol parsing
2. Pure Python fallback implementations when the native library is unavailable
3. ATSC 3.0 A/330, A/331, A/332 compliant data structures

Usage:
    bridge = ATSC3Bridge()
    lls_table = bridge.parse_lls_table(raw_bytes)
    is_valid = bridge.validate_slt_structure(slt_xml)
"""

from ctypes import (
    cdll, c_uint8, c_uint16, c_uint32, c_int, c_char_p, c_void_p, c_bool,
    POINTER, Structure, byref, create_string_buffer, sizeof
)
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import IntEnum
import xml.etree.ElementTree as ET
import os
import platform
import gzip
import struct

# ============================================================================
# ATSC 3.0 Constants from A/331 Section 6
# ============================================================================

class LLSTableType(IntEnum):
    """LLS Table ID values from A/331 Table 6.1"""
    SLT = 0x01                      # Service List Table
    RRT = 0x02                      # Region Rating Table
    SYSTEM_TIME = 0x03              # System Time
    AEAT = 0x04                     # Advanced Emergency Alert Table
    ON_SCREEN_MESSAGE = 0x05        # On-screen Message Notification
    RESERVED = 0xFF

class ServiceCategory(IntEnum):
    """Service Category values from A/331 Table 6.4"""
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

# ============================================================================
# C Structure Mirrors (for native library integration)
# ============================================================================

class BroadcastSvcSignaling(Structure):
    """Mirror of broadcast_svc_signaling_t from atsc3_lls.h"""
    _fields_ = [
        ("sls_protocol", c_int),
        ("sls_destination_ip_address", c_char_p),
        ("sls_destination_udp_port", c_char_p),
        ("sls_source_ip_address", c_char_p),
    ]

class ServiceEntry(Structure):
    """Mirror of service_t from atsc3_lls.h"""
    _fields_ = [
        ("service_id", c_uint16),
        ("global_service_id", c_char_p),
        ("major_channel_no", c_uint32),
        ("minor_channel_no", c_uint32),
        ("service_category", c_uint32),
        ("short_service_name", c_char_p),
        ("slt_svc_seq_num", c_uint8),
        ("broadcast_svc_signaling", BroadcastSvcSignaling),
    ]

class SLTTable(Structure):
    """Mirror of slt_table_t from atsc3_lls.h"""
    _fields_ = [
        ("bsid", POINTER(c_int)),
        ("bsid_n", c_int),
        ("slt_capabilities", c_char_p),
        ("service_entry", POINTER(POINTER(ServiceEntry))),
        ("service_entry_n", c_int),
    ]

class SystemTimeTable(Structure):
    """Mirror of system_time_table_t from atsc3_lls.h"""
    _fields_ = [
        ("current_utc_offset", c_int),
        ("ptp_prepend", c_uint16),
        ("leap59", c_bool),
        ("leap61", c_bool),
        ("utc_local_offset", c_char_p),
        ("ds_status", c_bool),
        ("ds_day_of_month", c_uint8),
        ("ds_hour", c_uint8),
    ]

class LLSXMLPayload(Structure):
    """Mirror of lls_xml_payload_t from atsc3_lls.h"""
    _fields_ = [
        ("xml_payload_compressed", POINTER(c_uint8)),
        ("xml_payload_compressed_size", c_uint32),
        ("xml_payload", POINTER(c_uint8)),
        ("xml_payload_size", c_uint32),
    ]

class LLSTable(Structure):
    """Mirror of lls_table_t from atsc3_lls.h"""
    _fields_ = [
        ("lls_table_id", c_uint8),
        ("lls_group_id", c_uint8),
        ("group_count_minus1", c_uint8),
        ("lls_table_version", c_uint8),
        ("raw_xml", LLSXMLPayload),
        # Note: Union members would need additional handling
    ]

# ============================================================================
# Packet Statistics Structures (from atsc3_packet_statistics.h)
# ============================================================================

class PacketIdMPUStats(Structure):
    """Mirror of packet_id_mmt_timed_mpu_stats_t"""
    _fields_ = [
        ("mpu_sequence_number", c_uint32),
        ("mpu_fragmentation_counter", c_uint8),
        ("mpu_sequence_number_last", c_uint32),
        ("mpu_fragmentation_counter_last", c_uint8),
        ("mpu_sequence_number_first", c_uint32),
        ("mpu_fragmentation_counter_first", c_uint8),
        ("mpu_timed_total", c_uint32),
    ]

class GlobalMMTStats(Structure):
    """Mirror of global_mmt_stats_t from atsc3_packet_statistics.h"""
    _fields_ = [
        ("packet_counter_lls_packets_received", c_uint32),
        ("packet_counter_lls_packets_parsed", c_uint32),
        ("packet_counter_lls_packets_parsed_error", c_uint32),
        ("packet_counter_lls_slt_packets_parsed", c_uint32),
        ("packet_counter_lls_slt_update_processed", c_uint32),
        ("packet_counter_mmtp_packets_received", c_uint32),
        ("packet_counter_mmtp_packets_parsed_error", c_uint32),
        ("packet_counter_mmtp_packets_missing", c_uint32),
        ("packet_counter_mmt_mpu", c_uint32),
        ("packet_counter_mmt_timed_mpu", c_uint32),
        ("packet_counter_mmt_nontimed_mpu", c_uint32),
        ("packet_counter_mmt_signaling", c_uint32),
        ("packet_counter_mmt_unknown", c_uint32),
        ("packet_counter_alc_recv", c_uint32),
        ("packet_counter_alc_packets_parsed", c_uint32),
        ("packet_counter_alc_packets_parsed_error", c_uint32),
        ("packet_counter_filtered_ipv4", c_uint32),
        ("packet_counter_total_received", c_uint32),
    ]

# ============================================================================
# Python Data Classes (for pure Python handling)
# ============================================================================

@dataclass
class ServiceInfo:
    """Python representation of an ATSC 3.0 service"""
    service_id: int
    global_service_id: str
    major_channel_no: int
    minor_channel_no: int
    service_category: ServiceCategory
    short_service_name: str
    slt_svc_seq_num: int
    sls_protocol: SLSProtocol
    sls_destination_ip: str
    sls_destination_port: int
    sls_source_ip: str

@dataclass
class SLTInfo:
    """Python representation of a Service List Table"""
    bsid: int
    slt_capabilities: Optional[str]
    services: List[ServiceInfo]

@dataclass
class LLSInfo:
    """Python representation of a Low-Level Signaling table"""
    table_id: LLSTableType
    group_id: int
    group_count: int
    table_version: int
    xml_payload: str
    parsed_data: Any  # SLTInfo, SystemTimeInfo, AEATInfo, etc.

@dataclass
class PacketStatistics:
    """Python representation of packet statistics"""
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

# ============================================================================
# ATSC 3.0 Bridge Class
# ============================================================================

class ATSC3Bridge:
    """
    Bridge to libatsc3 C library with pure Python fallback.
    
    This class provides:
    - Native library bindings when available
    - Pure Python implementations for all functionality
    - ATSC 3.0 A/330, A/331, A/332 compliant operations
    """
    
    # LLS multicast address and port from A/331
    LLS_DST_ADDR = "224.0.23.60"
    LLS_DST_PORT = 4937
    
    def __init__(self, lib_path: Optional[str] = None):
        """
        Initialize the ATSC3 bridge.
        
        Args:
            lib_path: Optional path to libatsc3 shared library.
                     If None, auto-detects based on platform.
        """
        self.lib = None
        self.native_available = False
        self._stats = PacketStatistics()
        
        if lib_path is None:
            lib_path = self._get_default_lib_path()
        
        if lib_path and os.path.exists(lib_path):
            try:
                self.lib = cdll.LoadLibrary(lib_path)
                self._setup_native_functions()
                self.native_available = True
            except OSError as e:
                print(f"Warning: Could not load libatsc3: {e}")
                print("Using pure Python implementation.")
    
    def _get_default_lib_path(self) -> Optional[str]:
        """Get default library path based on platform."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        lib_dir = os.path.join(base_dir, "libatsc3", "build")
        
        system = platform.system()
        if system == "Windows":
            return os.path.join(lib_dir, "Release", "atsc3.dll")
        elif system == "Linux":
            return os.path.join(lib_dir, "libatsc3.so")
        elif system == "Darwin":
            return os.path.join(lib_dir, "libatsc3.dylib")
        return None
    
    def _setup_native_functions(self):
        """Configure function signatures for native library calls."""
        if not self.lib:
            return
            
        # lls_table_create
        self.lib.lls_table_create.argtypes = [POINTER(c_uint8), c_int]
        self.lib.lls_table_create.restype = POINTER(LLSTable)
        
        # lls_table_free
        self.lib.lls_table_free.argtypes = [POINTER(LLSTable)]
        self.lib.lls_table_free.restype = None
        
        # lls_dump_instance_table
        self.lib.lls_dump_instance_table.argtypes = [POINTER(LLSTable)]
        self.lib.lls_dump_instance_table.restype = None
    
    # ========================================================================
    # LLS Parsing
    # ========================================================================
    
    def parse_lls_table(self, raw_bytes: bytes) -> Optional[LLSInfo]:
        """
        Parse raw LLS table bytes into structured data.
        
        Args:
            raw_bytes: Raw LLS table bytes as received from UDP.
            
        Returns:
            LLSInfo object or None if parsing fails.
        """
        if len(raw_bytes) < 4:
            return None
        
        # Parse header (first 4 bytes)
        lls_table_id = raw_bytes[0]
        lls_group_id = raw_bytes[1]
        group_count_minus1 = raw_bytes[2]
        lls_table_version = raw_bytes[3]
        
        # Decompress payload (gzip compressed per A/331)
        try:
            xml_payload = gzip.decompress(raw_bytes[4:]).decode('utf-8')
        except Exception:
            # Not compressed or invalid
            xml_payload = raw_bytes[4:].decode('utf-8', errors='ignore')
        
        # Parse based on table type
        parsed_data = None
        table_type = LLSTableType.RESERVED
        
        try:
            if lls_table_id <= 5:
                table_type = LLSTableType(lls_table_id)
        except ValueError:
            # Invalid or unknown table ID, treat as RESERVED
            pass
        
        if table_type == LLSTableType.SLT:
            parsed_data = self._parse_slt_xml(xml_payload)
        elif table_type == LLSTableType.SYSTEM_TIME:
            parsed_data = self._parse_system_time_xml(xml_payload)
        elif table_type == LLSTableType.AEAT:
            parsed_data = self._parse_aeat_xml(xml_payload)
        
        self._stats.lls_packets_received += 1
        self._stats.lls_packets_parsed += 1
        
        return LLSInfo(
            table_id=table_type,
            group_id=lls_group_id,
            group_count=group_count_minus1 + 1,
            table_version=lls_table_version,
            xml_payload=xml_payload,
            parsed_data=parsed_data
        )
    
    def _parse_slt_xml(self, xml_str: str) -> Optional[SLTInfo]:
        """Parse SLT XML into SLTInfo structure."""
        try:
            root = ET.fromstring(xml_str)
            
            # Get BSID from SLT element
            bsid = int(root.get('bsid', '0'))
            slt_capabilities = root.get('sltCapabilities')
            
            services = []
            for service_elem in root.findall('.//Service'):
                # Parse BroadcastSvcSignaling
                bss = service_elem.find('BroadcastSvcSignaling')
                
                service = ServiceInfo(
                    service_id=int(service_elem.get('serviceId', '0')),
                    global_service_id=service_elem.get('globalServiceID', ''),
                    major_channel_no=int(service_elem.get('majorChannelNo', '0')),
                    minor_channel_no=int(service_elem.get('minorChannelNo', '0')),
                    service_category=ServiceCategory(int(service_elem.get('serviceCategory', '1'))),
                    short_service_name=service_elem.get('shortServiceName', ''),
                    slt_svc_seq_num=int(service_elem.get('sltSvcSeqNum', '0')),
                    sls_protocol=SLSProtocol(int(bss.get('slsProtocol', '1'))) if bss is not None else SLSProtocol.ROUTE,
                    sls_destination_ip=bss.get('slsDestinationIpAddress', '') if bss is not None else '',
                    sls_destination_port=int(bss.get('slsDestinationUdpPort', '0')) if bss is not None else 0,
                    sls_source_ip=bss.get('slsSourceIpAddress', '') if bss is not None else '',
                )
                services.append(service)
            
            self._stats.lls_slt_updates += 1
            
            return SLTInfo(bsid=bsid, slt_capabilities=slt_capabilities, services=services)
            
        except ET.ParseError:
            return None
    
    def _parse_system_time_xml(self, xml_str: str) -> Optional[Dict[str, Any]]:
        """Parse SystemTime XML."""
        try:
            root = ET.fromstring(xml_str)
            return {
                'current_utc_offset': int(root.get('currentUtcOffset', '37')),
                'utc_local_offset': root.get('utcLocalOffset', ''),
                'ds_status': root.get('dsStatus', 'false').lower() == 'true',
            }
        except ET.ParseError:
            return None
    
    def _parse_aeat_xml(self, xml_str: str) -> Optional[Dict[str, Any]]:
        """Parse AEAT (Advanced Emergency Alert Table) XML."""
        try:
            root = ET.fromstring(xml_str)
            alerts = []
            for alert in root.findall('.//Alert'):
                alerts.append({
                    'identifier': alert.findtext('identifier', ''),
                    'sender': alert.findtext('sender', ''),
                    'sent': alert.findtext('sent', ''),
                    'status': alert.findtext('status', ''),
                    'msgType': alert.findtext('msgType', ''),
                    'scope': alert.findtext('scope', ''),
                })
            return {'alerts': alerts}
        except ET.ParseError:
            return None
    
    # ========================================================================
    # SLT Validation
    # ========================================================================
    
    def validate_slt_structure(self, slt_xml: str) -> Tuple[bool, List[str]]:
        """
        Validate SLT XML structure against ATSC 3.0 A/331 specification.
        
        Args:
            slt_xml: SLT XML string to validate.
            
        Returns:
            Tuple of (is_valid, list of error messages).
        """
        errors = []
        
        try:
            root = ET.fromstring(slt_xml)
        except ET.ParseError as e:
            return False, [f"XML parse error: {e}"]
        
        # Check root element
        if 'SLT' not in root.tag:
            errors.append("Root element must be 'SLT'")
        
        # Check required BSID attribute
        bsid = root.get('bsid')
        if bsid is None:
            errors.append("SLT must have 'bsid' attribute")
        else:
            try:
                bsid_val = int(bsid)
                if not (0 <= bsid_val <= 65535):
                    errors.append("bsid must be in range 0-65535")
            except ValueError:
                errors.append("bsid must be a valid integer")
        
        # Validate services
        services = root.findall('.//Service')
        service_ids = set()
        
        for svc in services:
            svc_id = svc.get('serviceId')
            if svc_id is None:
                errors.append("Service must have 'serviceId' attribute")
            else:
                if svc_id in service_ids:
                    errors.append(f"Duplicate serviceId: {svc_id}")
                service_ids.add(svc_id)
            
            # Validate serviceCategory
            category = svc.get('serviceCategory')
            if category:
                try:
                    cat_val = int(category)
                    if cat_val not in [0, 1, 2, 3, 4, 5]:
                        errors.append(f"Invalid serviceCategory: {category}")
                except ValueError:
                    errors.append("serviceCategory must be a valid integer")
            
            # Check for BroadcastSvcSignaling
            bss = svc.find('BroadcastSvcSignaling')
            if bss is not None:
                # Validate slsProtocol
                protocol = bss.get('slsProtocol')
                if protocol:
                    try:
                        proto_val = int(protocol)
                        if proto_val not in [0, 1, 2]:
                            errors.append(f"Invalid slsProtocol: {protocol}")
                    except ValueError:
                        errors.append("slsProtocol must be a valid integer")
        
        return len(errors) == 0, errors
    
    # ========================================================================
    # LLS Generation
    # ========================================================================
    
    def generate_lls_xml(self, config: Dict[str, Any]) -> str:
        """
        Generate spec-compliant LLS XML from configuration.
        
        Args:
            config: Configuration dictionary containing LLS parameters.
            
        Returns:
            LLS XML string.
        """
        table_type = config.get('table_type', 'SLT')
        
        if table_type == 'SLT':
            return self._generate_slt_xml(config)
        elif table_type == 'AEAT':
            return self._generate_aeat_xml(config)
        elif table_type == 'SystemTime':
            return self._generate_system_time_xml(config)
        else:
            raise ValueError(f"Unsupported LLS table type: {table_type}")
    
    def _generate_slt_xml(self, config: Dict[str, Any]) -> str:
        """Generate SLT XML per A/331 Section 6.3."""
        slt = ET.Element('SLT')
        slt.set('xmlns', 'tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/SLT/1.0/')
        slt.set('bsid', str(config.get('bsid', 1)))
        
        for svc_config in config.get('services', []):
            service = ET.SubElement(slt, 'Service')
            service.set('serviceId', str(svc_config.get('service_id', 1)))
            service.set('globalServiceID', svc_config.get('global_service_id', ''))
            service.set('majorChannelNo', str(svc_config.get('major_channel', 1)))
            service.set('minorChannelNo', str(svc_config.get('minor_channel', 1)))
            service.set('serviceCategory', str(svc_config.get('category', 1)))
            service.set('shortServiceName', svc_config.get('name', 'Service'))
            service.set('sltSvcSeqNum', '0')
            
            bss = ET.SubElement(service, 'BroadcastSvcSignaling')
            bss.set('slsProtocol', str(svc_config.get('sls_protocol', 2)))
            bss.set('slsDestinationIpAddress', svc_config.get('dest_ip', '239.255.10.1'))
            bss.set('slsDestinationUdpPort', str(svc_config.get('dest_port', 51001)))
            bss.set('slsSourceIpAddress', svc_config.get('source_ip', '172.16.200.1'))
        
        return ET.tostring(slt, encoding='unicode')
    
    def _generate_aeat_xml(self, config: Dict[str, Any]) -> str:
        """Generate AEAT XML per A/331 Section 6.5."""
        aeat = ET.Element('AEAT')
        aeat.set('xmlns', 'tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/AEAT/1.0/')
        
        for alert_config in config.get('alerts', []):
            alert = ET.SubElement(aeat, 'Alert')
            ET.SubElement(alert, 'identifier').text = alert_config.get('identifier', '')
            ET.SubElement(alert, 'sender').text = alert_config.get('sender', '')
            ET.SubElement(alert, 'sent').text = alert_config.get('sent', '')
            ET.SubElement(alert, 'status').text = alert_config.get('status', 'Actual')
            ET.SubElement(alert, 'msgType').text = alert_config.get('msg_type', 'Alert')
            ET.SubElement(alert, 'scope').text = alert_config.get('scope', 'Public')
            
            if 'headline' in alert_config:
                info = ET.SubElement(alert, 'info')
                ET.SubElement(info, 'headline').text = alert_config['headline']
                ET.SubElement(info, 'description').text = alert_config.get('description', '')
                ET.SubElement(info, 'urgency').text = alert_config.get('urgency', 'Unknown')
                ET.SubElement(info, 'severity').text = alert_config.get('severity', 'Unknown')
                ET.SubElement(info, 'certainty').text = alert_config.get('certainty', 'Unknown')
        
        return ET.tostring(aeat, encoding='unicode')
    
    def _generate_system_time_xml(self, config: Dict[str, Any]) -> str:
        """Generate SystemTime XML per A/331 Section 6.4."""
        st = ET.Element('SystemTime')
        st.set('xmlns', 'tag:atsc.org,2016:XMLSchemas/ATSC3/Delivery/SYSTIME/1.0/')
        st.set('currentUtcOffset', str(config.get('utc_offset', 37)))
        st.set('utcLocalOffset', config.get('local_offset', '-PT5H'))
        st.set('dsStatus', str(config.get('ds_status', False)).lower())
        return ET.tostring(st, encoding='unicode')
    
    # ========================================================================
    # Packet Statistics
    # ========================================================================
    
    def get_packet_statistics(self) -> PacketStatistics:
        """Get current packet statistics."""
        if self._stats.mmtp_packets_received > 0:
            self._stats.packet_loss_rate = (
                self._stats.mmtp_packets_missing / 
                self._stats.mmtp_packets_received
            )
        return self._stats
    
    def update_statistics(self, **kwargs):
        """Update packet statistics with new values."""
        for key, value in kwargs.items():
            if hasattr(self._stats, key):
                setattr(self._stats, key, value)
    
    def reset_statistics(self):
        """Reset all statistics to zero."""
        self._stats = PacketStatistics()
    
    # ========================================================================
    # Utility Methods
    # ========================================================================
    
    def is_native_available(self) -> bool:
        """Check if native libatsc3 is available."""
        return self.native_available
    
    def get_library_info(self) -> Dict[str, Any]:
        """Get information about the library configuration."""
        return {
            'native_available': self.native_available,
            'lls_address': self.LLS_DST_ADDR,
            'lls_port': self.LLS_DST_PORT,
            'platform': platform.system(),
            'supported_table_types': [t.name for t in LLSTableType if t != LLSTableType.RESERVED],
        }


# ============================================================================
# Convenience Functions
# ============================================================================

def create_bridge(lib_path: Optional[str] = None) -> ATSC3Bridge:
    """Factory function to create an ATSC3Bridge instance."""
    return ATSC3Bridge(lib_path)


def parse_lls_bytes(raw_bytes: bytes) -> Optional[LLSInfo]:
    """Convenience function to parse LLS bytes without creating a bridge instance."""
    bridge = ATSC3Bridge()
    return bridge.parse_lls_table(raw_bytes)


def validate_slt(slt_xml: str) -> Tuple[bool, List[str]]:
    """Convenience function to validate SLT XML."""
    bridge = ATSC3Bridge()
    return bridge.validate_slt_structure(slt_xml)


# ============================================================================
# Module Test
# ============================================================================

if __name__ == "__main__":
    # Test the bridge
    bridge = ATSC3Bridge()
    print("ATSC3 Bridge Configuration:")
    for key, value in bridge.get_library_info().items():
        print(f"  {key}: {value}")
    
    # Test SLT generation
    slt_config = {
        'bsid': 50,
        'services': [
            {
                'service_id': 1001,
                'global_service_id': 'urn:atsc:serviceid:test_1',
                'major_channel': 10,
                'minor_channel': 1,
                'category': 1,
                'name': 'Test Service',
                'sls_protocol': 2,
                'dest_ip': '239.255.10.1',
                'dest_port': 51001,
                'source_ip': '172.16.200.1',
            }
        ]
    }
    
    slt_xml = bridge.generate_lls_xml({'table_type': 'SLT', **slt_config})
    print("\nGenerated SLT XML:")
    print(slt_xml)
    
    # Validate the generated SLT
    is_valid, errors = bridge.validate_slt_structure(slt_xml)
    print(f"\nSLT Validation: {'PASSED' if is_valid else 'FAILED'}")
    if errors:
        for error in errors:
            print(f"  - {error}")
