---
name: evidence-backed-onboarding
description: "Use when onboarding developers to unfamiliar codebases by generating evidence-grounded orientation dossiers, hub reading orders, and verified setup recipes."
version: 1.0.0
last-updated: 2026-10-29
skills:
  - codebase-intelligence
  - architecture-intelligence
  - documentation-writer
tools: Read, Grep, Glob, Bash
scripts-binding:
  - .agent/scripts/codebase_intelligence.js
  - .agent/scripts/architecture_extractor.js
inputs:
  focus: "string" # Optional subdirectory to restrict onboarding focus
outputs:
  result_envelope: "object" # CodebaseIntelligenceResult (schema_version: 2.0.0)
  dossier_markdown: "string" # Developer Onboarding Dossier
  evidence_records: "array" # Verified build and entry point evidence
trigger:
  - "onboard developer"
  - "new to this codebase"
  - "how to get started"
  - "orientation guide"
  - "developer onboarding"
  - "explain codebase to newcomer"
  - "onboarding guide"
---

# Evidence-Backed Onboarding — Grounded Developer Orientation & Setup Guidance

## Prime Directive
Never hallucinate onboarding steps, installation commands, or architectural summaries.
All guidance must be grounded in verified repository evidence: active scripts in `package.json`, observed runtime requirements, verified test recipes, and ground-truth entry points (`L1_OBSERVED`).
Analysis is **strictly READ-ONLY** with zero repository mutations.

---

## Responsibility & Boundaries

### Primary Responsibilities
1. **Architectural Orientation**: Summarizes repository purpose, tech stack, and monorepo structure in an accessible 3-minute mental model.
2. **Key Architectural Hubs to Study**: Highlights the top 3 core modules by fan-in, explaining why they are central to the codebase.
3. **Verified Setup & Test Recipes**: Extracts actionable, ground-truth developer commands for installing dependencies, running the application, and executing tests.
4. **Structured Reading Order**: Recommends a sequenced inspection plan:
   - *Phase 1*: System Entry Points & Configuration manifests.
   - *Phase 2*: Core Domain Models & Architectural Hubs.
   - *Phase 3*: Integrations, Adapters, and Testing Infrastructure.
5. **Initial Contributor Checklist**: Provides a pre-flight checklist ensuring new engineers can make safe, verified contributions.

### Out of Scope
- Detailed blast-radius calculations (delegated to `change-impact-analysis`).
- Specific feature execution path tracing (delegated to `execution-flow-tracing`).
- Automated authoring of code changes (delegated to implementation agents).

---

## Invocation & Engine Delegation

This skill delegates directly to the canonical Codebase Intelligence engine operation `onboard`:

### CLI Invocation
```bash
# Generate comprehensive developer onboarding dossier
tk understand onboard

# Onboarding dossier focused on specific subsystem
tk understand onboard --focus src/
```

### Programmatic Delegation
```javascript
const { CodebaseIntelligence } = require('.agent/scripts/codebase_intelligence');

const engine = new CodebaseIntelligence(process.cwd());
const result = await engine.execute('onboard', null, {});
```

---

## Output Contract (Schema 2.0.0)

Returns a standard Schema 2.0.0 `CodebaseIntelligenceResult` envelope containing:
- `data.onboarding`: Structured onboarding metadata (purpose, hubs, setup commands, reading order).
- `data.top_hubs`: Top 3 architectural hubs recommended for initial code review.
- `data.verification_recipes`: Verified test and build commands from repository manifests.
- `evidence`: Ground-truth evidence records verifying manifests and scripts.
- `markdown`: Formatted **Developer Onboarding Dossier** ready for developer inspection.

---

## Handoff Contract
- **To `repository-reconnaissance`**: When the developer requests a broader structural inventory of all workspaces and routes.
- **To `execution-flow-tracing`**: When the developer needs to understand how a specific user request flows through the architecture.
- **To `code-relevance-analysis`**: When the newly onboarded developer is ready to start their first task.

