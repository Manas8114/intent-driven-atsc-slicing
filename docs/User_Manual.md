# User Manual

## AI-Native Broadcast Intelligence Platform

---

## Quick Start

### 1. Start the System

**Windows:**

```cmd
start_project.cmd
```

**Manual:**

```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### 2. Open Dashboard

Navigate to: **<http://localhost:5173>**

---

## Dashboard Pages

### 🎯 Intent Control

**Path:** `/intent`

Submit high-level operator intents:

- **Maximize Rural Coverage** - Focus on distant users
- **Emergency Reliability** - Prioritize alert delivery
- **Optimize Spectrum** - Maximize throughput

**How to use:**

1. Click a preset intent card
2. Review "Predicted Impact Assessment"
3. Click "Confirm & Apply Intent"

---

### 🧠 Cognitive Brain

**Path:** `/cognitive`

Visualize AI reasoning and decision-making process.

**Features:**

- Real-time AI state display
- Decision confidence scores
- Reasoning explanation

---

### 📊 KPI Dashboard

**Path:** `/kpi`

Monitor key performance indicators:

- Coverage percentage
- Alert reliability
- Latency metrics
- Spectral efficiency

---

### 📡 Broadcast Telemetry

**Path:** `/telemetry`

Real-time broadcast metrics:

- Transmission-side metrics
- Receiver-side metrics
- Traffic offloading status
- Mobile user coverage

---

### 🚨 Emergency Mode

**Path:** `/emergency`

Emergency broadcast controls:

- Trigger emergency override
- View alert status
- Monitor emergency PLP configuration

---

### ✅ Approval Workflow

**Path:** `/approval`

Human governance interface:

- Review AI recommendations
- Approve or reject configurations
- View audit trail

---

### 📈 Learning Timeline

**Path:** `/learning`

Track AI improvement over time:

- Learning milestones
- KPI improvement trends
- Before/after comparisons

---

### 🗺️ Knowledge Map

**Path:** `/knowledge`

Visualize learned patterns:

- Coverage heatmaps
- Density observations
- Mobility patterns

---

### 📊 Bootstrap Uncertainty

**Path:** `/bootstrap`

Statistical confidence analysis:

- BCa confidence intervals
- Convergence diagnostics
- IEEE-formatted reports

---

## Demo Walkthrough

### Demo 1: Intent to Configuration

1. Go to **Intent Control**
2. Select "Maximize Rural Coverage"
3. Observe impact assessment
4. Click "Confirm"
5. Watch **KPI Dashboard** update
6. Go to **Approval** to approve

### Demo 2: Emergency Override

1. Go to **Emergency Mode**
2. Click "Trigger Emergency"
3. Observe ModCod switch to QPSK 1/2
4. Watch coverage reach 99%+
5. Check **Telemetry** for alert metrics

### Demo 3: Congestion Offload

1. Go to **Broadcast Telemetry**
2. Observe current congestion level
3. Inject congestion via API:

   ```bash
   curl -X POST http://localhost:8000/env/hurdle \
     -d '{"hurdle": "congestion", "level": 0.7}'
   ```

4. Watch offload ratio increase
5. Observe latency reduction

### Demo 4: Learning Progress

1. Go to **Learning Timeline**
2. Observe improvement milestones
3. Check before/after comparison
4. Review coverage improvement %

---

## API Quick Reference

| Action | Command |
|--------|---------|
| Get AI Decision | `curl http://localhost:8000/ai/decision` |
| Submit Intent | `curl -X POST http://localhost:8000/intent/ -d '{"intent":"maximize_coverage"}'` |
| Approve Config | `curl -X POST http://localhost:8000/approval/approve` |
| Get Live KPIs | `curl http://localhost:8000/kpi/live` |
| Trigger Emergency | `curl -X POST http://localhost:8000/env/hurdle -d '{"hurdle":"emergency"}'` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not starting | Check Python 3.11+ installed |
| Frontend blank | Run `npm install` in frontend folder |
| CORS errors | Ensure backend running on port 8000 |
| No KPI data | Backend may need warm-up (30s) |

---

## Files Structure

```
intent-driven-atsc-slicing/
├── backend/           # FastAPI server
│   ├── main.py        # API entry point
│   ├── rl_agent.py    # PPO agent
│   └── ...
├── frontend/          # React dashboard
│   └── src/pages/     # Dashboard pages
├── sim/               # Digital Twin
│   └── spatial_model.py
├── docs/              # Documentation
└── start_project.cmd  # Quick start
```
