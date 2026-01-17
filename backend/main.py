from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .intent_service import router as intent_router
from .ai_engine import router as ai_router
from .kpi_engine import router as kpi_router
from .approval_engine import router as approval_router
from .visualization_router import router as viz_router
from .rf_adapter import router as rf_router
from .broadcast_telemetry import router as telemetry_router

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

# Allow frontend (http://localhost:5173) to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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




