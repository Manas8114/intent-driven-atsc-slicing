# Real-Time Impact-Driven Frontend Specification

## Core Philosophy

- **Motion = Meaning**: Animated state changes, no instant jumps.
- **Time Awareness**: Latency visualization, timestamps.
- **Impact First**: Visual hierarchy follows Consequence (Who is affected?).

## Architecture

- **Global State**: `GlobalSystemContext`
  - `systemPhase`: 'idle' | 'planning' | 'optimizing' | 'broadcasting' | 'emergency'
  - `activeIntent`: Current intent object
  - `atscState`: Real-time PLP/PHY config
  - `safetyLock`: Boolean (active when shield is up)

## Component Upgrades

### 1. Live System Overview (`Overview.tsx`) -> `TopStatusBar.tsx` Integration

- **Live Timeline Bar**: Replaces static header.
  - Nodes: Intent -> AI -> Safety -> PHY -> Receiver.
  - States: Pending (Pulse), Active (Green), Data Flow (Moving dots).
- **System Pulse**: Ring animation around status icon.

### 2. Intent Control (`IntentControl.tsx`)

- **Interaction**:
  - Click -> Lock Interface (Blur) -> Show countdown.
  - **Impact Preview**: Popover showing "Predicted Change".
  - **Consequences**: "Reduce public service BW" (Negative), "Increase robustness" (Positive).

### 3. AI Decisions (`Explainability.tsx`)

- **Thinking View**:
  - Show `Parsing Candidates...` animation.
  - Show Rejected options (Greyed out).
  - **Safety Shield Interruption**:
    - CSS Animation: Red shield slides in from right.
    - Text type-writer effect: "Safety Override Enforced".

### 4. Physical Spectrum (`PLPVisualization.tsx`)

- **SVG/D3 Animation**:
  - `<rect>` width changes smoothly (`transition-all duration-700`).
  - **Ripple Effect**: Radial gradient overlay on map/icon to simulate signal reach.
  - **Emergency Shove**: Red block pushes blue blocks (flex-basis animation or equivalent).

### 5. KPI Dashboard (`KPIDashboard.tsx`)

- **Badges**: Tooltip explaining provenance (AI vs Receiver).
- **Thresholds**: Background color flash when line crosses target (e.g. 99%).
- **Micro-interactions**: Hovering chart highlights relevant PLP in Sidebar/Spectrum view (Context coupling).

### 6. Emergency Mode (`EmergencyMode.tsx`)

- **Global Shift**:
  - Apply CSS class `theme-emergency` to `<body>` or Layout root.
  - Desaturate non-essential elements (opacity 0.3).
  - **Impact Counter**: "Receivers Reached: 12,340" (Rolling number animation).
