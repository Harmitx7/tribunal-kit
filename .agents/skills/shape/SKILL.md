---
name: shape
description: "Use when Plan feature UX before writing code via structured Socratic design interviews. Use when a user asks to plan a new screen, onboarding flow, feature UX, or user interaction before implementation."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - brainstorming
  - plan-writing
  - ui-reasoning-engine
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/checklist.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Shape — Pre-Code UX & Feature Shaping

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The 3-Step Shaping Workflow

### Step 1: High-Ambiguity Socratic Interview

Before designing components, ask 2 targeted questions about high-ambiguity choices:

1. **Primary User Goal**: _What is the single most important action the user must accomplish on this screen?_
2. **Context & Entry Point**: _Where does the user arrive from, and where do they expect to go after completing this step?_

### Step 2: Screen Boundaries & State Inventory

Define the component states before implementation:

- **Default State**: Primary layout with standard populated data.
- **Empty State**: Zero-data view with creation prompt.
- **Loading State**: Skeleton placeholders.
- **Error State**: Graceful fallback UI with retry action.
- **Success State**: Instant feedback toast or confirmation view.

### Step 3: Architecture Contract

Summarize the screen contract in a concise visual outline before coding:

```
[Screen Title]
  ├── Entry Point: (e.g. Dashboard -> "New Project" button)
  ├── Primary Action: (e.g. Create Project Form)
  ├── Secondary Actions: (e.g. Import from GitHub)
  └── Exit Point: (e.g. Redirect to /project/[id])
```
