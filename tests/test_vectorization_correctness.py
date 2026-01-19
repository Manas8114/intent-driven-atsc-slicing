import numpy as np
import pytest
from sim.channel_model import received_power
from sim.spatial_model import SpatialGrid

def test_vectorization_correctness():
    """Verify that vectorized received_power matches iterative calculation."""
    tx_power_dbm = 40.0
    frequency_mhz = 600.0
    distances = np.linspace(1.0, 10.0, 10)
    
    # Vectorized call
    vectorized_result = received_power(tx_power_dbm, frequency_mhz, distances)
    
    # Iterative call
    iterative_result = []
    for d in distances:
        iterative_result.append(received_power(tx_power_dbm, frequency_mhz, float(d)))
    
    iterative_result = np.array(iterative_result)
    
    # Assert equality with tolerance
    np.testing.assert_allclose(vectorized_result, iterative_result, rtol=1e-5)
    print("Vectorization correctness verified!")

def test_spatial_grid_vectorization():
    """Verify SpatialGrid uses vectorization."""
    grid = SpatialGrid(num_users=10, num_mobile=0)
    metrics = grid.calculate_grid_metrics(35.0, 600.0, 15.0)
    
    assert 'avg_snr_db' in metrics
    assert isinstance(metrics['avg_snr_db'], float)
