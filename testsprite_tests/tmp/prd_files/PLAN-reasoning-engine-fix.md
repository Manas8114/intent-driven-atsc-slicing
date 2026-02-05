# Plan: Fix AI Reasoning Engine & Connect Components

## Goal

Fix the "stuck" state of the AI Reasoning Engine (Thinking Trace) by establishing an autonomous decision heartbeat. Integrate "Surge" events into the Physics Telemetry Stream and ensure all frontend components (Map, Terminal, Trace) visually reflect the active simulation state.

## Core Issues Identified

1. **Stuck Cognitive Brain:** The AI only "thinks" when manually triggered. When a "Surge" event ends, no new decision is made to clear the state, leaving the UI stuck on "EMERGENCY".
2. **Disconnected Telemetry:** The Physics Telemetry Stream (`IntentLogTerminal`) focuses on raw physics (SNR, Power) and ignores high-level events like "Traffic Surge" or "Monsoon".
3. **Frontend Sync:** Components are not visually synchronized to the same "Active Hurdle" state.

## Proposed Changes

### Phase 1: Backend - Autonomous AI Loop

Create a background task that periodically triggers the AI to re-evaluate the environment. This ensures the "Thinking Trace" remains alive and updates immediately when conditions (like a Surge) change.

#### [NEW] `backend/autonomous_agent.py`

- Create a simple loop that runs every 5 seconds.
- Calls `ai_engine.make_decision` with a "monitoring" policy.
- Ensures `broadcast_ai_decision` is triggered.

#### [MODIFY] `backend/main.py`

- Start `autonomous_agent` on application startup.
- ensure it runs in the background.

### Phase 2: Backend - Enrich Telemetry

Pass the "Active Hurdle" (e.g., "Surge", "Monsoon") from the Environment State into the `ReceiverAgent`'s physics log.

#### [MODIFY] `backend/receiver_agent.py`

- In `_run_loop`, read `env_state.active_hurdle` and `env_state.active_scenario_label`.
- Add `hurdle` and `scenario` fields to `last_calculation_log`.

### Phase 3: Frontend - Telemetry UI

Update the Terminal to parse and display these new "System Events" prominently.

#### [MODIFY] `frontend/src/components/IntentLogTerminal.tsx`

- Update `PhysicsLog` interface to include `hurdle` and `scenario`.
- Add logic: IF `hurdle` is present, print a `[SYSTEM ALERT]` log line in RED/YELLOW.

### Phase 4: Frontend - Map Integration

Ensure the Map connects the dots by reacting to the autonomous decisions.

#### [MODIFY] `frontend/src/components/InteractiveIndiaMap.tsx`

- The Map already listens to `ai_decision`.
- Ensure that if `decision.intent` switches back to "balanced" (triggered by the new Autonomous Loop), the "Emergency" visualizations (red rings) are cleared.

## Verification

1. **Start System**: Monitor `ThinkingTrace` - it should update every ~5s even without user interaction.
2. **Trigger Surge**: Use Chaos Director to inject "Traffic Surge".
   - `ThinkingTrace`: Should show "EMERGENCY" or "SURGE" intent.
   - `IntentLogTerminal`: Should scroll `[ALERT] Traffic Surge Detected!`.
   - `Map`: Should glow RED.
3. **Clear Surge**: Use Chaos Director to "Reset".
   - All components should revert to "Balanced" / "Normal" within 5 seconds.
