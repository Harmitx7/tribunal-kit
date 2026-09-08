---
name: morphing-icons
description: Build morphing SVG icon components that transition smoothly between states (Play <-> Pause, Hamburger Menu <-> Close X, Sun <-> Moon).
version: 4.0.0
last-updated: 2026-09-07
skills:
  - svg-animation
  - micro-interaction
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Morphing Icons — Interactive State-Morphing Vector Icons

---

## Mandatory Pre-Flight Context Inspection

Before implementing morphing icon components, you MUST inspect:

1. Target states (e.g. Hamburger Menu <-> Close X, Play <-> Pause) → Verify matching SVG path point count and coordinate bounds
2. Accessibility (Section 65) → Ensure `aria-label` updates dynamically alongside state changes
3. Interpolation Curves → Use snappy ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`) with duration $\le 200\text{ms}$

Architect crisp, interactive SVG icon components that morph seamlessly between operational states.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Build morphing SVG icon components that transition smoothly between states (Play <-> Pause, Hamburger Menu <-> Close X, Sun <-> Moon)..
- **DO NOT activate when:** The task falls strictly outside morphing-icons domain or belongs to a different dedicated specialist.

---

## The Hamburger Menu <-> Close X Morph Recipe

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function MenuToCloseIcon({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
        {/* Top Line -> Top diagonal of X */}
        <motion.line
          x1="4"
          y1="6"
          x2="20"
          y2="6"
          animate={isOpen ? { x1: 6, y1: 6, x2: 18, y2: 18 } : { x1: 4, y1: 6, x2: 20, y2: 6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Middle Line -> Fade out */}
        <motion.line
          x1="4"
          y1="12"
          x2="20"
          y2="12"
          animate={isOpen ? { opacity: 0, x: -4 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        />
        {/* Bottom Line -> Bottom diagonal of X */}
        <motion.line
          x1="4"
          y1="18"
          x2="20"
          y2="18"
          animate={isOpen ? { x1: 6, y1: 18, x2: 18, y2: 6 } : { x1: 4, y1: 18, x2: 20, y2: 18 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </button>
  );
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
