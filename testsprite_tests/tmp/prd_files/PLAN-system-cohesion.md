# PLAN: System Cohesion & Realism

> **Goal**: Connect all system components (Receiver, Backend, AI, Frontend) so that actions in one area (e.g., Chaos Director) cause reliable, visible effects in others (e.g., Learning Loop, KPI Gauges), creating a "real" feeling of cause-and-effect.

## Current Disconnects (Analysis)

1. **Receiver Isolation**:
    * `ReceiverAgent` is running in the background (Main.py), but...
    * `KPIEngine` (Backend) currently generates *random/fake* statistics if the native bridge isn't present. It is **ignoring** the `ReceiverAgent`.
    * **Result**: If you trigger "Tower Failure" in the Chaos Director, the `ReceiverAgent` might see packet loss, but the KPI Dashboard will still show random "good" stats because it's looking at the fake simulator, not the agent.

2. **Learning Loop Feedback**:
    * The AI Learning Loop records "Actual KPIs" vs "Predicted KPIs".
    * Currently, "Actual KPIs" are often mocked or come from the `KPIEngine`.
    * **Result**: The AI "learns" from fake random data, not from the *actual* packet loss caused by audio/video degradation.

## Proposed Integration Strategy

### 1. Wire ReceiverAgent to KPIEngine

* **Change**: Modify `KPIEngine.update_from_bridge()` to check `ReceiverAgent` first.
* **Logic**:

    ```python
    # kpi_engine.py
    def update_stats(self):
        # 1. Try Native Bridge
        # 2. Try ReceiverAgent (NEW) -> Get real-time simulated packet loss
        # 3. Fallback to random simulation
    ```

* **Effect**: "Monsoon" -> ReceiverAgent detects SNR drop -> KPIEngine sees packet loss -> Frontend Gauges turn red.

### 2. Connect Chaos Director to Receiver Environment

* **Change**: Ensure `HurdlePanel` (Frontend) -> `/env/hurdle` (Backend) -> Updates `SimulationState`.
* **Effect**: `ReceiverAgent` already reads `SimulationState`. This link might exist, but we need to verify the *magnitude* of the impact so it's visible.

### 3. Visual Feedback Loop (The "Real" Feeling)

* **ThinkingTrace**: Ensure it shows the *actual* reward dropping when a Hurdle is active.
* **Latency**: Ensure the dashboard updates happen fast enough (WebSocket is already there, but data needs to flow).

## Open Questions for User

1. **Strict Realism vs. Demo Drama**: Do you want the system to be *hard* to recover (realistic physics) or *dramatic* (fast drops, fast recoveries)?
2. **Native Bridge**: Are we actively using the C++ `libatsc3` bridge on this machine, or are we relying 100% on the Python `ReceiverAgent` simulation for this demo? (Assuming Python Simulation is primary for stability).
3. **Data Flow**: Should I proceed to wire `ReceiverAgent` -> `KPIEngine` as the "Source of Truth"?

## Execution Steps (If Approved)

1. [ ] **Modify KPI Engine**: Import and use `get_receiver_agent()` in `kpi_engine.py`.
2. [ ] **Modify Learning Loop**: Ensure `actual_kpis` comes from `KPIEngine`'s live data.
3. [ ] **Verify Chaos**: Test that "Tower Failure" -> 0% Coverage in dash.
