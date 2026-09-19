---
name: to-spring-or-not-to-spring
description: "Use when Audit and decide when to use physics-based spring animations (stiffness, damping, mass) vs duration-based cubic-bezier easing curves."
version: 5.0.0
last-updated: 2026-09-13
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

## 🛠️ Technical Architecture & Reference Recipes

---

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
