# intent-driven-atsc-slicing

Intent-Driven AI-Native Network Slicing for Rural Broadcasting (ATSC 3.0) — production-grade research prototype translating high-level operator intents into physical layer configurations with closed-loop RL optimization.

## Overview

Implements an **AI-native broadcast control plane** that:
1. Accepts human-readable intents (e.g., "maximize rural coverage", "ensure emergency reliability")
2. Maps intents → mathematical utility functions
3. Optimizes ATSC 3.0 Physical Layer Pipes (PLPs): modulation, coding, power, bandwidth
4. Validates via spatial Digital Twin (UHF propagation over 10km×10km grid)
5. Deploys with human-in-the-loop approval workflow

## Key Features

| Capability | Description |
|------------|-------------|
| **Intent Translation** | Natural language-like intents → convex utility functions |
| **RL Optimization** | PPO agent dynamically adjusts slice weights |
| **Digital Twin** | `SpatialGrid` simulation (terrain, interference, UHF propagation) |
| **Human Approval** | AI recommendations require engineer sign-off |
| **Bootstrap Uncertainty** | BCa confidence intervals (10,000 resamples, block bootstrap for time-series) |
| **Real-time Telemetry** | Sub-10ms decision cycles, NOC-style dashboards |

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
│  Approval Engine    │ ◄── State machine: AI_RECOMMENDED → ENGINEER_APPROVED → DEPLOYED
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│  Encoder/Exciter    │ ◄── Vendor equipment (Harmonic, TeamCast, etc.)
│  (Certified HW)     │
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   RF Hardware       │ ◄── Licensed transmission
└─────────────────────┘
```

## Quick Start

```bash
# Backend
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm install && npm run dev
# Open http://localhost:5173
```

## Demo Mode (Hackathon)

```bash
start_all.cmd
# Opens 4 terminals: Backend, Frontend, BLE Advertiser, BLE Receiver
# Mobile: Expo Go → scan QR codes for I/Q constellation + physics simulation
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /intent/` | POST | Submit high-level operator intent |
| `POST /ai/decision` | POST | Generate AI configuration recommendation |
| `GET /approval/pending` | GET | List pending approvals |
| `POST /approval/approve` | POST | Engineer approves recommendation |
| `GET /kpi/` | GET | Get KPI history |
| `GET /bootstrap/analysis` | GET | BCa bootstrap uncertainty analysis |

## System Boundaries (IMPORTANT)

| ✅ This System DOES | ❌ This System Does NOT |
|---------------------|------------------------|
| Computes encoder-ready configurations | Generate ATSC 3.0 RF waveforms |
| Simulates baseband behavior for validation | Transmit on licensed spectrum |
| Acts as control/optimization layer | Replace certified broadcast encoders |
| Requires human approval for deployment | Interface directly with RF hardware |

## Tech Stack

- **Backend**: FastAPI, Python 3.11, PyTorch (PPO), NumPy/SciPy
- **Frontend**: React 19, Vite, Tailwind 4, Recharts
- **Mobile**: Expo (React Native), BLE, real-time I/Q constellation
- **Simulation**: Custom `SpatialGrid` (UHF propagation, terrain, interference)

## License

MIT (research prototype)