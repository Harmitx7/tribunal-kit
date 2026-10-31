---
name: codebase-intelligence
description: "Use when analyzing, tracing, exploring, assessing impact, investigating dead code, or preparing changes in unfamiliar codebases. Deterministic, read-only architectural intelligence grounded in static AST facts."
version: 2.0.0
last-updated: 2026-10-29
skills:
  - repository-reconnaissance
  - architecture-mapping
  - execution-flow-tracing
  - code-relevance-analysis
  - change-impact-analysis
  - evidence-backed-onboarding
  - architecture-intelligence
  - semantic-filesystem-navigation
  - clean-code
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/architecture_verifier.js
inputs:
  subcommand: "string" # overview | trace | dependencies | relevant-files | impact | dead-code | onboard | prepare
  target: "string"
  flags: "object"
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string"
  evidence_records: "array"
trigger:
  - "understand"
  - "onboard"
  - "codebase"
  - "explore"
  - "architecture overview"
  - "trace feature"
  - "relevant files"
  - "dead code"
  - "prepare change"
---

# Codebase Intelligence & Developer Onboarding — Verifiable Exploration Engine

## Prime Directive
Never hallucinate code paths, entry points, or dependencies when exploring an unfamiliar repository.
All architecture claims, execution traces, dependency relationships, and blast-radius estimations must be grounded in **deterministic AST facts** (`L1_OBSERVED` or `L2_CORROBORATED`).
Speculative or dynamic assumptions must be explicitly isolated as `L3_INFERRED` or `L0_UNKNOWN` and never presented as observed facts.
The exploration pipeline is **strictly READ-ONLY** with zero repository mutations.

---

## Primary Skill Orchestration Architecture
`codebase-intelligence` serves as the primary orchestrator coordinating six specialized, non-competing supporting skills:

| Capability Domain | Specialized Skill | Delegated Engine Operation | Primary CLI Command |
| :--- | :--- | :--- | :--- |
| **Repository Discovery** | `repository-reconnaissance` | `overview` | `tk understand overview` |
| **Component Topology** | `architecture-mapping` | `dependencies` | `tk understand dependencies` |
| **Control & Data Flow** | `execution-flow-tracing` | `trace` | `tk understand trace <target>` |
| **Task File Slicing** | `code-relevance-analysis` | `relevant-files` / `prepare` | `tk understand relevant-files "<task>"` |
| **Blast Radius Assessment** | `change-impact-analysis` | `impact` | `tk understand impact <target>` |
| **Developer Onboarding** | `evidence-backed-onboarding` | `onboard` | `tk understand onboard` |

---

## Standardized Contract System

### 1. Evidence Confidence Standards
- `L1_OBSERVED`: Directly verified by static AST parsing, file inspection, or cryptographic digest.
- `L2_CORROBORATED`: Supported by multiple independent static observations (e.g., import + route declaration + config entry).
- `L3_INFERRED`: Reasoned conclusion from naming, convention, or dynamic matching. Must record `unresolved_assumptions`.
- `L0_UNKNOWN`: Unavailable, unresolvable, or unanalyzed.

### 2. Standardized Risk Tiers
- `LOW`: Leaf component with no dependents, 0 endpoints impacted, isolated trust zone.
- `MEDIUM`: 3 to 8 downstream dependents, internal service boundaries.
- `HIGH`: >8 downstream dependents, public endpoints impacted, or cross-service coupling.
- `CRITICAL`: Changes cross trust boundaries (Public/Auth/Datastore), affect core auth gates, or impact >15 modules.
- `INDETERMINATE`: Target unresolved or evidence insufficient to calculate safe bounds.

### 3. File Relevance Classification
- `INSPECT`: Primary entry points and configuration files to review first.
- `LIKELY_CHANGE_TARGET`: Target file containing the logic to add or modify.
- `CONTRACT_TO_PRESERVE`: Shared types, schemas, interfaces, or DB models that must not break.
- `DEPENDENT_TO_VERIFY`: Direct downstream callers (Ring 1) requiring verification.
- `TEST_TO_REVIEW`: Existing test suites that cover the feature.
- `UNRESOLVED`: Candidate mentioned in requirements but not statically located.

### 4. Dead Code Classification
- `UNREFERENCED_STATICALLY`: Symbol or module has 0 static call sites in repository.
- `POSSIBLY_ORPHANED`: Module is not imported by any other internal file.
- `DYNAMICALLY_REACHABLE_POSSIBLE`: Module may be loaded dynamically or via framework conventions.
- `PUBLIC_INTERFACE`: Exported as part of public library API or package manifest.
- `PROTECTED`: Explicitly protected by configuration, CLI bin declaration, or Chesterton's fence (`// VERIFY`).
- `REMOVAL_CANDIDATE`: Multiple indicators confirm unreferenced status and safe removal candidate.
- **Safety Invariant:** Code findings never trigger automated deletion.

### 5. Change Preparation Readiness
- `READY_FOR_IMPLEMENTATION_REVIEW`: Target files, contracts, tests, and blast radius mapped with L1/L2 evidence.
- `READY_WITH_UNKNOWNS`: Mapped with documented assumptions or unverified dynamic links.
- `BLOCKED`: Target unresolvable, trust boundary violation without specification, or missing required context.

---

## 8 Core Operations

### 1. `overview` (System Topology Dossier)
Produces an evidence-backed architectural overview:
- Repository structure, monorepo workspaces, languages & frameworks.
- Application entry points (CLI binaries, HTTP routes, server scripts).
- Major modules and architectural hubs (top 5 by fan-in).
- Build and test infrastructure.
- Configuration boundaries.
- Important architectural uncertainties.

```bash
tk understand overview
```

### 2. `trace <feature/route/symbol>` (Execution Flow Chronicle)
Traces a symbol, function, API, event, or data flow through statically observable relationships:
- Ingress trigger -> Middleware guards -> Handler -> Service -> Datastore.
- Categorizes edges: `direct_reference`, `indirect_reference`, `framework_mediated`, `dynamic_runtime`, `unresolved`.
- Explicit disclaimer: Static analysis does not guarantee runtime invocation.

```bash
tk understand trace "POST /api/checkout"
tk understand trace "compress_context"
```

### 3. `dependencies [target]` (Dependency Matrix)
Analyzes module and package dependency topology:
- Internal module dependencies (inbound fan-in and outbound fan-out).
- External packages (declared vs imported).
- Circular dependency cycles with complete cycle paths.
- Missing dependencies vs unresolvable dynamic imports.

```bash
tk understand dependencies src/security/boundary.js
tk understand dependencies # repository-wide audit
```

### 4. `relevant-files <task>` (Targeted Inspection Checklist)
Ranks files by relationship to the developer's objective:
- Classifies each file (`LIKELY_CHANGE_TARGET`, `CONTRACT_TO_PRESERVE`, `DEPENDENT_TO_VERIFY`, `TEST_TO_REVIEW`).
- Explains evidence rationale behind each recommendation.
- Identifies exact verification command.

```bash
tk understand relevant-files "add OAuth login"
```

### 5. `impact <target>` (Blast Radius Assessment)
Estimates potential change impact:
- Concentric rings: Ring 1 (direct callers), Ring 2..N (transitive callers).
- Impacted public endpoints, datastores, and test suites.
- Canonical risk tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`, `INDETERMINATE`).
- Separates observed impact from inferred impact.

```bash
tk understand impact src/security/boundary.js
```

### 6. `dead-code [path]` (Code Relevance Inventory)
Statically identifies potential dead code without automatic removal:
- Categorizes candidates (`UNREFERENCED_STATICALLY`, `POSSIBLY_ORPHANED`, `PROTECTED`).
- Respects package exports, CLI binaries, and Chesterton's fences (`// VERIFY`, `// CAUTION`).

```bash
tk understand dead-code
```

### 7. `onboard` (Developer Onboarding Dossier)
Produces a concise developer onboarding guide:
- Project purpose and 30-second mental model.
- How to start and test it (verified repo instructions).
- Guided reading order (Day 1: Entry Points, Day 2: Core Domain, Day 3: Integrations).
- Critical invariants and gotchas.
- 1-line verification recipes.

```bash
tk understand onboard
```

### 8. `prepare <task-description>` (Change Preparation Dossier)
Assists a developer before making a requested change:
- Parses the proposed change.
- Identifies likely change targets.
- Maps relevant dependencies and callers.
- Identifies contracts that must be preserved.
- Finds relevant tests and validation commands.
- Estimates potential blast radius.
- Identifies security, compatibility, and migration concerns.
- Records unknowns and assumptions.
- Assigns analytical readiness status (`READY_FOR_IMPLEMENTATION_REVIEW`, `READY_WITH_UNKNOWNS`, `BLOCKED`).

```bash
tk understand prepare "migrate database auth table to include mfa_secret column"
```

---

## Global Flags
- `--depth <n>`: Traversal depth limit (default: 3, max: 15).
- `--focus <dir>`: Restricts analysis scope to a specific subdirectory.
- `--json`: Emits raw machine-readable JSON result envelope.
- `--no-cache`: Forces fresh in-memory AST extraction.
