---
name: accessible-animation
description: Tiered reduced-motion patterns for CSS, GSAP, Framer Motion, Lenis, and View Transitions API to ensure full WCAG 2.2 accessibility compliance for motion.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - 60fps-animation
  - motion-engineering
  - framer-motion-expert
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Accessible Animation — Tiered Reduced-Motion Patterns

---

## Mandatory Pre-Flight Context Inspection

Before implementing UI animation code, you MUST inspect:
1. CSS stylesheets → Verify presence of `@media (prefers-reduced-motion: reduce)` rules
2. Framer Motion / GSAP components → Query `useReducedMotion()` or `matchMedia('(prefers-reduced-motion: reduce)')`
3. Vestibular Trigger Replacement (Section 57) → Replace parallax scroll and 3D rotations with instant opacity cross-fades (`0 -> 1`)

Ensure UI motion respects user accessibility preferences (`prefers-reduced-motion: reduce`) without stripping functional state updates.

---

## 3 Tiered Reduced-Motion Rules

### Tier 1: CSS Reduced Motion Media Query
```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Tier 2: React & Framer Motion Hook (`useReducedMotion`)
```tsx
import { useReducedMotion, motion } from "framer-motion";

export function AccessibleCard({ children }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.05 : 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### Tier 3: Replacing Parallax & Vestibular Triggers with Instant Fades
- Disorienting motions (parallax scrolling, 3D rotations, zoom scaling) MUST be converted into instant cross-fades (`opacity: 0 -> 1`) when `prefers-reduced-motion: reduce` is active.

---

## 🤖 LLM-Specific Traps

1. **Stripping All State Updates**: Completely disabling CSS transitions so elements abruptly disappear or jump without opacity fading.
2. **Ignoring JS Smooth Scroll**: Leaving smooth scroll libraries (Lenis, GSAP ScrollSmoother) active when reduced motion is preferred.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `accessibility-reviewer` · `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is `@media (prefers-reduced-motion: reduce)` declared in CSS stylesheets?
✅ Do JS animation libraries (Framer Motion / GSAP) query `useReducedMotion()` or `window.matchMedia`?
✅ Are disorienting parallax/zoom effects converted into gentle opacity fades?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
