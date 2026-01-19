"""
osm_data_fetcher.py - OpenStreetMap Data Extraction for Broadcast Simulation

This module fetches real-world geographic data from OpenStreetMap to improve
the accuracy of the broadcast coverage simulation.

Data fetched:
1. Building footprints - For urban canyon/shadowing effects
2. Land use areas - Urban/rural/industrial classification
3. Road networks - For mobile user modeling
4. Points of interest - Population density indicators

Usage:
    python osm_data_fetcher.py --lat 40.7128 --lon -74.0060 --radius 5
    
This will fetch data for a 5km radius around New York City.
"""

import json
import requests
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import math

# Overpass API endpoints (use public servers)
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
]


@dataclass
class BoundingBox:
    """Geographic bounding box for queries."""
    south: float  # min latitude
    west: float   # min longitude
    north: float  # max latitude
    east: float   # max longitude
    
    @classmethod
    def from_center(cls, lat: float, lon: float, radius_km: float) -> 'BoundingBox':
        """Create bounding box from center point and radius in km."""
        # Approximate degrees per km (varies with latitude)
        lat_per_km = 1 / 111.0  # ~111 km per degree latitude
        lon_per_km = 1 / (111.0 * math.cos(math.radians(lat)))
        
        delta_lat = radius_km * lat_per_km
        delta_lon = radius_km * lon_per_km
        
        return cls(
            south=lat - delta_lat,
            west=lon - delta_lon,
            north=lat + delta_lat,
            east=lon + delta_lon
        )
    
    def to_overpass(self) -> str:
        """Convert to Overpass bbox format: (south,west,north,east)"""
        return f"{self.south},{self.west},{self.north},{self.east}"


class OSMDataFetcher:
    """
    Fetches OpenStreetMap data for broadcast simulation.
    
    ⚠️ IMPORTANT: This fetches REAL geographic data from OpenStreetMap.
    Data is licensed under ODbL (https://opendatacommons.org/licenses/odbl/)
    """
    
    def __init__(self, output_dir: str = "data/osm"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.endpoint_index = 0
    
    def _get_endpoint(self) -> str:
        """Rotate through available Overpass endpoints."""
        endpoint = OVERPASS_ENDPOINTS[self.endpoint_index]
        self.endpoint_index = (self.endpoint_index + 1) % len(OVERPASS_ENDPOINTS)
        return endpoint
    
    def _execute_query(self, query: str, max_retries: int = 3) -> Optional[Dict]:
        """Execute Overpass API query with retry logic."""
        for attempt in range(max_retries):
            try:
                endpoint = self._get_endpoint()
                print(f"  → Querying {endpoint} (attempt {attempt + 1})...")
                
                response = requests.post(
                    endpoint,
                    data={"data": query},
                    timeout=180  # 3 minute timeout for large queries
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    print(f"  ⚠️ Rate limited, waiting 30s...")
                    time.sleep(30)
                else:
                    print(f"  ❌ Error {response.status_code}: {response.text[:200]}")
                    
            except requests.exceptions.Timeout:
                print(f"  ⚠️ Timeout, trying next endpoint...")
            except Exception as e:
                print(f"  ❌ Error: {e}")
            
            time.sleep(2)  # Brief pause between retries
        
        return None
    
    def fetch_buildings(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch building footprints for signal shadowing calculations.
        
        Buildings affect RF propagation through:
        - Signal blocking (concrete, steel)
        - Reflection (multipath)
        - Diffraction around edges
        """
        print("\n📦 Fetching building data...")
        
        query = f"""
        [out:json][timeout:120];
        (
          way["building"]({bbox.to_overpass()});
          relation["building"]({bbox.to_overpass()});
        );
        out body geom;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            print(f"  ✅ Found {len(result['elements'])} buildings")
            self._save_geojson(result, "buildings.geojson")
            return result
        
        return None
    
    def fetch_land_use(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch land use classification for propagation model selection.
        
        Different terrain types have different propagation characteristics:
        - Urban: High attenuation, multipath
        - Suburban: Medium attenuation
        - Rural: Low attenuation, LOS more common
        - Forest: Vegetation loss
        - Water: Enhanced propagation (reflection)
        """
        print("\n🗺️ Fetching land use data...")
        
        query = f"""
        [out:json][timeout:120];
        (
          way["landuse"]({bbox.to_overpass()});
          relation["landuse"]({bbox.to_overpass()});
          way["natural"]({bbox.to_overpass()});
          relation["natural"]({bbox.to_overpass()});
        );
        out body geom;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            # Categorize by type
            categories = {}
            for element in result["elements"]:
                tags = element.get("tags", {})
                landuse = tags.get("landuse", tags.get("natural", "unknown"))
                categories[landuse] = categories.get(landuse, 0) + 1
            
            print(f"  ✅ Found {len(result['elements'])} land use areas")
            print(f"     Categories: {dict(list(categories.items())[:5])}...")
            self._save_geojson(result, "land_use.geojson")
            return result
        
        return None
    
    def fetch_cell_towers(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch cell tower locations from OSM (may be incomplete).
        
        Note: OpenCellID has more comprehensive data, but requires registration.
        """
        print("\n📡 Fetching cell tower data from OSM...")
        
        query = f"""
        [out:json][timeout:60];
        (
          node["man_made"="mast"]({bbox.to_overpass()});
          node["man_made"="tower"]["tower:type"="communication"]({bbox.to_overpass()});
          node["communication:mobile_phone"="yes"]({bbox.to_overpass()});
          node["tower:type"="communication"]({bbox.to_overpass()});
        );
        out body;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            print(f"  ✅ Found {len(result['elements'])} communication towers")
            self._save_geojson(result, "cell_towers_osm.geojson")
            return result
        
        return None
    
    def fetch_roads(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch road network for mobile user path modeling.
        
        Roads are used to:
        - Generate realistic mobile user trajectories
        - Identify high-traffic corridors
        - Model vehicle-based reception
        """
        print("\n🛣️ Fetching road network...")
        
        query = f"""
        [out:json][timeout:120];
        (
          way["highway"~"motorway|trunk|primary|secondary|tertiary"]({bbox.to_overpass()});
        );
        out body geom;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            print(f"  ✅ Found {len(result['elements'])} road segments")
            self._save_geojson(result, "roads.geojson")
            return result
        
        return None
    
    def fetch_population_indicators(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch POIs that indicate population density.
        
        Includes: schools, hospitals, shopping centers, residential areas
        """
        print("\n👥 Fetching population indicators...")
        
        query = f"""
        [out:json][timeout:120];
        (
          node["amenity"~"school|hospital|university|marketplace"]({bbox.to_overpass()});
          way["amenity"~"school|hospital|university"]({bbox.to_overpass()});
          node["shop"]({bbox.to_overpass()});
          way["building"="residential"]({bbox.to_overpass()});
        );
        out body geom;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            print(f"  ✅ Found {len(result['elements'])} population indicators")
            self._save_geojson(result, "population_indicators.geojson")
            return result
        
        return None
    
    def fetch_broadcast_infrastructure(self, bbox: BoundingBox) -> Optional[Dict]:
        """
        Fetch existing broadcast infrastructure.
        
        Includes TV/radio towers, transmitter sites.
        """
        print("\n📺 Fetching broadcast infrastructure...")
        
        query = f"""
        [out:json][timeout:60];
        (
          node["man_made"="tower"]["tower:type"="communication"]({bbox.to_overpass()});
          node["man_made"="mast"]["mast:type"="broadcast"]({bbox.to_overpass()});
          node["communication:television"="yes"]({bbox.to_overpass()});
          node["communication:radio"="yes"]({bbox.to_overpass()});
          way["man_made"="tower"]["tower:type"="communication"]({bbox.to_overpass()});
        );
        out body;
        """
        
        result = self._execute_query(query)
        
        if result and "elements" in result:
            print(f"  ✅ Found {len(result['elements'])} broadcast sites")
            self._save_geojson(result, "broadcast_infrastructure.geojson")
            return result
        
        return None
    
    def _save_geojson(self, osm_data: Dict, filename: str):
        """Convert OSM JSON to GeoJSON and save."""
        features = []
        
        for element in osm_data.get("elements", []):
            feature = self._osm_to_geojson_feature(element)
            if feature:
                features.append(feature)
        
        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "source": "OpenStreetMap via Overpass API",
                "license": "ODbL (https://opendatacommons.org/licenses/odbl/)",
                "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "disclaimer": "This is REAL geographic data from OpenStreetMap"
            }
        }
        
        filepath = self.output_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(geojson, f, indent=2)
        
        print(f"  💾 Saved to {filepath}")
    
    def _osm_to_geojson_feature(self, element: Dict) -> Optional[Dict]:
        """Convert OSM element to GeoJSON feature."""
        elem_type = element.get("type")
        
        if elem_type == "node":
            geometry = {
                "type": "Point",
                "coordinates": [element.get("lon"), element.get("lat")]
            }
        elif elem_type == "way" and "geometry" in element:
            coords = [[p["lon"], p["lat"]] for p in element["geometry"]]
            # Close polygon if it's a building/area
            if coords[0] != coords[-1] and element.get("tags", {}).get("building"):
                coords.append(coords[0])
            geometry = {
                "type": "Polygon" if coords[0] == coords[-1] else "LineString",
                "coordinates": [coords] if coords[0] == coords[-1] else coords
            }
        else:
            return None
        
        return {
            "type": "Feature",
            "id": f"{elem_type}/{element.get('id')}",
            "geometry": geometry,
            "properties": element.get("tags", {})
        }
    
    def fetch_all(self, lat: float, lon: float, radius_km: float = 5.0) -> Dict[str, int]:
        """
        Fetch all relevant data for a region.
        
        Args:
            lat: Center latitude
            lon: Center longitude
            radius_km: Radius in kilometers (default 5km)
        
        Returns:
            Dictionary with counts of fetched elements
        """
        print(f"\n{'='*60}")
        print(f"🌍 OSM Data Fetcher for Broadcast Simulation")
        print(f"{'='*60}")
        print(f"📍 Center: ({lat}, {lon})")
        print(f"📏 Radius: {radius_km} km")
        print(f"📁 Output: {self.output_dir.absolute()}")
        print(f"\n⚠️ DISCLAIMER: This fetches REAL geographic data from OpenStreetMap")
        print(f"   Licensed under ODbL. See: https://www.openstreetmap.org/copyright")
        
        bbox = BoundingBox.from_center(lat, lon, radius_km)
        print(f"\n🔲 Bounding Box: {bbox.to_overpass()}")
        
        results = {}
        
        # Fetch each data type
        buildings = self.fetch_buildings(bbox)
        results["buildings"] = len(buildings.get("elements", [])) if buildings else 0
        
        time.sleep(2)  # Be nice to the API
        
        land_use = self.fetch_land_use(bbox)
        results["land_use"] = len(land_use.get("elements", [])) if land_use else 0
        
        time.sleep(2)
        
        roads = self.fetch_roads(bbox)
        results["roads"] = len(roads.get("elements", [])) if roads else 0
        
        time.sleep(2)
        
        towers = self.fetch_cell_towers(bbox)
        results["cell_towers"] = len(towers.get("elements", [])) if towers else 0
        
        time.sleep(2)
        
        broadcast = self.fetch_broadcast_infrastructure(bbox)
        results["broadcast_sites"] = len(broadcast.get("elements", [])) if broadcast else 0
        
        time.sleep(2)
        
        population = self.fetch_population_indicators(bbox)
        results["population_indicators"] = len(population.get("elements", [])) if population else 0
        
        # Summary
        print(f"\n{'='*60}")
        print("📊 FETCH SUMMARY")
        print(f"{'='*60}")
        for data_type, count in results.items():
            status = "✅" if count > 0 else "⚠️"
            print(f"  {status} {data_type}: {count:,} elements")
        
        total = sum(results.values())
        print(f"\n  📦 Total: {total:,} geographic features fetched")
        print(f"  📁 Saved to: {self.output_dir.absolute()}")
        
        return results


def main():
    """CLI interface for OSM data fetcher."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fetch OpenStreetMap data for broadcast simulation"
    )
    parser.add_argument("--lat", type=float, required=True, help="Center latitude")
    parser.add_argument("--lon", type=float, required=True, help="Center longitude")
    parser.add_argument("--radius", type=float, default=5.0, help="Radius in km (default: 5)")
    parser.add_argument("--output", type=str, default="data/osm", help="Output directory")
    
    args = parser.parse_args()
    
    fetcher = OSMDataFetcher(output_dir=args.output)
    fetcher.fetch_all(lat=args.lat, lon=args.lon, radius_km=args.radius)


if __name__ == "__main__":
    # Example usage for testing - New Delhi, India (example location)
    # Change these coordinates to your target broadcast region
    
    # For demo, uncomment one of these:
    
    # New Delhi, India
    # LAT, LON = 28.6139, 77.2090
    
    # New York City, USA
    # LAT, LON = 40.7128, -74.0060
    
    # Tokyo, Japan
    # LAT, LON = 35.6762, 139.6503
    
    # Default: Run with CLI arguments
    main()
