---
name: code-relevance-analysis
description: "Use when identifying, ranking, and classifying files relevant to a development task into change targets, contracts to preserve, dependents, and tests."
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
  target: "string" # Natural language task description or feature requirement
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # Targeted File Inspection Checklist
  evidence_records: "array" # Match evidence explaining file classification
trigger:
  - "find relevant files"
  - "which files should I edit"
  - "files needed for task"
  - "slice codebase for"
  - "relevant file retrieval"
  - "relevant files"
---

# Code Relevance Analysis — Task-Scoring File Retrieval & Inspection Slicing

## Prime Directive
Never guess which files to modify for a task.
Relevant file discovery must correlate the stated task objectives against statically verified architectural symbols, routes, models, and call sites (`L1_OBSERVED` / `L2_CORROBORATED`).
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **Targeted File Retrieval**: Analyzes a developer's task description and extracts candidate files across the workspace.
2. **Standardized Relevance Classification**:
   - `LIKELY_CHANGE_TARGET`: Primary source files implementing the targeted capability.
   - `CONTRACT_TO_PRESERVE`: Shared interfaces, schemas, DTOs, and database models that must maintain backward compatibility.
   - `DEPENDENT_TO_VERIFY`: Direct downstream callers (Ring 1) that consume the target and require regression verification.
   - `TEST_TO_REVIEW`: Existing unit, integration, or E2E tests validating the feature.
3. **Evidence-Backed Rationale**: Provides an explicit justification and match score for every suggested file.
4. **Verification Recipe**: Generates the exact test commands needed to verify changes to the scoped files.

### Out of Scope
- Full-repository architectural overview (delegated to `repository-reconnaissance`).
- Transitive blast-radius calculations across concentric rings (delegated to `change-impact-analysis`).
- Automated code modifications (delegated to implementation agents).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `relevant-files`:

### CLI Invocation
```bash
# Retrieve and classify relevant files for a development task
tk understand relevant-files "add OAuth authentication support"

# Slice codebase for database migration preparation
tk understand relevant-files "add tenant_id column to users table"
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('relevant-files', 'add OAuth authentication support');
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.task`: Cleaned input task query string.
- `data.files`: Ranked array of relevant files with classifications, match scores, and rationale.
- `data.verification_recipe`: Bash test commands recommended prior to submitting edits.
- `evidence`: Ground-truth evidence records linking symbols and routes to files.
- `markdown`: Formatted **Targeted File Inspection Checklist** ready for developer inspection.

---

## Handoff Contract
- **To `change-impact-analysis`**: When caller has selected specific files to edit and requires full blast-radius estimation.
- **To `project-planner` / Implementer Agent**: When developer requires a step-by-step implementation plan based on the scoped files.
- **To `test-engineer`**: When updating existing tests or authoring new test coverage for identified change targets.

