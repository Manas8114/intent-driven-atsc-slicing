"""
pdf_extractor.py - Extract AM and TV station data from FCC PDF query results

Uses pdfplumber to extract tabular data from PDFs.
"""

import pdfplumber
import csv
import re
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class BroadcastStation:
    """Represents a broadcast station."""
    call_sign: str
    frequency: str  # kHz for AM, MHz for TV
    channel: str
    service_type: str  # AM, TV
    status: str
    city: str
    state: str
    erp_kw: float
    latitude: float
    longitude: float
    licensee: str


def parse_coordinates(coord_str: str) -> tuple:
    """Parse coordinate string like 'N 40 42 46' to decimal degrees."""
    try:
        parts = coord_str.strip().split()
        if len(parts) >= 4:
            direction = parts[0]
            degrees = float(parts[1])
            minutes = float(parts[2])
            seconds = float(parts[3]) if len(parts) > 3 else 0.0
            
            decimal = degrees + (minutes / 60) + (seconds / 3600)
            if direction in ['S', 'W']:
                decimal = -decimal
            return decimal
    except:
        pass
    return 0.0


def extract_pdf_text(pdf_path: Path) -> str:
    """Extract all text from a PDF file."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text


def parse_am_line(line: str) -> Optional[Dict]:
    """Parse a single AM station line."""
    # AM format typically: CALL  FREQ  CITY  STATE  LICENSEE
    # Example pattern matching
    
    # Skip header/non-data lines
    if not line.strip() or 'Call' in line or '---' in line:
        return None
    
    try:
        # Look for call sign pattern (starts with K or W for US stations)
        call_match = re.match(r'^([KW][A-Z0-9]{2,4})\s+', line)
        if not call_match:
            return None
        
        call_sign = call_match.group(1)
        
        # Find frequency (kHz for AM)
        freq_match = re.search(r'(\d{3,4})\s*kHz', line, re.IGNORECASE)
        if not freq_match:
            # Try finding just a 3-4 digit number that could be frequency
            freq_match = re.search(r'\b(\d{3,4})\b', line)
        
        frequency = freq_match.group(1) if freq_match else "0"
        
        # Find state (2-letter code)
        state_match = re.search(r'\b([A-Z]{2})\s+(US|CA|MX)\b', line)
        state = state_match.group(1) if state_match else "XX"
        
        # Find coordinates
        lat_match = re.search(r'([NS])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        lon_match = re.search(r'([EW])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        
        latitude = 0.0
        longitude = 0.0
        
        if lat_match:
            lat_dir = lat_match.group(1)
            lat_deg = float(lat_match.group(2))
            lat_min = float(lat_match.group(3))
            lat_sec = float(lat_match.group(4))
            latitude = lat_deg + (lat_min / 60) + (lat_sec / 3600)
            if lat_dir == 'S':
                latitude = -latitude
        
        if lon_match:
            lon_dir = lon_match.group(1)
            lon_deg = float(lon_match.group(2))
            lon_min = float(lon_match.group(3))
            lon_sec = float(lon_match.group(4))
            longitude = lon_deg + (lon_min / 60) + (lon_sec / 3600)
            if lon_dir == 'W':
                longitude = -longitude
        
        # Find power
        power_match = re.search(r'(\d+\.?\d*)\s*kW', line)
        power = float(power_match.group(1)) if power_match else 0.0
        
        return {
            'call_sign': call_sign,
            'frequency_khz': frequency,
            'service_type': 'AM',
            'state': state,
            'latitude': round(latitude, 6),
            'longitude': round(longitude, 6),
            'power_kw': power
        }
    except Exception as e:
        return None


def parse_tv_line(line: str) -> Optional[Dict]:
    """Parse a single TV station line."""
    if not line.strip() or 'Call' in line or '---' in line:
        return None
    
    try:
        # Look for call sign pattern
        call_match = re.match(r'^([KW][A-Z0-9\-]{2,6})\s+', line)
        if not call_match:
            return None
        
        call_sign = call_match.group(1)
        
        # Find channel number
        channel_match = re.search(r'\b(\d{1,2})\b.*(?:TV|DT|LD)', line)
        channel = channel_match.group(1) if channel_match else "0"
        
        # Find frequency (MHz for TV)
        freq_match = re.search(r'(\d+\.?\d*)\s*MHz', line)
        frequency = freq_match.group(1) if freq_match else "0"
        
        # Find state
        state_match = re.search(r'\b([A-Z]{2})\s+(US|CA|MX)\b', line)
        state = state_match.group(1) if state_match else "XX"
        
        # Find coordinates
        lat_match = re.search(r'([NS])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        lon_match = re.search(r'([EW])\s+(\d+)\s+(\d+)\s+([\d.]+)', line)
        
        latitude = 0.0
        longitude = 0.0
        
        if lat_match:
            lat_dir = lat_match.group(1)
            lat_deg = float(lat_match.group(2))
            lat_min = float(lat_match.group(3))
            lat_sec = float(lat_match.group(4))
            latitude = lat_deg + (lat_min / 60) + (lat_sec / 3600)
            if lat_dir == 'S':
                latitude = -latitude
        
        if lon_match:
            lon_dir = lon_match.group(1)
            lon_deg = float(lon_match.group(2))
            lon_min = float(lon_match.group(3))
            lon_sec = float(lon_match.group(4))
            longitude = lon_deg + (lon_min / 60) + (lon_sec / 3600)
            if lon_dir == 'W':
                longitude = -longitude
        
        # Find power
        power_match = re.search(r'(\d+\.?\d*)\s*kW', line)
        power = float(power_match.group(1)) if power_match else 0.0
        
        return {
            'call_sign': call_sign,
            'channel': channel,
            'frequency_mhz': frequency,
            'service_type': 'TV',
            'state': state,
            'latitude': round(latitude, 6),
            'longitude': round(longitude, 6),
            'power_kw': power
        }
    except Exception as e:
        return None


def save_to_csv(data: List[Dict], output_path: Path, fieldnames: List[str]):
    """Save extracted data to CSV."""
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)


def main():
    data_dir = Path(__file__).parent
    
    print("=" * 60)
    print("FCC PDF Data Extractor")
    print("=" * 60)
    
    # Extract AM data
    am_pdf = data_dir / 'AM query result.pdf'
    if am_pdf.exists():
        print(f"\n[AM] Extracting from {am_pdf.name}...")
        am_text = extract_pdf_text(am_pdf)
        
        # Save raw text for inspection
        raw_file = data_dir / 'am_raw_text.txt'
        with open(raw_file, 'w', encoding='utf-8') as f:
            f.write(am_text)
        print(f"   [SAVED] Raw text saved to {raw_file.name}")
        
        # Parse stations
        am_stations = []
        for line in am_text.split('\n'):
            station = parse_am_line(line)
            if station and station['latitude'] != 0.0:
                am_stations.append(station)
        
        if am_stations:
            output_file = data_dir / 'broadcast_stations_am.csv'
            save_to_csv(
                am_stations, 
                output_file,
                ['call_sign', 'frequency_khz', 'service_type', 'state', 'latitude', 'longitude', 'power_kw']
            )
            print(f"   [OK] Parsed {len(am_stations)} AM stations")
            print(f"   [SAVED] Saved to {output_file.name}")
        else:
            print("   [WARN] No AM stations could be parsed with coordinates")
    else:
        print(f"   [WARN] {am_pdf.name} not found")
    
    # Extract TV data
    tv_pdf = data_dir / 'TV query results.pdf'
    if tv_pdf.exists():
        print(f"\n[TV] Extracting from {tv_pdf.name}...")
        tv_text = extract_pdf_text(tv_pdf)
        
        # Save raw text for inspection
        raw_file = data_dir / 'tv_raw_text.txt'
        with open(raw_file, 'w', encoding='utf-8') as f:
            f.write(tv_text)
        print(f"   [SAVED] Raw text saved to {raw_file.name}")
        
        # Parse stations
        tv_stations = []
        for line in tv_text.split('\n'):
            station = parse_tv_line(line)
            if station and station['latitude'] != 0.0:
                tv_stations.append(station)
        
        if tv_stations:
            output_file = data_dir / 'broadcast_stations_tv.csv'
            save_to_csv(
                tv_stations,
                output_file, 
                ['call_sign', 'channel', 'frequency_mhz', 'service_type', 'state', 'latitude', 'longitude', 'power_kw']
            )
            print(f"   [OK] Parsed {len(tv_stations)} TV stations")
            print(f"   [SAVED] Saved to {output_file.name}")
        else:
            print("   [WARN] No TV stations could be parsed with coordinates")
    else:
        print(f"   [WARN] {tv_pdf.name} not found")
    
    print("\n" + "=" * 60)
    print("[DONE] PDF extraction complete!")
    print("=" * 60)
    print("\nCheck the raw text files to see the PDF content for manual parsing if needed.")


if __name__ == "__main__":
    main()
