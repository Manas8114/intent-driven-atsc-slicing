"""
sumo_loader.py - SUMO Network & Route Parser for Digital Twin Integration

Parses SUMO XML files (*.net.xml, *.rou.xml) to extract:
- Road network geometry for realistic user placement
- Vehicle routes for mobile user simulation

This replaces random coordinate generation with real road network data.
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional
import numpy as np
from pathlib import Path
import os


@dataclass
class SumoJunction:
    """A road intersection/junction from the SUMO network."""
    id: str
    x: float
    y: float
    junction_type: str = "unknown"


@dataclass
class SumoEdge:
    """A road segment (edge) from the SUMO network."""
    id: str
    from_junction: str
    to_junction: str
    shape: List[Tuple[float, float]] = field(default_factory=list)
    speed_limit: float = 13.89  # Default ~50 km/h in m/s
    num_lanes: int = 1


@dataclass
class SumoVehicle:
    """A vehicle from a SUMO route file."""
    id: str
    route_edges: List[str]
    depart_time: float = 0.0
    vehicle_type: str = "car"


@dataclass
class SumoNetwork:
    """Complete parsed SUMO network data."""
    junctions: List[SumoJunction] = field(default_factory=list)
    edges: List[SumoEdge] = field(default_factory=list)
    vehicles: List[SumoVehicle] = field(default_factory=list)
    
    # Coordinate bounds
    min_x: float = float('inf')
    max_x: float = float('-inf')
    min_y: float = float('inf')
    max_y: float = float('-inf')
    
    # Network metadata
    projection: str = ""
    offset_x: float = 0.0
    offset_y: float = 0.0
    
    def get_center(self) -> Tuple[float, float]:
        """Get the center of the network in local coordinates."""
        return (
            (self.min_x + self.max_x) / 2,
            (self.min_y + self.max_y) / 2
        )
    
    def get_size_km(self) -> Tuple[float, float]:
        """Get the approximate size of the network in kilometers."""
        return (
            (self.max_x - self.min_x) / 1000.0,
            (self.max_y - self.min_y) / 1000.0
        )


class SumoNetworkParser:
    """
    Parses SUMO .net.xml files to extract road network geometry.
    
    Usage:
        parser = SumoNetworkParser()
        network = parser.parse("path/to/network.net.xml")
        
        # Get junction positions as static user locations
        for junction in network.junctions:
            print(f"Junction {junction.id} at ({junction.x}, {junction.y})")
    """
    
    def __init__(self):
        self.network = SumoNetwork()
    
    def parse(self, file_path: str) -> SumoNetwork:
        """
        Parse a SUMO network file.
        
        Args:
            file_path: Path to the .net.xml file
            
        Returns:
            SumoNetwork object with parsed data
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"SUMO network file not found: {file_path}")
        
        self.network = SumoNetwork()
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        # Parse location metadata
        self._parse_location(root)
        
        # Parse junctions (intersections)
        self._parse_junctions(root)
        
        # Parse edges (roads)
        self._parse_edges(root)
        
        return self.network
    
    def _parse_location(self, root: ET.Element):
        """Parse network location and projection info."""
        location = root.find("location")
        if location is not None:
            # Parse offset
            offset = location.get("netOffset", "0.00,0.00")
            parts = offset.split(",")
            if len(parts) == 2:
                self.network.offset_x = float(parts[0])
                self.network.offset_y = float(parts[1])
            
            # Store projection info
            self.network.projection = location.get("projParameter", "")
            
            # Parse boundary for size calculation
            boundary = location.get("convBoundary", "")
            if boundary:
                coords = boundary.split(",")
                if len(coords) == 4:
                    self.network.min_x = float(coords[0])
                    self.network.min_y = float(coords[1])
                    self.network.max_x = float(coords[2])
                    self.network.max_y = float(coords[3])
    
    def _parse_junctions(self, root: ET.Element):
        """Parse junction (intersection) elements."""
        for junction in root.findall("junction"):
            junction_id = junction.get("id", "")
            junction_type = junction.get("type", "unknown")
            
            # Skip internal junctions (they start with ":")
            if junction_id.startswith(":"):
                continue
            
            try:
                x = float(junction.get("x", "0"))
                y = float(junction.get("y", "0"))
                
                self.network.junctions.append(SumoJunction(
                    id=junction_id,
                    x=x,
                    y=y,
                    junction_type=junction_type
                ))
                
                # Update bounds
                self.network.min_x = min(self.network.min_x, x)
                self.network.max_x = max(self.network.max_x, x)
                self.network.min_y = min(self.network.min_y, y)
                self.network.max_y = max(self.network.max_y, y)
                
            except (ValueError, TypeError):
                continue
    
    def _parse_edges(self, root: ET.Element):
        """Parse edge (road segment) elements."""
        for edge in root.findall("edge"):
            edge_id = edge.get("id", "")
            
            # Skip internal edges (they start with ":")
            if edge_id.startswith(":"):
                continue
            
            from_junction = edge.get("from", "")
            to_junction = edge.get("to", "")
            
            # Parse lanes to get shape and speed
            lanes = edge.findall("lane")
            shape_points = []
            speed_limit = 13.89  # Default
            
            if lanes:
                # Use first lane's shape
                first_lane = lanes[0]
                speed_limit = float(first_lane.get("speed", "13.89"))
                
                shape_str = first_lane.get("shape", "")
                if shape_str:
                    shape_points = self._parse_shape(shape_str)
            
            if from_junction and to_junction:
                self.network.edges.append(SumoEdge(
                    id=edge_id,
                    from_junction=from_junction,
                    to_junction=to_junction,
                    shape=shape_points,
                    speed_limit=speed_limit,
                    num_lanes=len(lanes)
                ))
    
    def _parse_shape(self, shape_str: str) -> List[Tuple[float, float]]:
        """Parse a shape string into a list of (x, y) coordinate tuples."""
        points = []
        for point_str in shape_str.split():
            parts = point_str.split(",")
            if len(parts) >= 2:
                try:
                    x = float(parts[0])
                    y = float(parts[1])
                    points.append((x, y))
                except ValueError:
                    continue
        return points


class SumoRouteParser:
    """
    Parses SUMO .rou.xml files to extract vehicle routes.
    
    Usage:
        parser = SumoRouteParser()
        vehicles = parser.parse("path/to/routes.rou.xml")
        
        for vehicle in vehicles:
            print(f"Vehicle {vehicle.id} follows edges: {vehicle.route_edges}")
    """
    
    def parse(self, file_path: str) -> List[SumoVehicle]:
        """
        Parse a SUMO route file.
        
        Args:
            file_path: Path to the .rou.xml file
            
        Returns:
            List of SumoVehicle objects
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"SUMO route file not found: {file_path}")
        
        vehicles = []
        tree = ET.parse(file_path)
        root = tree.getroot()
        
        for vehicle in root.findall("vehicle"):
            vehicle_id = vehicle.get("id", "")
            depart = float(vehicle.get("depart", "0"))
            vtype = vehicle.get("type", "car")
            
            # Get route
            route_edges = []
            route_elem = vehicle.find("route")
            if route_elem is not None:
                edges_str = route_elem.get("edges", "")
                route_edges = edges_str.split()
            
            vehicles.append(SumoVehicle(
                id=vehicle_id,
                route_edges=route_edges,
                depart_time=depart,
                vehicle_type=vtype
            ))
        
        return vehicles


def load_sumo_network(data_dir: str) -> Optional[SumoNetwork]:
    """
    Convenience function to load SUMO network from the data directory.
    
    Args:
        data_dir: Path to the data directory containing SUMO files
        
    Returns:
        SumoNetwork object if found, None otherwise
    """
    # Look for network files
    possible_paths = [
        Path(data_dir) / "veins-veins-5.3.1" / "examples" / "veins" / "erlangen.net.xml",
        Path(data_dir) / "erlangen.net.xml",
        Path(data_dir) / "network.net.xml",
    ]
    
    for path in possible_paths:
        if path.exists():
            parser = SumoNetworkParser()
            return parser.parse(str(path))
    
    return None


def get_user_locations_from_network(
    network: SumoNetwork,
    num_users: int = 100,
    use_junctions: bool = True,
    use_edge_points: bool = True,
    normalize_to_km: bool = True
) -> np.ndarray:
    """
    Extract user locations from a SUMO network.
    
    This places users at:
    - Road intersections (junctions) - representing homes/businesses
    - Points along road edges - representing distributed users
    
    Args:
        network: Parsed SUMO network
        num_users: Target number of user locations
        use_junctions: Include junction positions
        use_edge_points: Include points along edges
        normalize_to_km: Convert to km and center around origin
        
    Returns:
        numpy array of shape (N, 2) with (x, y) coordinates
    """
    locations = []
    
    # Get center for normalization
    center_x, center_y = network.get_center()
    
    # Add junction locations
    if use_junctions:
        for junction in network.junctions:
            x = junction.x
            y = junction.y
            
            if normalize_to_km:
                # Convert to km relative to center
                x = (x - center_x) / 1000.0
                y = (y - center_y) / 1000.0
            
            locations.append([x, y])
    
    # Add edge midpoints if needed
    if use_edge_points and len(locations) < num_users:
        for edge in network.edges:
            if edge.shape and len(edge.shape) >= 2:
                # Get midpoint of the edge
                mid_idx = len(edge.shape) // 2
                x, y = edge.shape[mid_idx]
                
                if normalize_to_km:
                    x = (x - center_x) / 1000.0
                    y = (y - center_y) / 1000.0
                
                locations.append([x, y])
                
                if len(locations) >= num_users:
                    break
    
    # If still not enough, sample along edges
    while len(locations) < num_users and network.edges:
        edge = np.random.choice(network.edges)
        if edge.shape:
            idx = np.random.randint(0, len(edge.shape))
            x, y = edge.shape[idx]
            
            if normalize_to_km:
                x = (x - center_x) / 1000.0
                y = (y - center_y) / 1000.0
            
            # Add small random offset to avoid exact duplicates
            x += np.random.uniform(-0.05, 0.05)
            y += np.random.uniform(-0.05, 0.05)
            
            locations.append([x, y])
    
    return np.array(locations[:num_users])


# Quick test
if __name__ == "__main__":
    import sys
    
    print("=== SUMO Network Parser Test ===\n")
    
    # Default test path
    test_path = "data/veins-veins-5.3.1/examples/veins/erlangen.net.xml"
    
    if len(sys.argv) > 1:
        test_path = sys.argv[1]
    
    if os.path.exists(test_path):
        parser = SumoNetworkParser()
        network = parser.parse(test_path)
        
        print(f"Parsed network:")
        print(f"  Junctions: {len(network.junctions)}")
        print(f"  Edges: {len(network.edges)}")
        print(f"  Bounds: ({network.min_x:.0f}, {network.min_y:.0f}) to ({network.max_x:.0f}, {network.max_y:.0f})")
        
        size_x, size_y = network.get_size_km()
        print(f"  Size: {size_x:.2f} km x {size_y:.2f} km")
        
        # Get user locations
        locations = get_user_locations_from_network(network, num_users=50)
        print(f"\nExtracted {len(locations)} user locations")
        print(f"  X range: {locations[:, 0].min():.2f} to {locations[:, 0].max():.2f} km")
        print(f"  Y range: {locations[:, 1].min():.2f} to {locations[:, 1].max():.2f} km")
    else:
        print(f"Test file not found: {test_path}")
        print("Run from project root or provide path as argument")
