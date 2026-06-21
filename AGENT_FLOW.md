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
          │  Full:      all 16 reviewers        │
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

## Tribunal Reviewers

| Reviewer                 | Activates for     | Catches                                                         |
| ------------------------ | ----------------- | --------------------------------------------------------------- |
| `logic-reviewer`         | All domains       | Invented stdlib methods, impossible logic, undefined refs       |
| `security-auditor`       | All domains       | OWASP Top 10, injection, secrets, auth bypass                   |
| `dependency-reviewer`    | Backend, full     | Imports not in package.json                                     |
| `type-safety-reviewer`   | TS code           | `any`, unsafe casts, missing return types                       |
| `sql-reviewer`           | Database          | Injection, N+1, invented table/column names                     |
| `frontend-reviewer`      | React/Next.js     | Hooks violations, missing deps, state mutation                  |
| `performance-reviewer`   | All domains       | O(n²), blocking I/O, unnecessary allocations                    |
| `test-coverage-reviewer` | Test files        | Tautology tests, no-assertion specs, over-mocking               |
| `resilience-reviewer`    | Backend, full     | Swallowed errors, naked Promises, missing retries/timeouts      |
| `schema-reviewer`        | Backend, DB, full | Missing Zod/Pydantic validation, `z.any()`, unvalidated inputs  |
| `precedence-reviewer`    | All domains       | Violations of previously rejected patterns (Case Law)           |
| `ai-code-reviewer`       | AI/LLM code       | Hallucinated model names, prompt injection, missing rate limits |
| `accessibility-reviewer` | Frontend          | WCAG violations, missing ARIA, focus management                 |
| `mobile-reviewer`        | Mobile (RN)       | Platform-specific issues, gesture/animation problems            |
| `penetration-tester`     | Security audits   | Attack surface mapping, exploitation paths                      |
| `db-latency-auditor`     | Database          | Slow queries, missing indexes, N+1 patterns                     |

---

## Agent Selection Matrix

| Domain                 | Auto-Routed Agent        | Tribunal                |
| ---------------------- | ------------------------ | ----------------------- |
| API / server           | `backend-specialist`     | `/tribunal-backend`     |
| API design / contracts | `api-architect`          | `/tribunal-backend`     |
| Database / ORM         | `database-architect`     | `/tribunal-database`    |
| React / Next.js        | `frontend-specialist`    | `/tribunal-frontend`    |
| Mobile (RN)            | `mobile-developer`       | `logic + security`      |
| CI/CD / Docker         | `devops-engineer`        | `logic + security`      |
| Debugging              | `debugger`               | — (investigation mode)  |
| Security               | `security-auditor`       | `/tribunal-full`        |
| Fault tolerance        | `resilience-reviewer`    | `/tribunal-backend`     |
| Input validation       | `schema-reviewer`        | `/tribunal-backend`     |
| Performance            | `performance-optimizer`  | `logic + performance`   |
| Multi-domain           | `orchestrator`           | per sub-agent           |
| New codebase           | `explorer-agent`         | — (read-only)           |
| Legacy code            | `code-archaeologist`     | — (read-only)           |
| Planning               | `project-planner`        | — (no code)             |
| Documentation          | `documentation-writer`   | `logic`                 |
| Testing                | `test-engineer`          | `logic + test-coverage` |
| Full automated QA      | `qa-automation-engineer` | `logic + test-coverage` |
| Game development       | `game-developer`         | `logic + security`      |
| Product strategy       | `product-manager`        | — (no code)             |
| User stories / backlog | `product-owner`          | — (no code)             |
| SEO / search           | `seo-specialist`         | `logic`                 |
| Throughput / latency   | `throughput-optimizer`   | `logic + performance`   |
| Core Web Vitals        | `vitals-reviewer`        | `logic + performance`   |
| Pen testing / red team | `penetration-tester`     | `/tribunal-full`        |
| DB performance         | `db-latency-auditor`     | `/tribunal-database`    |
| AI/LLM code            | `ai-code-reviewer`       | `logic + security`      |

---

## Slash Command Map

| Command              | Purpose                     | Main Agent            | Gate             |
| -------------------- | --------------------------- | --------------------- | ---------------- |
| `/brainstorm`        | Ideas before implementation | —                     | None (no code)   |
| `/create`            | New app or feature          | Multiple              | Tribunal + Human |
| `/debug`             | Root cause investigation    | `debugger`            | None             |
| `/plan`              | Plan file only, no code     | `project-planner`     | None             |
| `/enhance`           | Add to existing code        | Domain agent          | Tribunal + Human |
| `/orchestrate`       | Multi-agent coordination    | `orchestrator`        | Tribunal + Human |
| `/test`              | Generate or audit tests     | `test-engineer`       | `test-coverage`  |
| `/deploy`            | Production release          | `devops-engineer`     | 3-gate sequence  |
| `/status`            | Session dashboard           | —                     | —                |
| `/preview`           | Local server                | —                     | —                |
| `/generate`          | Full Tribunal pipeline      | Maker                 | Tribunal + Human |
| `/review`            | Audit existing code         | Reviewers             | Verdicts only    |
| `/ui-ux-pro-max`     | Advanced UI design          | `frontend-specialist` | Tribunal         |
| `/tribunal-full`     | All 16 reviewers            | All reviewers         | Human            |
| `/tribunal-backend`  | Backend audit               | 4 reviewers           | Human            |
| `/tribunal-frontend` | Frontend audit              | 4 reviewers           | Human            |
| `/tribunal-database` | DB audit                    | 3 reviewers           | Human            |

---

## Script Integration

Scripts in `.agent/scripts/` can be called by any agent:

```
checklist.py      → python .agent/scripts/checklist.py .
verify_all.py     → python .agent/scripts/verify_all.py
auto_preview.py   → python .agent/scripts/auto_preview.py start
session_manager.js → node .agent/scripts/session_manager.js load
```

---

## Skill Inheritance Engine (ADK Patterns)

The Tribunal Agent Kit implements 5 core Agent Design Kit (ADK) patterns as "Inheritance Templates."
These exist in `.agent/patterns/` and dictate strict agent behavior protocols.

To upgrade any existing skill or scaffold a new one using these patterns, append the `pattern` key to the skill's YAML frontmatter:

```yaml
---
name: my-skill
pattern: inversion   ← (inversion | reviewer | tool-wrapper | generator | pipeline)
---
```

When activated, the agent automatically pre-loads the restrictive base prompt (e.g. "Do not guess, you must interview the user first" for `inversion`) before running the skill's specific logic.

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
├── agents/              ← 41 specialist agents
│   ├── [16 Tribunal reviewers]
│   └── [24 domain specialists]
│
├── workflows/           ← 31 slash command definitions
│
├── scripts/             ← 25 Python/JS utility scripts
│   ├── checklist.py, verify_all.py, auto_preview.py
│   ├── security_scan.py, lint_runner.py, test_runner.py
│   ├── case_law_manager.js, skill_evolution.js
│   ├── swarm_dispatcher.js, session_manager.js
│   └── ... and 15 more
│
├── patterns/            ← 5 ADK skill base patterns (Inheritance engine)
│   ├── generator.md
│   ├── inversion.md
│   ├── pipeline.md
│   ├── reviewer.md
│   └── tool-wrapper.md
│
├── skills/              ← 91 skill modules (all hardened)
│
├── history/             ← User-generated data (preserved on update)
│   ├── case-law/        ← Rejected pattern precedents
│   └── skill-evolution/ ← Auto-evolved idiom log
│
├── .shared/             ← Shared assets (ui-ux-pro-max, etc.)
│
└── mcp_config.json      ← MCP server configuration
```

---

## Supreme Court Edition — Self-Learning Engine

Tribunal Kit v4.0+ ships two industry-first features that transform the
agent kit from a reactive reviewer into a **persistent engineering authority**.

### 1 — Case Law Engine

Every rejected pattern becomes binding legal precedent.

| Step | What Happens                                                                 |
| :--- | :--------------------------------------------------------------------------- |
| 1    | Developer rejects AI proposal                                                |
| 2    | Runs `case_law_manager.js add-case`                                          |
| 3    | diff + tags + reason stored in `.agent/history/case-law/`                    |
| 4    | `precedence-reviewer` queries index on every future `/generate` or `/review` |
| 5    | Jaccard tag match score >= 0.4 → PRECEDENCE HOLD                             |

### 2 — Skill Evolution Forge

The agent kit writes its own skills by learning from your commits.

| Step | What Happens                                                        |
| :--- | :------------------------------------------------------------------ |
| 1    | Developer commits code different from AI proposal                   |
| 2    | `tribunal-kit learn` (or `skill_evolution.js digest`)               |
| 3    | Semantic Delta Filter strips trivial noise (70-90% token reduction) |
| 4    | Minimal LLM Reflection Prompt (< 500 tokens)                        |
| 5    | YAML idioms merged into `.agent/skills/project-idioms/SKILL.md`     |
| 6    | All agents inherit these idioms on next activation                  |

### CLI Commands (Supreme Court)

| Command                                                              | Action                                |
| :------------------------------------------------------------------- | :------------------------------------ |
| `tribunal-kit learn`                                                 | Run Skill Evolution + Case Law prompt |
| `tribunal-kit learn --dry-run`                                       | Preview delta without writing         |
| `tribunal-kit learn --head`                                          | Diff last commit instead of staged    |
| `node .agent/scripts/case_law_manager.js add-case`                   | Record a rejection                    |
| `node .agent/scripts/case_law_manager.js search-cases --query "..."` | Find precedents                       |
| `node .agent/scripts/skill_evolution.js digest`                      | Run evolution cycle                   |
| `node .agent/scripts/skill_evolution.js status`                      | Token savings report                  |

### Review Order (Updated)

```
1. precedence-reviewer   <- FIRST (Case Law check, zero LLM tokens)
2. logic-reviewer
3. security-auditor
4. domain-specific reviewers
5. Human Gate
```

### New Reviewer

| Reviewer              | Activates for | Catches                                    |
| :-------------------- | :------------ | :----------------------------------------- |
| `precedence-reviewer` | All domains   | Violations of previously rejected patterns |
