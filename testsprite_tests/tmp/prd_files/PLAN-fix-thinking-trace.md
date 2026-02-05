# PLAN: Fix Thinking Trace Connection

> **Goal**: Make the "AI Reasoning Engine" (ThinkingTrace) show live, valid data instead of "Invalid Date" and "0.00".

## Root Cause Analysis

1. **Missing WebSocket Broadcast**:
    * `ThinkingTrace.tsx` listens for `type: "ai_decision"`.
    * `learning_loop.py` records decisions but **does not broadcast** them to the WebSocket.
    * **Result**: The frontend only gets "state_update" messages (which don't contain the decision trace), or nothing at all, leading to stale/empty states or the "Invalid Date" if it tries to parse a null.

2. **Date Parsing**:
    * If the timestamp is missing or null, `new Date(log.timestamp)` returns "Invalid Date".

3. **Missing "Reliability/Coverage"**:
    * These are computed in `_compute_reward` but if the message isn't sent, they won't appear.

## Implementation Steps

### 1. Backend: Broadcast Decisions

* **File**: `backend/learning_loop.py`
* **Action**: Import `broadcast_state_update` (or similar manager function) and call it inside `record_decision_outcome`.
* **Payload**:

    ```json
    {
        "type": "ai_decision",
        "data": { ...outcome_dict... }
    }
    ```

### 2. Frontend: Robustness

* **File**: `frontend/src/components/ThinkingTrace.tsx`
* **Action**:
  * Add safety check: `if (!log.timestamp) return ...`
  * Ensure `RewardComponents` handles missing keys gracefully (already mostly done, but verify).

### 3. Verification

* Trigger a decision (e.g., via "Chaos Director" or "Seed Demo").
* Watch `ThinkingTrace` update instantly with:
  * Valid Date (e.g., "12:45:30 PM")
  * Non-zero Reward
  * Visible "Coverage" and "Reliability" bars.

## Wiring Diagram

`LearningLoop.record()` -> **NEW: Broadcast(WebSocket)** -> `ThinkingTrace.tsx (useEffect)` -> `setThoughtLog` -> **UI Updates**
