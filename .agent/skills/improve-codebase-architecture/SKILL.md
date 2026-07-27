---
name: improve-codebase-architecture
description: Scans a codebase for deepening opportunities, architectural bottlenecks, tight coupling, and produces a prioritized visual improvement roadmap.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Codebase Architectural Audit
  tier: pro
  co-requires: [codebase-design, clean-code, architecture]
  trigger-signals:
    strong: [improve-codebase-architecture, architectural audit, refactor architecture, decouple modules, codebase refactor plan]
    weak: [architecture check, fix architecture]
---

# Improve Codebase Architecture — Architectural Audit & Refactoring

Audit an existing codebase for structural rot, circular dependencies, monolithic controllers, and produce a prioritized refactoring roadmap.

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

| Impact Level | Architectural Issue | Proposed Seam / Refactor |
| --- | --- | --- |
| 🔴 **High Impact** | Direct DB queries inside React Server Components | Extract Repository layer pattern |
| 🟠 **Medium Impact** | Circular import between Auth and User modules | Introduce `EventBus` for user registration events |
| 🟡 **Low Impact** | Hardcoded API base URLs across 12 files | Centralize in typed `ConfigService` |

---

## 🤖 LLM-Specific Traps

1. **Shotgun Surgery**: Refactoring 20 files at once without establishing tests or clean interfaces first.
2. **Ignoring Existing Conventions**: Forgetting existing project patterns and forcing an incompatible framework structure.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `logic-reviewer` · `complexity-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are circular dependencies identified and resolved via clean seams?
✅ Is the refactoring plan broken down into safe, testable phases?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
