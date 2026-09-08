---
name: redesign-skill
description: Audit and upgrade existing interfaces to premium visual quality while preserving product functionality and business logic.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - taste-skill
  - better-ui
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Redesign Skill — UI Upgrade Methodology

---

## Mandatory Pre-Flight Context Inspection

Before executing interface redesigns, you MUST inspect:

1. Logic Isolation Rule (Section 24) → Extract and preserve ALL state hooks (`useState`), event handlers (`onClick`), and API props before altering layout
2. Surface Hierarchy (Section 32) → Upgrade raw hex backgrounds to OKLCH surface levels (`--bg-base`, `--bg-surface`, `--bg-elevated`)
3. Spatial Grid (Section 28) → Standardize spacing to an 8px system (`gap-4`, `p-6`) with `text-wrap: balance` on headings

Audit legacy or unstyled user interfaces and transform them into modern, production-grade products without breaking underlying business logic.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Audit and upgrade existing interfaces to premium visual quality while preserving product functionality and business logic..
- **DO NOT activate when:** The task falls strictly outside redesign-skill domain or belongs to a different dedicated specialist.

---

## 4 Redesign Upgrade Steps

### Step 1: Logic & State Isolation

Before touching CSS or HTML layout:

- Extract all state hooks (`useState`), event handlers (`onClick`), and API props. **Zero business logic may be deleted or altered.**

### Step 2: Spatial & Typographic Grid Overhaul

- Replace arbitrary pixel margins with an 8px spatial system (`gap-4`, `p-6`).
- Apply modular font scaling (`text-sm`, `text-base`, `text-2xl`, `text-4xl`) with `text-wrap: balance` on headings.

### Step 3: Color & Surface Elevation Upgrade

- Replace raw `#fff` / `#000` colors with an OKLCH surface hierarchy (`--bg-base`, `--bg-surface`, `--bg-elevated`).
- Replace hard black borders with subtle 8% opacity surface borders and multi-layered ambient shadows.

### Step 4: Micro-Interaction & Polish Pass

- Add `:active` scale press feedback (`scale(0.97)`), smooth hover state transitions, and keyboard focus rings (`:focus-visible`).

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
