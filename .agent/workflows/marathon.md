---
description: Long-running agent harness for multi-session projects. Decomposes specs into atomic features tracked in JSON, ensures clean handoffs between sessions, and provides structured progress tracking. Based on Anthropic's long-running agent patterns.
required-skills: harness-protocol, agent-organizer
---

# /marathon — Long-Running Agent Harness

$ARGUMENTS

---

## $CONTEXT_REQUIRED

```
Read BEFORE marathon start/continue:
□ progress.json               → See current marathon state
□ feature_list.json           → View remaining tasks
□ git log --oneline -5        → Check recent commits
```

---

## When to Use /marathon

| Use `/marathon` when...                                            | Use something else when...            |
| :----------------------------------------------------------------- | :------------------------------------ |
| A project requires multiple sessions to complete                   | Quick one-shot task → `/generate`     |
| You need structured progress tracking across context windows       | Single feature addition → `/enhance`  |
| Building a complex app from a high-level spec                      | Planning without execution → `/plan`  |
| Previous agent sessions lost context or declared victory too early | Brainstorming options → `/brainstorm` |

---

## Sub-Commands

```
/marathon init [spec]       Start a new marathon from a specification
/marathon continue          Resume work: read progress, pick next feature, implement
/marathon status            Show progress dashboard
/marathon reset             Archive current marathon and start fresh
```

---

## Phase 1: Initialize (First Session Only)

**Trigger:** `/marathon init "Build X"`

This phase runs the **Initializer Agent** pattern — a specialized first session that sets up the foundation for all future sessions.

### Steps

1. **Parse the specification** — Read the user's spec carefully
2. **Decompose into atomic features** — Generate 30–200 features depending on project complexity
   - Each feature must be **independently testable**
   - Each must have clear **done criteria** (verification steps)
   - Group by category: `core`, `auth`, `ui`, `data`, `integration`, `polish`
   - All features start with `passes: false`
3. **Create the marathon state:**
   ```bash
   node .agent/scripts/marathon_harness.js init "Build X"
   # Then add features one by one:
   node .agent/scripts/marathon_harness.js add-feature "core" "User can open a new chat" "Navigate to main page" "Click New Chat" "Verify welcome state"
   node .agent/scripts/marathon_harness.js add-feature "core" "User can type and send a message" "Open chat" "Type in input" "Press Enter" "See message appear"
   # ... repeat for all features
   ```
4. **Scaffold the project** — Create initial files, install dependencies
5. **Create init.sh** — Write a bootstrap script that starts the dev environment
6. **Initial git commit:** `git commit -m "marathon: initial scaffold for [spec]"`
7. **Human Gate:** User reviews the feature list before proceeding

### Feature JSON Format

Features are stored in `.agent/history/marathon/feature_list.json` as structured JSON. JSON is used instead of Markdown because agents are less likely to inappropriately modify JSON structures.

```json
{
  "id": 1,
  "category": "core",
  "description": "User can open a new chat and see a welcome screen",
  "steps": ["Navigate to main page", "Click 'New Chat' button", "Verify welcome state renders"],
  "passes": false,
  "sessionCompleted": null
}
```

> [!CAUTION]
> **Feature descriptions are immutable.** After initialization, agents may ONLY change the `passes` field and `sessionCompleted` timestamp. It is unacceptable to remove, edit, or reorder features — this could lead to missing or buggy functionality.

---

## Phase 2: Get Bearings (Every Session Start)

**Trigger:** `/marathon continue`

Every new session starts by orienting the agent. This is the **Coding Agent** pattern — understanding state before making changes.

### Steps

1. **Read marathon state:**

   ```bash
   node .agent/scripts/marathon_harness.js session-start
   ```

   This automatically:
   - Reads `progress.json` and shows what was done in previous sessions
   - Reads `git log --oneline -20` for recent commits
   - Shows the next unfinished feature
   - Records the session start time

2. **Start the dev environment:**

   ```bash
   node .agent/scripts/auto_preview.js start
   ```

3. **Smoke test basic functionality:**
   - If a web app: navigate to the main page, verify it loads without errors
   - If a CLI tool: run the help command, verify it outputs correctly
   - If an API: hit the health check endpoint
   - If browser MCP tools are available (Puppeteer), use them for visual verification

4. **If smoke test fails:** Fix the broken state FIRST before implementing new features. The codebase must be clean before new work begins.

5. **Announce bearings:**
   ```
   Session N. Progress: 12/47 features (25%).
   Working on: Feature #13 [ui] — "User can toggle dark mode"
   ```

---

## Phase 3: Implement (One Feature Per Cycle)

Work on exactly **one feature at a time**. This incremental approach prevents the common failure mode of trying to do too much at once.

### Steps

1. **Impact analysis** — Identify files that will be affected (per `/enhance` workflow)
2. **Implement the feature** — Write code, following Tribunal code quality standards
3. **Self-verify the feature:**
   - Run the verification steps listed in the feature's `steps` array
   - Test as a human user would (browser for web, CLI for CLI)
   - Run existing tests to ensure no regressions: `npm test` or equivalent
4. **Mark as passing:**
   ```bash
   node .agent/scripts/marathon_harness.js mark <id> pass
   ```
5. **Git commit** with a descriptive message:
   ```bash
   git commit -m "marathon: implement feature #13 — dark mode toggle"
   ```
6. **Check context budget:**
   - If context allows → return to Phase 2, step 5 (pick next feature)
   - If nearing context limit → proceed to Phase 4

### If a feature cannot be completed

If a feature is blocked or too complex for the current session:

1. Leave it as `passes: false`
2. Add a log note explaining why:
   ```bash
   node .agent/scripts/marathon_harness.js log "Feature #13 blocked: requires OAuth integration not yet set up"
   ```
3. Move to the next feature or proceed to Phase 4

---

## Phase 4: Clean Exit (Session End)

Every session MUST leave the codebase in a clean, merge-ready state.

### Steps

1. **Verify clean state:**
   - All code compiles without errors
   - All existing tests pass
   - No half-implemented features left in an intermediate state
   - If something is half-done, either complete it or revert it

2. **Record session end:**

   ```bash
   node .agent/scripts/marathon_harness.js session-end "Implemented dark mode, user settings page, and notification bell"
   ```

3. **Final git commit:**

   ```bash
   git commit -m "marathon: session N complete, 15/47 features passing"
   ```

4. **Display status dashboard** — The session-end command automatically shows progress

---

## Marathon Guards

```
❌ Never delete or edit feature descriptions — only change the passes status
❌ Never skip the smoke test at session start — broken code must be fixed first
❌ Never mark a feature as passing without testing it end-to-end
❌ Never work on more than one feature at a time
❌ Never leave the codebase in a broken state at session end
❌ Never declare the project "done" if any feature has passes: false
❌ Never try to one-shot the entire project — always work incrementally
❌ Never guess what happened in previous sessions — read progress.json and git log
```

---

## State Files

All marathon state is stored in `.agent/history/marathon/` (preserved on `tk update`):

```
.agent/history/marathon/
├── feature_list.json    ← Structured feature backlog (immutable descriptions)
├── progress.json        ← Session log + progress notes
└── archive/             ← Previous marathons (after reset)
```

---

## Script Reference

```bash
# Initialize
node .agent/scripts/marathon_harness.js init "Build a task management app"

# Add features (during init phase)
node .agent/scripts/marathon_harness.js add-feature "core" "User can create a task" "Click add" "Type title" "Save"

# Session lifecycle
node .agent/scripts/marathon_harness.js session-start
node .agent/scripts/marathon_harness.js session-end "Completed auth and dashboard"

# During implementation
node .agent/scripts/marathon_harness.js next
node .agent/scripts/marathon_harness.js mark 5 pass
node .agent/scripts/marathon_harness.js log "Refactored auth to use JWT"

# Status
node .agent/scripts/marathon_harness.js status

# Archive and restart
node .agent/scripts/marathon_harness.js reset
```

---

## Usage Examples

```
/marathon init Build a full-stack clone of claude.ai with chat, settings, and themes
/marathon continue
/marathon status
/marathon reset
```

---

## After /marathon — Next Steps

| Outcome                   | Next Command                          |
| :------------------------ | :------------------------------------ |
| Session completes         | → `/marathon continue` (next session) |
| Feature done, needs audit | → `/audit` for project health         |
| Marathon fully completed  | → `/deploy` to ship                   |

---
