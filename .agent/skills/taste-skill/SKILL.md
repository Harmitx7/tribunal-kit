---
name: taste-skill
description: Senior UI/UX frontend skill that enforces anti-slop design decisions, motion quality, visual rhythm, micro-craft, and architectural discipline.
version: 3.0.0
last-updated: 2026-07-30
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

## 🤖 LLM-Specific Traps

1. **Defaulting to Plain Templates**: Producing boring, unstyled HTML buttons with zero hover/active states.
2. **Ignoring Dark Mode Depth**: Leaving card backgrounds flat black (`#000000`) without surface lightness progression.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are generic purple gradients and glowing borders completely avoided?
✅ Is text length bounded to 65ch max width for body paragraphs?
✅ Do interactive elements feature tactile press feedback (`scale(0.97)`)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
