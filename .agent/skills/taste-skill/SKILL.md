---
name: taste-skill
description: Senior UI/UX frontend skill that enforces anti-slop design decisions, motion quality, visual rhythm, micro-craft, and architectural discipline.
version: 4.0.0
last-updated: 2026-09-07
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

## Mandatory Pre-Flight Context Inspection

Before rendering UI components, you MUST inspect:

1. Banned AI Clichés (Section 24) → Strictly ban purple/indigo gradients (`from-purple-600 to-indigo-600`), glowing neon borders, and floating 3D spheres
2. Typography Rules (Section 30) → Apply negative tracking (`-0.025em`) + `text-wrap: balance` to display headings; cap body text at `65ch` max width
3. Tactile Press Feedback (Section 39) → Enforce `:active` press feedback (`transform: scale(0.97)`) on all interactive buttons/cards

Enforce senior-level design taste, anti-slop constraints, and visual craft across every component.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Senior UI/UX frontend skill that enforces anti-slop design decisions, motion quality, visual rhythm, micro-craft, and architectural discipline..
- **DO NOT activate when:** The task falls strictly outside taste-skill domain or belongs to a different dedicated specialist.

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
