---
name: to-spring-or-not-to-spring
description: Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Motion Physics & Animation Decisions
  tier: pro
  co-requires: [emil-design-eng, framer-motion-expert]
  trigger-signals:
    strong: [to-spring-or-not-to-spring, spring physics, spring animation vs cubic bezier, stiffness damping mass, motion physics decision]
    weak: [spring animation, spring vs easing]
---

# To Spring or Not to Spring — Motion Physics Decision Matrix

Decide when to use physics-driven spring models (Framer Motion / Reanimated) vs duration-based cubic-bezier easing curves.

---

## Spring vs Duration Decision Matrix

| Motion Scenario | Use Spring Physics? | Recommended Parameters / Curve |
| --- | --- | --- |
| **Interruptible Gestures** (Drag, Swipe, Sheet pull) | ✅ **ALWAYS** | `type: "spring", stiffness: 300, damping: 30` (adapts to drag velocity) |
| **Button Press Feedback** (`:active`) | ❌ **NO (Use Curve)** | `transition: transform 120ms cubic-bezier(0.2, 0, 0, 1)` |
| **Modal / Dialog Entrance** | ❌ **NO (Use Curve)** | `transition: all 220ms cubic-bezier(0.16, 1, 0.3, 1)` |
| **Badge Bouncing / Celebration** | ✅ **YES** | `type: "spring", stiffness: 400, damping: 15` (intentional overshoot bounce) |
| **Page / Route Transitions** | ❌ **NO (Use Curve)** | `transition: opacity 200ms ease-out` |
| **Toggle Switch Flip** | ✅ **YES** | `type: "spring", stiffness: 500, damping: 35` (crisp snap without wobble) |

---

## 3 Core Spring Parameters

1. **Stiffness** (Rigidity): High stiffness ($400+$) = snappy and tight; Low stiffness ($100$) = slow and lazy.
2. **Damping** (Friction): High damping ($30+$) = zero overshoot bounce; Low damping ($10$) = heavy oscillating bounce.
3. **Mass** (Weight): Higher mass ($2.0$) = feels heavy with momentum inertia.

---

## 🤖 LLM-Specific Traps

1. **Bouncy Springs on Modals**: Adding low-damping bouncy springs to popovers or modals, making popovers wobble on screen.
2. **Fixed Duration Springs**: Setting `duration: 0.5` alongside `type: "spring"` in Framer Motion, which overrides natural spring physics.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are spring physics restricted to gestures, toggles, drag targets, and playful badges?
✅ Are modals, dropdowns, and route transitions using deterministic cubic-bezier curves?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
