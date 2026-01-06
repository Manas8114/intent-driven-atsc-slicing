
try:
    import sys
    import os
    sys.path.append(os.getcwd())
    import numpy as np
    from scipy.optimize import minimize
    print("Imports successful")
except ImportError as e:
    print(f"Import Error: {e}")
    exit(1)

from backend.optimizer import SpectrumOptimizer

def debug():
    print("Initializing Optimizer...")
    opt = SpectrumOptimizer(total_power_dbm=40, total_bandwidth_mhz=6.0)
    
    slices = [
        {'name': 'Rural', 'weight': 1.5, 'channel_gain': 0.5},
        {'name': 'Urban', 'weight': 1.0, 'channel_gain': 1.0},
        {'name': 'Suburban', 'weight': 1.0, 'channel_gain': 0.8}
    ]
    
    print("Running optimization...")
    try:
        res = opt.optimize_allocation(slices)
        print("Optimization successful!")
        print(res)
    except Exception as e:
        print(f"Optimization FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug()
