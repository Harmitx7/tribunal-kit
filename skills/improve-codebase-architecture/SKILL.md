---
name: improve-codebase-architecture
description: "Use when Scans a codebase for deepening opportunities, architectural bottlenecks, tight coupling, and produces a prioritized visual improvement roadmap."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - codebase-design
  - clean-code
  - architecture
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Improve Codebase Architecture — Architectural Audit & Refactoring

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
