---
name: animation-systems
description: Systematize animation tokens (durations, easings, keyframes) across a full codebase for consistent motion design and maintenance.
version: 3.0.0
last-updated: 2026-07-30
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

---

## Centralized Motion Tokens Schema

Define standardized design tokens for motion in global CSS or Tailwind config:

```css
:root {
  /* Duration Scale */
  --duration-instant:  80ms;  /* Micro feedback, toggle switches */
  --duration-fast:    150ms;  /* Tooltips, hover states, press feedback */
  --duration-normal:  220ms;  /* Dropdowns, menus, tab switching */
  --duration-slow:    320ms;  /* Modals, drawers, page reveals */
  --duration-delight: 500ms;  /* Milestone celebrations, toasts */

  /* Standardized Easing Curves */
  --ease-snappy:  cubic-bezier(0.2, 0, 0, 1);       /* Quick response for press/active */
  --ease-out-ui:  cubic-bezier(0.16, 1, 0.3, 1);     /* Smooth entrance for popovers/modals */
  --ease-in-ui:   cubic-bezier(0.7, 0, 0.84, 0);     /* Smooth exit for modals */
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);/* Subtle spring overshoot */
  --ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1);    /* Morphing layout changes */
}
```

---

## 🤖 LLM-Specific Traps

1. **Ad-Hoc Easing Curves**: Writing random `cubic-bezier(0.12, 0.45, ...)` inline inside individual components instead of referencing motion tokens.
2. **Inconsistent Speeds**: Having tooltips take 400ms while modals take 100ms. Follow the duration scale strictly.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all animation durations and easings pulled from centralized CSS motion tokens?
✅ Do component entrance and exit transitions match the system's duration scale?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
