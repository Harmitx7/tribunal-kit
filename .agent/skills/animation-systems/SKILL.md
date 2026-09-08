---
name: animation-systems
description: Systematize animation tokens (durations, easings, keyframes) across a full codebase for consistent motion design and maintenance.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - motion-engineering
  - 60fps-animation
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Animation Systems — Global Motion Tokens & System Architecture

---

## Mandatory Pre-Flight Context Inspection

Before defining animation tokens or styling transitions, you MUST inspect:

1. `index.css` / `DESIGN.md` → Verify presence of centralized `--duration-*` and `--ease-*` CSS custom properties
2. Centralized Motion Tokens Schema (Section 26) → Enforce standardized duration tiers (80ms instant to 500ms delight)
3. Anti-Ad-Hoc Easing Rule (Section 48) → Strictly prohibit inline custom cubic-bezier curves; reference motion tokens instead

Architect a unified, scalable motion system with centralized CSS easing curves, duration tiers, and standardized keyframes.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Systematize animation tokens (durations, easings, keyframes) across a full codebase for consistent motion design and maintenance..
- **DO NOT activate when:** The task falls strictly outside animation-systems domain or belongs to a different dedicated specialist.

---

## Centralized Motion Tokens Schema

Define standardized design tokens for motion in global CSS or Tailwind config:

```css
:root {
  /* Duration Scale */
  --duration-instant: 80ms; /* Micro feedback, toggle switches */
  --duration-fast: 150ms; /* Tooltips, hover states, press feedback */
  --duration-normal: 220ms; /* Dropdowns, menus, tab switching */
  --duration-slow: 320ms; /* Modals, drawers, page reveals */
  --duration-delight: 500ms; /* Milestone celebrations, toasts */

  /* Standardized Easing Curves */
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1); /* Quick response for press/active */
  --ease-out-ui: cubic-bezier(0.16, 1, 0.3, 1); /* Smooth entrance for popovers/modals */
  --ease-in-ui: cubic-bezier(0.7, 0, 0.84, 0); /* Smooth exit for modals */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Subtle spring overshoot */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* Morphing layout changes */
}
```

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
