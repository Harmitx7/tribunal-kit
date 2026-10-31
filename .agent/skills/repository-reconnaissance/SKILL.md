---
name: repository-reconnaissance
description: "Use when performing repository discovery, structural inventory, monorepo workspace analysis, tech stack detection, and system entry-point identification in unfamiliar codebases."
version: 1.0.0
last-updated: 2026-10-29
skills:
  - codebase-intelligence
  - architecture-intelligence
  - semantic-filesystem-navigation
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
inputs:
  focus: "string" # Optional subdirectory to restrict reconnaissance
  depth: "number" # Max traversal depth (default: 3)
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # System Topology Dossier
  evidence_records: "array" # Ground-truth entry point and framework evidence
trigger:
  - "repository reconnaissance"
  - "discover repository"
  - "scan unfamiliar codebase"
  - "inspect entry points"
  - "repository topology"
  - "workspace layout"
  - "project structure"
---

# Repository Reconnaissance — Structural Inventory & Entry-Point Discovery

## Prime Directive
Never guess directory structures, language distributions, or entry points.
All structural discoveries must be verified against deterministic filesystem facts (`L1_OBSERVED`) extracted via in-memory manifest parsing and workspace traversal.
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **Repository Topology**: Identifies monorepo workspaces (pnpm, yarn, npm, lerna, cargo), root configurations, and language file counts.
2. **System Entry Points**: Discovers CLI binaries, HTTP endpoints, WebSocket handlers, and service entry scripts.
3. **Configuration Boundaries**: Locates manifests (`package.json`, `tsconfig.json`, `Cargo.toml`) and environment templates (`.env.example`).
4. **Epistemic Attribution**: Labels all identified entry points with ground-truth evidence records (`[L1_OBSERVED] routes_to`).

### Out of Scope
- Tracing multi-step execution flows (delegated to `execution-flow-tracing`).
- Concentric blast-radius calculation (delegated to `change-impact-analysis`).
- Full dependency graph and fan-in hub ranking (delegated to `architecture-mapping`).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `overview`:

### CLI Invocation
```bash
# Full repository reconnaissance
tk understand overview

# Scoped reconnaissance focused on specific directory
tk understand overview --focus src/
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('overview', null, { focus: 'src/', depth: 3 });
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.monorepo`: Workspaces list and package roots.
- `data.entry_points`: Array of detected CLI, HTTP, and background entry points.
- `data.tech_stack`: Detected runtime languages and framework badges.
- `evidence`: Ground-truth evidence records verifying detected entry points.
- `markdown`: Formatted **System Topology Dossier** ready for developer inspection.

---

## Handoff Contract
- **To `architecture-mapping`**: When caller requires component relationship mapping, module fan-in/fan-out metrics, or coupling analysis.
- **To `execution-flow-tracing`**: When caller selects a discovered ingress route and requests its step-by-step control flow.
- **To `evidence-backed-onboarding`**: When caller is a new contributor seeking a guided onboarding reading order.

