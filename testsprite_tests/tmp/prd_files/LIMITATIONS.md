# Research Prototype Limitations & Sim-to-Real Gap

> **Note:** This is a research prototype designed to demonstrate *Intent-Driven Network Slicing* logic. It is **not** a certified ATSC 3.0 transmission system.

## 1. Simulation vs. Reality

The system relies on a **Digital Twin** (simulation) to train the AI agent.

- **RF Physics:** Signal propagation is modeled using numeric path loss models (Log-Distance, Rician Fading), not real electromagnetic waves.
- **Hardware Integration:** The system *can* drive a Software Defined Radio (USRP/HackRF) via the `rf_adapter`, but for this demo, the "Air Interface" is simulated to ensure reliable presentation without broadcasting on licensed spectrum.

### Mitigation: Drift Detection

We have implemented a **Drift Detector** (`backend/drift_detector.py`) that monitors the divergence between:

1. **Digital Twin Predictions** (AI's expectation)
2. **Observed Reality** (Receiver telemetry)

If the gap exceeds a safety threshold (e.g., >10% coverage error), the AI **freezes** and requests human intervention. This demonstrates *Epistemic Humility*—the AI knows when it is hallucinating.

## 2. Safety Constraints

The AI is capable of exploring dangerous configurations (e.g., extremely high power).

- **Hard Constraints:** A specialized `SafetyConstraints` layer strictly enforces FCC-style rules:
  - Max Power: 40 dBm
  - Protected Bands: Transmissions blocked outside approved TV channels.
  - EAS Priority: Emergency Alert Service requires robust modulation (QPSK/16QAM).

## 3. Real-Time Latency

- The AI optimization loop runs at ~200ms per decision.
- Real ATSC 3.0 exciters may take 2-5 seconds to reconfigure Physical Layer Pipes (PLP) without dropping frames.
- **Current Status:** We model this delay, but the visual demo allows for "instant" switching to show the concept.

## 4. Emergency Mode

- The "Emergency Mode" bypasses human approval for immediate overrides.
- **Risk:** In a production system, this requires cryptographic authentication to prevent hijacking. This prototype uses a simple flag.

## 5. Scope of Optimization

The AI optimizes for:

- **Coverage** (Signal Strength)
- **Spectral Efficiency** (Throughput)
- **Modulation Robustness** (QAM Order)

It does *not* currently optimize:

- Forward Error Correction (FEC) block lengths
- Time Interleaving depth
- Pilot Pattern density
