
import sys
import os
sys.path.append(os.getcwd())

def debug_integration():
    print("Testing Imports...")
    try:
        from backend.optimizer import SpectrumOptimizer
        print("Optimizer imported.")
        from sim.spatial_model import SpatialGrid
        print("SpatialGrid imported.")
        from backend.rl_agent import RLController
        print("RLController imported.")
    except Exception as e:
        print(f"Import Failed: {e}")
        import traceback
        traceback.print_exc()
        return

    print("Testing SpatialGrid...")
    try:
        grid = SpatialGrid(size_km=10.0, num_users=100)
        metrics = grid.calculate_grid_metrics(40.0, 600.0, 15.0)
        print(f"SpatialGrid OK: {metrics}")
    except Exception as e:
        print(f"SpatialGrid Failed: {e}")
        import traceback
        traceback.print_exc()
        return

    print("Testing RLController...")
    try:
        rl = RLController()
        obs = [85.0, 20.0, 1.0, 1.0]
        print("Getting weight suggestion...")
        action = rl.suggest_weights(obs)
        print(f"RL Action: {action}")
    except Exception as e:
        print(f"RLController Failed: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    debug_integration()
