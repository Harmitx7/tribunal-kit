---
name: 60fps-animation
description: Web animation performance guidance for avoiding layout thrashing, achieving 60/120fps motion, and using GPU compositor-friendly properties (transform, opacity).
version: 4.0.0
last-updated: 2026-09-07
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

1. Target Animated Properties → Strictly enforce GPU compositor-only properties (`transform`, `opacity`); ban layout-triggering properties (`width`, `height`, `top`, `left`, `margin`)
2. CSS `@starting-style` & Popover API → Use native CSS entry transitions for dialogs/popovers; avoid manual JavaScript mount/unmount timers
3. Layout Containment → Apply `contain: layout paint` or `content-visibility: auto` to isolate animation paint boundaries from parent DOM trees
4. Frame Rate Budget → Animations must complete within a 16.6ms frame budget (8.3ms on 120Hz ProMotion displays) without dropping frames

## Activation Boundaries

- **Activate when:** Designing web animations, transitions, micro-interactions, scroll animations, and fixing visual jank or low frame rates.
- **DO NOT activate when:** Writing static layouts without motion or backend Node.js business logic.

## 2026 Motion Performance & GPU Invariants

1. **CSS `@starting-style` Native Transitions**:
   ```css
   /* Native entry animation without JS transition wrappers */
   dialog[open] {
     opacity: 1;
     transform: scale(1);
     transition: opacity 200ms ease, transform 200ms ease;
     @starting-style {
       opacity: 0;
       transform: scale(0.95);
     }
   }
   ```
2. **Native Scroll-Driven Animations**: Use CSS `animation-timeline: view()` or `scroll()` to run scroll animations directly on the compositor thread without firing JavaScript scroll event handlers.
3. **No Layout Thrashing in JS**: Never interleave DOM reads (`element.getBoundingClientRect()`, `offsetHeight`) with DOM writes (`style.transform`). Batch reads first, then writes in `requestAnimationFrame()`.

## Hallucination Traps (Read First)

- ❌ Animating `top`, `left`, `width`, `height` → ✅ Animate `transform: translate3d(...)` and `scale(...)`
- ❌ Using JavaScript scroll listeners for parallax/fade → ✅ Use native CSS `animation-timeline`
- ❌ Setting `will-change: transform` globally on every element → ✅ Blows GPU VRAM; apply only during active interaction
- ❌ Animating box-shadow directly → ✅ Animate `opacity` on a pseudo-element (`::after`) with pre-rendered shadow

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
