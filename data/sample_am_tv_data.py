# FCC AM and TV Broadcast Stations
# Data Source: FCC License Search Query Results
# 
# ⚠️ NOTE: The PDF files (AM query result.pdf, TV query results.pdf) are 
# image-based PDFs that require OCR to extract text. For this project,
# the FM data (20,346 stations) provides sufficient broadcast infrastructure.
#
# If you need AM/TV data, you can:
# 1. Re-export from FCC as CSV or TXT instead of PDF
# 2. Use online PDF-to-text converters
# 3. Install Tesseract OCR locally
#
# Alternative: Use the FCC's direct data downloads:
# - AM: https://www.fcc.gov/media/radio/am-query
# - TV: https://www.fcc.gov/media/television/tv-query
# Select "Export to delimited text" instead of PDF

# For now, this file contains sample/representative AM and TV station data
# that can be used for simulation purposes.

# REPRESENTATIVE AM STATIONS (Sample data for simulation)
# Format: CALL_SIGN,FREQUENCY_KHZ,CITY,STATE,LATITUDE,LONGITUDE,POWER_KW,LICENSEE
AM_STATIONS = [
    ("WABC", 770, "NEW YORK", "NY", 40.7562, -74.0018, 50.0, "CUMULUS LICENSING LLC"),
    ("WBZ", 1030, "BOSTON", "MA", 42.3541, -71.0603, 50.0, "CBS RADIO EAST LLC"),
    ("WBBM", 780, "CHICAGO", "IL", 41.8788, -87.6358, 50.0, "CBS RADIO STATIONS INC"),
    ("KFI", 640, "LOS ANGELES", "CA", 34.0577, -118.0772, 50.0, "IHEART MEDIA"),
    ("KRLD", 1080, "DALLAS", "TX", 32.7825, -96.8009, 50.0, "CBS RADIO TEXAS"),
    ("WSB", 750, "ATLANTA", "GA", 33.8472, -84.3692, 50.0, "COX RADIO INC"),
    ("KDKA", 1020, "PITTSBURGH", "PA", 40.4464, -79.9495, 50.0, "CBS RADIO EAST"),
    ("WWL", 870, "NEW ORLEANS", "LA", 29.9546, -90.0751, 50.0, "ENTERCOM"),
    ("KOA", 850, "DENVER", "CO", 39.7381, -104.9858, 50.0, "IHEART MEDIA"),
    ("WLW", 700, "CINCINNATI", "OH", 39.1044, -84.4778, 50.0, "IHEART MEDIA"),
    ("WCBS", 880, "NEW YORK", "NY", 40.7591, -73.9704, 50.0, "CBS RADIO"),
    ("KGO", 810, "SAN FRANCISCO", "CA", 37.7823, -122.3949, 50.0, "CUMULUS"),
    ("WFAN", 660, "NEW YORK", "NY", 40.7502, -73.9855, 50.0, "CBS RADIO"),
    ("KMOX", 1120, "ST LOUIS", "MO", 38.6351, -90.2038, 50.0, "ENTERCOM"),
    ("WHO", 1040, "DES MOINES", "IA", 41.5891, -93.6057, 50.0, "IHEART MEDIA"),
]

# REPRESENTATIVE TV STATIONS (Sample data - major market stations)
# Format: CALL_SIGN,CHANNEL,CITY,STATE,LATITUDE,LONGITUDE,POWER_KW,NETWORK,LICENSEE
TV_STATIONS = [
    ("WNBC", 4, "NEW YORK", "NY", 40.7484, -73.9856, 45.0, "NBC", "NBC UNIVERSAL"),
    ("WABC-TV", 7, "NEW YORK", "NY", 40.7589, -73.9851, 110.0, "ABC", "DISNEY"),
    ("WCBS-TV", 2, "NEW YORK", "NY", 40.7536, -73.9832, 45.0, "CBS", "CBS CORP"),
    ("WNYW", 5, "NEW YORK", "NY", 40.7501, -73.9873, 45.0, "FOX", "FOX CORP"),
    ("KABC-TV", 7, "LOS ANGELES", "CA", 34.0900, -118.3200, 160.0, "ABC", "DISNEY"),
    ("KNBC", 4, "LOS ANGELES", "CA", 34.1500, -118.3400, 44.0, "NBC", "NBC UNIVERSAL"),
    ("KCBS-TV", 2, "LOS ANGELES", "CA", 34.0500, -118.2600, 49.0, "CBS", "CBS CORP"),
    ("WLS-TV", 7, "CHICAGO", "IL", 41.8872, -87.6377, 316.0, "ABC", "DISNEY"),
    ("WMAQ-TV", 5, "CHICAGO", "IL", 41.8919, -87.6278, 45.0, "NBC", "NBC UNIVERSAL"),
    ("WBBM-TV", 2, "CHICAGO", "IL", 41.8879, -87.6308, 28.0, "CBS", "CBS CORP"),
    ("KYW-TV", 3, "PHILADELPHIA", "PA", 39.9500, -75.1600, 50.0, "CBS", "CBS CORP"),
    ("KTRK-TV", 13, "HOUSTON", "TX", 29.7500, -95.3600, 316.0, "ABC", "DISNEY"),
    ("WFAA", 8, "DALLAS", "TX", 32.7900, -96.8000, 316.0, "ABC", "TEGNA"),
    ("WSB-TV", 2, "ATLANTA", "GA", 33.8500, -84.3600, 100.0, "ABC", "COX MEDIA"),
    ("WTVJ", 6, "MIAMI", "FL", 25.7900, -80.2100, 100.0, "NBC", "NBC UNIVERSAL"),
    ("KPIX-TV", 5, "SAN FRANCISCO", "CA", 37.7700, -122.4100, 50.0, "CBS", "CBS CORP"),
]

import csv
from pathlib import Path


def save_sample_data():
    """Save sample AM and TV data to CSV files."""
    data_dir = Path(__file__).parent
    
    # Save AM stations
    am_file = data_dir / 'broadcast_stations_am.csv'
    with open(am_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['call_sign', 'frequency_khz', 'city', 'state', 'latitude', 'longitude', 'power_kw', 'licensee'])
        for station in AM_STATIONS:
            writer.writerow(station)
    print(f"Saved {len(AM_STATIONS)} sample AM stations to {am_file.name}")
    
    # Save TV stations
    tv_file = data_dir / 'broadcast_stations_tv.csv'
    with open(tv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['call_sign', 'channel', 'city', 'state', 'latitude', 'longitude', 'power_kw', 'network', 'licensee'])
        for station in TV_STATIONS:
            writer.writerow(station)
    print(f"Saved {len(TV_STATIONS)} sample TV stations to {tv_file.name}")
    
    print("\n[NOTE] These are representative/sample stations for simulation.")
    print("For complete AM/TV data, re-export from FCC as CSV format instead of PDF.")


if __name__ == "__main__":
    save_sample_data()
