"""
fcc_am_tv_parser.py - Parse AM and TV station data from FCC query results

Parses AM.md and TV.md files to extract broadcast station data including:
- Call signs
- Frequencies/Channels
- Power levels
- Coordinates
- Licensee information
"""

import re
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import csv
from dataclasses import dataclass


@dataclass
class AMStation:
    """AM broadcast station data."""
    call_sign: str
    frequency_khz: int
    hours: str  # Daytime, Nighttime, Unlimited
    station_class: str
    status: str
    city: str
    state: str
    country: str
    facility_id: str
    power_kw: float
    directional: bool
    latitude: float
    longitude: float
    licensee: str


@dataclass
class TVStation:
    """TV broadcast station data."""
    call_sign: str
    channel: int
    virtual_channel: str
    service_type: str  # DTV, LPD, DCA, DTS, DRT
    status: str
    atsc3: bool
    city: str
    state: str
    country: str
    facility_id: str
    erp_kw: float
    directional: bool
    haat_m: float
    rcamsl_m: float
    rcagl_m: float
    latitude: float
    longitude: float
    licensee: str


def parse_am_coordinates(lat_str: str, lon_str: str) -> Tuple[float, float]:
    """Parse AM coordinate strings like 'N 40 37 24.5' and 'W 122 16 53.0'."""
    try:
        # Parse latitude
        lat_parts = lat_str.strip().split()
        if len(lat_parts) >= 4:
            lat_dir = lat_parts[0]
            lat_deg = float(lat_parts[1])
            lat_min = float(lat_parts[2])
            lat_sec = float(lat_parts[3])
            latitude = lat_deg + (lat_min / 60.0) + (lat_sec / 3600.0)
            if lat_dir == 'S':
                latitude = -latitude
        else:
            latitude = 0.0
        
        # Parse longitude
        lon_parts = lon_str.strip().split()
        if len(lon_parts) >= 4:
            lon_dir = lon_parts[0]
            lon_deg = float(lon_parts[1])
            lon_min = float(lon_parts[2])
            lon_sec = float(lon_parts[3])
            longitude = lon_deg + (lon_min / 60.0) + (lon_sec / 3600.0)
            if lon_dir == 'W':
                longitude = -longitude
        else:
            longitude = 0.0
            
        return (round(latitude, 6), round(longitude, 6))
    except (ValueError, IndexError):
        return (0.0, 0.0)


def parse_am_line(line: str) -> Optional[AMStation]:
    """Parse a single AM station line."""
    line = line.strip()
    if not line or len(line) < 50:
        return None
    
    # Skip header lines
    if 'Call' in line and 'Frequency' in line:
        return None
    if 'FCC' in line or 'Query' in line or '---' in line:
        return None
    
    try:
        # Pattern for AM lines - more flexible matching
        # Example: WASG       AM 540  kHz  Daytime        D - LIC     A DAPHNE                   AL US ...
        
        # Match call sign at start (allow for leading dash for unnamed stations)
        call_match = re.match(r'^([A-Z0-9\-]{1,8})\s+AM\s+(\d+)\s+kHz', line)
        if not call_match:
            return None
        
        call_sign = call_match.group(1)
        frequency = int(call_match.group(2))
        
        # Skip non-US/Canadian stations for now (focus on US)
        if ' US ' not in line and ' CA ' not in line:
            return None
        
        # Extract hours of operation
        hours = 'Unknown'
        if 'Unlimited' in line:
            hours = 'Unlimited'
        elif 'Daytime' in line:
            hours = 'Daytime'
        elif 'Nighttime' in line:
            hours = 'Nighttime'
        
        # Extract status
        status = 'Unknown'
        if ' LIC' in line:
            status = 'Licensed'
        elif ' CP' in line:
            status = 'CP'
        elif ' APP' in line:
            status = 'Application'
        elif ' STA' in line:
            status = 'STA'
        
        # Extract power
        power_match = re.search(r'(\d+\.?\d*)\s*kW', line)
        power = float(power_match.group(1)) if power_match else 0.0
        
        # Check if directional
        directional = 'Directional' in line
        
        # Extract facility ID
        facility_match = re.search(r'\s(\d{3,7})\s+[NS]', line)
        facility_id = facility_match.group(1) if facility_match else ''
        
        # Extract coordinates - look for pattern like "N 40 37 24.5  W 122 16 53.0"
        coord_match = re.search(r'([NS])\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([EW])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        if coord_match:
            lat_dir = coord_match.group(1)
            lat_deg = float(coord_match.group(2))
            lat_min = float(coord_match.group(3))
            lat_sec = float(coord_match.group(4))
            lon_dir = coord_match.group(5)
            lon_deg = float(coord_match.group(6))
            lon_min = float(coord_match.group(7))
            lon_sec = float(coord_match.group(8))
            
            latitude = lat_deg + (lat_min / 60.0) + (lat_sec / 3600.0)
            if lat_dir == 'S':
                latitude = -latitude
            
            longitude = lon_deg + (lon_min / 60.0) + (lon_sec / 3600.0)
            if lon_dir == 'W':
                longitude = -longitude
        else:
            latitude = 0.0
            longitude = 0.0
        
        # Extract city and state
        city = 'UNKNOWN'
        state = 'XX'
        country = 'US'
        
        state_match = re.search(r'\s([A-Z]{2})\s+(US|CA)\s', line)
        if state_match:
            state = state_match.group(1)
            country = state_match.group(2)
            
            # Try to extract city (comes before state)
            city_pattern = r'(?:LIC|CP|APP|AMD|STA)\s+[A-Z]?\s*([A-Z][A-Z\s\-\.]+?)\s+' + state
            city_match = re.search(city_pattern, line)
            if city_match:
                city = city_match.group(1).strip()
        
        # Extract licensee (at end of line)
        licensee = ''
        licensee_match = re.search(r'[EW]\s+\d+\s+\d+\s+[\d.]+\s+(.+)$', line)
        if licensee_match:
            licensee = licensee_match.group(1).strip()
        
        return AMStation(
            call_sign=call_sign,
            frequency_khz=frequency,
            hours=hours,
            station_class='',
            status=status,
            city=city,
            state=state,
            country=country,
            facility_id=facility_id,
            power_kw=power,
            directional=directional,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            licensee=licensee
        )
        
    except Exception as e:
        return None


def parse_tv_line(line: str) -> Optional[TVStation]:
    """Parse a single TV station line."""
    line = line.strip()
    if not line or len(line) < 50:
        return None
    
    # Skip header lines
    if 'Call' in line and 'Channel' in line:
        return None
    if 'FCC' in line or 'Query' in line or '---' in line or 'KML' not in line:
        return None
    
    try:
        # Pattern for TV lines
        # Example: WBBM-TV    KML/Fill/Text  12  2   DTV  LIC     Y  CHICAGO                    IL US ...
        
        # Match call sign at start
        call_match = re.match(r'^([A-Z0-9\-]{1,10})\s+KML', line)
        if not call_match:
            return None
        
        call_sign = call_match.group(1)
        
        # Skip non-US stations 
        if ' US ' not in line:
            return None
        
        # Extract channel number
        channel_match = re.search(r'KML/Fill/Text\s+(\d+)', line)
        channel = int(channel_match.group(1)) if channel_match else 0
        
        # Extract virtual channel (if present)
        virtual_match = re.search(r'KML/Fill/Text\s+\d+\s+(\d+)\s+', line)
        virtual_channel = virtual_match.group(1) if virtual_match else ''
        
        # Extract service type
        service_type = 'DTV'
        for stype in ['DTV', 'LPD', 'DCA', 'DTS', 'DRT']:
            if f' {stype} ' in line:
                service_type = stype
                break
        
        # Extract status
        status = 'Unknown'
        if ' LIC ' in line:
            status = 'Licensed'
        elif ' CP ' in line:
            status = 'CP'
        elif ' APP ' in line:
            status = 'Application'
        elif ' STA ' in line:
            status = 'STA'
        elif ' AMD ' in line:
            status = 'Amendment'
        
        # ATSC 3.0 (NextGen TV)
        atsc3 = ' Y ' in line.split('LIC')[0] if 'LIC' in line else False
        
        # Extract ERP (power)
        power_match = re.search(r'(\d+\.?\d*)\s*kW', line)
        power = float(power_match.group(1)) if power_match else 0.0
        
        # Check for directional antenna
        directional = ' DA' in line
        
        # Extract HAAT (Height Above Average Terrain)
        haat_match = re.search(r'(\d+\.?\d*)\s*m\s+\d+', line)
        haat = float(haat_match.group(1)) if haat_match else 0.0
        
        # Extract facility ID
        facility_match = re.search(r'\s(\d{3,7})\s+[\d.]+\s*kW', line)
        facility_id = facility_match.group(1) if facility_match else ''
        
        # Extract coordinates
        coord_match = re.search(r'([NS])\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([EW])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        if coord_match:
            lat_dir = coord_match.group(1)
            lat_deg = float(coord_match.group(2))
            lat_min = float(coord_match.group(3))
            lat_sec = float(coord_match.group(4))
            lon_dir = coord_match.group(5)
            lon_deg = float(coord_match.group(6))
            lon_min = float(coord_match.group(7))
            lon_sec = float(coord_match.group(8))
            
            latitude = lat_deg + (lat_min / 60.0) + (lat_sec / 3600.0)
            if lat_dir == 'S':
                latitude = -latitude
            
            longitude = lon_deg + (lon_min / 60.0) + (lon_sec / 3600.0)
            if lon_dir == 'W':
                longitude = -longitude
        else:
            latitude = 0.0
            longitude = 0.0
        
        # Extract city and state
        city = 'UNKNOWN'
        state = 'XX'
        
        state_match = re.search(r'\s([A-Z]{2})\s+US\s', line)
        if state_match:
            state = state_match.group(1)
            
            # Try to extract city
            city_pattern = r'[YN]\s+([A-Z][A-Z\s\-\.]+?)\s+' + state
            city_match = re.search(city_pattern, line)
            if city_match:
                city = city_match.group(1).strip()
        
        # Extract licensee (at end of line)
        licensee = ''
        licensee_match = re.search(r'\d{6,7}\s+(.+)$', line)
        if licensee_match:
            licensee = licensee_match.group(1).strip()
        
        return TVStation(
            call_sign=call_sign,
            channel=channel,
            virtual_channel=virtual_channel,
            service_type=service_type,
            status=status,
            atsc3=atsc3,
            city=city,
            state=state,
            country='US',
            facility_id=facility_id,
            erp_kw=power,
            directional=directional,
            haat_m=haat,
            rcamsl_m=0.0,
            rcagl_m=0.0,
            latitude=round(latitude, 6),
            longitude=round(longitude, 6),
            licensee=licensee
        )
        
    except Exception as e:
        return None


def parse_am_file(filepath: Path) -> List[AMStation]:
    """Parse AM.md file and return list of stations."""
    stations = []
    seen = set()  # Avoid duplicates
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            station = parse_am_line(line)
            if station and station.latitude != 0.0 and station.longitude != 0.0:
                # Create unique key to avoid duplicates
                key = (station.call_sign, station.frequency_khz, station.hours, station.power_kw)
                if key not in seen:
                    seen.add(key)
                    stations.append(station)
    
    return stations


def parse_tv_file(filepath: Path) -> List[TVStation]:
    """Parse TV.md file and return list of stations."""
    stations = []
    seen = set()  # Avoid duplicates
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            station = parse_tv_line(line)
            if station and station.latitude != 0.0 and station.longitude != 0.0:
                # Create unique key to avoid duplicates
                key = (station.call_sign, station.channel, station.service_type)
                if key not in seen:
                    seen.add(key)
                    stations.append(station)
    
    return stations


def save_am_to_csv(stations: List[AMStation], output_path: Path):
    """Save AM stations to CSV file."""
    fieldnames = [
        'call_sign', 'frequency_khz', 'hours', 'status', 
        'city', 'state', 'country', 'facility_id',
        'power_kw', 'directional', 'latitude', 'longitude', 'licensee'
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for s in stations:
            writer.writerow({
                'call_sign': s.call_sign,
                'frequency_khz': s.frequency_khz,
                'hours': s.hours,
                'status': s.status,
                'city': s.city,
                'state': s.state,
                'country': s.country,
                'facility_id': s.facility_id,
                'power_kw': s.power_kw,
                'directional': s.directional,
                'latitude': s.latitude,
                'longitude': s.longitude,
                'licensee': s.licensee
            })


def save_tv_to_csv(stations: List[TVStation], output_path: Path):
    """Save TV stations to CSV file."""
    fieldnames = [
        'call_sign', 'channel', 'virtual_channel', 'service_type', 'status',
        'atsc3', 'city', 'state', 'country', 'facility_id',
        'erp_kw', 'directional', 'haat_m', 'latitude', 'longitude', 'licensee'
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for s in stations:
            writer.writerow({
                'call_sign': s.call_sign,
                'channel': s.channel,
                'virtual_channel': s.virtual_channel,
                'service_type': s.service_type,
                'status': s.status,
                'atsc3': s.atsc3,
                'city': s.city,
                'state': s.state,
                'country': s.country,
                'facility_id': s.facility_id,
                'erp_kw': s.erp_kw,
                'directional': s.directional,
                'haat_m': s.haat_m,
                'latitude': s.latitude,
                'longitude': s.longitude,
                'licensee': s.licensee
            })


def main():
    data_dir = Path(__file__).parent
    
    print("=" * 60)
    print("FCC AM & TV Data Parser")
    print("=" * 60)
    
    # Parse AM data
    am_file = data_dir / 'AM.md'
    if am_file.exists():
        print(f"\n[AM] Parsing AM data from {am_file.name}...")
        am_stations = parse_am_file(am_file)
        print(f"   [OK] Found {len(am_stations)} unique AM stations (US/CA)")
        
        if am_stations:
            output_file = data_dir / 'broadcast_stations_am.csv'
            save_am_to_csv(am_stations, output_file)
            print(f"   [SAVED] Saved to {output_file.name}")
            
            # Summary
            states = {}
            for s in am_stations:
                states[s.state] = states.get(s.state, 0) + 1
            
            top_states = sorted(states.items(), key=lambda x: -x[1])[:5]
            print(f"\n   [SUMMARY]:")
            print(f"      Total stations: {len(am_stations):,}")
            print(f"      States/Provinces: {len(states)}")
            max_power = max(s.power_kw for s in am_stations)
            max_station = next(s for s in am_stations if s.power_kw == max_power)
            print(f"      Max power: {max_power} kW ({max_station.call_sign})")
            print(f"      Top states: {top_states}")
    else:
        print(f"   [WARN] {am_file.name} not found")
    
    # Parse TV data
    tv_file = data_dir / 'TV.md'
    if tv_file.exists():
        print(f"\n[TV] Parsing TV data from {tv_file.name}...")
        tv_stations = parse_tv_file(tv_file)
        print(f"   [OK] Found {len(tv_stations)} unique TV stations (US)")
        
        if tv_stations:
            output_file = data_dir / 'broadcast_stations_tv.csv'
            save_tv_to_csv(tv_stations, output_file)
            print(f"   [SAVED] Saved to {output_file.name}")
            
            # Summary
            states = {}
            for s in tv_stations:
                states[s.state] = states.get(s.state, 0) + 1
            
            top_states = sorted(states.items(), key=lambda x: -x[1])[:5]
            print(f"\n   [SUMMARY]:")
            print(f"      Total stations: {len(tv_stations):,}")
            print(f"      States: {len(states)}")
            max_power = max(s.erp_kw for s in tv_stations)
            max_station = next(s for s in tv_stations if s.erp_kw == max_power)
            print(f"      Max power: {max_power} kW ({max_station.call_sign})")
            print(f"      Top states: {top_states}")
    else:
        print(f"   [WARN] {tv_file.name} not found")
    
    print("\n" + "=" * 60)
    print("[DONE] Parsing complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
