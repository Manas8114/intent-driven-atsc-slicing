import asyncio
import logging
from typing import Optional

# Configure logging
logger = logging.getLogger("autonomous_agent")

class AutonomousMonitor:
    """
    Autonomous Agent that monitors the environment and triggers AI reasoning.
    
    Acts as the "Heartbeat" of the Cognitive Broadcasting system.
    Ensures that even without user interaction, the AI is actively:
    1. Monitoring spectrum conditions
    2. Reacting to surges/hurdles
    3. Optimizing configuration
    4. broadcasting its "thought process" to the frontend
    """
    
    _instance = None
    
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    async def start(self):
        """Start the autonomous monitoring loop."""
        if self.is_running:
            return
            
        self.is_running = True
        logger.info("🧠 Autonomous AI Agent STARTED")
        self._task = asyncio.create_task(self._run_loop())
        
    async def stop(self):
        """Stop the monitoring loop."""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("🧠 Autonomous AI Agent STOPPED")
            
    async def _run_loop(self):
        """Main autonomous loop."""
        from .ai_engine import make_decision, DecisionRequest
        from .environment import get_env_state
        
        while self.is_running:
            try:
                # 1. Wait for next heartbeat (5 seconds)
                await asyncio.sleep(5)
                
                # 2. Get current environment context
                env = get_env_state()
                
                # 3. Determine 'Monitoring' Policy
                # If emergency/surge is active, the policy should reflect that expectation
                policy_type = "maximize_coverage" # Default
                if env.is_emergency_active:
                    policy_type = "ensure_emergency_reliability"
                elif env.traffic_load_level > 1.5:
                    policy_type = "minimize_latency" # Prioritize capacity/latency during surges
                
                # 4. Trigger AI Reasoning
                # This calcualtes optimal settings and BROADCASTS the decision via WebSocket
                # driving the "Thinking Trace" on the frontend.
                await make_decision(DecisionRequest(
                    policy={
                        "type": policy_type,
                        "target": 0.95,
                        "context": "autonomous_monitoring"
                    }
                ))
                
                # logger.debug("🧠 AI Heartbeat: Decision cycle complete")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in autonomous loop: {e}")
                await asyncio.sleep(5) # Prevent rapid error loops

def start_autonomous_agent():
    """Helper to start the singleton agent."""
    agent = AutonomousMonitor.get_instance()
    asyncio.create_task(agent.start())

def stop_autonomous_agent():
    """Helper to stop the singleton agent."""
    agent = AutonomousMonitor.get_instance()
    asyncio.create_task(agent.stop())
