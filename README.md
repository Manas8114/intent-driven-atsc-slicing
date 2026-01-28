# Intent-Driven AI-Native Network Slicing for Rural Broadcasting (ATSC 3.0)

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0%2B-purple)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-cyan)](https://tailwindcss.com)
[![Expo](https://img.shields.io/badge/Expo-Go-black)](https://expo.dev)

## Overview

This project implements a production-grade research prototype for an **AI-native, intent-driven broadcast control plane**. It translates high-level operator intents (e.g., "maximize rural coverage", "ensure emergency reliability") into specific ATSC 3.0 physical layer configurations (PLPs, Modulation, Coding, Power) while guaranteeing compliance with emergency alerts and regulatory constraints.

The system features a **closed-loop control system** where a Reinforcement Learning (PPO) agent optimizes spectrum allocation dynamically based on real-time simulated feedback from a spatial "Digital Twin" of the coverage area.

> **🏆 ITU FG-AINN Hackathon Edition (Build-a-thon 4.0)**
> This version includes special "Realism" and "Demo" features including a full mobile stack with RF physics simulation.

---

## 🚀 Quick Start (Demo Mode)

We have created a unified launcher for the entire stack (Backend + Frontend + Mobile Servers).

### One-Click Launch

Double-click `start_all.cmd` (Windows) or run:

```cmd
start_all.cmd
```

This will open **4 terminal windows** automatically:

1. **Backend API** (<http://localhost:8000>)
2. **Frontend Dashboard** (<http://localhost:5173>)
3. **BLE Advertiser** (Expo Server)
4. **BLE Receiver** (Expo Server)

### Mobile App Setup

1. Install **Expo Go** on two Android phones.
2. Scan the **QR Code** in the "BLE Advertiser" terminal with Phone 1.
3. Scan the **QR Code** in the "BLE Receiver" terminal with Phone 2.
4. Ensure phones and laptop are on the **same WiFi network**.

---

## 📱 New Mobile Realism Features

The BLE Receiver app has been upgraded to demonstrate professional RF engineering concepts:

### 1. I/Q Constellation Diagram

* Real-time visualization of signal quality in the I/Q plane.
* **Tight Clusters:** Strong signal (High SNR).
* **Scattered Points:** Noisy signal (Low SNR).
* Supports QPSK, 16QAM, 64QAM, 256QAM modulations.

### 2. Advanced Physics Simulation

* **Real-World Math:** Uses Log-distance path loss model and AWGN channel model.
* **Distance Control:** Use the **-5m / +5m** buttons to simulate walking distance.
* **Chain Reaction:** Increasing Distance → Reduces RSSI → Reduces SNR → Increases BER → Causes CRC Failures.

### 3. Real Binary Protocol

* The system transmits **real 20-byte binary packets** encoded with Python's `struct` module.
* The mobile app performs **local decoding** and **real CRC-16 verification** (no API cheating).

---

## ⚡ Quick Demo Mode

For hackathon presentations, use the **"🚀 QUICK DEMO"** button in the Frontend sidebar:

1. **Injects Knowledge:** Seeds the AI with 30 pre-learned experiences showing an improving reward curve.
2. **Triggers Chaos:** Immediately activates a "Monsoon" weather scenario.
3. **Shows Adaptation:** The AI instantly adapts modulation to maintain coverage, visible in the "Thinking Trace" and Constellation Diagram.

---

## System Boundaries (IMPORTANT)

> **This system is a CONTROL AND OPTIMIZATION LAYER, not a transmission system.**

### What This System DOES ✅

* Computes encoder-ready configurations using AI optimization
* Simulates baseband behavior for pre-deployment validation
* Acts as a control and optimization layer for broadcast operations
* Requires human approval before any configuration deployment
* Provides full audit trail for all decisions

### What This System Does NOT Do ❌

| Capability | Status |
|------------|--------|
| Generate ATSC 3.0 RF waveforms | ❌ NOT IMPLEMENTED |
| Transmit on licensed spectrum | ❌ NOT IMPLEMENTED |
| Replace certified broadcast encoders | ❌ NOT IMPLEMENTED |
| Interface with real RF hardware | ❌ STUBBED (architectural placeholder) |

This transparency is intentional and increases credibility with real broadcast operators.

---

## Key Features

* **Human Approval Workflow**: AI recommendations require engineer approval before deployment.
* **Intent Translation**: Natural language-like intents are mapped to mathematical utility functions.
* **AI Orchestration (RL)**: PPO agent dynamically adjusts slice weights.
* **Digital Twin Simulation**: sophisticated `SpatialGrid` simulation models UHF propagation.
* **Bootstrap Uncertainty Analysis**: Publication-quality statistical inference with BCa confidence intervals.

---

## Architecture

```
┌─────────────────────┐
│   Human Engineer    │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  AI Control Plane   │ ◄── Backend (FastAPI + AI Engine)
│  (Recommendations)  │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Encoder / Exciter   │ ◄── Vendor Equipment (Harmonic, TeamCast, etc.)
│ (Certified Hardware)│
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│    RF Hardware      │ ◄── Licensed Transmission
└─────────────────────┘
```

**This system replaces manual engineering decisions, not certified RF hardware.**

---

## Key Features

* **Human Approval Workflow**: AI recommendations require engineer approval before deployment. Emergency mode allows bypass with full logging.
* **Intent Translation**: Natural language-like intents are mapped to mathematical utility functions and constraints.
* **AI Orchestration (RL)**: A Proximal Policy Optimization (PPO) agent dynamically adjusts slice weights to balance competing objectives (e.g., Reliability vs. Throughput).
* **Digital Twin Simulation**: A sophisticated `SpatialGrid` simulation models UHF propagation, interference, and decoding probability across a 10km x 10km rural grid.
* **Bootstrap Uncertainty Analysis**: Publication-quality statistical inference with BCa confidence intervals, block bootstrap for time-series, and IEEE-formatted reporting.
* **Real-World Data Integration**: Integrates **FCC Broadcast Station Data** (AM/FM/TV) and **OpenCellID** (5M+ towers) to model realistic interference scenarios.
* **Broadcast-Grade Telemetry**: Comprehensive monitoring of transmission metrics, receiver statistics, and control plane performance with NOC-style dashboards.
* **Hurdle Control**: Interactive controls to simulate adverse network conditions (Interference, Load Spikes, Spectrum Loss) to test the system's resilience.
* **Explainability**: Transparent "Decision Logs" explain *why* the AI made specific configuration changes (e.g., "Shifted to QPSK due to low SNR").
* **ATSC 3.0 Compliance**: Models legitimate A/322 Physical Layer Pipe (PLP) configurations and signaling.
* **Baseband Abstraction**: Encoder-ready configuration export for future hardware integration.
* **Real-Time Performance**: Measured sub-10ms decision cycles with instrumented latency tracking.

---

## Performance Benchmarks

> **All latency values are measured using high-precision `time.perf_counter()` instrumentation.**

| Metric | Measured Value | Target |
|--------|----------------|--------|
| PPO Policy Inference | ~0.5 - 2.0 ms | <2 ms |
| Digital Twin Validation | ~1.0 - 3.0 ms | <5 ms |
| Total Decision Cycle | ~2.0 - 6.0 ms | <10 ms |
| Coverage Improvement | +10-15% | >10% |
| Emergency Reliability | 97-99% | >95% |

*Values measured on reference hardware: Intel i7, 16GB RAM, CPU-only inference*

### Why Real-Time Inference is Achievable

The PPO agent uses **offline training** with **online inference only**:

* **Training**: 10,000+ timesteps on Digital Twin (done once, saved to disk)
* **Runtime**: Single `model.predict()` call (~0.8ms on CPU)
* **No gradient computation**, no backpropagation at demo time

This architecture enables cognitive decisions in **<10ms**, meeting real-time broadcast requirements.

For detailed methodology, see [docs/BENCHMARKS.md](docs/BENCHMARKS.md).

---

## Future Research & Algorithmic Extensions

> **Note**: The following represent potential research directions, not current features.

### Near-Term Extensions

* **Model-Based RL (MPC + RL hybrid)**: Combine learned world models with policy optimization for faster adaptation
* **Actor-Critic Methods (SAC)**: Soft Actor-Critic for continuous action control with entropy regularization
* **Policy Distillation**: Compress large networks into ultra-fast inference models (<1ms)

### Longer-Term Research

* **Multi-Agent RL (MARL)**: Decentralized optimization for multi-transmitter scenarios
* **Approximate Dynamic Programming**: Learned value functions for faster decision making
* **Drift-Plus-Penalty Methods**: Multi-objective optimization for competing KPIs (coverage vs. throughput)

These extensions would further reduce latency and improve adaptation speed while maintaining the human-governed architecture.

---

## Architecture

The system consists of four integrated layers:

### 1. Backend (FastAPI + AI Engine)

* **API Layer**: REST endpoints for intent submission and status monitoring.
* **AI Engine**: Integrates the PPO Agent and Convex Optimizer.
* **Optimizer**: Solves for optimal Power/Bandwidth allocation using water-filling algorithms.
* **Approval Engine**: State machine ensuring human oversight (AI_RECOMMENDED → ENGINEER_APPROVED → DEPLOYED).

### 2. Simulation Layer (Digital Twin)

Pre-deployment validation through simulation:

* `SpatialGrid`: Simulates signal propagation over a realistic 10km x 10km terrain grid.
* `Environment`: Manages external variables like Noise Floor, Interference, and User Traffic.
* `Interference Simulator`: Models co-channel and adjacent channel interference.

**These simulations reduce risk before real broadcast changes.**

### 3. Abstraction Layers (Architectural)

* `baseband_interface.py`: Symbolic baseband frame generation, encoder-ready exports.
* `iq_generator.py`: Simulated I/Q samples for visualization (NOT RF-accurate).
* `rf_adapter.py`: RF front-end abstraction with SIMULATION mode only (SDR/Encoder modes stubbed).
* `libatsc3_bridge.py`: Python bindings to libatsc3 C library for ATSC 3.0 protocol parsing and validation.

### 4. Frontend (React + Vite)

* Real-time dashboard for operators.
* **Decision Approval Panel**: Engineers approve/reject AI recommendations.
* **Broadcast Readiness Checklist**: Explicit visibility of implementation status.
* **Broadcast Telemetry Dashboard**: NOC-style monitoring of transmission, receiver, and control plane metrics.
* Visualizations for Spectrum usage, Coverage Heatmaps, and KPI trends.
* Control panel for Intents and Hurdle simulation.

---

## Getting Started

### Prerequisites

* **OS**: Windows (preferred for provided scripts), Linux, or macOS.
* **Python**: Version 3.10 or higher.
* **Node.js**: Version 18 or higher.

### Quick Start (Windows)

The easiest way to run the full stack is using the provided startup script:

1. **Clone the repository**.
2. **Run the startup script**:
    Double-click `start_project.cmd` or run it from the terminal:

    ```cmd
    start_project.cmd
    ```

    This will:
    * Install Python dependencies from `backend/requirements.txt`.
    * Install Node.js dependencies for the frontend.
    * Start the Backend server on `http://localhost:8000`.
    * Start the Frontend client on `http://localhost:5173`.
    * Open separate command windows for backend and frontend processes.

### Quick Start (Linux/macOS)

For Linux or macOS systems:

1. **Install dependencies**:

    ```bash
    # Backend
    pip install -r backend/requirements.txt
    
    # Frontend
    cd frontend && npm install
    ```

2. **Start the services**:

    ```bash
    # Terminal 1: Backend
    python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
    
    # Terminal 2: Frontend
    cd frontend && npm run dev
    ```

### Manual Setup

If you prefer to run components individually:

#### 1. Backend

```bash
# Navigate to project root
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Usage Guide

1. **Dashboard**: Open `http://localhost:5173`.
2. **Decision Approval**: Navigate to "Decision Approval" to see pending AI recommendations. Approve or reject each recommendation.
3. **Intent Control**: Use the "Active Intent" dropdown to switch modes (e.g., from "Balanced" to "Emergency"). Observe how the system reconfigures PLPs.
4. **Broadcast Telemetry**: Monitor transmission metrics, receiver statistics, and control plane performance in the "Telemetry" dashboard.
5. **Hurdle Simulation**: Use the "Hurdle Control" panel to inject faults (e.g., "High Interference"). Watch the AI adapt by lowering modulation order (e.g., 256QAM → 16QAM) to maintain coverage.
6. **Readiness Checklist**: Review the "Readiness Checklist" page to see what's implemented vs. what's not.
7. **Deep Dive**: Click on specific AI Decisions in the log to see the detailed "Reasoning" and "Context".

---

## Folder Structure

* `backend/`: FastAPI app, AI models (`rl_agent.py`), approval engine, and optimization logic.
  * `ai_engine.py`: AI decision engine with human approval integration
  * `approval_engine.py`: Human approval workflow state machine
  * `baseband_interface.py`: Encoder-ready configuration abstraction
  * `broadcast_telemetry.py`: Broadcast-grade telemetry and monitoring
  * `environment_router.py`: Environment control and hurdle simulation
  * `intent_service.py`: Intent translation service
  * `iq_generator.py`: Simulated I/Q for visualization
  * `kpi_engine.py`: KPI tracking and metrics
  * `libatsc3_bridge.py`: Bridge to libatsc3 library
  * `main.py`: FastAPI application entry point
  * `optimizer.py`: Spectrum optimization algorithms
  * `rf_adapter.py`: RF front-end abstraction (simulation only)
  * `rl_agent.py`: Reinforcement learning agent
  * `simulation_state.py`: Simulation state management
  * `simulator.py`: Main simulation orchestrator
  * `visualization_router.py`: Visualization data endpoints
  * `requirements.txt`: Python dependencies
  * `__pycache__/`: Python bytecode cache
* `frontend/`: React application code (`src/pages`, `src/components`).
  * `src/pages/`: Main application pages
    * `ApprovalPanel.tsx`: Decision approval UI
    * `BroadcastReadiness.tsx`: Implementation checklist
    * `BroadcastTelemetry.tsx`: Telemetry dashboard
    * `CapabilitiesLimits.tsx`: System capabilities and limits
    * `EmergencyMode.tsx`: Emergency control interface
    * `Explainability.tsx`: AI decision explanations
    * `IntentControl.tsx`: Intent submission interface
    * `KPIDashboard.tsx`: KPI monitoring dashboard
    * `Overview.tsx`: Main dashboard overview
    * `PLPVisualization.tsx`: PLP spectrum visualization
  * `src/components/`: Reusable UI components
  * `src/context/`: React context providers
  * `src/lib/`: Utility libraries
  * `package.json`: Node.js dependencies
* `sim/`: Physics simulation (`spatial_model.py`) and validation scripts.
  * `spatial_model.py`: Digital twin spatial coverage simulation
  * `channel_model.py`: RF propagation modeling
  * `interference_simulator.py`: Interference simulation
  * `real_interference_simulator.py`: Real-world interaction modeling
  * `emergency_scenarios.py`: Emergency scenario testing
  * `validation.py`: Simulation validation utilities
  * `__pycache__/`: Python bytecode cache
* `data/`: Data ingestion and processing
  * `fcc_data_parser.py`: Parser for FCC broadcast station databases
  * `osm_data_fetcher.py`: Fetcher for OpenStreetMap terrain capabilities
  * `pdf_extractor.py`: Utility for extracting query results from regulatory PDFs
  * `broadcast_data_loader.py`: Universal loader for processed CSV datasets
* `libatsc3/`: ATSC 3.0 reference library (C/C++).
  * `src/`: Source code for ATSC 3.0 parsing and processing
  * `CMakeLists.txt`: Build configuration
  * `README.md`: Library documentation
* `docs/`: Additional documentation.
  * `explainability.md`: AI decision explainability details
  * `frontend_design.md`: Frontend design principles
  * `frontend_realtime_spec.md`: Real-time frontend specifications
* `tests/`: Test suites and validation scripts.
* `start_project.cmd`: Windows startup script for full stack

---

## API Documentation

After starting the backend, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

Key endpoints:

### Intent Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /intent/` | POST | Submit high-level operator intent |

### AI Engine

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /ai/decision` | POST | Generate AI configuration recommendation |

### Approval Workflow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /approval/pending` | GET | Get pending approval requests |
| `GET /approval/all` | GET | Get all approval records |
| `GET /approval/{id}` | GET | Get specific approval record |
| `POST /approval/approve` | POST | Engineer approves recommendation |
| `POST /approval/reject` | POST | Engineer rejects recommendation |
| `POST /approval/emergency-override` | POST | Emergency bypass with logging |
| `GET /approval/audit/log` | GET | Get audit trail |
| `GET /approval/status/last-deployed` | GET | Get last deployed configuration |

### KPI Engine

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /kpi/` | GET | Get KPI history |
| `POST /kpi/record` | POST | Record new KPI data |
| `GET /kpi/live` | GET | Get live KPI metrics |
| `GET /kpi/packets` | GET | Get packet statistics |
| `GET /kpi/packets/history` | GET | Get packet stats history |
| `POST /kpi/update` | POST | Update KPI values |
| `POST /kpi/save` | POST | Save current KPIs |
| `POST /kpi/reset` | POST | Reset KPI counters |

### Environment Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /env/state` | GET | Get current environment state |
| `POST /env/hurdle` | POST | Set environmental hurdles |

### Visualization

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /viz/constellation` | GET | Get constellation diagram data |
| `GET /viz/spectrum` | GET | Get spectrum visualization data |
| `GET /viz/baseband-frame` | GET | Get baseband frame data |
| `GET /viz/current` | GET | Get current visualization state |
| `POST /viz/validate` | POST | Validate visualization parameters |
| `GET /viz/capabilities` | GET | Get system capabilities |

### RF Adapter (Simulation Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /rf/status` | GET | Get RF adapter status |
| `GET /rf/hardware` | GET | Get hardware information |
| `GET /rf/transmission-log` | GET | Get transmission log |
| `POST /rf/validate` | POST | Validate RF configuration |

### Broadcast Telemetry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /telemetry/all` | GET | Get all telemetry data |
| `GET /telemetry/transmission` | GET | Get transmission telemetry |
| `GET /telemetry/receiver` | GET | Get receiver telemetry |
| `GET /telemetry/control-plane` | GET | Get control plane telemetry |

### Bootstrap Uncertainty Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /bootstrap/analysis` | GET | Full bootstrap analysis with BCa confidence intervals |
| `GET /bootstrap/diagnostics` | GET | Convergence and stability diagnostics |
| `GET /bootstrap/report` | GET | IEEE-formatted reporting text |
| `GET /bootstrap/comparison` | GET | Bootstrap vs Bayesian comparison |

---
Why This Matters
Proper form labeling is essential for:

Screen reader users - They can understand what each field is for
Motor-impaired users - Clicking the label also focuses the input (larger click target)
SEO and standards compliance - Meets WCAG accessibility guidelines

The "Honest" Constructive Critique
If you take this beyond the hackathon, the biggest hurdle will be Simulation vs. Reality. Currently, the AI is learning in a perfect digital environment. In a real RF environment, multi-path interference and hardware latency are "noisy" in ways simulations rarely capture. To make this production-ready, your next big push would be "Sim-to-Real" transfer learning—training on hardware data.

> **See [docs/LIMITATIONS.md](docs/LIMITATIONS.md) for a detailed analysis of the Sim-to-Real gap, Drift Detection logic, and Safety Constraints implemented to address these challenges.**

---

## License

MIT License - Open for Research and Education.
