---
name: morphing-icons
description: Build morphing SVG icon components that transition smoothly between states (Play <-> Pause, Hamburger Menu <-> Close X, Sun <-> Moon).
version: 3.0.0
last-updated: 2026-07-30
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

---

## The Hamburger Menu <-> Close X Morph Recipe

```tsx
import React from "react";
import { motion } from "framer-motion";

export function MenuToCloseIcon({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <svg className="w-6 h-6 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
        {/* Top Line -> Top diagonal of X */}
        <motion.line
          x1="4" y1="6" x2="20" y2="6"
          animate={isOpen ? { x1: 6, y1: 6, x2: 18, y2: 18 } : { x1: 4, y1: 6, x2: 20, y2: 6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Middle Line -> Fade out */}
        <motion.line
          x1="4" y1="12" x2="20" y2="12"
          animate={isOpen ? { opacity: 0, x: -4 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        />
        {/* Bottom Line -> Bottom diagonal of X */}
        <motion.line
          x1="4" y1="18" x2="20" y2="18"
          animate={isOpen ? { x1: 6, y1: 18, x2: 18, y2: 6 } : { x1: 4, y1: 18, x2: 20, y2: 18 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
    </button>
  );
}
```

---

## 🤖 LLM-Specific Traps

1. **Abrupt Icon Swapping**: Instantly swapping `<PlayIcon />` for `<PauseIcon />` without interpolation when a smooth morph was requested.
2. **Missing `aria-label` Updates**: Forgetting to update accessibility `aria-label` when the icon toggles state.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `motion-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are vector coordinates smoothly interpolated during state changes?
✅ Is `aria-label` dynamically toggled to match current icon state?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
