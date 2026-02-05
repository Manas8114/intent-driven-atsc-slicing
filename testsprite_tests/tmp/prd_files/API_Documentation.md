# API Documentation

## AI-Native Broadcast Intelligence Platform

**Base URL:** `http://localhost:8000`

---

## Quick Reference

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| Intent | `/intent/*` | Parse and execute operator intents |
| AI Engine | `/ai/*` | Get AI decisions and recommendations |
| KPI | `/kpi/*` | View/record performance metrics |
| Approval | `/approval/*` | Human approval workflow |
| Telemetry | `/telemetry/*` | Real-time broadcast metrics |
| Learning | `/learning/*` | View learning progress |
| Experiences | `/experiences/*` | Training data storage |

---

## Core Endpoints

### Intent Service (`/intent`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/intent/` | Submit a new intent |
| `GET` | `/intent/active` | Get current active intent |
| `GET` | `/intent/history` | Get intent history |

**Example:**

```bash
curl -X POST http://localhost:8000/intent/ \
  -H "Content-Type: application/json" \
  -d '{"intent": "maximize_coverage", "target": 0.95}'
```

---

### AI Engine (`/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/ai/decision` | Get AI decision recommendation |
| `GET` | `/ai/state` | Get current AI state |
| `POST` | `/ai/reset` | Reset AI state |

**Example:**

```bash
curl http://localhost:8000/ai/decision
```

---

### KPI Engine (`/kpi`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/kpi/` | Get KPI history |
| `GET` | `/kpi/live` | Get real-time KPIs |
| `POST` | `/kpi/record` | Record new KPI |
| `POST` | `/kpi/save` | Save KPIs to database |

**Example:**

```bash
curl http://localhost:8000/kpi/live
```

---

### Approval Workflow (`/approval`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/approval/status` | Check approval status |
| `POST` | `/approval/approve` | Approve pending decision |
| `POST` | `/approval/reject` | Reject pending decision |

**Example:**

```bash
curl -X POST http://localhost:8000/approval/approve
```

---

### Telemetry (`/telemetry`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/telemetry/all` | Get all telemetry metrics |
| `GET` | `/telemetry/offloading` | Get offloading metrics |

---

### Learning Loop (`/learning`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/learning/timeline` | Get learning milestones |
| `GET` | `/learning/stats` | Get improvement statistics |
| `GET` | `/learning/before-after` | Compare Day 0 vs Now |

---

### Knowledge Store (`/knowledge`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/knowledge/state` | Get knowledge store state |
| `GET` | `/knowledge/heatmap` | Get coverage heatmap data |
| `GET` | `/knowledge/patterns` | Get learned patterns |

---

### Experience Buffer (`/experiences`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/experiences/record` | Record training experience |
| `GET` | `/experiences/stats` | Get buffer statistics |
| `GET` | `/experiences/recent` | Get recent experiences |
| `POST` | `/experiences/save` | Save to disk |
| `POST` | `/experiences/export` | Export replay buffer |

**Example - Record Experience:**

```bash
curl -X POST http://localhost:8000/experiences/record \
  -H "Content-Type: application/json" \
  -d '{
    "state": [0.85, 25.3, 0.5, 0.5, 0.3, 0.2],
    "action": [0.1, -0.05, 0.4],
    "reward": 2.5,
    "next_state": [0.88, 26.1, 0.55, 0.45, 0.28, 0.22],
    "done": false
  }'
```

**Example - Export for Training:**

```bash
curl -X POST http://localhost:8000/experiences/export
# Returns: {"status": "exported", "path": "backend/training_data/replay_buffer.pkl"}
```

---

### Bootstrap Uncertainty (`/bootstrap`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bootstrap/analysis` | Get BCa confidence intervals |
| `GET` | `/bootstrap/report` | Get IEEE-formatted report |
| `GET` | `/bootstrap/diagnostics` | Get convergence diagnostics |

---

### Environment Control (`/env`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/env/hurdle` | Inject stress scenario |
| `GET` | `/env/state` | Get environment state |
| `POST` | `/env/reset` | Reset environment |

**Example - Inject Congestion:**

```bash
curl -X POST http://localhost:8000/env/hurdle \
  -d '{"hurdle": "congestion", "level": 0.7}'
```

---

## OpenAPI Documentation

Interactive API docs available at:

- **Swagger UI:** <http://localhost:8000/docs>
- **ReDoc:** <http://localhost:8000/redoc>

---

## Response Formats

All endpoints return JSON. Standard response structure:

```json
{
  "status": "success",
  "data": { ... },
  "timestamp": 1705766400
}
```

Error responses:

```json
{
  "detail": "Error message here"
}
```

---

## Authentication

Currently no authentication required (demo mode).

In production, add API key header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8000/...
```
