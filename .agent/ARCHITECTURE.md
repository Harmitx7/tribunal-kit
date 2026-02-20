# 🏛️ Tribunal Anti-Hallucination Kit — Architecture

> Works natively in **Cursor**, **Windsurf**, **Antigravity**, and any AI IDE that indexes `.agent/` folders.

---

## Slash Commands (Workflows)

Type any of these in your AI IDE chat:

| Command | Purpose |
|---|---|
| `/generate` | Full Tribunal: Maker → Parallel Review → Human Gate |
| `/review` | Audit existing code (no generation) |
| `/tribunal-full` | ALL 8 agents at once — maximum coverage |
| `/tribunal-backend` | Logic + Security + Deps + Types |
| `/tribunal-frontend` | Logic + Security + Frontend + Types |
| `/tribunal-database` | Logic + Security + SQL |

---

## The 8 Tribunal Agents

| Agent | File | Activates When |
|---|---|---|
| `logic-reviewer` | `agents/logic-reviewer.md` | All sessions (always on) |
| `security-auditor` | `agents/security-auditor.md` | All sessions (always on) |
| `performance-reviewer` | `agents/performance-reviewer.md` | "optimize", "slow", `/tribunal-full` |
| `dependency-reviewer` | `agents/dependency-reviewer.md` | "api", "backend", `/tribunal-full` |
| `type-safety-reviewer` | `agents/type-safety-reviewer.md` | "typescript", "api", `/tribunal-full` |
| `sql-reviewer` | `agents/sql-reviewer.md` | "query", "database", `/tribunal-full` |
| `frontend-reviewer` | `agents/frontend-reviewer.md` | "react", "hook", "component", `/tribunal-full` |
| `test-coverage-reviewer` | `agents/test-coverage-reviewer.md` | "test", "spec", "coverage", `/tribunal-full` |

---

## How the Tribunal Works

```
User prompt
    │
    ▼
GEMINI.md → Classify request → Select active reviewers
    │
    ▼
MAKER generates code (temp 0.1, context-bound, no hallucinations)
    │
    ▼
ALL SELECTED REVIEWERS run in parallel
    │
    ├── Logic      → hallucinated methods?
    ├── Security   → OWASP violations?
    ├── Deps       → fake npm packages?
    ├── Types      → any/unsafe casts?
    ├── SQL        → injection / N+1?
    ├── Frontend   → hooks violations?
    ├── Perf       → O(n²) / blocking I/O?
    └── Tests      → tautology / no edges?
    │
    ▼
VERDICT: All approved → HUMAN GATE (you approve or reject the diff)
         Any failed   → Feedback returned to Maker for revision (max 3 attempts)
```

---

## Auto Domain Routing (GEMINI.md)

| Keywords in prompt | Extra reviewers added |
|---|---|
| api, route, endpoint, server | + Dependency + TypeSafety |
| sql, query, database, orm | + SQL |
| component, hook, react, next | + Frontend + TypeSafety |
| test, spec, coverage, jest | + TestCoverage |
| optimize, slow, memory, cpu | + Performance |
