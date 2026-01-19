"""
fcc_data_parser.py - Parse FCC Broadcast License Data

This script parses FCC FM/AM/TV query results and extracts useful data
for the broadcast simulation, including:
- Transmitter locations (lat/lon)
- Power levels (ERP)
- Antenna heights (HAAT)
- Frequency/Channel
- Licensee information

Usage:
    python fcc_data_parser.py
    
This will parse FM.md and create broadcast_stations.csv
"""

import re
import csv
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class BroadcastStation:
    """Represents a broadcast station from FCC data."""
    call_sign: str
    channel: int
    frequency_mhz: float
    service_type: str  # FM, AM, TV
    status: str  # LIC, CP, STA, etc.
    city: str
    state: str
    country: str
    facility_id: str
    erp_kw: float  # Effective Radiated Power in kW
    haat_m: float  # Height Above Average Terrain in meters
    latitude: float
    longitude: float
    licensee: str


def parse_dms_to_decimal(dms_str: str, direction: str) -> float:
    """
    Convert Degrees Minutes Seconds to decimal degrees.
    Example: "N 40 42  46" -> 40.7128
    """
    try:
        # Clean up the string
        parts = dms_str.strip().split()
        if len(parts) >= 3:
            degrees = float(parts[0])
            minutes = float(parts[1])
            seconds = float(parts[2]) if len(parts) > 2 else 0.0
            
            decimal = degrees + (minutes / 60) + (seconds / 3600)
            
            # Apply direction
            if direction.upper() in ['S', 'W']:
                decimal = -decimal
            
            return round(decimal, 6)
    except (ValueError, IndexError):
        pass
    return 0.0


def parse_erp(erp_str: str) -> float:
    """Parse ERP value like '0.09 kW' or '100. kW' to float."""
    try:
        # Remove 'kW' and clean up
        cleaned = erp_str.replace('kW', '').strip()
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_height(height_str: str) -> float:
    """Parse height value like '-102. m' or '619. m' to float."""
    try:
        cleaned = height_str.replace('m', '').strip()
        return float(cleaned)
    except ValueError:
        return 0.0


def parse_fm_line(line: str) -> Optional[BroadcastStation]:
    """
    Parse a single FM station line from FCC query results.
    
    Example line:
    KAKI        KML/Fill/Text  201 A   FM   88.1 MHz LIC        JUNEAU                   AK US BLED-20141202AAO     175915           1.7 kW       -333. m     42. m        m   N 58 18   4.0  W 134 26  32.0  1028325    K-LOVE, INC.
    """
    # Skip header lines and empty lines
    if not line.strip() or 'Call' in line or 'KML Maps' in line or '----' in line:
        return None
    
    # Skip lines that don't start with a call sign pattern
    if not re.match(r'^[A-Z0-9\-]+\s+', line.strip()):
        return None
    
    try:
        # Extract call sign (first word)
        parts = line.split()
        if len(parts) < 20:
            return None
        
        call_sign = parts[0]
        
        # Skip special entries like 'NEW', '-', 'D'
        if call_sign in ['NEW', '-', 'D', 'KML/Fill/Text']:
            return None
        
        # Find frequency pattern like "88.1 MHz"
        freq_match = re.search(r'(\d+\.?\d*)\s*MHz', line)
        if not freq_match:
            return None
        frequency = float(freq_match.group(1))
        
        # Find channel (3-digit number before frequency)
        channel_match = re.search(r'\b(2\d{2}|3\d{2})\b.*MHz', line)
        channel = int(channel_match.group(1)) if channel_match else 0
        
        # Find service type (FM, AM, TV)
        service_match = re.search(r'\b(FM|AM|TV|FX|FL)\b', line)
        service_type = service_match.group(1) if service_match else 'FM'
        
        # Find status (LIC, CP, STA, etc.)
        status_match = re.search(r'\b(LIC|CP|STA|APP|AMD|MOD)\b', line)
        status = status_match.group(1) if status_match else 'UNK'
        
        # Find city and state
        # Pattern: CITY    STATE COUNTRY
        location_match = re.search(r'(LIC|CP|STA|APP|AMD|MOD)\s+[H]?\s*([A-Z][A-Z\s\-\.\']+?)\s+([A-Z]{2})\s+(US|CA|MX)', line)
        if location_match:
            city = location_match.group(2).strip()
            state = location_match.group(3)
            country = location_match.group(4)
        else:
            city = "UNKNOWN"
            state = "XX"
            country = "US"
        
        # Find ERP in kW
        erp_match = re.search(r'(\d+\.?\d*)\s*kW', line)
        erp_kw = float(erp_match.group(1)) if erp_match else 0.0
        
        # Find HAAT (meters) - pattern like "619. m" or "-102. m"
        haat_match = re.search(r'(-?\d+\.?\d*)\.\s*m\s+\d+\.?\s*m', line)
        haat_m = float(haat_match.group(1)) if haat_match else 0.0
        
        # Find coordinates
        lat_match = re.search(r'([NS])\s+(\d+)\s+(\d+)\s+([\d\.]+)', line)
        lon_match = re.search(r'([EW])\s+(\d+)\s+(\d+)\s+([\d\.]+)', line)
        
        if lat_match and lon_match:
            lat_dir = lat_match.group(1)
            lat_deg = float(lat_match.group(2))
            lat_min = float(lat_match.group(3))
            lat_sec = float(lat_match.group(4))
            latitude = lat_deg + (lat_min / 60) + (lat_sec / 3600)
            if lat_dir == 'S':
                latitude = -latitude
            
            lon_dir = lon_match.group(1)
            lon_deg = float(lon_match.group(2))
            lon_min = float(lon_match.group(3))
            lon_sec = float(lon_match.group(4))
            longitude = lon_deg + (lon_min / 60) + (lon_sec / 3600)
            if lon_dir == 'W':
                longitude = -longitude
        else:
            latitude = 0.0
            longitude = 0.0
        
        # Find facility ID (numeric after state)
        facility_match = re.search(r'US\s+[\w\-]+\s+(\d+)', line)
        facility_id = facility_match.group(1) if facility_match else ""
        
        # Get licensee (last part of line)
        licensee_match = re.search(r'\d{7}\s+(.+)$', line)
        licensee = licensee_match.group(1).strip() if licensee_match else "UNKNOWN"
        
        return BroadcastStation(
            call_sign=call_sign,
            channel=channel,
            frequency_mhz=frequency,
            service_type=service_type,
            status=status,
            city=city,
            state=state,
            country=country,
            facility_id=facility_id,
            erp_kw=erp_kw,
            haat_m=haat_m,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            licensee=licensee
        )
        
    except Exception as e:
        return None


def parse_fm_file(filepath: Path) -> List[BroadcastStation]:
    """Parse entire FM query result file."""
    stations = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            station = parse_fm_line(line)
            if station and station.latitude != 0.0:
                stations.append(station)
    
    return stations


def save_to_csv(stations: List[BroadcastStation], output_path: Path):
    """Save stations to CSV file."""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'call_sign', 'channel', 'frequency_mhz', 'service_type', 'status',
            'city', 'state', 'country', 'facility_id', 'erp_kw', 'haat_m',
            'latitude', 'longitude', 'licensee'
        ])
        
        # Data
        for station in stations:
            writer.writerow([
                station.call_sign,
                station.channel,
                station.frequency_mhz,
                station.service_type,
                station.status,
                station.city,
                station.state,
                station.country,
                station.facility_id,
                station.erp_kw,
                station.haat_m,
                station.latitude,
                station.longitude,
                station.licensee
            ])


def generate_summary(stations: List[BroadcastStation]) -> Dict:
    """Generate summary statistics."""
    if not stations:
        return {}
    
    states = {}
    total_power = 0.0
    max_power = 0.0
    max_power_station = None
    
    for s in stations:
        states[s.state] = states.get(s.state, 0) + 1
        total_power += s.erp_kw
        if s.erp_kw > max_power:
            max_power = s.erp_kw
            max_power_station = s.call_sign
    
    return {
        'total_stations': len(stations),
        'states_covered': len(states),
        'avg_power_kw': round(total_power / len(stations), 2),
        'max_power_kw': max_power,
        'max_power_station': max_power_station,
        'top_states': sorted(states.items(), key=lambda x: -x[1])[:10]
    }


def main():
    """Main entry point."""
    data_dir = Path(__file__).parent
    
    print("=" * 60)
    print("FCC Broadcast Data Parser")
    print("=" * 60)
    
    # Parse FM data
    fm_file = data_dir / 'FM.md'
    if fm_file.exists():
        print(f"\n[FM] Parsing FM data from {fm_file}...")
        fm_stations = parse_fm_file(fm_file)
        print(f"   [OK] Found {len(fm_stations)} valid FM stations")
        
        # Save to CSV
        output_file = data_dir / 'broadcast_stations_fm.csv'
        save_to_csv(fm_stations, output_file)
        print(f"   [SAVED] Saved to {output_file}")
        
        # Summary
        summary = generate_summary(fm_stations)
        print(f"\n[SUMMARY]:")
        print(f"   Total stations: {summary.get('total_stations', 0):,}")
        print(f"   States covered: {summary.get('states_covered', 0)}")
        print(f"   Average power: {summary.get('avg_power_kw', 0)} kW")
        print(f"   Max power: {summary.get('max_power_kw', 0)} kW ({summary.get('max_power_station', 'N/A')})")
        print(f"   Top states: {summary.get('top_states', [])[:5]}")
    else:
        print(f"   [WARN] FM.md not found at {fm_file}")
    
    print("\n" + "=" * 60)
    print("[DONE] Parsing complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
