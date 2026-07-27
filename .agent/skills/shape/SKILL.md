---
name: shape
description: Plan feature UX before writing code via structured Socratic design interviews. Use when a user asks to plan a new screen, onboarding flow, feature UX, or user interaction before implementation.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Pre-Code UX Shaping
  tier: pro
  co-requires: [appflow-wireframe, brainstorming, plan-writing]
  trigger-signals:
    strong: [shape, UX shaping, feature design, pre-code planning, user flow interview, shape workflow]
    weak: [plan UI, spec out feature]
---

# Shape — Pre-Code UX & Feature Shaping

Uncover core requirements, define interaction boundaries, and lock down screen flows BEFORE writing frontend code.

---

## The 3-Step Shaping Workflow

### Step 1: High-Ambiguity Socratic Interview
Before designing components, ask 2 targeted questions about high-ambiguity choices:
1. **Primary User Goal**: *What is the single most important action the user must accomplish on this screen?*
2. **Context & Entry Point**: *Where does the user arrive from, and where do they expect to go after completing this step?*

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

---

## 🤖 LLM-Specific Traps

1. **Jumping straight to code**: Writing CSS/React components without clarifying user goals or entry/exit points.
2. **Over-asking questions**: Asking more than 2-3 questions. Prioritize only blocking architectural ambiguities.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are the entry and exit points of the screen explicitly defined?
✅ Are all 5 screen states (default, empty, loading, error, success) planned?
✅ Has the user confirmed the core interaction boundary before code generation?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
