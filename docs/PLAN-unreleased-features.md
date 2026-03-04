# Plan: Unreleased Changelog Features

## What Done Looks Like
Three independent feature areas are shipped and wired into the existing `.agent/` system: (A) `/tribunal-mobile` and `/tribunal-performance` slash commands that activate their specific reviewer agents; (B) `session_manager.py` gains 4 new interactive commands (`status`, `tag`, `list`, `export`) with an updated `/session` workflow doc; (C) `skill_integrator.py` gains `--report` (markdown output) and `--verify` (validate mapped scripts are runnable) flags.

---

## Won't Include in This Version
- A GUI or web dashboard for session state
- Live code execution inside skill scripts
- Integration tests that require external API calls
- Changes to any existing Tribunal reviewer agent `.md` files (they already exist and work)

---

## Unresolved Questions
- `[VERIFY]` Should session `export` output to stdout or write to a `session_export.md` file? (Defaulting to file with stdout option via `--stdout` flag)
- `[VERIFY]` Should `/tribunal-mobile` also include the accessibility-reviewer (overlapping WCAG concerns)? (Defaulting to: no — keep panels focused)

---

## Estimates

| Phase | Optimistic | Realistic | Pessimistic | Confidence |
|---|---|---|---|---|
| A1+A2: Tribunal workflow files | 30 min | 45 min | 1 hr | High |
| A3+A4+A5: Update GEMINI/ARCH/README | 20 min | 30 min | 45 min | High |
| B1: Extend session_manager.py | 45 min | 1 hr | 2 hr | High |
| B2: Update session.md workflow | 15 min | 20 min | 30 min | High |
| C1+C2: Extend skill_integrator.py | 45 min | 1 hr | 1.5 hr | High |
| C3: Update ARCHITECTURE.md | 10 min | 15 min | 20 min | High |
| **Total** | **2.75 hr** | **3.75 hr** | **6 hr** | High |

---

## Task Table

| # | Task | Agent | Depends on | Done when |
|---|---|---|---|---|
| A1 | Create `workflows/tribunal-mobile.md` | `agent-organizer` | none | File exists, activates mobile-reviewer + logic + security |
| A2 | Create `workflows/tribunal-performance.md` | `agent-organizer` | none | File exists, activates performance-reviewer + logic |
| A3 | Update `GEMINI.md` — add `/tribunal-mobile` and `/tribunal-performance` to slash command table | `documentation-writer` | A1, A2 | Both rows appear in the table |
| A4 | Update `ARCHITECTURE.md` — add both to Slash Commands table | `documentation-writer` | A1, A2 | Both rows appear |
| A5 | Update `README.md` | `documentation-writer` | A1, A2 | Both rows appear in slash commands section |
| B1 | Extend `session_manager.py` with `status`, `tag`, `list`, `export` commands | `backend-specialist` | none | All 4 commands work via CLI; `status` prints last 3 sessions; `tag` adds a label to current session; `list` paginates all history; `export` writes `session_export.md` |
| B2 | Update `workflows/session.md` with new command docs | `documentation-writer` | B1 | Workflow file documents all 8 commands with examples |
| C1 | Extend `skill_integrator.py` with `--report` flag (writes `skill-integration-report.md`) | `backend-specialist` | none | Flag works; report file contains skill name, script path, script existence status |
| C2 | Extend `skill_integrator.py` with `--verify` flag (checks scripts are importable via `py_compile`) | `backend-specialist` | C1 | Flag validates each mapped script; reports pass/fail per skill; exits 1 if any fail |
| C3 | Update `ARCHITECTURE.md` script inventory for `skill_integrator.py` | `documentation-writer` | C1, C2 | Updated usage example shows `--report` and `--verify` flags |

---

## Review Gates

| Task | Tribunal |
|---|---|
| B1 `session_manager.py` extension | `/tribunal-backend` (logic + security) |
| C1+C2 `skill_integrator.py` extension | `/tribunal-backend` (logic + security) |
| A1+A2 workflow files | `/review` |

---

## Verification Plan

### Automated Tests

**Feature B — `session_manager.py` new commands:**
```bash
# From project root
python .agent/scripts/session_manager.py save "test session"
python .agent/scripts/session_manager.py status
python .agent/scripts/session_manager.py tag "my-tag"
python .agent/scripts/session_manager.py list
python .agent/scripts/session_manager.py export
# Verify session_export.md was created:
python -c "from pathlib import Path; assert Path('session_export.md').exists(), 'Export file missing'"
```

**Feature C — `skill_integrator.py` new flags:**
```bash
python .agent/scripts/skill_integrator.py --report
# Verify skill-integration-report.md created:
python -c "from pathlib import Path; assert Path('skill-integration-report.md').exists(), 'Report file missing'"

python .agent/scripts/skill_integrator.py --verify
# Must exit 0 (all mapped scripts pass syntax check)
```

**Syntax checks:**
```bash
python -m py_compile .agent/scripts/session_manager.py; if ($?) { Write-Output "OK" }
python -m py_compile .agent/scripts/skill_integrator.py; if ($?) { Write-Output "OK" }
```

### Manual Verification

1. Open your AI IDE (Cursor/Windsurf/Antigravity)
2. Type `/tribunal-mobile` — verify the workflow appears in suggestions
3. Type `/tribunal-performance` — verify the workflow appears in suggestions
4. Type `/session status` — verify the agent runs `session_manager.py status`
5. Type `/session list` — verify history is shown
