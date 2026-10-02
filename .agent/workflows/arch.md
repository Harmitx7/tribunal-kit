---
description: Tribunal Architecture Intelligence — Autonomous architecture extraction, zero-trust verification, blast radius simulation, semantic diffing, and health auditing.
---

# /arch — Tribunal Architecture Intelligence

Execute deterministic architecture intelligence, verification, and blast radius simulation.

## Overview

Unlike superficial diagramming tools that only generate static pictures, `/arch` treats architecture as an **executable, verifiable Evidence Graph**.

```
SOURCE CODE
    ↓ (AST & pattern extraction)
FACT MODEL (.agent/history/architecture-model.json)
    ↓ (Zero-trust provenance verification)
CONFIDENCE & CONTRADICTION GATES (L1-L5)
    ↓ (Downstream dependency closure)
BLAST RADIUS & RISK SIMULATION
    ↓ (Projections: Topology, Security, Failure, Impact)
INTERACTIVE STANDALONE EXPLORER & AUDIT REPORT
```

---

## Subcommands

### 1. Extract Architectural Fact Model

```bash
tk arch map
# or: node .agent/scripts/architecture_extractor.js
```

Scans repository AST, route definitions, database models, queues, events, and auth middleware. Emits the canonical `.agent/history/architecture-model.json`.

### 2. Zero-Trust Verification

```bash
tk arch verify [--strict]
# or: node .agent/scripts/architecture_verifier.js
```

Verifies that all entity code locations, lines, symbols, and hashes match ground truth. Surfaces any architectural contradictions or drifted/stale evidence.

### 3. Change Blast Radius & Impact Simulation

```bash
tk arch impact <component-id-or-file>
# or: node .agent/scripts/blast_radius_engine.js <query>
```

Simulates the impact of changing a component: direct callers, transitive dependents across concentric depth rings, impacted API routes, affected test suites, and risk tier (LOW/MEDIUM/HIGH/CRITICAL).

### 4. Semantic Architecture Diff (PR Gate)

```bash
tk arch diff <base-model.json> <head-model.json>
# or: node .agent/scripts/architecture_diff.js <base> <head>
```

Calculates true architectural shifts:

- Trust boundaries crossed (e.g. public route directly accessing isolated database)
- Resilience regressions (e.g. timeouts removed from external API calls)
- Blast radius expansions (components whose downstream impact grew >25%)
- New external SaaS/cloud dependencies introduced

### 5. Architectural Health Audit

```bash
tk arch audit
# or: node .agent/scripts/architecture_health.js
```

Audits structural risks:

- Circular dependencies (exact cycle chains)
- Single Points of Failure (SPOFs / High Fan-In bottlenecks)
- Excessive Coupling (God Modules / High Fan-Out)
- Test coverage gaps on critical components

### 6. Multi-Projection Interactive Explorer

```bash
tk arch project [--open]
# or: node .agent/scripts/architecture_visualizer.js
```

Generates a zero-dependency, standalone HTML explorer at `.agent/history/architecture-intelligence.html` with 4 interactive projections:

1. **Topology**: Services, routes, datastores, queues
2. **Security**: Trust zones & authentication gates
3. **Failure Modes**: Timeouts, retries, fallbacks
4. **Blast Radius Simulator**: Click any node to visualize live concentric blast rings
