import urllib.request
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("VERIFY")

def make_request(url, method="GET", data=None):
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header('Content-Type', 'application/json')
        
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req.data = json_data
            
        with urllib.request.urlopen(req) as response:
            if response.status >= 200 and response.status < 300:
                return json.loads(response.read().decode('utf-8'))
            else:
                logger.error(f"Request failed: {response.status}")
                return None
    except Exception as e:
        logger.error(f"Request error: {e}")
        return None

def verify():
    base_url = "http://localhost:8000/ai"
    
    # 1. Initial State
    logger.info("Checking initial state...")
    init_state = make_request(f"{base_url}/city-state")
    if not init_state:
        logger.error("Failed to get initial state. Is backend running?")
        return
        
    init_cov = init_state['aggregate']['avg_coverage']
    logger.info(f"Initial Coverage: {init_cov}%")
    
    # 2. Inject Scenario
    logger.info("Injecting MONSOON scenario...")
    res = make_request(f"{base_url}/inject-scenario", method="POST", data={"scenario": "monsoon"})
    if not res:
        logger.error("Failed to inject scenario")
        return
    logger.info(f"Injection Response: {res}")
    
    # 3. Wait for State Update (Backend might take a moment if it was async, but active_scenario is immediate)
    time.sleep(1) 
    
    # 4. Check Degraded State
    logger.info("Checking degraded state...")
    new_state = make_request(f"{base_url}/city-state")
    if not new_state: 
        return
        
    new_cov = new_state['aggregate']['avg_coverage']
    logger.info(f"Degraded Coverage: {new_cov}%")
    
    # 5. Verify Drop
    if new_state.get('active_scenario') == 'monsoon':
        logger.info("✅ 'active_scenario' is CORRECTLY set to 'monsoon'")
    else:
        logger.error(f"❌ 'active_scenario' is {new_state.get('active_scenario')}")
        
    if new_cov < init_cov - 10:
        logger.info("✅ PASSED: Coverage dropped significantly.")
    else:
        logger.error(f"❌ FAILED: Coverage drop insufficient. ({init_cov} -> {new_cov})")

    # 6. Clear Scenario
    logger.info("Clearing scenario...")
    make_request(f"{base_url}/inject-scenario", method="POST", data={"scenario": "clear"})
    
    # 7. Final Check
    time.sleep(1)
    final_state = make_request(f"{base_url}/city-state")
    final_cov = final_state['aggregate']['avg_coverage']
    logger.info(f"Restored Coverage: {final_cov}%")
    
    if final_cov > new_cov + 10:
         logger.info("✅ PASSED: Coverage restored.")
    else:
         logger.warning("⚠️ Coverage did not fully recover? (Simulated data might still be noisy)")

if __name__ == "__main__":
    verify()
