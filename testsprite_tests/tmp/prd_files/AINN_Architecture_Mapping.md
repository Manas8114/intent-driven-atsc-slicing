# ITU FG-AINN Architecture Mapping

This document maps our Intent-Driven ATSC 3.0 Slicing system to the ITU Focus Group on AI for Future Networks (FG-AINN) architecture framework.

## Overview

Our system implements an **AI-Native Broadcast Intelligence Platform** that aligns with the three key ITU FG-AINN architectural concepts:

| ITU Framework | Our Implementation | Document |
|---------------|-------------------|----------|
| Layered AI-Native Network Architecture | 3-Layer Broadcast Control Plane | [AINN_Layered_Architecture.puml](./AINN_Layered_Architecture.puml) |
| Agentic AI Framework | Cognitive Broadcasting System | [AINN_Agentic_Framework.puml](./AINN_Agentic_Framework.puml) |
| Model LCM Framework | RL Model Lifecycle Management | [AINN_Model_LCM.puml](./AINN_Model_LCM.puml) |

---

## 1. Layered Architecture (Figure 1)

```
┌────────────────────────────────────────────────────────────────────┐
│                  MANAGEMENT & ORCHESTRATION LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Network Mgmt │  │  Resource    │  │  Capability Exposure     │ │
│  │   AI Agent   │  │ Orchestration│  │      AI Agent            │ │
│  │[ai_engine.py]│  │[optimizer.py]│  │[visualization_router.py] │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                     NETWORK FUNCTION LAYER                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      Access Network                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│  │
│  │  │  AN AI Agent│ │  Model LCM  │ │     Digital Twin        ││  │
│  │  │[rl_agent.py]│ │[learning_   │ │  [spatial_model.py]     ││  │
│  │  │             │ │ loop.py]    │ │                         ││  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Base Station │  │ Core Network │  │   Cloud Application      │ │
│  │[broadcast_   │  │[approval_    │  │  [ai_data_collector.py]  │ │
│  │telemetry.py] │  │engine.py]    │  │                          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │   Communication        Computing           Data               │ │
│  │   [rf_adapter.py]     [PPO Inference]     [FCC/Cell Data]     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  Physical: Radio(Sim) | Gateway(API) | CPU(Torch) | Memory(NumPy)│
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agentic AI Framework (Figure 3)

```
                    ┌─────────────────┐
                    │Network Management│
                    │   Personnel      │
                    └────────┬────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
┌─────────┐           ┌─────────────────────────────────────┐
│   OTT   │           │          LLM AI Agent               │
│Application│          │  ┌─────────────────────────────┐   │
│ AI Agent │           │  │          Memory              │   │
│[Frontend]│           │  │  ┌───────────┐ ┌──────────┐ │   │
└─────────┘           │  │  │Knowledge  │ │  LLM     │ │   │
                      │  │  │   Base    │ │ (Rules)  │ │   │
┌─────────┐           │  │  │[Knowledge │ │[demand_  │ │   │
│External │           │  │  │Store]     │ │predictor]│ │   │
│  Tool   │───────────▶│  │  └───────────┘ └──────────┘ │   │
│[FCC     │           │  │  ┌───────────────────────────┐│   │
│Parser]  │           │  │  │     Resource Pool         ││   │
└─────────┘           │  │  │    [API Endpoints]        ││   │
                      │  │  └───────────────────────────┘│   │
┌─────────┐           │  └─────────────────────────────────┘   │
│External │           │  ┌─────────────────────────────────┐   │
│Resource │───────────▶│  │         Tool Pool              │   │
│[OpenCell│           │  │  [optimizer.py, simulator.py]   │   │
│ID Data] │           │  └─────────────────────────────────┘   │
└─────────┘           └─────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
    ┌──────────┐               ┌──────────┐               ┌──────────┐
    │ Conflict │               │ Security │               │Performance│
    │Management│               │Management│               │Management │
    │[approval_│               │[emergency│               │[kpi_      │
    │engine.py]│               │_atsc3.py]│               │engine.py] │
    └──────────┘               └──────────┘               └──────────┘
```

---

## 3. Model LCM Framework (Figure 4)

### Model Preparing Phase

```
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Model    │──▶│  Model    │──▶│  Model    │──▶│  Model    │
│ Training  │   │  Testing  │   │ Inference │   │ Transfer/ │
│           │   │           │   │ Emulation │   │ Delivery  │
│[PPO.learn]│   │[check_env]│   │[predict()]│   │[save()]   │
└───────────┘   └───────────┘   └───────────┘   └───────────┘
```

### Model Running Phase

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Model  │──▶│  Model  │──▶│  Model  │──▶│  Model  │
│  Mgmt.  │   │Discovery│   │ Storage │   │Register │
│         │   │         │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
      │
      ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Model  │──▶│  Model  │──▶│  Model  │──▶│  Model  │
│ Running │   │Inference│   │Activation│  │Deployment│
│         │   │         │   │         │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
      │                                         │
      ▼                                         ▼
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│Deactivate│  │Selection│   │Fine-tune│   │Monitoring│
│         │──▶│/Fallback│──▶│/Adapt   │──▶│         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### Data Management Layer

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│Physical │──▶│ Digital │──▶│  Data   │──▶│  Data   │──▶│  Data   │
│ Network │   │  Twin   │   │Collection│  │Processing│  │ Storage │
│         │   │         │   │         │   │         │   │         │
│[rf_     │   │[spatial_│   │[ai_data_│   │[broadcast│   │[kpis.db]│
│adapter] │   │model.py]│   │collector│   │data_    │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

---

## Component Mapping Reference

| ITU FG-AINN Concept | Our File | Description |
|---------------------|----------|-------------|
| AN AI Agent | `rl_agent.py` | PPO-based optimization agent |
| Digital Twin | `sim/spatial_model.py` | 10km×10km coverage simulation |
| Model LCM | `learning_loop.py` | Continuous learning tracker |
| Knowledge Base | `ai_data_collector.py` | BroadcastKnowledgeStore |
| Demand Predictor | `demand_predictor.py` | Time-based demand forecasting |
| Conflict Management | `approval_engine.py` | Human approval workflow |
| Performance Management | `kpi_engine.py` | KPI tracking |
| Resource Orchestration | `optimizer.py` | Spectrum allocation |

---

## Rendering Diagrams

To render PlantUML diagrams:

```bash
# Using PlantUML jar
java -jar plantuml.jar docs/AINN_*.puml

# Using VS Code PlantUML extension
# Install: ext install jebbs.plantuml
# Preview: Alt+D
```

## References

- ITU-T FG-AINN-I-116-R2: AI-Native Network Architecture
- ITU-T FG-AINN-I-139: Agentic AI Framework
- Project README.md for full system documentation
