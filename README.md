# Tribunal Anti-Hallucination Agent Kit

> Plug-in `.agent/` folder that gives your AI IDE (Cursor, Windsurf, Antigravity) a full
> anti-hallucination system with 30 specialist agents, 25 slash commands, 8 parallel Tribunal reviewers,
> and a Swarm/Supervisor multi-agent orchestration engine.

---

## Quick Install

```bash
npx tribunal-kit init
```

Or install globally and use anywhere:

```bash
npm install -g tribunal-kit
tribunal-kit init
```

This installs the `.agent/` folder containing all agents, workflows, skills, and scripts into your project.

---

> ⚠️ **Important — `.gitignore` Note**
>
> If you use AI-powered editors like Cursor or Windsurf, adding `.agent/` to your `.gitignore`
> may prevent the IDE from indexing the workflows. Slash commands like `/generate` or `/review`
> won't appear in the chat suggestion dropdown.
>
> **Recommended:** Keep `.agent/` out of `.gitignore`. If you want it local-only:
> ```
> # Add this to .git/info/exclude (not .gitignore)
> .agent/
> ```

---

## What's Included

| Component | Count | Description |
|---|---|---|
| Agents | 32 | Specialist AI personas including Supervisor, Worker Registry, and Contract schemas |
| Workflows | 25 | Slash command procedures including `/swarm` |
| Skills | 44 | Domain-specific knowledge modules |
| Scripts | 13 | Python utility scripts (checklist, verify, preview, session, swarm dispatcher, etc.) |

---

## How It Works

### Auto-Agent Routing

No need to mention agents explicitly. The system automatically detects the right specialist:

```
You: "Add JWT authentication"
AI:  🤖 Applying @security-auditor + @backend-specialist...

You: "Fix the dark mode button"
AI:  🤖 Applying @frontend-specialist...

You: "Login returns 500 error"
AI:  🤖 Applying @debugger for systematic analysis...

You: "/swarm build a REST API, PostgreSQL schema, and documentation"
AI:  🤖 supervisor-agent → dispatching 3 Workers in parallel...
```

### The Tribunal Pipeline

Every generated code goes through parallel reviewers before you see it:

```
You type /generate →
  Maker generates at low temperature →
  Reviewers audit in parallel (logic, security, types, ...) →
  Human Gate: you approve the diff before it writes to disk
```

---

## Slash Commands

| Command | Description |
|---|---|
| `/generate` | Full Tribunal pipeline: generate → review → approve |
| `/review` | Audit existing code — no generation |
| `/tribunal-full` | All 8 reviewers simultaneously |
| `/tribunal-backend` | Logic + Security + Dependency + Types |
| `/tribunal-frontend` | Logic + Security + Frontend + Types |
| `/tribunal-database` | Logic + Security + SQL |
| `/tribunal-mobile` | Logic + Security + Mobile — React Native, Flutter, responsive web |
| `/tribunal-performance` | Logic + Performance — optimization and bottleneck analysis |
| `/brainstorm` | Explore options before implementation |
| `/create` | Build new features or apps |
| `/debug` | Systematic root-cause investigation |
| `/plan` | Create structured plan file only |
| `/enhance` | Improve existing code safely |
| `/orchestrate` | Multi-agent coordination |
| `/swarm` | Supervisor decomposes multi-domain goals → parallel specialist Workers → unified output |
| `/test` | Generate or audit tests |
| `/deploy` | 3-gate production deployment |
| `/preview` | Local dev server control |
| `/status` | Tribunal session dashboard |
| `/ui-ux-pro-max` | Advanced UI/UX design workflow |

---

## CLI Reference

```bash
tribunal-kit init                        # Install into current directory
tribunal-kit init --force                # Overwrite existing .agent/ folder
tribunal-kit init --path ./my-app        # Install in specific directory
tribunal-kit init --quiet                # Suppress output (for CI/CD)
tribunal-kit init --dry-run              # Preview without writing files
tribunal-kit update                      # Re-install to get latest version
tribunal-kit status                      # Check installation status
```

---

## Utility Scripts (after install)

```bash
python .agent/scripts/checklist.py .         # Pre-commit audit
python .agent/scripts/verify_all.py          # Pre-deploy full suite
python .agent/scripts/auto_preview.py start  # Start dev server
python .agent/scripts/session_manager.py save "note"  # Save session
```

---

## Compatible IDEs

| IDE | Support |
|---|---|
| Cursor | ✅ Reads `.agent/` automatically |
| Windsurf | ✅ Reads `.agent/` automatically |
| Antigravity | ✅ Native `.agent/` support |
| GitHub Copilot (Agent Mode) | ✅ Copy `GEMINI.md` → `.github/copilot-instructions.md` |
