---
name: svg-animation
description: SVG stroke draw-on effects, path morphing, animated icons, motion paths, and interactive vector graphics.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - morphing-icons
  - 60fps-animation
  - motion-engineering
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# SVG Animation — Stroke Draw-On & Path Morphing

---

## Mandatory Pre-Flight Context Inspection

Before engineering SVG path or stroke animations, you MUST inspect:

1. Target SVG attributes → Ensure `fill="none"` is set on draw-on paths to prevent black fill occlusion
2. Path Length Calibration (Section 70) → Calculate exact `path.getTotalLength()` instead of guessing `stroke-dasharray` values
3. Non-scaling Stroke rule (Section 83) → Apply `vector-effect="non-scaling-stroke"` if vector elements scale across responsive viewports

Craft crisp, resolution-independent vector animations using CSS, Framer Motion, or GSAP.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring SVG stroke draw-on effects, path morphing, animated icons, motion paths, and interactive vector graphics..
- **DO NOT activate when:** The task falls strictly outside svg-animation domain or belongs to a different dedicated specialist.

---

## 3 SVG Motion Techniques

### 1. Pure CSS Stroke Draw-On Effect

```css
@keyframes draw-path {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.draw-signature-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-path 1.8s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}
```

### 2. Framer Motion SVG Path Length Animation

```tsx
import { motion } from 'framer-motion';

export function DrawCheckmark() {
  return (
    <svg className="w-8 h-8 stroke-emerald-500 stroke-2 fill-none" viewBox="0 0 24 24">
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  );
}
```

### 3. SVG Path Morphing (GSAP MorphSVGPlugin)

- Morph between 2 vector paths with identical point counts or using GSAP MorphSVG:

```javascript
gsap.to('#start-shape', {
  morphSVG: '#end-shape',
  duration: 0.6,
  ease: 'power2.inOut',
});
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
