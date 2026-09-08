---
name: to-spring-or-not-to-spring
description: Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - motion-engineering
  - framer-motion-expert
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# To Spring or Not to Spring — Motion Physics Decision Matrix

---

## Mandatory Pre-Flight Context Inspection

Before selecting animation model (Spring vs Cubic-Bezier), you MUST inspect:

1. Spring vs Duration Decision Matrix (Section 22) → Use Spring physics ONLY for interruptible gestures, drag, toggles, and playful badges
2. Modal & Dropdown Rule → Use deterministic cubic-bezier curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for modals, dropdowns, and route transitions
3. Anti-Conflict Rule (Section 46) → Never specify both `duration` AND spring `stiffness/damping` parameters together in Framer Motion

Decide when to use physics-driven spring models (Framer Motion / Reanimated) vs duration-based cubic-bezier easing curves.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves..
- **DO NOT activate when:** The task falls strictly outside to-spring-or-not-to-spring domain or belongs to a different dedicated specialist.

---

## Spring vs Duration Decision Matrix

| Motion Scenario                                      | Use Spring Physics?   | Recommended Parameters / Curve                                               |
| ---------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| **Interruptible Gestures** (Drag, Swipe, Sheet pull) | ✅ **ALWAYS**         | `type: "spring", stiffness: 300, damping: 30` (adapts to drag velocity)      |
| **Button Press Feedback** (`:active`)                | ❌ **NO (Use Curve)** | `transition: transform 120ms cubic-bezier(0.2, 0, 0, 1)`                     |
| **Modal / Dialog Entrance**                          | ❌ **NO (Use Curve)** | `transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1)`                        |
| **Badge Bouncing / Celebration**                     | ✅ **YES**            | `type: "spring", stiffness: 400, damping: 15` (intentional overshoot bounce) |
| **Page / Route Transitions**                         | ❌ **NO (Use Curve)** | `transition: opacity 200ms ease-out`                                         |
| **Toggle Switch Flip**                               | ✅ **YES**            | `type: "spring", stiffness: 500, damping: 35` (crisp snap without wobble)    |

---

## 3 Core Spring Parameters

1. **Stiffness** (Rigidity): High stiffness ($400+$) = snappy and tight; Low stiffness ($100$) = slow and lazy.
2. **Damping** (Friction): High damping ($30+$) = zero overshoot bounce; Low damping ($10$) = heavy oscillating bounce.
3. **Mass** (Weight): Higher mass ($2.0$) = feels heavy with momentum inertia.

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
