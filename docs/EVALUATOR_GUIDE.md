# Evaluator's Guide: Intent-Driven AI-Native Network Slicing

## Quick Start

1. **Run the project:**

   ```
   Double-click start_project.cmd
   ```

2. **Wait for both servers:**
   - Backend: <http://localhost:8000>
   - Frontend: <http://localhost:5173>

3. **Navigate to Telemetry page** to see live metrics

---

## What You're Looking At

This is an **AI-native control plane** for ATSC 3.0 broadcast networks. It demonstrates:

| Feature | What It Shows |
|---------|---------------|
| **Traffic Offloading** | AI shifts load from cellular to broadcast when congested |
| **Mobility Support** | Coverage adapts for moving vehicles (30-80 km/h) |
| **Emergency Priority** | Guaranteed delivery of public safety alerts |
| **Human-in-the-Loop** | Engineers approve/reject AI recommendations |

---

## 3 Demo Scenarios

### Scenario 1: Cellular Congestion Relief

**Steps:**

1. Open Demo Controls panel (right side)
2. Enable **Demo Mode**
3. Click **Cellular Congestion**
4. Watch the Telemetry page

**Expected Behavior:**

- Congestion gauge spikes to 85%
- Offload ratio increases automatically
- AI Explanation shows: "High congestion detected, offloading to broadcast"
- Latency reduction appears (e.g., "↓15ms saved")

---

### Scenario 2: Mobility Surge (Connected Vehicles)

**Steps:**

1. Click **Mobility Surge** in Demo Controls
2. Watch the Mobility section on Telemetry page

**Expected Behavior:**

- Mobile users jump to 60%
- Average velocity shows 75 km/h
- Mobile coverage may dip slightly
- AI Explanation shows: "Using robust ModCod for high-speed receivers"

---

### Scenario 3: Emergency Alert Override

**Steps:**

1. Click **Emergency Alert** in Demo Controls
2. Observe the system-wide changes

**Expected Behavior:**

- Mode changes to "EMERGENCY" (orange indicator)
- Emergency resource ratio increases to ~40%
- AI prioritizes alert delivery over throughput
- QPSK modulation selected for maximum robustness

---

## What Judges Should Look For

### ✅ AI Adaptation

- System reacts to stress conditions without crashing
- Metrics change in response to hurdles
- Explanations are human-readable

### ✅ Safety First

- Emergency mode always takes priority
- AI never recommends unsafe configurations
- Human approval required for non-emergency changes

### ✅ Real-Time Updates

- Telemetry updates every 2-3 seconds
- Changes propagate throughout the UI
- No stale data or frozen displays

### ✅ Explainability

- AI Explanation banner shows reasoning
- KPI cards have source badges (🧪 Simulated, etc.)
- Tooltips provide context

---

## What This Project Is NOT ⚠️

> **IMPORTANT FOR EVALUATION**

This system does **NOT**:

- Transmit RF signals
- Use licensed spectrum
- Replace certified broadcast equipment
- Interface with real ATSC encoders

This is a **decision and optimization layer** that:

- Simulates network conditions (digital twin)
- Recommends configurations
- Validates changes before deployment
- Provides human approval workflow

---

## API Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /telemetry/all` | All broadcast metrics |
| `GET /telemetry/offloading` | Congestion & mobility data |
| `POST /env/hurdle` | Trigger stress test |
| `POST /env/reset` | Reset to baseline |
| `POST /env/demo-mode` | Toggle demo mode |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend shows "Connection error" | Check backend is running on port 8000 |
| Metrics not updating | Click Refresh or check Auto-refresh is on |
| Demo controls not working | Ensure backend is started first |

---

**Project:** Intent-Driven AI-Native Network Slicing for Rural Broadcasting (ATSC 3.0)  
**Submission:** ITU FG-AINN Build-a-thon 4.0
