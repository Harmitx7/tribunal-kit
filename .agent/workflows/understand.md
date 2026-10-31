---
description: Codebase Intelligence & Developer Onboarding — Autonomous architectural exploration, feature flow tracing, dependency analysis, change blast radius impact, dead-code detection, guided onboarding, and change preparation.
required-skills:
  - codebase-intelligence
  - repository-reconnaissance
  - architecture-mapping
  - execution-flow-tracing
  - code-relevance-analysis
  - change-impact-analysis
  - evidence-backed-onboarding
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
  - .agent/scripts/architecture_mapper.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/trace_engine.js
---

# /tribunal-understand — Codebase Intelligence & Developer Onboarding

Execute deterministic, read-only architectural exploration, impact assessment, and change preparation for unfamiliar codebases.

**Command:** `/tribunal-understand`  
**Alias:** `/understand`  
**Persona:** `@explorer-agent`  
**Safety:** Strictly Read-Only (100% In-Memory Fact Extraction)  
**Contract:** Standardized Codebase Evidence Record (`L1_OBSERVED`, `L2_CORROBORATED`, `L3_INFERRED`, `L0_UNKNOWN`)

---

## Architecture Flow

```
UNFAMILIAR CODEBASE
    │
    ▼ (In-Memory AST & Workspace Extraction)
TRIBUNAL FACT MODEL (TAFM)
    │
    ▼ (Zero-Trust Ground-Truth Verification)
SLICING & BLAST RADIUS ENGINE (Concentric Depth Rings)
    │
    ▼ (Secret Redaction & Token Bounding <2,500 Tokens)
FLIGHT DATA HUD / CHANGE PREPARATION DOSSIER
```

---

## Integrated Skill Architecture
`/tribunal-understand` delegates to the `codebase-intelligence` orchestrator and routes specific intents to specialized supporting skills:

| Subcommand | Specialized Skill | Primary Responsibility |
| :--- | :--- | :--- |
| `overview` | `repository-reconnaissance` | Repository structure, workspaces, tech stack, and entry points |
| `dependencies` | `architecture-mapping` | Module dependency topology, fan-in hubs, and circular cycles |
| `trace` | `execution-flow-tracing` | Evidence-backed control/data flow tracing from ingress to test |
| `relevant-files` / `prepare` | `code-relevance-analysis` | Task-driven relevant file retrieval and change inspection slicing |
| `impact` | `change-impact-analysis` | Concentric blast-radius calculation and downstream risk tiers |
| `onboard` | `evidence-backed-onboarding` | Guided developer onboarding and verified setup recipes |

---

## Subcommands

### 1. Architectural Overview (Default)

```bash
/understand
/understand overview
/understand overview --focus src/
```

Produces the **System Topology Dossier**:
- Repository structure, monorepo workspaces, languages & frameworks
- Primary entry points (CLI binaries, HTTP routes, server scripts)
- Datastores, message queues, and external APIs
- Architectural hubs (top 5 modules by fan-in)
- Build and test infrastructure
- Verified ground-truth evidence records

---

### 2. Feature Execution Flow Tracing

```bash
/understand trace <feature-or-route>
/understand trace "POST /api/checkout"
/understand trace "auth"
```

Produces the **Execution Flow Chronicle**:
- Step 1: Ingress Trigger (CLI command / HTTP route dispatch)
- Step 2: Middleware & security guards
- Step 3: Handler and business logic
- Step 4: Datastores and third-party API calls
- Step 5: Covering test suites and verification recipes
- *Note:* Static analysis does not guarantee runtime invocation.

---

### 3. Dependency Topology Analysis

```bash
/understand dependencies <target-file-or-module>
/understand dependencies # repository-wide audit
```

Produces the **Dependency Topology Matrix**:
- Inbound callers (Fan-In) & Outbound calls (Fan-Out)
- Transitive coupling depth
- Circular dependency cycle detection & path alerts
- Missing dependencies vs unresolvable dynamic imports

---

### 4. Targeted File Inspection Checklist

```bash
/understand relevant-files <task-description>
/understand relevant-files "add OAuth login"
/understand relevant-files "stripe webhook payment"
```

Produces the **Targeted File Inspection Checklist**:
- Classified file list: `INSPECT`, `LIKELY_CHANGE_TARGET`, `CONTRACT_TO_PRESERVE`, `DEPENDENT_TO_VERIFY`, `TEST_TO_REVIEW`
- Evidence explanations for each recommendation
- Exact verification command to run before submitting PR

---

### 5. Change Blast Radius & Risk Assessment

```bash
/understand impact <target-file-or-symbol>
/understand impact src/security/boundary.js
```

Produces the **Blast Radius Assessment**:
- Canonical Risk Tier: `🟢 LOW` | `🟡 MEDIUM` | `🟠 HIGH` | `🔴 CRITICAL` | `⚪ INDETERMINATE`
- Concentric Rings: Ring 1 (direct callers), Ring 2..N (transitive callers)
- Impacted public endpoints, datastores, and test suites
- Trust boundary crossing alerts

---

### 6. Dead Code & Relevance Inventory

```bash
/understand dead-code
/understand dead-code src/commands
```

Produces the **Code Relevance Inventory**:
- Classified findings: `UNREFERENCED_STATICALLY`, `POSSIBLY_ORPHANED`, `PROTECTED`
- Protected entry point registry (`bin/`, `package.json` `main`/`exports`)
- Chesterton's fences (`// VERIFY` landmines to preserve)
- *Invariant:* Dead-code findings never trigger automated deletion.

---

### 7. Guided Developer Onboarding

```bash
/understand onboard
```

Produces the **Developer Onboarding Dossier**:
- Project purpose and 30-second mental model
- Guided Reading Order:
  - *Day 1:* System Entry Points & Configuration
  - *Day 2:* Core Domain & Architectural Hubs
  - *Day 3:* Integrations & Verification Suites
- 1-Line Verification Recipes (build, test, lint)

---

### 8. Change Preparation Operation

```bash
/understand prepare <task-description>
/understand prepare "add payment idempotency key support to checkout"
```

Produces the **Change Preparation Dossier**:
- Proposed change analysis and likely change targets (`LIKELY_CHANGE_TARGET`)
- Contracts and schemas to preserve (`CONTRACT_TO_PRESERVE`)
- Dependent callers requiring verification (`DEPENDENT_TO_VERIFY`)
- Covering test suites and verification recipes (`TEST_TO_REVIEW`)
- Blast radius estimate and risk tier
- Analytical Readiness Gate:
  - `READY_FOR_IMPLEMENTATION_REVIEW`
  - `READY_WITH_UNKNOWNS`
  - `BLOCKED`

---

## Global Flags
- `--depth <n>`: Traversal depth limit (default: 3, max: 15).
- `--focus <dir>`: Restricts analysis scope to a specific subdirectory.
- `--json`: Emits raw machine-readable JSON result envelope.
- `--no-cache`: Forces fresh in-memory AST extraction.
