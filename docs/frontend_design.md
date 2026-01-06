# Frontend Design — Intent-Driven AI-Native Broadcast Control Plane

## Core Frontend Philosophy

The frontend is **not a dashboard**.
It is a **visual control plane** for a safety-critical broadcast system.

### Psychological Goals

1. **Trust**
   Users must trust the AI will not break emergency services.

2. **Explainability**
   Every AI action must be understandable in < 5 seconds.

3. **Cognitive Hierarchy**
   * Intent → Decision → Effect → Outcome
   * Never show raw numbers without meaning.

4. **Stress-aware design**
   Emergency Mode assumes:
   * urgency
   * reduced attention
   * need for clarity, not density

---

## Global Frontend Architecture

### Tech Stack

* **React + TypeScript**
  * Guarantees data type correctness from backend
  * Prevents silent UI errors (critical in safety systems) 

* **Tailwind CSS**
  * Utility-first = consistent visual semantics
  * No “mystery CSS” during hackathon

* **Recharts + D3**
  * Recharts → KPIs (fast, readable)
  * D3 → PLP spectrum visualization (custom, precise)

* **Polling / WebSocket (optional)**
  * Real-time feedback loop visualization

---

## Global Layout Structure

```
┌──────────────────────────────────────────────┐
│ Top Status Bar                               │
├───────────┬─────────────────────────────────┤
│ Sidebar   │ Main Context Area                │
│ (Intent   │ (Dynamic Page Content)           │
│  + Mode)  │                                 │
└───────────┴─────────────────────────────────┘
```

### Why this layout?

* **Left = Control (Intent)**
* **Center = Consequence (What happened)**
* **Top = System Health (Always visible)**

This mirrors **human cause-effect reasoning**.

---

# 1️⃣ Top Status Bar (Always Visible)

### Purpose

Provides **constant reassurance** that the system is alive, compliant, and safe.

### Elements

#### 🔵 System State Indicator

* Green: Stable
* Yellow: Reconfiguring
* Red: Emergency Mode Active

**Backend Data Used**

```json
{
  "system_state": "emergency",
  "last_decision_time": "2025-02-02T10:31:22Z"
}
```

**Why**: Humans subconsciously scan the top of screens for safety cues.

#### 🔒 ATSC Compliance Badge

* “ATSC 3.0 Receiver-Validated”
* Tooltip: “Protocol parsing validated using libatsc3 reference receiver.”

**Backend Source**: libatsc3 parsing success flags
**Why**: Judges and reviewers immediately look for *credibility signals*.

#### ⏱ Last AI Decision Timestamp

* Shows recency of control loop
**Why**: Avoids fear of “stale AI decisions”.

---

# 2️⃣ Sidebar — Intent & Mode Control

This is **the psychological entry point**.

## Intent Control Panel

### Design

* Large buttons
* Icon + text
* Color-coded

### Buttons

#### 🚨 Emergency Mode

* Color: Red
* Locked unless confirmed

**On Click**

* Confirmation modal: “Emergency Mode will preempt non-critical services.”

**Backend Call**

```http
POST /intent
{
  "intent": "emergency_mode"
}
```

**Why**: Prevents accidental triggers; Reinforces seriousness.

#### 📡 Maximize Coverage

* Color: Blue
**Explanation Tooltip**: “Optimizes modulation and coding for maximum rural reach.”

#### ⚖️ Balanced Mode

* Color: Neutral
**Why**: Human brains prefer named strategies over numeric sliders.

### Custom Intent (Advanced Users)

* JSON editor (collapsed by default)
* Validation feedback inline
**Why**: Avoids overwhelming novice users; Still supports researchers.

---

# 3️⃣ System Overview Page (Mental Model Builder)

This page answers: “What is this system doing right now?”

## Architecture Flow Visualization

### Visual Flow

```
[ Intent ] → [ AI Policy ] → [ Safety Shield ] → [ ATSC Config ] → [ Broadcast ] → [ Receiver ] → [ KPIs ]
```

Animated arrows pulse **only when data flows**.

**Backend Data**: Current intent, Current action, Validation status
**Why**: Humans understand **processes better than numbers**.

## Live Text Explanation Panel

Example:
> “Emergency Mode active. A dedicated robust PLP has been allocated to ensure ≥99% alert delivery reliability.”

Generated from backend explanation strings.

---

# 4️⃣ AI Decisions & Explainability Page (Most Important)

This is where **AI fear is neutralized**.

## Before vs After Comparison

| Parameter  | Before | After     |
| ---------- | ------ | --------- |
| Modulation | 16QAM  | QPSK      |
| Code Rate  | 8/15   | 2/15      |
| PLP Power  | Medium | High      |
| Priority   | Normal | Emergency |

**Backend Source**: AI decision object, atsc_adapter explanation

## Natural-Language Explanation Box

Example:
> “The AI switched to QPSK with a low code rate to improve robustness under poor rural signal conditions, guaranteeing emergency alert delivery.”

**Why**: Humans trust systems that *talk like humans*; Mandatory for safety-critical AI.

## Safety Shield Indicator

* Shows: “AI choice approved by Safety Shield” or “AI choice overridden”
**Backend Source**: Safety-shield decision logs

---

# 5️⃣ PLP & Spectrum Visualization Page (Physical Reality)

This page connects **abstract AI decisions to real RF resources**.

## Spectrum Bar (6 MHz)

Each PLP shown as a colored segment:

* Width = bandwidth
* Color = priority
* Pattern = robustness

Example:

* Solid red → Emergency PLP
* Blue dashed → Public info

**Backend Data**

```json
{"plps": [{"plp_id": 0, "service": "Emergency", "bandwidth": 1.5, "modulation": "QPSK", "priority": "high"}]}
```

**Why**: Makes spectrum a *tangible resource*; Judges love this visual.

## Hover Tooltips

Show: Modulation, Code rate, Expected SNR threshold.

---

# 6️⃣ KPI Dashboard (Outcome Validation)

This page answers: “Did the system actually work?”

## Charts (Live)

### Coverage (%)

* Green band = acceptable rural coverage

### Alert Reliability (%)

* Red line at 99%
* Anything below = visual alarm

### Latency (ms)

* Countdown during Emergency Mode

### Spectral Efficiency (bits/s/Hz)

**Backend Source**: libatsc3 packet statistics, simulator outputs, kpi_engine aggregation.

## Receiver-Validated Badge (Critical)

Every KPI that comes from libatsc3 has:

* “Receiver-validated” badge
* Tooltip explaining parsing path
**Why**: Separates **simulation guesses** from **protocol reality**.

---

# 7️⃣ Emergency Mode Page (Stress-Optimized UI)

Designed assuming **panic / urgency**.

## Full-Screen Mode

* Reduced clutter
* High contrast
* Minimal text

## Alert Timeline

1. Alert triggered
2. PLP reconfigured
3. Broadcast active
4. Receiver confirmed
*Each step turns green when confirmed.*

## Preemption Visualization

Non-critical services fade out visually.
**Why**: Makes invisible system decisions visible.

---

# 8️⃣ Tooltips & Micro-copy (Cognitive Glue)

Every chart, button, and number has:

* Hover explanation
* Plain language
* No acronyms without expansion
Example: “PLP (Physical Layer Pipe): an independent data channel within the broadcast signal.”

---

# 9️⃣ Data Integrity Guarantee (Important)

### Every frontend component must display

* Source of data: AI Engine, Simulator, or libatsc3
* Timestamp
* Validity status

This prevents: “Where did this number come from?” or “Is this simulated or real?”

---

## Final Psychological Outcome

When a judge uses this UI:

1. They **understand the problem** in 10 seconds
2. They **trust the system** in 30 seconds
3. They **believe the AI is safe** in 1 minute
4. They **see real ATSC protocol behavior**
5. They **remember this project**
