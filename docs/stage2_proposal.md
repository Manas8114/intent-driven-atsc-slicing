# Stage 2 Proposal: Implementation of Intent-Driven AI-Native Network Slicing

## Technical Implementation Proposal for ITU FG-AINN Build-a-thon 4.0

**Submission Date:** January 2026  
**Status:** Functional Prototype (~90% Complete)

---

## 1. System Architecture

### 1.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Human Operator                           │
│                    (Intent Submission)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Intent Service Layer                         │
│              (Policy Translation & Validation)                   │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Decision Engine                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │  PPO Agent  │  │  Spectrum   │  │   Unicast Congestion    │ │
│   │ (RL Weight  │→ │  Optimizer  │→ │      Model              │ │
│   │ Adjustment) │  │ (Convex)    │  │                         │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Digital Twin Simulation                      │
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│   │  Spatial Grid   │  │  Channel Model  │  │  Mobile Users  │  │
│   │ (Static + Mobile│→ │  (Propagation)  │→ │  (Vehicles)    │  │
│   │     Users)      │  │                 │  │                │  │
│   └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Approval Engine                               │
│           (Human-in-the-Loop State Machine)                      │
│    [AI_RECOMMENDED] → [ENGINEER_APPROVED] → [DEPLOYED]          │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Encoder-Ready Configuration                     │
│              (ATSC 3.0 A/322 Compliant Output)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Module Index

| Module | Path | Purpose |
|--------|------|---------|
| AI Decision Engine | `backend/ai_engine.py` | Recommendation generation with risk assessment |
| RL Agent | `backend/rl_agent.py` | PPO-based weight/offload optimization |
| Spectrum Optimizer | `backend/optimizer.py` | Convex optimization with A/322 ModCod table |
| Approval Engine | `backend/approval_engine.py` | Human approval workflow state machine |
| Unicast Model | `sim/unicast_network_model.py` | Cellular congestion simulation |
| Spatial Model | `sim/spatial_model.py` | Digital twin with static + mobile users |
| Simulator | `backend/simulator.py` | KPI evaluation including offloading metrics |
| Frontend | `frontend/src/pages/` | React-based operator dashboard |

---

## 2. AI Design

### 2.1 Reinforcement Learning Agent

**Algorithm:** Proximal Policy Optimization (PPO)  
**Framework:** Stable-Baselines3 with Gymnasium

#### State Space (7 dimensions)

| Index | Feature | Range | Description |
|-------|---------|-------|-------------|
| 0 | Coverage % | [0, 100] | Percentage of users with acceptable SNR |
| 1 | Average SNR | [-10, 40] dB | Mean signal quality across grid |
| 2 | Emergency Weight | [0.1, 5.0] | Priority weight for emergency slice |
| 3 | Coverage Weight | [0.1, 5.0] | Priority weight for coverage slice |
| 4 | Unicast Congestion | [0.0, 1.0] | Cellular network load level |
| 5 | Mobile User Ratio | [0.0, 1.0] | Fraction of mobile receivers |
| 6 | Avg Velocity (norm) | [0.0, 1.0] | Normalized average speed |

#### Action Space (3 dimensions)

| Index | Action | Range | Description |
|-------|--------|-------|-------------|
| 0 | Δ Emergency Weight | [-0.5, 0.5] | Adjustment to emergency priority |
| 1 | Δ Coverage Weight | [-0.5, 0.5] | Adjustment to coverage priority |
| 2 | Offload Ratio | [0.0, 1.0] | Traffic to offload to broadcast |

#### Reward Function

```python
reward = coverage / 10.0  # Base coverage reward

# Low coverage penalty
if coverage < 80.0:
    reward -= 10.0
    
# Congestion management reward
congestion_reduction = congestion - effective_congestion
reward += congestion_reduction * 5.0

# High congestion penalty
if effective_congestion > 0.7:
    reward -= (effective_congestion - 0.7) * 20.0
    
# Emergency safety constraint (hard)
if emergency_weight < 0.5:
    reward -= 15.0
```

### 2.2 Spectrum Optimizer

**Method:** Water-filling algorithm (convex optimization)  
**Compliance:** Full ATSC 3.0 A/322 ModCod table (48 modes)

The optimizer solves:

```
Maximize: Σ W_i × log₂(1 + P_i × H_i / (N₀ × W_i))
Subject to:
  Σ P_i ≤ P_total
  Σ W_i ≤ W_total
  P_i, W_i ≥ 0
```

---

## 3. Traffic Offloading Logic

### 3.1 Unicast Congestion Model

The `UnicastNetworkModel` simulates cellular network load:

```python
# Time-of-day patterns
if peak_hours:  # 5 PM - 9 PM
    load *= 1.5
    
# Emergency surge
if emergency_active:
    load += 0.4  # 40% surge
    
# Mobility overhead (handovers)
load += mobile_user_ratio * 0.15

# Derived metrics
latency = base_latency * exp(3 × (congestion - 0.5))
packet_loss = 0.2 × (congestion - 0.5)² if congestion > 0.5
```

### 3.2 Offload Decision Logic

The RL agent learns to set `offload_ratio` based on:

1. Current unicast congestion level
2. Available broadcast capacity
3. Emergency priority constraints
4. Mobile user population

**Heuristic baseline:**

- Congestion < 30%: No offload (0%)
- Congestion 30-50%: Gradual offload (0-50%)
- Congestion 50-70%: Aggressive offload (50-90%)
- Congestion > 70%: Maximum offload (90-100%)

### 3.3 Offload Benefit Calculation

```python
# Effective congestion after offloading
effective_congestion = congestion × (1 - offload_ratio × 0.7)

# Latency improvement
latency_saved = current_latency - projected_latency

# Users benefiting from offload
users_offloaded = active_users × offload_ratio
```

---

## 4. Mobility Modeling

### 4.1 Mobile User Representation

```python
@dataclass
class MobileUser:
    id: int
    x_km: float  # Position X
    y_km: float  # Position Y
    velocity_kmh: float  # Speed [30-80 km/h]
    heading_deg: float  # Direction
    path_type: str  # 'linear' or 'random'
```

### 4.2 Position Update

Each simulation tick:

```python
def update_position(dt_seconds):
    distance_km = (velocity_kmh / 3600) × dt_seconds
    x_km += distance_km × sin(heading_rad)
    y_km += distance_km × cos(heading_rad)
    # Bounce off grid boundaries
```

### 4.3 Velocity-Based SNR Degradation

Mobile receivers experience additional fading:

```python
velocity_penalty_db = velocity_kmh × 0.03  # ~1.5 dB at 50 km/h
rx_power -= velocity_penalty_db
```

### 4.4 AI Mobility Awareness

The agent observes:

- `mobile_user_ratio`: Fraction of mobile users
- `average_velocity_kmh`: Mean speed
- `mobile_coverage_success_rate`: Coverage for mobile vs static

**Learned behavior:** At high mobility, AI selects more robust ModCod (lower-order modulation) to maintain coverage stability.

---

## 5. Evaluation Methodology

### 5.1 Digital Twin Validation

All configurations are validated using the `SpatialGrid` before deployment:

1. **Coverage Estimation:** Percentage of users meeting SNR threshold
2. **Mobile Coverage:** Separate tracking for static and mobile users
3. **Alert Reliability:** Emergency message delivery probability
4. **Spectral Efficiency:** Throughput per Hz

### 5.2 Simulated Scenarios

| Scenario | Conditions | Expected Behavior |
|----------|------------|-------------------|
| Normal | Low congestion, 10% mobile | Standard ModCod, minimal offload |
| Peak Hours | High congestion, 15% mobile | Increase offload ratio to 40-60% |
| Emergency | Alert active, high mobility | Robust ModCod, priority override |
| Mobility Surge | 40% mobile at 60 km/h | Lower ModCod, aggressive offload |

### 5.3 Frontend Verification

The operator dashboard displays:

- **Congestion Gauge:** Cellular network load (0-100%)
- **Offload Dial:** Current broadcast offload ratio
- **Mobile Receivers:** Count, average speed, coverage rate
- **Adaptation Explanation:** Natural language reasoning

---

## 6. Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| Rural Coverage | ≥ 95% | SpatialGrid simulation |
| Emergency Reliability | ≥ 99.9% | Alert delivery probability |
| Congestion Reduction | ≥ 30% | Effective vs. raw congestion |
| Mobile Coverage | ≥ 85% | Coverage for receivers at 50+ km/h |
| AI Recommendation Accuracy | ≥ 90% | Approval rate by engineers |
| Response Latency | < 100 ms | Intent-to-recommendation time |

---

## 7. Technology Stack

| Component | Technology |
|-----------|------------|
| Backend API | FastAPI (Python 3.11+) |
| RL Framework | Stable-Baselines3 / Gymnasium |
| Optimization | SciPy (SLSQP) |
| Frontend | React 19 / Vite / Tailwind CSS |
| ATSC 3.0 Parsing | libatsc3 (C++) with Python bindings |
| Database | SQLite (KPI history) |

---

## 8. Limitations and Future Work

### Current Limitations

- **Simulation Only:** No RF transmission or hardware integration
- **Simplified Propagation:** Free-space path loss model
- **Synthetic Mobility:** Predefined paths, not real traffic data

### Future Extensions

1. **Real Hardware Integration:** Connect to certified ATSC 3.0 encoders
2. **Federated Learning:** Multi-tower coordination
3. **5G Integration:** Direct cellular-broadcast handoff
4. **Real Telemetry:** Receiver feedback for closed-loop control

---

## 9. Compliance Statement

> This system is an **optimization and decision support layer**. It does NOT transmit RF signals, replace certified broadcast equipment, or interface with licensed spectrum. All AI recommendations require human approval before deployment to production systems.

---

## 10. Repository Structure

```
intent-driven-atsc-slicing/
├── backend/
│   ├── ai_engine.py         # AI decision with approval integration
│   ├── rl_agent.py          # PPO agent (extended for offloading)
│   ├── optimizer.py         # Spectrum optimization (A/322)
│   ├── simulator.py         # Digital twin KPI evaluation
│   └── simulation_state.py  # State management (with mobility)
├── sim/
│   ├── spatial_model.py     # Coverage grid (with MobileUser)
│   ├── unicast_network_model.py  # Cellular congestion
│   └── channel_model.py     # RF propagation
├── frontend/
│   └── src/pages/
│       └── BroadcastTelemetry.tsx  # Offloading & mobility UI
├── docs/
│   ├── stage1_proposal.md   # Concept proposal
│   └── stage2_proposal.md   # Implementation proposal (this file)
└── tests/
    └── test_optimization.py # Validation scripts
```

---

**Prepared for:** ITU FG-AINN Build-a-thon 4.0  
**Team:** Intent-Driven ATSC Slicing Research Team
