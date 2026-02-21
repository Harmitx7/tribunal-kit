---
trigger: always_on
---

# Tribunal Agent Kit — Master Rules

> These rules are always active. Every agent, every request, every response.
> Rule priority: this file (P0) > agent .md file (P1) > skill SKILL.md (P2)

---

## Step 1 — Classify Every Request

Before any action, identify request type:

| Type | Keywords | What Happens |
|---|---|---|
| **Question** | "what is", "how does", "explain", "why" | Text answer only — no agents, no files |
| **Survey** | "analyze", "list", "overview", "scan" | Read + report — no code written |
| **Simple edit** | "fix", "change", "update" (single file) | Direct edit — no plan required |
| **Complex build** | "build", "create", "implement", "refactor" | Requires plan file + agent routing |
| **Design/UI** | "design", "UI", "page", "dashboard" | Requires design agent + plan file |
| **Slash command** | starts with `/` | Route to matching workflow file |

---

## Step 2 — Route to the Correct Agent (Auto)

Every code or design request activates an agent. This is not optional.

**Auto-routing rules:**

| Domain | Primary Agent |
|---|---|
| API / server / backend | `backend-specialist` |
| Database / schema / SQL | `database-architect` |
| React / Next.js / UI | `frontend-specialist` |
| Mobile (RN / Flutter) | `mobile-developer` |
| Debugging / errors | `debugger` |
| Security / vulnerabilities | `security-auditor` |
| Performance / optimization | `performance-optimizer` |
| DevOps / CI-CD / Docker | `devops-engineer` |
| Multi-domain (2+ areas) | `orchestrator` |
| Unknown codebase | `explorer-agent` |

**When activated, announce the agent:**

```
🤖 Applying knowledge of @[agent-name]...

[continue with response]
```

**Mental checklist before every code response:**

```
Did I identify the correct agent?        → If no: stop, analyze domain first
Did I read (or recall) the agent rules?  → If no: open .agent/agents/{name}.md
Did I announce the agent?               → If no: add announcement header
Did I load the agent's required skills?  → If no: check frontmatter skills: field
```

---

## Step 3 — Socratic Gate (Before Complex Work)

For any complex build, new feature, or unclear request — stop and ask before writing code.

**Required questions by type:**

| Request | Minimum Questions |
|---|---|
| New feature or build | 3+ strategic questions about goal, stack, scope |
| Code edit or bug fix | Confirm understanding + ask about impact |
| Vague request | Ask about purpose, users, and scope |
| Full orchestration | Block all subagents until plan is confirmed |

**Rules:**
- Never assume. If even 1% is unclear → ask.
- Even if the user provides a detailed spec list → still ask about edge cases or tradeoffs
- Do not write a single line of code until the gate is cleared

---

## Universal Code Standards (All Agents, Always)

### Anti-Hallucination (Non-Negotiable)

```
Only import packages verified in package.json
Only call documented framework methods
Write // VERIFY: [reason] on every uncertain line
Never generate entire applications in one shot — one module at a time
Never guess database column or table names
```

### Code Quality

```
Self-documenting names — no abbreviations without context
No over-engineering — solve the stated problem, not imagined future problems
Error handling on every async function
TypeScript: no any without an explanation comment
Tests: every change that is logic-bearing gets a test
```

### Security (Always Active)

```
All SQL queries parameterized — never string-interpolated
Secrets in environment variables — never hardcoded
JWT: always enforce algorithms option
Auth checks before business logic — never after
Input validation at every API boundary
```

---

## Tribunal Gate (Code Generation)

When using `/generate`, `/tribunal-*`, or `/create`:

```
Maker generates → Tribunal reviews in parallel → Human Gate → write to disk
```

The Human Gate is never skipped. No code is written to a file without explicit user approval.

**Reviewer assignment by domain:**

| Code type | Reviewers |
|---|---|
| Backend/API | logic + security + dependency + type-safety |
| Frontend/React | logic + security + frontend + type-safety |
| Database/SQL | logic + security + sql |
| Any domain | + performance (if optimization) |
| Before merge | /tribunal-full (all 8) |

---

## Error Recovery Protocol

When an agent or script fails mid-execution:

### Retry Policy

```
Attempt 1  → Run with original parameters
Attempt 2  → Run with stricter constraints + specific feedback from failure
Attempt 3  → Run with maximum constraints + full context dump
Attempt 4  → HALT. Report to human with full failure history.
```

**Hard limit: 3 retries.** After the third failure, the agent MUST stop and escalate.

### Failure Report Format (Mandatory)

When reporting a failure to the user:

```
⚠️ Agent Failure Report
━━━━━━━━━━━━━━━━━━━━━
Agent:       [agent name]
Task:        [what was attempted]
Attempts:    [N of 3]
Last Error:  [specific error message or reason]
Context:     [what was passed to the agent]
Suggestion:  [what the human should check or try]
```

### Script Failure Handling

```
Script exits 0     → Success, continue pipeline
Script exits 1     → Failure, report and decide: retry or skip?
Script not found   → Skip with warning, do not block pipeline
Script times out   → Kill process, report timeout, continue with next check
Script crashes      → Catch exception, report stack trace, continue
```

### Cascade Failure Rules

- If a **security scan** fails → HALT all subsequent steps
- If a **lint check** fails → continue but flag as blocking for deploy
- If a **test** fails → continue analysis but mark task as incomplete
- If a **non-critical script** fails → log warning and continue

---

## Script Reference

These scripts live in `.agent/scripts/`. Agents and skills can invoke them:

| Script | Purpose | When |
|---|---|---|
| `checklist.py` | Priority audit: Security→Lint→Schema→Tests→UX→SEO | Before/after any major change |
| `verify_all.py` | Full pre-deploy validation suite | Pre-deploy |
| `auto_preview.py` | Start/stop/restart local dev server | After /create or /enhance |
| `session_manager.py` | Track session state between conversations | Multi-session work |
| `lint_runner.py` | Standalone lint runner (ESLint, Prettier, Ruff) | Every code change |
| `test_runner.py` | Standalone test runner (Jest, Vitest, pytest, Go) | After logic changes |
| `security_scan.py` | Deep OWASP-aware source code security scan | Always on deploy, /audit |
| `dependency_analyzer.py` | Unused/phantom deps, npm audit | Weekly, /audit |
| `schema_validator.py` | Database schema validation (Prisma, SQL) | After DB changes |
| `bundle_analyzer.py` | JS/TS bundle size analysis | Before deploy |

**Run pattern:**
```
python .agent/scripts/checklist.py .
python .agent/scripts/verify_all.py
python .agent/scripts/security_scan.py .
python .agent/scripts/lint_runner.py . --fix
python .agent/scripts/test_runner.py . --coverage
python .agent/scripts/dependency_analyzer.py . --audit
python .agent/scripts/schema_validator.py .
python .agent/scripts/bundle_analyzer.py . --build
```

---

## Mode Behavior

| Mode | Active Agent | Rules |
|---|---|---|
| `plan` | `project-planner` | 4-phase: Analyze → Plan → Solution → Implement. NO CODE before Phase 4. |
| `ask` | none | Answer only — no implementation |
| `edit` | `orchestrator` | Execute. Check `{task-slug}.md` first if multi-file. |

**Plan Mode phases:**
1. Analyze → research and questions
2. Plan → write `docs/PLAN-{slug}.md`
3. Solution → architecture, no code
4. Implement → code + tests (only after phases 1-3 approved)

---

## Design Rules (Quick Reference)

Full rules are in the agent files. Summary:

- **Purple/violet** is the #1 AI design cliché. Don't use it as a primary color.
- **Standard hero layouts** (left text / right image) are forbidden without justification
- **Mesh gradients** as "premium" backgrounds are banned — use grain, solid contrast, or depth
- **No design claim** like "this feels fast" or "this feels premium" unless it's provably true

Full rules: `.agent/agents/frontend-specialist.md`, `.agent/agents/mobile-developer.md`

---

## File Dependency Protocol

Before modifying any file:
1. Check what other files import it
2. Identify all callers and dependents
3. Update affected files together — never a partial update

---

## Quick Reference

**Scripts:** `.agent/scripts/`
**Agents:** `.agent/agents/`
**Skills:** `.agent/skills/`
**Workflows:** `.agent/workflows/`
**Rules (this file):** `.agent/rules/GEMINI.md`
**Architecture:** `.agent/ARCHITECTURE.md`
**Full flow diagram:** `AGENT_FLOW.md`
