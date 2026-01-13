"""
test_sumo_parser.py - Unit tests for SUMO network parser

Tests the sumo_loader module to ensure it correctly parses
SUMO network files and extracts junction/edge data.
"""

import pytest
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sim.sumo_loader import (
    SumoNetworkParser,
    SumoNetwork,
    get_user_locations_from_network
)


# Path to the test network file
TEST_NETWORK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "veins-veins-5.3.1", "examples", "veins", "erlangen.net.xml"
)


class TestSumoNetworkParser:
    """Tests for the SumoNetworkParser class."""
    
    def test_parser_initialization(self):
        """Test that parser can be instantiated."""
        parser = SumoNetworkParser()
        assert parser is not None
    
    def test_parse_network_file_exists(self):
        """Test parsing when file exists."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        assert network is not None
        assert isinstance(network, SumoNetwork)
    
    def test_parse_extracts_junctions(self):
        """Test that parser extracts junctions from network."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        # Should have found junctions
        assert len(network.junctions) > 0
        print(f"Found {len(network.junctions)} junctions")
        
        # Each junction should have valid coordinates
        for junction in network.junctions[:5]:  # Check first 5
            assert isinstance(junction.x, float)
            assert isinstance(junction.y, float)
            assert junction.id  # Should have an ID
    
    def test_parse_extracts_edges(self):
        """Test that parser extracts edges (roads) from network."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        # Should have found edges
        assert len(network.edges) > 0
        print(f"Found {len(network.edges)} edges")
        
        # Each edge should have from/to junction references
        for edge in network.edges[:5]:  # Check first 5
            assert edge.from_junction
            assert edge.to_junction
    
    def test_network_bounds(self):
        """Test that network has valid coordinate bounds."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        # Bounds should be valid
        assert network.min_x < network.max_x
        assert network.min_y < network.max_y
        
        # Size should be reasonable (Erlangen is a few km)
        size_x, size_y = network.get_size_km()
        print(f"Network size: {size_x:.2f} km x {size_y:.2f} km")
        assert 0.5 < size_x < 50  # Between 500m and 50km
        assert 0.5 < size_y < 50
    
    def test_file_not_found_raises(self):
        """Test that missing file raises FileNotFoundError."""
        parser = SumoNetworkParser()
        
        with pytest.raises(FileNotFoundError):
            parser.parse("nonexistent_file.xml")


class TestUserLocationExtraction:
    """Tests for user location extraction from network."""
    
    def test_extract_locations(self):
        """Test extracting user locations from network."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        locations = get_user_locations_from_network(network, num_users=50)
        
        assert len(locations) == 50
        assert locations.shape == (50, 2)
    
    def test_locations_normalized(self):
        """Test that locations are normalized to km around origin."""
        if not os.path.exists(TEST_NETWORK_PATH):
            pytest.skip(f"Test network file not found: {TEST_NETWORK_PATH}")
        
        parser = SumoNetworkParser()
        network = parser.parse(TEST_NETWORK_PATH)
        
        locations = get_user_locations_from_network(
            network, num_users=50, normalize_to_km=True
        )
        
        # Normalized coords should be close to origin (within ~5km for a city)
        assert abs(locations[:, 0].mean()) < 5  # X mean near 0
        assert abs(locations[:, 1].mean()) < 5  # Y mean near 0


if __name__ == "__main__":
    # Run tests if executed directly
    pytest.main([__file__, "-v"])
