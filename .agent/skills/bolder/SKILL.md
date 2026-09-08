---
name: bolder
description: Increase visual impact, punch, and personality for generic or bland interfaces. Use when the user asks to make the UI pop, stand out, have more character, or feel less template-like.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - better-colors
  - better-ui
  - impeccable
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Bolder — Injecting Punch & Personality into UI

---

## Mandatory Pre-Flight Context Inspection

Before applying bold visual transformations, you MUST inspect:

1. `DESIGN.md` / `package.json` → Check existing brand color variables and design tokens
2. Typographic Contrast Scaling rules (Section 24) → Enforce extreme scale jumps (`1.5rem` to `4.5rem`) for display headings
3. Single Electric Accent System (Section 28) → Use one high-chroma accent color sparingly for primary CTAs and badges

Transform generic, boring template UIs into high-impact, distinctive interfaces with strong visual presence.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Increase visual impact, punch, and personality for generic or bland interfaces. Use when the user asks to make the UI pop, stand out, have more character, or feel less template-like..
- **DO NOT activate when:** The task falls strictly outside bolder domain or belongs to a different dedicated specialist.

---

## 5 Tactics for Bold UI Transformation

### 1. Typographic Contrast Scaling

- **Extreme Scale Jump**: Increase heading size contrast. Jump from `1.5rem` to `3.5rem` or `4.5rem` display type for key value propositions.
- **Font Weight Hierarchy**: Pair ultra-heavy display headings (`font-weight: 800` / `900`) with clean, lightweight body type (`font-weight: 400`).

### 2. High-Contrast Accent System

- **Single Electric Accent**: Introduce one bold, unexpected accent color (e.g. electric lime `oklch(0.85 0.25 130)`, safety orange `oklch(0.68 0.22 40)`, or deep cobalt `oklch(0.45 0.28 260)`).
- **Asymmetric Color Application**: Use the accent color sparingly on primary CTA buttons, hero badges, or interactive active indicators—never on body text.

### 3. Oversized Spatial Framing & Borders

- **Crisp Structural Outlines**: Replace faint gray borders with thick 2px solid structural borders (`border: 2px solid var(--foreground)`).
- **Hard Drop Shadows**: Use sharp, solid offset shadows (`box-shadow: 4px 4px 0px var(--foreground)`) for brutalist or neo-brutalist energy.

### 4. Hero Section Asymmetry

- **Break Symmetrical Grids**: Shift text alignment left, place a huge badge or key visual off-axis, or overlap card containers across background sections.

### 5. Tactile Micro-Interactions

- **Snappy Press Springs**: Give buttons a satisfying 3D press effect on active (`transform: translate(2px, 2px); box-shadow: 2px 2px 0px var(--foreground)`).

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
