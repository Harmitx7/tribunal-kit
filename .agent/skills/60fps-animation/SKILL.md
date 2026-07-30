---
name: 60fps-animation
description: Web animation performance guidance for avoiding layout thrashing, achieving 60/120fps motion, and using GPU compositor-friendly properties (transform, opacity).
version: 3.0.0
last-updated: 2026-07-30
skills:
  - motion-engineering
  - accessible-animation
  - fixing-motion-performance
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# 60fps Animation — GPU Compositor & High-Performance Motion

---

## Mandatory Pre-Flight Context Inspection

Before writing animation CSS or JS, you MUST inspect:
1. Target animated properties → Strictly enforce GPU compositor-only properties (`transform`, `opacity`) and ban layout-triggering properties (`width`, `height`, `top`, `left`)
2. Scale Math Replacement (Section 29) → Use `transform: scaleX(2)` instead of animating `width`
3. `will-change` VRAM Management (Section 45) → Apply `will-change` dynamically during active animation and remove upon completion

Eliminate jank, layout thrashing, and frame drops to achieve locked 60fps / 120fps UI animations.

---

## 4 Performance Rules

### 1. Compositor-Only Animation Pipeline
Only animate properties handled strictly by the GPU compositor layer:
- ✅ **Compositor Properties** (Zero Layout / Zero Paint): `transform` (`translate3d`, `scale`, `rotate`) and `opacity`.
- ❌ **Forbidden Animating Properties** (Triggers Full Layout Re-calculation): `width`, `height`, `margin`, `padding`, `top`, `left`, `border-width`.

### 2. Replacing Width/Height Transitions with Scale Math
Instead of animating `width: 100px` to `200px`:
```css
/* BAD: Triggers Layout recalculation on every frame */
.box-bad {
  transition: width 300ms ease;
}

/* GOOD: GPU Compositor Hardware Accelerated */
.box-good {
  transform: scaleX(2);
  transform-origin: left center;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3. `will-change` Management
- Apply `will-change: transform, opacity` ONLY right before or during active animation.
- Remove `will-change` when animation completes to free up GPU VRAM memory!

### 4. Layout Thrashing Prevention in JS
- Never interleave DOM reads (`element.offsetHeight`) with DOM writes (`element.style.height = ...`) inside requestAnimationFrame or scroll handlers. Batch all reads first, then perform all writes.

---

## 🤖 LLM-Specific Traps

1. **Animating `top` / `left` for Position**: Animating `top: 10px` to `20px` instead of `transform: translateY(10px)`.
2. **Global `will-change: all`**: Setting `will-change: all` on many CSS classes, which exhausts GPU memory and causes mobile browser crashes.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `performance-optimizer` · `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all animated properties restricted to `transform` and `opacity`?
✅ Have layout-triggering properties (`width`, `height`, `top`, `left`) been eliminated from transitions?
✅ Is `will-change` cleaned up after animation completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
