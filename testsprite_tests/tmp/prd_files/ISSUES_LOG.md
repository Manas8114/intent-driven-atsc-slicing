# System Issues & Logical Errors Log

This document tracks identified small logical errors, code quality issues, and potential bugs found during the debugging session.

## 🔴 High Priority (Logical/Runtime Risks)

1. **React Key Anti-Pattern in ThinkingTrace**
    * **File**: `frontend/src/components/ThinkingTrace.tsx`
    * **Issue**: `key={log.decision_id || Math.random()}`
    * **Why**: Using `Math.random()` as a key forces React to re-create the DOM element on every render, hurting performance and potentially losing focus/state. If `decision_id` is missing, we have a bigger data problem.
    * **Fix**: Ensure `decision_id` is always present or use a stable index (though index is also sub-optimal, it's better than random).

2. **Silent Failure in KPI Engine**
    * **File**: `backend/kpi_engine.py`
    * **Issue**: `except Exception: pass` block around `libatsc3_bridge` import.
    * **Why**: If the bridge exists but crashes or fails to import due to a missing DLL, we will never know because the error is swallowed silently.
    * **Fix**: Log the error `e` before passing.

3. **Inline Imports in Loop**
    * **File**: `backend/learning_loop.py`
    * **Issue**: `from .websocket_manager import manager` inside `record_decision_outcome`.
    * **Why**: `record_decision_outcome` is called frequently. Repeatedly running an import statement (even if cached) is messy style.
    * **Fix**: Move import to top of file (handle circular dep if needed) or at least class level.

## 🟡 Medium Priority (Code Quality/Linting)

1. **Inline CSS Styles**
    * **File**: `frontend/src/pages/CellTowerData.tsx` (Line 520)
    * **Issue**: `style={{ width: \`\${percentage}%\` }}`
    * **Why**: Linter explicitly forbids inline styles.
    * **Fix**: Use Tailwind arbitrary values `w-[${percentage}%]` or a styled component, though for dynamic widths inline style is often the *only* practical React way. If strict linting is required, we can suppress the warning or use a `style` object defined outside the JSX.

2. **Hardcoded Simulation Parameters**
    * **File**: `backend/receiver_agent.py`
    * **Issue**: `processing_time = random.uniform(0.05, 0.2)`
    * **Why**: These "magic numbers" should be constants or part of the `EnvironmentState` configuration.

## 🟢 Low Priority (Polish)

1. **"Invalid Date" Fallback**
    * **File**: `frontend/src/components/ThinkingTrace.tsx`
    * **Issue**: Defaults to `--:--:--`.
    * **Why**: While safe, it looks broken to the user. We should verify why timestamps might be missing (they shouldn't be).

## Action Plan

1. Fix `ThinkingTrace` keys.
2. Fix `CellTowerData` inline style (or add suppression).
3. Add logging to `kpi_engine.py` catch block.
