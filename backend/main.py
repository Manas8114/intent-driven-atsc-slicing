from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .intent_service import router as intent_router
from .ai_engine import router as ai_router
from .kpi_engine import router as kpi_router
from .approval_engine import router as approval_router
from .visualization_router import router as viz_router
from .rf_adapter import router as rf_router
from .broadcast_telemetry import router as telemetry_router

app = FastAPI(
    title="Intent‑Driven ATSC Slicing Backend",
    description=(
        "AI-native broadcast control plane. Computes encoder-ready configurations "
        "with human approval workflow. This system acts as a control and optimization layer. "
        "It does NOT generate RF waveforms or transmit on licensed spectrum."
    )
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



