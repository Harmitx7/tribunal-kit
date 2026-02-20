# Agent Flow Architecture

> **Tribunal Anti-Hallucination Agent Kit** — Complete system flow documentation

---

## Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                           │
└──────────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                  STEP 1 — REQUEST CLASSIFICATION               │
│                                                                │
│  Question?      → Text answer only (no agents, no files)      │
│  Survey?        → Read + report (no code)                     │
│  Simple edit?   → Direct edit (no plan)                       │
│  Complex build? → Plan file + agent routing                   │
│  Design/UI?     → Design agent + plan file                    │
│  Slash command? → Route to .agent/workflows/{cmd}.md          │
└──────────────────────────────┬─────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
  ┌───────────────────────┐         ┌───────────────────────┐
  │   SLASH COMMAND       │         │   DIRECT AGENT CALL   │
  │   (Workflow file)     │         │   (Auto-routed)       │
  └──────────┬────────────┘         └──────────┬────────────┘
             │                                 │
             ▼                                 ▼
  /brainstorm, /create,                Domain detection:
  /debug, /plan, /enhance,             backend → backend-specialist
  /orchestrate, /test,                 frontend → frontend-specialist
  /deploy, /status,                    database → database-architect
  /preview, /generate,                 mobile   → mobile-developer
  /review, /ui-ux-pro-max,             debug    → debugger
  /tribunal-*                          security → security-auditor
             │                                 │
             └─────────────┬───────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────┐
          │         AGENT ACTIVATION           │
          │                                    │
          │  1. Announce: "🤖 Applying @[...]" │
          │  2. Load agent .md file            │
          │  3. Read frontmatter skills:       │
          │  4. Load required SKILL.md files   │
          └────────────────┬───────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────┐
          │         SOCRATIC GATE              │
          │                                    │
          │  Complex task? → Ask first         │
          │  New feature?  → 3+ questions      │
          │  Bug fix?      → Confirm context   │
          │  Vague?        → Clarify scope     │
          │                                    │
          │  Only cleared gate moves forward   │
          └────────────────┬───────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────┐
          │         CODE GENERATION            │
          │         (Maker Agent)              │
          │                                    │
          │  Temperature: 0.1 (accuracy)       │
          │  Context: loaded from project      │
          │  Scope: one module at a time       │
          │  Rules: // VERIFY on uncertainty   │
          └────────────────┬───────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────┐
          │       TRIBUNAL REVIEW              │
          │       (Parallel reviewers)         │
          │                                    │
          │  Backend:   logic + security       │
          │             + dependency + types   │
          │                                    │
          │  Frontend:  logic + security       │
          │             + frontend + types     │
          │                                    │
          │  Database:  logic + security + sql │
          │                                    │
          │  Full:      all 8 reviewers        │
          └────────────────┬───────────────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
    ┌─────────────────┐        ┌──────────────────┐
    │  ALL APPROVED   │        │  ANY REJECTED    │
    └────────┬────────┘        └────────┬─────────┘
             │                          │
             ▼                          ▼
    ┌─────────────────┐        ┌──────────────────┐
    │  HUMAN GATE     │        │  REVISION LOOP   │
    │                 │        │  (max 3 retries) │
    │  Show diff      │        └────────┬─────────┘
    │  Y = write      │                 │
    │  N = discard    │         If still failing after 3:
    │  R = revise     │         → Stop, report to user
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  CODE WRITTEN   │
    │  TO DISK        │
    └─────────────────┘
```

---

## The 8 Tribunal Reviewers

| Reviewer | Activates for | Catches |
|---|---|---|
| `logic-reviewer` | All domains | Invented stdlib methods, impossible logic, undefined refs |
| `security-auditor` | All domains | OWASP Top 10, injection, secrets, auth bypass |
| `dependency-reviewer` | Backend, full | Imports not in package.json |
| `type-safety-reviewer` | TS code | `any`, unsafe casts, missing return types |
| `sql-reviewer` | Database | Injection, N+1, invented table/column names |
| `frontend-reviewer` | React/Next.js | Hooks violations, missing deps, state mutation |
| `performance-reviewer` | All domains | O(n²), blocking I/O, unnecessary allocations |
| `test-coverage-reviewer` | Test files | Tautology tests, no-assertion specs, over-mocking |

---

## Agent Selection Matrix

| Domain | Auto-Routed Agent | Tribunal |
|---|---|---|
| API / server | `backend-specialist` | `/tribunal-backend` |
| Database / ORM | `database-architect` | `/tribunal-database` |
| React / Next.js | `frontend-specialist` | `/tribunal-frontend` |
| Mobile (RN) | `mobile-developer` | `logic + security` |
| CI/CD / Docker | `devops-engineer` | `logic + security` |
| Debugging | `debugger` | — (investigation mode) |
| Security | `security-auditor` | `/tribunal-full` |
| Performance | `performance-optimizer` | `logic + performance` |
| Multi-domain | `orchestrator` | per sub-agent |
| New codebase | `explorer-agent` | — (read-only) |
| Legacy code | `code-archaeologist` | — (read-only) |
| Planning | `project-planner` | — (no code) |
| Documentation | `documentation-writer` | `logic` |
| Testing | `test-engineer` | `logic + test-coverage` |
| Full automated QA | `qa-automation-engineer` | `logic + test-coverage` |

---

## Slash Command Map

| Command | Purpose | Main Agent | Gate |
|---|---|---|---|
| `/brainstorm` | Ideas before implementation | — | None (no code) |
| `/create` | New app or feature | Multiple | Tribunal + Human |
| `/debug` | Root cause investigation | `debugger` | None |
| `/plan` | Plan file only, no code | `project-planner` | None |
| `/enhance` | Add to existing code | Domain agent | Tribunal + Human |
| `/orchestrate` | Multi-agent coordination | `orchestrator` | Tribunal + Human |
| `/test` | Generate or audit tests | `test-engineer` | `test-coverage` |
| `/deploy` | Production release | `devops-engineer` | 3-gate sequence |
| `/status` | Session dashboard | — | — |
| `/preview` | Local server | — | — |
| `/generate` | Full Tribunal pipeline | Maker | Tribunal + Human |
| `/review` | Audit existing code | Reviewers | Verdicts only |
| `/ui-ux-pro-max` | Advanced UI design | `frontend-specialist` | Tribunal |
| `/tribunal-full` | All 8 reviewers | All reviewers | Human |
| `/tribunal-backend` | Backend audit | 4 reviewers | Human |
| `/tribunal-frontend` | Frontend audit | 4 reviewers | Human |
| `/tribunal-database` | DB audit | 3 reviewers | Human |

---

## Script Integration

Scripts in `.agent/scripts/` can be called by any agent:

```
checklist.py      → python .agent/scripts/checklist.py .
verify_all.py     → python .agent/scripts/verify_all.py
auto_preview.py   → python .agent/scripts/auto_preview.py start
session_manager.py → python .agent/scripts/session_manager.py load
```

---

## File Layout

```
.agent/
│
├── GEMINI.md            ← Compact always-on rule summary for IDEs
├── ARCHITECTURE.md      ← System architecture and path reference
│
├── rules/
│   └── GEMINI.md        ← Full master rules (12KB) — P0 priority
│
├── agents/              ← 27 specialist agents
│   ├── [8 Tribunal reviewers]
│   └── [19 domain specialists]
│
├── workflows/           ← 17 slash command definitions
│
├── scripts/             ← 4 Python utility scripts
│   ├── checklist.py
│   ├── verify_all.py
│   ├── auto_preview.py
│   └── session_manager.py
│
├── skills/              ← 37 skill modules
│
├── .shared/             ← Shared assets (ui-ux-pro-max, etc.)
│
└── mcp_config.json      ← MCP server configuration
```
