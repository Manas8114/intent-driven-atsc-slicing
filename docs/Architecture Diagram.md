# AI-Native Broadcast Intelligence Platform - System Architecture

## High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Client Layer"]
        WebUI["React + Vite UI<br/>(Port 5173)"]
    end

    subgraph API["🔌 API Gateway"]
        FastAPI["FastAPI Backend<br/>(Port 8000)"]
    end

    subgraph AI_PLANE["🧠 AI Intelligence Plane (Cognitive Layer)"]
        direction TB
        IntentSvc["Intent<br/>Service"]
        AIEngine["AI Decision<br/>Engine"]
        RLAgent["PPO RL<br/>Agent"]
        DemandPred["Demand<br/>Predictor"]
        LearningLoop["Learning<br/>Loop"]
        KnowledgeStore["Knowledge<br/>Store"]
    end

    subgraph GOVERNANCE["👤 Human Governance Layer"]
        ApprovalEngine["Approval<br/>Engine"]
        AuditLog["Audit<br/>Trail"]
    end

    subgraph SIMULATION["🌐 Digital Twin (Simulation Layer)"]
        SpatialGrid["Spatial Grid<br/>(10km×10km)"]
        ChannelModel["UHF Propagation<br/>Model"]
        SUMOLoader["SUMO/Veins<br/>Network Loader"]
        UnicastModel["Unicast Network<br/>Simulator"]
    end

    subgraph BROADCAST["📡 Broadcast Abstraction Layer"]
        ATSC_Adapter["ATSC 3.0<br/>Adapter"]
        RFAdapter["RF Hardware<br/>Interface (Stub)"]
        TerrainIF["Terrain<br/>Interface (SPLAT!)"]
        Emergency["Emergency<br/>Handler"]
    end

    subgraph DATA["💾 Data Layer"]
        KPIDB[(KPI Database<br/>SQLite)]
        SUMOData[("SUMO Network<br/>.net.xml")]
        SRTMData[("SRTM Terrain<br/>.shp/.prj")]
    end

    %% Client to API
    WebUI -->|HTTP REST| FastAPI

    %% API to AI Plane
    FastAPI --> IntentSvc
    FastAPI --> AIEngine
    FastAPI --> DemandPred
    FastAPI --> LearningLoop
    FastAPI --> KnowledgeStore

    %% AI Plane internal flow
    IntentSvc -->|"Parse Intent<br/>(Coverage, Emergency)"| AIEngine
    AIEngine -->|"Request Action"| RLAgent
    RLAgent -->|"Optimized Weights"| AIEngine
    AIEngine -->|"Validate in Simulation"| SpatialGrid
    LearningLoop -->|"Feedback"| RLAgent
    DemandPred -->|"Predictions"| AIEngine

    %% AI to Governance
    AIEngine -->|"Submit Recommendation"| ApprovalEngine
    ApprovalEngine -->|"Log Decision"| AuditLog

    %% Governance to Broadcast
    ApprovalEngine -->|"Approved Config"| ATSC_Adapter
    Emergency -->|"Override (Bypass)"| ATSC_Adapter

    %% Simulation layer
    SpatialGrid --> ChannelModel
    SUMOLoader -->|"Road Network"| SpatialGrid
    SpatialGrid --> UnicastModel

    %% Broadcast layer
    ATSC_Adapter --> RFAdapter
    TerrainIF -->|"Path Loss"| ChannelModel

    %% Data sources
    SUMOData -->|"Load"| SUMOLoader
    SRTMData -->|"Load"| TerrainIF
    KPIDB <-->|"Store/Query"| FastAPI

    %% Styling
    classDef clientStyle fill:#e1f5fe,stroke:#01579b
    classDef apiStyle fill:#fff3e0,stroke:#e65100
    classDef aiStyle fill:#f3e5f5,stroke:#7b1fa2
    classDef govStyle fill:#fce4ec,stroke:#c2185b
    classDef simStyle fill:#e8f5e9,stroke:#2e7d32
    classDef broadcastStyle fill:#fff8e1,stroke:#f57f17
    classDef dataStyle fill:#eceff1,stroke:#455a64

    class WebUI clientStyle
    class FastAPI apiStyle
    class IntentSvc,AIEngine,RLAgent,DemandPred,LearningLoop,KnowledgeStore aiStyle
    class ApprovalEngine,AuditLog govStyle
    class SpatialGrid,ChannelModel,SUMOLoader,UnicastModel simStyle
    class ATSC_Adapter,RFAdapter,TerrainIF,Emergency broadcastStyle
    class KPIDB,SUMOData,SRTMData dataStyle
```

---

## Component Breakdown

### 🖥️ **Client Layer**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Web UI | React 18 + Vite + TailwindCSS | 12 dashboard pages for NOC operators |

**Key Pages:**

- `IntentControl.tsx` - Operator intent injection
- `CognitiveBrain.tsx` - AI reasoning visualization
- `BroadcastTelemetry.tsx` - Live KPI monitoring
- `EmergencyMode.tsx` - Emergency override controls

---

### 🔌 **API Gateway**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| FastAPI Backend | Python 3.11, FastAPI, Uvicorn | REST API serving 11 route modules |

**Endpoints:**

- `/intent/*` - Intent parsing and policy extraction
- `/ai/*` - AI decision engine and cognitive state
- `/approval/*` - Human approval workflow
- `/kpi/*` - KPI metrics and history
- `/telemetry/*` - Broadcast-grade telemetry
- `/rf/*` - RF adapter status (simulation only)

---

### 🧠 **AI Intelligence Plane**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Intent Service | Python | Parse natural language → structured policy |
| AI Engine | Python | Generate ATSC 3.0 configurations |
| PPO RL Agent | stable-baselines3, PyTorch | Learn optimal weight adjustments |
| Demand Predictor | Python | Proactive load forecasting |
| Learning Loop | Python | Track and improve AI decisions over time |
| Knowledge Store | Python | Store historical patterns and outcomes |

**Decision Flow:**

```
Intent → Policy → AI Engine → Digital Twin Validation → Human Approval → Deployment
```

---

### 👤 **Human Governance Layer**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Approval Engine | Python | State machine for approve/reject workflow |
| Audit Trail | In-memory + DB | Complete traceability of all decisions |

**States:** `AI_RECOMMENDED` → `AWAITING_APPROVAL` → `ENGINEER_APPROVED` → `DEPLOYED`

---

### 🌐 **Digital Twin (Simulation)**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Spatial Grid | NumPy | 10km×10km coverage simulation |
| Channel Model | Python | Log-distance path loss + shadow fading |
| SUMO Loader | XML Parser | Load real road networks (199 junctions, 457 edges) |
| Unicast Model | Python | Cellular congestion simulation |

---

### 📡 **Broadcast Abstraction Layer**

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| ATSC Adapter | Python | Map AI decisions to A/322 parameters |
| RF Interface | Stub | Placeholder for future hardware integration |
| Terrain Interface | Stub | SPLAT! coverage map integration |
| Emergency Handler | Python | CAP alerts and automatic override |

> ⚠️ **NOTE:** This system does NOT transmit RF signals. All operations are simulated.

---

### 💾 **Data Layer**

| Component | Format | Content |
|-----------|--------|---------|
| KPI Database | SQLite | Historical KPIs, learning outcomes |
| SUMO Network | `.net.xml` | Erlangen road network (Veins) |
| SRTM Terrain | `.shp/.prj` | Elevation data for propagation |

---

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant Operator
    participant WebUI
    participant FastAPI
    participant AIEngine
    participant DigitalTwin
    participant ApprovalEngine
    participant ATSCAdapter

    Operator->>WebUI: Submit Intent<br/>"Ensure 99% coverage"
    WebUI->>FastAPI: POST /intent/parse
    FastAPI->>AIEngine: Generate Configuration
    AIEngine->>DigitalTwin: Validate Coverage
    DigitalTwin-->>AIEngine: Coverage: 94.2%
    AIEngine->>ApprovalEngine: Submit Recommendation
    ApprovalEngine-->>WebUI: Awaiting Approval
    Operator->>WebUI: Click "Approve"
    WebUI->>ApprovalEngine: POST /approval/approve
    ApprovalEngine->>ATSCAdapter: Deploy Config
    ATSCAdapter-->>WebUI: Deployed ✓
```

---

## Technology Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **AI/ML** | PyTorch, stable-baselines3, Gymnasium, NumPy, SciPy |
| **Simulation** | Custom Digital Twin, SUMO/Veins integration |
| **Data** | SQLite, XML parsing, Shapefiles |
| **DevOps** | Git, pytest |

---

## Key Architectural Principles

1. **Simulation-First Validation** - All AI decisions are tested in the Digital Twin before approval
2. **Human-in-the-Loop** - No configuration deploys without explicit human approval
3. **Separation of Concerns** - AI intelligence is decoupled from RF transmission
4. **Explainability** - Every AI decision includes reasoning and confidence scores
5. **Emergency Override** - Deterministic emergency paths bypass normal approval when lives are at risk
