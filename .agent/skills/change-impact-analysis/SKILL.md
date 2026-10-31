---
name: change-impact-analysis
description: "Use when calculating concentric blast-radius rings, transitive downstream dependents, impacted endpoints, and risk tiers for proposed file or symbol changes."
version: 1.0.0
last-updated: 2026-10-29
skills:
  - codebase-intelligence
  - architecture-intelligence
  - resilience-reviewer
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/blast_radius_engine.js
inputs:
  target: "string" # File path, module, or symbol to evaluate for blast radius
  depth: "number" # Max concentric ring traversal depth (default: 3)
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # Change Impact Dossier
  evidence_records: "array" # Blast radius ring evidence
trigger:
  - "blast radius"
  - "change impact"
  - "what breaks if I change"
  - "downstream callers"
  - "ripple effect"
  - "impact analysis"
---

# Change Impact Analysis — Concentric Blast-Radius & Downstream Risk Assessment

## Prime Directive
Never underestimate the blast radius of a proposed change.
Downstream impact must be calculated through concentric caller rings verified by static AST imports and call-graph edges (`L1_OBSERVED` / `L2_CORROBORATED`).
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **Concentric Blast-Radius Rings**:
   - *Ring 1 (Direct Callers)*: Files that directly import or invoke the target module/symbol.
   - *Ring 2 (Transitive Callers)*: Secondary consumers indirectly affected through intermediate modules.
   - *Ring 3 (System Boundaries)*: Public HTTP endpoints, CLI entry points, and database models reaching the target.
2. **Standardized Risk Tiers**:
   - `LOW`: Isolated leaf component, 0 public endpoints impacted, isolated trust boundary.
   - `MEDIUM`: 3 to 8 downstream callers, internal library boundaries.
   - `HIGH`: >8 downstream callers, public HTTP/CLI entry points affected.
   - `CRITICAL`: Crosses security trust boundaries (Auth/Datastore/Crypto) or affects >15 modules.
   - `INDETERMINATE`: Target unresolved or evidence insufficient to calculate safe bounds.
3. **Targeted Verification Recipe**: Generates the exact test suites and commands covering the affected blast radius.

### Out of Scope
- Initial task scoping and relevant-file discovery (delegated to `code-relevance-analysis`).
- Full repository inventory (delegated to `repository-reconnaissance`).
- Applying code fixes or refactorings (delegated to implementation agents).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `impact`:

### CLI Invocation
```bash
# Calculate blast radius for a specific module
tk understand impact src/security/boundary.js

# Calculate blast radius with extended depth
tk understand impact src/utils/helpers.js --depth 4
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('impact', 'src/security/boundary.js', { depth: 3 });
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.target`: Analyzed target symbol or file path.
- `data.risk_tier`: Calculated risk classification (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`).
- `data.rings`: Concentric dependent arrays (`ring1`, `ring2`, `ring3`).
- `data.impacted_endpoints`: Public routes and entry points at risk.
- `data.verification_recipe`: Targeted test commands for the impacted blast radius.
- `evidence`: Ground-truth evidence records verifying dependent edges.
- `markdown`: Formatted **Change Impact Dossier** ready for developer inspection.

---

## Handoff Contract
- **To `resilience-reviewer`**: When changes affect High or Critical risk components requiring fault-tolerance review.
- **To `security-auditor`**: When the blast radius crosses authentication, authorization, or datastore trust boundaries.
- **To `test-engineer`**: When execution of the generated verification recipe is required prior to merging.

