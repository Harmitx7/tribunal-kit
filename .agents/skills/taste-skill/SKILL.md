---
name: taste-skill
description: "Use when Senior UI/UX frontend skill that enforces anti-slop design decisions, motion quality, visual rhythm, micro-craft, and architectural discipline."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - impeccable
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Taste Skill — Senior Design Taste & Anti-Slop Discipline

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The 5 Rules of Design Taste

### 1. Banned AI Visual Clichés (Zero Tolerance)

- ❌ Purple/violet gradient backgrounds (`from-purple-600 to-indigo-600`).
- ❌ Glowing neon borders on every card element.
- ❌ Floating 3D spheres or generic iridescent mesh gradients.
- ❌ Identical Bento Box 3-column grids on every page.

### 2. High-Fidelity Typography

- Typography accounts for 80% of interface perception.
- Display headings must use negative tracking (`-0.025em`) and balanced text wrapping (`text-wrap: balance`).
- Body text line length MUST be bounded to `65ch` max width.

### 3. Spatial System Strictness

- Never use arbitrary `px` paddings or margins (`margin-top: 17px`).
- Enforce strict 8px spatial grid math (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).

### 4. Tactile Micro-Feedback

- All interactive controls MUST respond to press with `transform: scale(0.97)` on `:active` with transition duration $\le 160\text{ms}$.

### 5. Multi-Layer Depth Over Flat Lines

- Replace harsh black borders with multi-layer ambient drop shadows and subtle 8% opacity surface outlines.
