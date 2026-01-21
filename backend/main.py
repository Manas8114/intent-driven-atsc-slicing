from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

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

import os

# ... (imports)

# Allow frontend to access API
# Relaxed for hackathon/debugging to allow localhost/127.0.0.1
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "*"  # TEMPORARY: Allow all for debugging connectivity
]

# if os.getenv("ALLOW_ALL_ORIGINS", "True").lower() == "true": # Default to True for now
#     cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def log_all_routes():
    """Debug: Log all registered routes to help diagnose 404s."""
    print("🛣️  Registered Routes:")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"   - {route.path} [{','.join(route.methods) if hasattr(route, 'methods') else ''}]")

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
        await manager.send_personal(websocket, {
            "type": "connected",
            "data": {"message": "Connected to AI-Native Broadcast Intelligence Platform"}
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            # Echo or handle client messages if needed
            # For now, the server primarily broadcasts to clients
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)

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


# ============================================================================
# Startup Event: Seed Demo Data
# ============================================================================
# Automatically seeds demonstration data on startup for hackathon demos.
# This ensures the learning timeline and bootstrap analysis have data immediately.

# Background task for periodic WebSocket broadcasts
_broadcast_task = None

# ... (rest of the file until seeding)

# Track broadcast health
last_broadcast_time = 0

async def periodic_state_broadcast():
    """
    Background task that broadcasts system state every 2 seconds.
    This keeps all connected frontends in sync with the AI brain.
    """
    import asyncio
    import time
    from .ai_engine import get_latency_tracker
    from .learning_loop import get_learning_tracker
    
    global last_broadcast_time
    
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
            last_broadcast_time = time.time()
            
        except Exception as e:
            print(f"Broadcast error: {e}")
            await asyncio.sleep(5)  # Back off on error

@app.on_event("startup")
async def seed_demo_data_on_startup():
    """
    Seed demo data when the server starts.
    Gated by ALLOW_DEMO_SEEDING environment variable.
    """
    if os.getenv("ALLOW_DEMO_SEEDING", "False").lower() != "true":
        print("ℹ️  Demo seeding skipped (ALLOW_DEMO_SEEDING not set to true)")
        return

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

@app.get("/health")
async def health_check():
    """System health check endpoint."""
    import time
    from .receiver_agent import get_receiver_agent
    
    receiver = get_receiver_agent()
    # Check if receiver has updated in last 30 seconds
    if receiver.last_update:
        receiver_healthy = (datetime.now() - receiver.last_update).total_seconds() < 30
    else:
        receiver_healthy = False
    
    # Check if broadcast has run in last 15 seconds
    # If last_broadcast_time is 0, it might be just started
    broadcast_healthy = True
    if last_broadcast_time > 0:
        broadcast_healthy = (time.time() - last_broadcast_time) < 15
    elif time.time() - start_time > 15: # Assuming start_time tracking or just lax check
        broadcast_healthy = False # If running for >15s and no broadcast, then unhealthy
        
    # Simplify broadcast check: just check if it's running if started
    if last_broadcast_time > 0 and (time.time() - last_broadcast_time) > 15:
         broadcast_healthy = False

    status = "healthy" if receiver_healthy and broadcast_healthy else "degraded"
    if not receiver_healthy and not broadcast_healthy:
        status = "unhealthy"
        
    return {
        "status": status,
        "components": {
            "receiver_agent": {
                "status": "healthy" if receiver_healthy else "stalled",
                "last_update": receiver.last_update.isoformat() if receiver.last_update else "never",
                "running_flag": receiver.running
            },
            "websocket_broadcast": {
                "status": "healthy" if broadcast_healthy else "stalled",
                "last_run_seconds_ago": round(time.time() - last_broadcast_time, 1) if last_broadcast_time > 0 else "never"
            }
        },
        "timestamp": datetime.now().isoformat()
    }
