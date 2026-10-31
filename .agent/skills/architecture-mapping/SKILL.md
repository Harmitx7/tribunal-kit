---
name: architecture-mapping
description: "Use when mapping architectural components, module dependencies, fan-in/fan-out coupling, architectural hubs, and circular dependency cycles in codebases."
version: 1.0.0
last-updated: 2026-10-29
skills:
  - codebase-intelligence
  - architecture-intelligence
  - clean-code
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
inputs:
  target: "string" # Optional module or file path to focus dependency analysis
  depth: "number" # Traversal depth limit (default: 3)
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # Dependency Topology Matrix
  evidence_records: "array" # Ground-truth import and relationship evidence
trigger:
  - "map architecture"
  - "component relationships"
  - "dependency topology"
  - "architectural hubs"
  - "fan in fan out"
  - "module coupling"
  - "circular dependencies"
---

# Architecture Mapping — Component Coupling & Dependency Topology

## Prime Directive
Component relationships and architectural dependencies must never be invented or assumed.
All dependency edges, fan-in/fan-out metrics, and cycle detections must be extracted directly from static AST import declarations (`L1_OBSERVED`).
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **Module Dependency Graphs**: Extracts internal import/require statements and models inbound callers (fan-in) and outbound callees (fan-out).
2. **Architectural Hub Identification**: Ranks the top architectural hubs in the repository by dependent fan-in count.
3. **Circular Dependency Detection**: Deterministically identifies circular dependency cycles with complete cycle node paths.
4. **External Package Accounting**: Correlates declared manifest dependencies (`package.json`) against active AST imports to detect unused or phantom dependencies.

### Out of Scope
- Initial repository layout and entry-point discovery (delegated to `repository-reconnaissance`).
- Single-route end-to-end execution flow tracing (delegated to `execution-flow-tracing`).
- Concentric ring blast-radius calculations (delegated to `change-impact-analysis`).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `dependencies`:

### CLI Invocation
```bash
# Repository-wide architectural dependency analysis
tk understand dependencies

# Scoped component dependency mapping
tk understand dependencies src/security/boundary.js
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('dependencies', 'src/utils', { depth: 3 });
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.hubs`: Ranked list of top architectural hubs by fan-in.
- `data.dependencies`: Inbound callers and outbound callees for the targeted component.
- `data.cycles`: Detected circular import cycles with node chains.
- `data.package_dependencies`: Imported external packages vs unresolvable imports.
- `evidence`: Ground-truth evidence records verifying detected dependencies.
- `markdown`: Formatted **Dependency Topology Matrix** ready for developer inspection.

---

## Handoff Contract
- **To `change-impact-analysis`**: When planning modifications to identified architectural hubs with high fan-in.
- **To `execution-flow-tracing`**: When tracing control and data flow through coupled architectural components.
- **To `code-relevance-analysis`**: When scoping relevant files for a task impacting mapped components.

