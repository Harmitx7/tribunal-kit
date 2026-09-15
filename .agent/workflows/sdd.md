---
description: Subagent-Driven Development (SDD) with Tribunal Review Waves. Execute implementation plans task-by-task using out-of-band context isolation, strict TDD, and adaptive Tribunal reviewer waves.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - tdd-workflow
  - agent-organizer
  - codebase-design
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/test_runner.js
  - .agent/scripts/security_scan.js
---

# Subagent-Driven Development (SDD) with Tribunal Review Waves

Execute implementation plans task-by-task using out-of-band context isolation, strict TDD, and adaptive Tribunal reviewer waves.

---

## Mandatory Pre-Flight Context Inspection

Before dispatching SDD subagents or executing implementation plan tasks, you MUST inspect:

1. Approved Implementation Plan (`docs/plans/YYYY-MM-DD-<feature>.md`) → Verify plan exists and is approved
2. SDD Workspace State (`.tribunal/sdd/<plan-slug>/`) → Check for existing progress ledger and completed tasks
3. Required Skills → Before executing, load and follow procedural rules from:
   - `tdd-workflow` (`.agent/skills/tdd-workflow/SKILL.md`): Red-Green-Refactor TDD cycle and test-first development
   - `agent-organizer` (`.agent/skills/agent-organizer/SKILL.md`): Multi-agent coordination and task decomposition
   - `codebase-design` (`.agent/skills/codebase-design/SKILL.md`): Deep module design with small interfaces and clean seams

---

## 1. Setup & Workspace Preparation

1. **Verify Implementation Plan:**
   Ensure an approved plan exists at `docs/plans/YYYY-MM-DD-<feature>.md`.
2. **Ensure Isolated Workspace:**
   Run the native Rust command:
   ```bash
   tk sdd workspace docs/plans/<plan-file>.md
   ```
   This resolves and creates `<repo-root>/.tribunal/sdd/<plan-slug>/` with an auto-generated `.gitignore`.
3. **Initialize Progress Ledger:**
   Check `<workspace>/progress.md`. If resuming, find the first incomplete task.
   Otherwise, initialize:
   ```markdown
   # SDD Ledger — Plan: <plan-file>
   ```

---

## 2. Pre-Flight Conflict Scan

Scan the plan for cross-task interface agreements before dispatching Task 1:

- Tasks that contradict each other or Global Constraints.
- Mismatched method names or parameter types across neighboring tasks.
- Record the scan table and any necessary autonomous rulings in `progress.md`:
  `Ruling: <decision> — <why> — <cost if wrong>`.

---

## 3. The Task Execution Loop (Per Task)

Repeat for each task $N$:

### Step 1: Slice Task Brief Out-of-Band

Run:

```bash
tk sdd brief docs/plans/<plan-file>.md <N>
```

Output: `.tribunal/sdd/<plan-slug>/task-<N>-brief.md`.
**Rule:** Never paste the full plan into the subagent dispatch prompt.

### Step 2: Record Base Commit

```bash
BASE=$(git rev-parse HEAD)
```

### Step 3: Dispatch Implementer Subagent

Fill `.agent/templates/sdd/implementer-prompt.md` with the path to the brief and dispatch:

- Subagent reads brief out-of-band.
- Subagent writes failing test first $\rightarrow$ verifies failure (RED).
- Subagent writes minimal production code $\rightarrow$ verifies pass (GREEN).
- Subagent commits changes.
- Subagent writes full report to `task-<N>-report.md`.
- Subagent returns short summary (`<15 lines`) to Controller.

### Step 4: Generate Out-of-Band Diff Package

```bash
HEAD=$(git rev-parse HEAD)
tk sdd diff docs/plans/<plan-file>.md $BASE $HEAD
```

Output: `.tribunal/sdd/<plan-slug>/review-<base>..<head>.diff`.

### Step 5: Dispatch Tribunal Reviewer Wave

Dispatch reviewer subagent using `.agent/templates/sdd/task-reviewer-prompt.md`:

- Reviewer reads `.diff` file on disk once (context lines are the files).
- Returns **Spec Compliance** (Missing / Extra / Misunderstood) + **Code Quality** (Security, Typing, Resilience).

### Step 6: Fix Loop & Circuit Breaker

- If issues found:
  - Rounds 1–3: Resume existing implementer with findings.
  - Rounds 4–5: Discard implementer, dispatch fresh subagent on higher-tier model.
  - Round 5: Circuit breaker trips $\rightarrow$ Controller adjudicates open findings directly.
- Record any autonomous rulings in `progress.md` and sync with Tribunal Case Law database.

### Step 7: Mark Task Done

Append completion to `progress.md`:

```markdown
- [x] Task <N>: complete (<commit-hash>)
```

Continue to Task $N+1$ without pausing or waiting for human approval between tasks.

---

## 4. Final Gate & Closeout

1. **Whole-Branch Audit:** Run Wave 3 (Domain/Performance) across the complete feature branch diff.
2. **Verification Before Completion:** Execute the fresh test suite; verify exit code 0.
3. **Commit Ledger & Clean Worktree:** Record final status in Case Law repository.
