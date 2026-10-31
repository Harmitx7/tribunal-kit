---
name: execution-flow-tracing
description: "Use when tracing evidence-backed control and data flows from ingress triggers through middleware, handlers, business logic, datastores, and tests."
version: 1.0.0
last-updated: 2026-10-29
skills:
  - codebase-intelligence
  - architecture-intelligence
  - systematic-debugging
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
inputs:
  target: "string" # Feature name, HTTP route (e.g. "POST /api/checkout"), or function symbol
  depth: "number" # Max trace hop depth (default: 4)
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # Execution Flow Chronicle
  evidence_records: "array" # Flow step evidence records
trigger:
  - "trace execution flow"
  - "trace route"
  - "trace feature"
  - "how does request flow"
  - "call path for"
  - "control flow tracing"
  - "trace function"
---

# Execution Flow Tracing — Evidence-Backed Control & Data-Flow Analysis

## Prime Directive
Never hallucinate runtime execution paths. Static relationships and import chains must never be reported as proven runtime invocations.
All traced flow steps must be explicitly labeled (`direct_reference`, `indirect_reference`, `framework_mediated`, `dynamic_runtime`, `unresolved`) with ground-truth evidence attribution.
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **End-to-End Tracing**: Traces features from entry-point ingress (HTTP routes, CLI flags, queue consumers) through security middleware, handler logic, database interactions, and covering tests.
2. **Step Sequencing**: Emits a 5-stage sequential chronicle:
   - *Stage 1 (Ingress)*: Route mounts and CLI command dispatch.
   - *Stage 2 (Guards)*: Middleware, authentication, and boundary sanitization.
   - *Stage 3 (Core Logic)*: Controller, service, and domain operations.
   - *Stage 4 (Storage & Egress)*: Database queries, caches, and third-party API calls.
   - *Stage 5 (Verification)*: Relevant unit, integration, and E2E test suites.
3. **Epistemic Invariant**: Explicitly documents that static call-site observations indicate architectural linkage, not guaranteed runtime execution.

### Out of Scope
- Whole-repository structural inventory (delegated to `repository-reconnaissance`).
- High-level fan-in hub ranking (delegated to `architecture-mapping`).
- File-level edit scoping for tasks (delegated to `code-relevance-analysis`).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `trace`:

### CLI Invocation
```bash
# Trace an HTTP route execution flow
tk understand trace "POST /api/checkout"

# Trace a core domain symbol or feature
tk understand trace "authenticate"
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('trace', 'authenticate', { depth: 4 });
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.target`: Traced symbol or route string.
- `data.flow_steps`: Ordered array of stages (ingress, guards, handler, storage, tests).
- `data.relationship_edges`: Categorized call-graph edges with confidence tags.
- `evidence`: Ground-truth evidence records verifying each observed step.
- `markdown`: Formatted **Execution Flow Chronicle** ready for developer inspection.

---

## Handoff Contract
- **To `code-relevance-analysis`**: When planning code modifications across the traced flow path.
- **To `change-impact-analysis`**: When assessing the blast radius of modifying a core middleware or handler identified in the trace.
- **To `systematic-debugging`**: When diagnosing an unexpected runtime error along the traced path.

