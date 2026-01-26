from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .intent_service import router as intent_router
from .ai_engine import router as ai_router
from .kpi_engine import router as kpi_router
from .approval_engine import router as approval_router
from .visualization_router import router as viz_router
from .rf_adapter import router as rf_router
from .broadcast_telemetry import router as telemetry_router
from .websocket_manager import manager, broadcast_state_update

# AI Intelligence Layer modules (Cognitive Broadcasting)
from .ai_data_collector import router as knowledge_router
from .demand_predictor import router as demand_router
from .learning_loop import router as learning_router
from .bootstrap_uncertainty import router as bootstrap_router
from .ble_adapter import router as ble_router

app = FastAPI(
    title="AI-Native Broadcast Intelligence Platform",
    description=(
        "Cognitive Broadcasting AI Layer for Intent-Driven ATSC 3.0 Network Slicing. "
        "This system implements an AI-native control plane that continuously senses, "
        "learns, predicts, and optimizes broadcast behavior. "
        "It does NOT generate RF waveforms or transmit on licensed spectrum - "
        "it acts as an intelligence and control layer above the broadcast infrastructure."
    ),
    version="2.0.0"
)

# Allow frontend (http://localhost:5173) to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# WebSocket Endpoint for Real-Time Updates
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.
    
    Clients can connect to receive:
    - System state updates
    - AI decision notifications
    - Alert broadcasts
    - KPI metric changes
    
    Message format: JSON with 'type' and 'data' fields
    """
    await manager.connect(websocket)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "data": {
                "message": "Connected to AI-Native Broadcast Intelligence Platform",
                "timestamp": str(datetime.utcnow())
            }
        })
        
        # Listen for incoming messages (e.g., from Advertiser App)
        while True:
            data = await websocket.receive_json()
            
            # Message Relay Logic
            if data.get("type") == "broadcast_packet":
                # Advertiser is broadcasting a packet
                # Relay to ALL connected clients (Receivers will hear this)
                await manager.broadcast({
                    "type": "air_interface_packet",
                    "data": data.get("data")
                })
                
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await manager.disconnect(websocket)
        except:
            pass

# Core routers
app.include_router(intent_router, prefix="/intent", tags=["Intent Service"])
app.include_router(ai_router, prefix="/ai", tags=["AI Engine"])
app.include_router(kpi_router, prefix="/kpi", tags=["KPI Engine"])
app.include_router(approval_router, prefix="/approval", tags=["Approval Workflow"])

# Environment control
from .environment_router import router as env_router
app.include_router(env_router, prefix="/env", tags=["Environment Control"])

# Visualization and RF abstraction
app.include_router(viz_router, prefix="/viz", tags=["Visualization (Simulated)"])
app.include_router(rf_router, prefix="/rf", tags=["RF Adapter (Simulation Only)"])

# Broadcast-grade telemetry
app.include_router(telemetry_router, prefix="/telemetry", tags=["Broadcast Telemetry"])

# ============================================================================
# Real-time Physics Telemetry Endpoint (for "God View" visualization)
# ============================================================================
@app.get("/api/telemetry/physics", tags=["Broadcast Telemetry"])
async def get_physics_telemetry():
    """
    Get real-time physics calculation log from the ReceiverAgent.
    
    Returns the exact inputs (TX power, path loss, shadowing) and 
    outputs (RX power, SNR) used in the signal quality calculation.
    This powers the frontend "God View" visualization.
    """
    from .receiver_agent import get_receiver_agent
    agent = get_receiver_agent()
    return {
        "status": "ok",
        "physics_log": agent.get_calculation_log(),
        "metrics": agent.get_metrics(),
        "last_update": agent.last_update.isoformat() if agent.last_update else None
    }

# ============================================================================
# AI Intelligence Layer (Cognitive Broadcasting)
# ============================================================================
# These modules implement the "brain" of the AI-native broadcast system:
# - Knowledge Store: Continuous learning from broadcast feedback
# - Demand Predictor: Proactive scheduling and mode selection
# - Learning Loop: Explicit feedback loop with improvement tracking

app.include_router(knowledge_router, tags=["AI Knowledge Store"])
app.include_router(demand_router, tags=["AI Demand Prediction"])
app.include_router(learning_router, tags=["AI Learning Loop"])
app.include_router(bootstrap_router, prefix="/bootstrap", tags=["Bootstrap Uncertainty"])

# Real-world data integration
from .cell_tower_router import router as cell_tower_router
app.include_router(cell_tower_router, prefix="/cell-towers", tags=["Cell Tower Data"])

# Real FCC Broadcast Data Integration
from .broadcast_data_router import router as broadcast_router
app.include_router(broadcast_router, prefix="/broadcast", tags=["Real Broadcast Data (FCC)"])

# ============================================================================
# Training Experience Buffer (Continuous Learning)
# ============================================================================
# Stores state-action-reward tuples for offline retraining

from .experience_buffer import router as experience_router
app.include_router(experience_router, prefix="/experiences", tags=["Training Experience Buffer"])

# BLE Mobile Demo (Hackathon Demo Feature)
app.include_router(ble_router, prefix="/ble", tags=["BLE Mobile Demo"])


# ============================================================================
# QUICK DEMO MODE - For Hackathon Presentations
# ============================================================================

@app.post("/demo/quick-start", tags=["Demo Mode"])
async def quick_start_demo():
    """
    🚀 QUICK DEMO MODE - One-click impressive demo setup
    
    This endpoint:
    1. Seeds 30 AI learning experiences with improving rewards
    2. Triggers a 'monsoon' chaos scenario
    3. Returns success for frontend confirmation
    
    Use this to instantly show judges:
    - AI learning curve (experiences already recorded)
    - Chaos resilience (monsoon active)
    - Real-time recovery (AI adapts)
    """
    import random
    import uuid
    
    from .learning_loop import get_learning_tracker
    from .environment import get_env_state
    
    tracker = get_learning_tracker()
    env = get_env_state()
    
    # 1. Seed experiences with IMPROVING rewards (shows learning)
    experiences_added = 0
    for i in range(30):
        decision_id = f"quickdemo-{uuid.uuid4().hex[:6]}"
        
        # Simulate improving performance over time
        base_reward = 0.4 + (i / 30) * 0.5  # Starts at 0.4, ends at 0.9
        noise = random.gauss(0, 0.05)
        reward = min(1.0, max(0.0, base_reward + noise))
        
        predicted_kpis = {
            "coverage": 0.7 + (i / 30) * 0.2,
            "alert_reliability": 0.85 + (i / 30) * 0.1,
        }
        
        actual_kpis = {
            "coverage": predicted_kpis["coverage"] + random.gauss(0.02, 0.01),
            "alert_reliability": predicted_kpis["alert_reliability"] + random.gauss(0, 0.01),
            "mobile_stability": 0.8 + (i / 30) * 0.15,
        }
        
        action = {
            "modulation": ["QPSK", "16QAM", "64QAM"][min(2, i // 10)],
            "coding_rate": "5/15" if i < 15 else "7/15",
            "power_dbm": 33 + (i / 30) * 5,
            "delivery_mode": "broadcast"
        }
        
        tracker.record_decision_outcome(
            decision_id=decision_id,
            intent="maximize_coverage" if i < 15 else "balanced",
            action=action,
            predicted_kpis=predicted_kpis,
            actual_kpis=actual_kpis
        )
        experiences_added += 1
    
    # 2. Trigger monsoon scenario for dramatic effect
    env.active_hurdle = "monsoon"
    env.hurdle_intensity = 0.7
    
    return {
        "status": "🚀 DEMO MODE ACTIVE",
        "experiences_added": experiences_added,
        "total_experiences": tracker.total_decisions,
        "active_scenario": "monsoon",
        "message": "AI is now learning and adapting to monsoon conditions!",
        "next_steps": [
            "Open Learning Timeline to see improvement curve",
            "Open Thinking Trace to see AI decisions",
            "Watch constellation diagram scatter under stress"
        ]
    }


@app.post("/demo/reset", tags=["Demo Mode"])
async def reset_demo():
    """
    Reset demo state - clears scenario and resets to normal operation.
    """
    from .environment import get_env_state
    
    env = get_env_state()
    env.active_hurdle = None
    env.hurdle_intensity = 0.0
    
    return {
        "status": "Demo reset",
        "active_scenario": None,
        "message": "System returned to normal operation"
    }


# ============================================================================
# Startup Event: Seed Demo Data
# ============================================================================
# Automatically seeds demonstration data on startup for hackathon demos.
# This ensures the learning timeline and bootstrap analysis have data immediately.

# Background task for periodic WebSocket broadcasts
_broadcast_task = None

async def periodic_state_broadcast():
    """
    Background task that broadcasts system state every 2 seconds.
    This keeps all connected frontends in sync with the AI brain.
    """
    import asyncio
    from .ai_engine import get_latency_tracker
    from .learning_loop import get_learning_tracker
    
    while True:
        try:
            await asyncio.sleep(2)
            
            # Get current system state
            learning = get_learning_tracker()
            latency = get_latency_tracker()
            
            state = {
                "total_decisions": learning.total_decisions,
                "success_rate": learning.get_improvement_stats().get("success_rate", 0) if learning.total_decisions > 0 else 0,
                "reward_trend": learning.get_improvement_stats().get("reward_trend", "stable") if learning.total_decisions > 0 else "stable",
                "connected_clients": manager.connection_count,
                "latency_ms": latency.get_latest_metrics().total_decision_cycle_ms if latency.get_latest_metrics() else 0,
            }
            
            await broadcast_state_update(state)
            
        except Exception as e:
            print(f"Broadcast error: {e}")
            await asyncio.sleep(5)  # Back off on error

@app.on_event("startup")
async def start_receiver_agent():
    """Start the background receiver agent."""
    from .receiver_agent import get_receiver_agent
    get_receiver_agent().start()

@app.on_event("shutdown")
async def stop_receiver_agent():
    """Stop the receiver agent."""
    from .receiver_agent import get_receiver_agent
    get_receiver_agent().stop()


@app.on_event("startup")
async def start_periodic_broadcast():
    """Start the periodic WebSocket broadcast background task."""
    import asyncio
    global _broadcast_task
    _broadcast_task = asyncio.create_task(periodic_state_broadcast())
    print("🔴 LIVE: Periodic WebSocket broadcast started (every 2s)")

@app.on_event("shutdown")
async def stop_periodic_broadcast():
    """Stop the periodic broadcast on shutdown."""
    global _broadcast_task
    if _broadcast_task:
        _broadcast_task.cancel()
        print("🔴 LIVE: Periodic WebSocket broadcast stopped")

@app.on_event("startup")
async def seed_demo_data_on_startup():
    """
    Seed demo data when the server starts.
    
    This ensures that the learning timeline, bootstrap analysis, and other
    AI-native features have data to display immediately during demos.
    """
    from .learning_loop import get_learning_tracker
    import uuid
    import random
    
    tracker = get_learning_tracker()
    
    # Only seed if the tracker is empty
    if tracker.total_decisions == 0:
        print("🌱 Seeding demo data for hackathon demonstration...")
        
        intent_types = ["maximize_coverage", "minimize_latency", "balanced", "emergency"]
        
        for i in range(15):
            decision_id = f"demo-{uuid.uuid4().hex[:8]}"
            intent = random.choice(intent_types)
            
            # Realistic KPIs
            base_coverage = random.gauss(87, 4)
            
            predicted_kpis = {
                "coverage": min(1.0, max(0.6, base_coverage / 100 + random.gauss(0, 0.02))),
                "alert_reliability": min(1.0, max(0.8, random.gauss(0.96, 0.02))),
            }
            
            actual_kpis = {
                "coverage": min(1.0, max(0.6, predicted_kpis["coverage"] + random.gauss(0, 0.02))),
                "alert_reliability": min(1.0, max(0.8, predicted_kpis["alert_reliability"] + random.gauss(0, 0.01))),
                "mobile_stability": random.uniform(0.8, 0.95)
            }
            
            action = {
                "modulation": random.choice(["QPSK", "16QAM", "64QAM"]),
                "coding_rate": random.choice(["5/15", "7/15", "9/15"]),
                "power_dbm": random.uniform(33, 38),
                "delivery_mode": random.choice(["broadcast", "multicast", "hybrid"])
            }
            
            tracker.record_decision_outcome(
                decision_id=decision_id,
                intent=intent,
                action=action,
                predicted_kpis=predicted_kpis,
                actual_kpis=actual_kpis
            )
        
        print(f"✅ Demo data seeded: {tracker.total_decisions} decisions recorded")
    else:
        print(f"ℹ️  Learning tracker already has {tracker.total_decisions} decisions, skipping seed")

@app.on_event("startup")
async def start_autonomous_agent_task():
    """Start the autonomous AI agent."""
    from .autonomous_agent import start_autonomous_agent
    start_autonomous_agent()

@app.on_event("shutdown")
async def stop_autonomous_agent_task():
    """Stop the autonomous AI agent."""
    from .autonomous_agent import stop_autonomous_agent
    stop_autonomous_agent()
