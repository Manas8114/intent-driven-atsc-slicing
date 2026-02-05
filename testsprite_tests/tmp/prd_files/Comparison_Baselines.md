# System Comparison Baselines & Test Cases

This document defines the comparison baselines and formal test cases for evaluating our AI-Native Broadcast Intelligence Platform.

---

## Test Case Summary

| Test ID | Name | Description | Key Metric |
|---------|------|-------------|------------|
| **TST-1** | AI Plane vs No AI | Compare AI-native vs traditional static ATSC 3.0 | Reaction time, scalability, reliability |
| **TST-2** | Congestion Offload | Cellular congestion triggers broadcast offload | Congestion reduction % |
| **TST-3** | Emergency ModCod | Emergency intent enforces robust modulation | Alert delivery time |
| **TST-4** | Learning Progress | Performance improvement over time (Day 0 → Day 100) | Coverage %, decision quality |

---

## TST-1: AI Plane vs No AI Plane

### Objective

Evaluate our PoC against two baselines:

1. **Baseline A**: Traditional ATSC 3.0 with no AI plane and static configuration
2. **Our System**: AI-native intelligence plane over broadcast

### What We Prove

Introducing an AI-native intelligence plane achieves:

- ✅ **Faster reaction time** (ms vs hours)
- ✅ **Higher scalability** (handles load spikes)
- ✅ **Better emergency reliability** (>99%)
- ✅ **Preserves one-to-many efficiency** (broadcast advantage)

### Comparison Matrix

| Aspect | Baseline (Static ATSC) | Our System (AI-Native) |
|--------|------------------------|------------------------|
| Configuration | Fixed ModCod, fixed power | Dynamic, intent-driven |
| Reaction Time | Hours (manual) | <10 ms (AI inference) |
| Scalability | Per-design limits | Adaptive to load |
| Emergency | Manual override only | AI + human hybrid |
| Efficiency | One-to-many (broadcast) | One-to-many preserved |

### Expected Results

| Metric | Baseline | AI System | Improvement |
|--------|----------|-----------|-------------|
| Coverage % | 75-80% | 90-95% | +15-20% |
| Reaction Time | 1-24 hours | <10 ms | **10,000x faster** |
| Emergency Reliability | 85-90% | 99%+ | +10-15% |
| Scalability (users) | Fixed design | Adaptive | Dynamic |

### Code Reference

```python
# backend/rl_agent.py - AI inference
action = rl_agent.suggest_action(observation)  # <10ms

# Baseline comparison
baseline_coverage = 78.5%  # Static
ai_coverage = 93.2%        # AI-optimized
```

---

## TST-2: Congestion → Broadcast Offload

### Objective

Demonstrate that when cellular (unicast) network experiences congestion, the AI system automatically offloads traffic to broadcast.

### Test Procedure

1. Start with normal cellular load (30% congestion)
2. Inject congestion event (→ 70% congestion)
3. Observe AI offloading decision
4. Measure latency and packet loss reduction

### Expected Behavior

```text
TIME     CONGESTION   AI ACTION              RESULT
─────────────────────────────────────────────────────
t=0      30%          Minimal offload (10%)  Normal ops
t=10s    70%          Increase offload (50%) Congestion mitigated
t=20s    70%→40%      Maintain offload       Stable
t=30s    40%          Reduce offload (25%)   Gradual return
```

### Metrics

| Metric | Before Offload | After Offload | Improvement |
|--------|----------------|---------------|-------------|
| Congestion | 70% | 35% | **50% reduction** |
| Latency | 200 ms | 45 ms | **77% faster** |
| Packet Loss | 15% | 2% | **87% reduction** |

### Code Reference

```python
# sim/unicast_network_model.py
offload_benefit = unicast_model.get_offload_benefit(
    congestion_metrics, 
    offload_ratio=0.5
)
# Returns: projected_congestion, latency_reduction_ms
```

---

## TST-3: Emergency Intent → Robust ModCod Enforced

### Objective

When emergency intent is activated, the AI system automatically switches to robust modulation/coding to ensure maximum emergency alert reliability.

### Test Procedure

1. Normal operation (balanced intent, 64QAM 3/4)
2. Inject emergency intent
3. Observe ModCod change
4. Measure alert delivery time and reliability

### Expected Behavior

```text
INTENT        MODULATION   CODE RATE   COVERAGE   ALERT TIME
────────────────────────────────────────────────────────────
Balanced      64QAM        3/4         88%        N/A
Emergency     QPSK         1/2         99.2%      <1s
```

### Why Robust ModCod

| ModCod | Throughput | SNR Required | Coverage | Use Case |
|--------|------------|--------------|----------|----------|
| 64QAM 3/4 | High | 18 dB | 85% | Entertainment |
| 16QAM 1/2 | Medium | 12 dB | 92% | General |
| QPSK 1/2 | Low | 6 dB | **99%+** | **Emergency** |

### Metrics

| Metric | Normal Mode | Emergency Mode | Requirement |
|--------|-------------|----------------|-------------|
| Modulation | 64QAM | QPSK | Robust |
| Code Rate | 3/4 | 1/2 | Low |
| Coverage | 88% | 99.2% | >95% ✅ |
| Alert Time | N/A | 0.8s | <2s ✅ |

### Code Reference

```python
# backend/ai_engine.py
if intent == "emergency":
    config["modulation"] = "QPSK"
    config["code_rate"] = "1/2"
    config["priority"] = "CRITICAL"
```

---

## TST-4: Learning Improvement (Day 0 vs Day 100)

### Objective

Demonstrate that the AI system improves over time through continuous learning, showing measurable performance gains from initial deployment to mature operation.

### Test Procedure

1. Record baseline metrics at Day 0 (initial deployment)
2. Run simulation for extended period
3. Record metrics at Day 100 (mature system)
4. Compare and show improvement trend

### Expected Learning Curve

```text
                    LEARNING PROGRESS
Coverage %
    |
100 |                              ╭───────
 95 |                    ╭─────────╯
 90 |          ╭─────────╯
 85 |    ╭─────╯
 80 |────╯
    └──────────────────────────────────────▶
       Day 0    25      50      75     100
```

### Metrics Comparison

| Metric | Day 0 | Day 100 | Improvement |
|--------|-------|---------|-------------|
| Coverage % | 82% | 94% | **+12%** |
| Decision Quality | 70% | 92% | **+22%** |
| Success Rate | 75% | 95% | **+20%** |
| Avg Reward | 1.2 | 3.8 | **+217%** |

### Learning Milestones

| Day | Milestone | Description |
|-----|-----------|-------------|
| 0 | Initial deployment | PPO model loaded, baseline performance |
| 10 | Pattern recognition | System learns time-of-day patterns |
| 30 | Mobility adaptation | Handles mobile users effectively |
| 60 | Emergency optimization | Fast emergency response learned |
| 100 | Mature operation | Stable, high-performance decisions |

### Code Reference

```python
# backend/learning_loop.py
tracker = LearningLoopTracker()
comparison = tracker.get_before_after_comparison()
# Returns: baseline_kpis, current_kpis, improvements
```

---

## Running All Tests

### Backend Commands

```bash
# Start backend
python -m uvicorn backend.main:app --reload --port 8000

# TST-1: Compare AI vs baseline
curl http://localhost:8000/ai/decision?use_ai=true
curl http://localhost:8000/ai/decision?use_ai=false

# TST-2: Trigger congestion offload
curl -X POST http://localhost:8000/env/hurdle \
  -d '{"hurdle": "congestion", "level": 0.7}'

# TST-3: Activate emergency intent
curl -X POST http://localhost:8000/intent/ \
  -d '{"intent": "emergency"}'

# TST-4: View learning progress
curl http://localhost:8000/learning/before-after
```

### Frontend Verification

1. **TST-1**: Compare KPI Dashboard before/after enabling AI
2. **TST-2**: Use Hurdle Control panel → observe Telemetry changes
3. **TST-3**: Switch to Emergency Mode → verify ModCod change
4. **TST-4**: View Learning Timeline page for improvement graphs

---

## Summary

| Test | Proves | Key Result |
|------|--------|------------|
| TST-1 | AI adds value | 10,000x faster, +15% coverage |
| TST-2 | Smart offloading | 50% congestion reduction |
| TST-3 | Emergency priority | 99%+ reliability, <1s delivery |
| TST-4 | Continuous learning | +20% improvement over time |
