<div align="center">

# 🏛️ Tribunal Anti-Hallucination Agent Kit

**The ultimate guardrail system for AI IDEs (Cursor, Windsurf, Antigravity)**

[![npm version](https://img.shields.io/npm/v/tribunal-kit.svg?style=flat-square)](https://www.npmjs.com/package/tribunal-kit)
[![license](https://img.shields.io/npm/l/tribunal-kit.svg?style=flat-square)](https://github.com/your-repo/tribunal-kit/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A plug-in `.agent/` folder that upgrades your AI with **32 specialist agents**, **25 slash commands**, **8 parallel Tribunal reviewers**, and a powerful **Swarm/Supervisor** multi-agent orchestration engine.

</div>

---

## ⚡ Quick Install

Get started in seconds:

```bash
npx tribunal-kit init
```

Or install globally to use on any project:

```bash
npm install -g tribunal-kit
tribunal-kit init
```

> **Note:** This installs the `.agent/` folder containing all agents, workflows, skills, and scripts directly into your project.

---

## ⚠️ Important: `.gitignore` Notice

If you use AI-powered editors like **Cursor** or **Windsurf**, adding `.agent/` to your `.gitignore` may prevent the IDE from indexing the workflows. Slash commands like `/generate` or `/review` won't appear in your chat suggestion dropdown.

💡 **Recommended:** Keep `.agent/` out of `.gitignore`. 
If you want it to remain local-only, add it to your repo's exclude file instead:
```bash
# Add this to .git/info/exclude (not .gitignore)
.agent/
```

---

## 📦 What's Included

| Component | Count | Description |
|---|:---:|---|
| 🤖 **Agents** | **32** | Specialist AI personas including Supervisor, Worker Registry, and Contract schemas |
| 🔄 **Workflows**| **25** | Slash command procedures including `/swarm` orchestration |
| 🧠 **Skills** | **44** | Domain-specific knowledge modules for targeted expertise |
| 🛠️ **Scripts** | **13** | Python utility scripts (checklist, verify, preview, session, swarm dispatcher, etc.) |

---

## ⚙️ How It Works

### 🎯 Auto-Agent Routing
No need to mention agents explicitly. The system automatically detects and summons the right specialist for the job:

> **You:** "Add JWT authentication" <br>
> **AI:** `🤖 Applying @security-auditor + @backend-specialist...`
>
> **You:** "Fix the dark mode button" <br>
> **AI:** `🤖 Applying @frontend-specialist...`
>
> **You:** "Login returns 500 error" <br>
> **AI:** `🤖 Applying @debugger for systematic analysis...`
>
> **You:** "/swarm build a REST API, PostgreSQL schema, and documentation" <br>
> **AI:** `🤖 supervisor-agent → dispatching 3 Workers in parallel...`

### ⚖️ The Tribunal Pipeline
Every piece of generated code goes through rigorous, parallel reviewers before you even see it:

```
You type /generate →
  Maker generates at low temperature →
  Reviewers audit in parallel (logic, security, types, ...) →
  Human Gate: you approve the diff before it writes to disk
```

---

## ⌨️ Slash Commands

Supercharge your workflow with these built-in commands:

<details open>
<summary><b>🛠️ Core Execution</b></summary>
<br>

| Command | Description |
|---|---|
| `/generate` | Full Tribunal pipeline: generate → review → approve |
| `/create` | Build new features or apps from scratch |
| `/enhance` | Improve existing code safely without breaking it |
| `/deploy` | 3-gate production deployment process |

</details>

<details open>
<summary><b>⚖️ Review & Audit</b></summary>
<br>

| Command | Description |
|---|---|
| `/review` | Audit existing code — no generation |
| `/test` | Generate or audit tests |
| `/tribunal-full` | Run all 8 reviewers simultaneously |
| `/tribunal-backend` | Logic + Security + Dependency + Types |
| `/tribunal-frontend` | Logic + Security + Frontend + Types |
| `/tribunal-database`| Logic + Security + SQL |
| `/tribunal-mobile` | Logic + Security + Mobile (React Native, Flutter, Web) |
| `/tribunal-performance`| Logic + Performance (Optimization & bottlenecks) |

</details>

<details open>
<summary><b>🧠 Planning & Orchestration</b></summary>
<br>

| Command | Description |
|---|---|
| `/brainstorm` | Explore options before implementation |
| `/plan` | Create a structured architectural plan file only |
| `/orchestrate` | Multi-agent coordination for complex tasks |
| `/swarm` | Supervisor decomposes multi-domain goals → parallel Workers → unified output |
| `/ui-ux-pro-max` | Advanced UI/UX design workflow |

</details>

<details open>
<summary><b>🔧 Troubleshooting & Ops</b></summary>
<br>

| Command | Description |
|---|---|
| `/debug` | Systematic root-cause investigation |
| `/preview` | Local dev server control |
| `/status` | Tribunal session dashboard |

</details>

---

## 💻 CLI Reference

Manage your installation directly from the terminal:

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

## 🧰 Utility Scripts *(Post-install)*

```bash
python .agent/scripts/checklist.py .                  # 📋 Pre-commit audit
python .agent/scripts/verify_all.py                   # 🚀 Pre-deploy full suite
python .agent/scripts/auto_preview.py start           # 🌍 Start dev server
python .agent/scripts/session_manager.py save "note"  # 💾 Save session state
```

---

## 🤝 Compatible IDEs

| IDE | Support Level |
|---|---|
| **Cursor** | ✅ Reads `.agent/` automatically |
| **Windsurf** | ✅ Reads `.agent/` automatically |
| **Antigravity** | ✅ Native `.agent/` support |
| **GitHub Copilot** | ✅ Manual setup: Copy `GEMINI.md` to `.github/copilot-instructions.md` |

<br>

<div align="center">
  <sub>Built with ❤️ for safer, hallucination-free AI coding.</sub>
</div>
