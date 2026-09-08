---
name: improve-codebase-architecture
description: Scans a codebase for deepening opportunities, architectural bottlenecks, tight coupling, and produces a prioritized visual improvement roadmap.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
skills:
  - codebase-design
  - clean-code
  - architecture
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Improve Codebase Architecture — Architectural Audit & Refactoring

---

## Mandatory Pre-Flight Context Inspection

Before refactoring or producing an architectural improvement roadmap, you MUST inspect:

1. Circular Dependency Breaking Rule (Section 24) → Identify circular imports (`A -> B -> C -> A`) and resolve via event buses or explicit interfaces
2. Monolithic Controller Line Threshold (500 lines) (Section 27) → Flag any controller/service >500 lines with mixed concerns for immediate decomposition
3. Incremental Refactoring Rule (Section 46) → Ban shotgun surgery across >5 files simultaneously; enforce phased, test-backed interface extractions

Audit an existing codebase for structural rot, circular dependencies, monolithic controllers, and produce a prioritized refactoring roadmap.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Scans a codebase for deepening opportunities, architectural bottlenecks, tight coupling, and produces a prioritized visual improvement roadmap..
- **DO NOT activate when:** The task falls strictly outside improve-codebase-architecture domain or belongs to a different dedicated specialist.

---

## 4 Audit Steps

### 1. Dependency Graph Inspection

- Map import relationships across modules. Identify circular dependencies (`A -> B -> C -> A`) and break them by introducing event buses or interface abstractions.

### 2. Monolithic Controller Detection

- Flag files exceeding 500 lines of code containing mixed concerns (database queries, HTTP response handling, email sending, data validation).

### 3. Interface Shrinking (Deepening Modules)

- Audit public exports. Convert large multi-parameter interfaces into thin, single-responsibility contracts.

### 4. Prioritized Architectural Roadmap Output

Output audit findings in a clear prioritized Markdown table:

| Impact Level         | Architectural Issue                              | Proposed Seam / Refactor                          |
| -------------------- | ------------------------------------------------ | ------------------------------------------------- |
| 🔴 **High Impact**   | Direct DB queries inside React Server Components | Extract Repository layer pattern                  |
| 🟠 **Medium Impact** | Circular import between Auth and User modules    | Introduce `EventBus` for user registration events |
| 🟡 **Low Impact**    | Hardcoded API base URLs across 12 files          | Centralize in typed `ConfigService`               |

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
