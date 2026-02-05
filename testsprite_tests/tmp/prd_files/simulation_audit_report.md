# 🕵️ System Authenticity Audit Report

This report categorizes the "Realness" of each major component in the **Intent-Driven ATSC 3.0 Slicing System**.
**Date:** 2026-01-28
**Auditor:** Agentic AI

## 📊 Summary

| Component | Status | Authenticity Level | Notes |
|-----------|--------|---------------------|-------|
| **Spectrum Optimization** | ✅ **REAL** | 100% Math-based | Uses `scipy.optimize` & Convex Optimization (Waterfilling) |
| **Physics Simulation** | ✅ **REAL** | Physics-based | Uses Path Loss models, Doppler shifts, & Spatial grids |
| **RL Agent (Brain)** | ✅ **REAL** | ML Model (PPO) | Runs actual inference (Torch) with 7-dim observation |
| **I/Q Constellation** | ⚠️ **SIMULATED** | Math-generated | Generated via NumPy (not RF hardware), accurate to math |
| **Demand Prediction** | ⚠️ **HEURISTIC** | Rule-based | Uses hardcoded hourly patterns & multipliers, not dynamic ML |
| **Map Visualization** | 🎨 **MIXED** | Cosmetic + Real | Live focus is real; "42 TB/s" & "1240 Nodes" are plain text |

---

## 🔍 Detailed Component Analysis

### 1. 🧠 AI & Optimization (The Core)

* **`backend/optimizer.py`**: **AUTHENTIC**.
  * **Evidence**: Calls `scipy.optimize.minimize` to solve strict constraints ($P_total$, $BW_total$).
  * **Detail**: Implements the full **ATSC 3.0 A/322 ModCod Table** (QPSK to 256QAM). It actually calculates Spectral Efficiency.
* **`backend/rl_agent.py`**: **AUTHENTIC**.
  * **Evidence**: Uses `stable_baselines3` PPO.
  * **Detail**: We recently upgraded this to use a **7-dimensional** real-time observation vector. The "Confidence" and "Value" scores come directly from the Neural Network's `policy.predict_values()`.

### 2. 🌍 Simulation Layer (Digital Twin)

* **`sim/spatial_model.py`**: **AUTHENTIC SIMULATION**.
  * **Evidence**: Calculates specific Path Loss (dB) for every user based on distance and frequency.
  * **Detail**: Simulates varying velocity for mobile users ($v \cdot 0.03$ dB penalty). It supports loading **Real SUMO Traffic Data** and **OpenCellID Tower Data**, falling back to random distribution only if files are missing.

### 3. 📉 Signal Processing

* **`backend/iq_generator.py`**: **MATHEMATICAL SIMULATION**.
  * **Evidence**: It does *not* read from a Software Defined Radio (SDR).
  * **Detail**: It generates complex numbers $(I + jQ)$ using standard OFDM math. The "Noise" is added artificially (`np.random.randn`). This is standard for demos without \$10k hardware.

### 4. 🔮 Predictive Engine

* **`backend/demand_predictor.py`**: **HEURISTIC / RULE-BASED**.
  * **Evidence**: Logic is `if hour < 5: demand = 0.2` (Hardcoded Pattern).
  * **Verdict**: It *simulates* a predictor but doesn't actually learn from new data in real-time. The "training" history is ephemeral.

### 5. 🖥️ Frontend Visualization

* **`InteractiveIndiaMap.tsx`**: **COSMETIC DECORATION**.
  * **Real Part**: The "AI Focus" pulses on the city the AI actually selected.
  * **Fake Part**: "Active Nodes: 1,240", "Traffic Load: 42 TB/s" are hardcoded text strings. The floating "Live Intents" use `Math.random()` for device counts.

## 🛠️ Recommendations for "Realness"

1. **Fix Map Stats**: Connect "Active Nodes" to `sim_state.num_users`.
2. **Upgrade Predictor**: Replace hardcoded lists with a simple regression model that actually updates.
3. **Disclaimer**: Add a "Simulation Mode" badge to the I/Q graph so users know it's a math model, not live RF.
