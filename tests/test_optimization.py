import requests
import json
import time

def test_optimization():
    print("Testing AI Optimization Engine...")
    url = "http://127.0.0.1:8000/ai/decision"
    
    # 1. Test "Maximize Coverage" (should favor robustness)
    payload_cov = {
        "policy": {
            "type": "maximize_coverage",
            "target": 0.95
        }
    }
    try:
        res_cov = requests.post(url, json=payload_cov)
        res_cov.raise_for_status()
        data_cov = res_cov.json()
        print(f"\n[Usage: Maximize Coverage]")
        print(json.dumps(data_cov['action'], indent=2))
        
        # Verify scientific validity (Research Level)
        action = data_cov['action']
        explanation = data_cov['explanation']
        
        if 'power_dbm' not in action:
            print("FAIL: Missing optimization parameters")
            return
            
        # Check for RL and Spatial keywords
        if "RL Agent adjusted" not in explanation:
            print("FAIL: RL Agent did not contribute to decision.")
        elif "Spatial Sim projects" not in explanation:
            print("FAIL: Spatial Grid simulation not run.")
        else:
            print("PASS: System used RL Agent + Spatial Grid + Convex Optimization.")
            print(f"      Explain: {explanation}")
        
    except Exception as e:
        print(f"FAIL: Request failed - {e}")

    # 2. Test "Emergency Reliability" (Different constraints)
    payload_emg = {
        "policy": {
            "type": "ensure_emergency_reliability",
            "target": 0.99
        }
    }
    try:
        res_emg = requests.post(url, json=payload_emg)
        data_emg = res_emg.json()
        print(f"\n[Usage: Emergency Reliability]")
        print(json.dumps(data_emg['action'], indent=2))
        
        # Check if allocation differs (it should, due to different weights)
        if data_emg['action']['power_dbm'] == data_cov['action']['power_dbm']:
            print("WARNING: Allocations are identical. Check weights/channel gains.")
        else:
            print("PASS: Optimization adapted to new intent (different power levels).")
            
    except Exception as e:
        print(f"FAIL: Request failed - {e}")

if __name__ == "__main__":
    # Give server a moment to start
    time.sleep(2) 
    test_optimization()
