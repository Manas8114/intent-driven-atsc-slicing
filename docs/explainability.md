# AI Decision Explainability Report

## 1. Safety-Shielded RL Architecture

The prototype employs a **Hierarchical Control Architecture** to ensure that AI-driven optimization never compromises safety-critical broadcast requirements.

### Layers of Control

1. **Intent Layer (Human Input)**: Operator defines high-level goals (e.g., "Maximize Coverage").
2. **Policy Translation**: Deterministic rules convert intents into mathematical objectives (e.g., "Objective: Maximize SNR s.t. Coverage > 90%").
3. **RL Agent (Optimization)**: A reinforcement learning agent explores the parameter space (Modulation, Coding Rate, Power) to find optimal configurations.
4. **Safety Shield (Hard Constraints)**: A non-learnable logical filter acts as a "gateway". It rejects any action proposed by the RL agent that violates:
    * Emergency Alert Reliability (< 99%)
    * Spectrum Emissions Masks (Bandwidth > 6 MHz)
    * ATSC 3.0 Standard Compliance (Invalid ModCod combinations)

## 2. Decision Logic Example

### Scenario: Emergency Alert Triggered

**1. Input:**

* Intent: "Ensure Emergency Reliability ≥ 99%"
* Current State: PLP0 running 64QAM (High throughput, Low robustness).

**2. AI Proposal (Unsafe):**

* The RL agent might initially propose keeping 64QAM to maintain high throughput while slightly increasing power.
* *Simulator Check*: 64QAM at 10km radius yields ~92% reliability.

**3. Safety Shield Intervention:**

* Constraint Check: `Reliability (92%) < Target (99%)` → **VIOLATION**.
* **Action Blocked**.

**4. Fallback / Valid Action:**

* The system forces a fallback to a known robust configuration: **QPSK, Code Rate 1/2**.
* *Simulator Check*: QPSK at 10km yields >99.9% reliability.

**5. Final Output:**

* PLP0 reconfigured to QPSK.
* Explanation Logged: "Emergency PLP upgraded to QPSK with low code rate to meet reliability ≥99%."

## 3. Explaining Optimization

When not in emergency mode, the AI balances multiple objectives:

`Reward = w1 * Coverage + w2 * SpectralEfficiency - w3 * PowerConsumption`

By adjusting weights `w`, the system shifts behavior:

* **"Maximize Coverage"**: Increases power and uses lower-order modulation (16QAM).
* **"Optimize Spectrum"**: Uses high-order modulation (256QAM) where SNR permits, maximizing bits/s/Hz.

All decisions are logged with "Before" and "After" snapshots to provide operators with full transparency.
