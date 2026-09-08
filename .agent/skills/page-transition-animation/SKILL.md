---
name: page-transition-animation
description: Page and route transition patterns using the native View Transitions API, Framer Motion AnimatePresence, and Next.js App Router exit animations.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - framer-motion-expert
  - 60fps-animation
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Page Transition Animation — Native & Framework Route Motion

---

## Mandatory Pre-Flight Context Inspection

Before engineering route or page transitions, you MUST inspect:

1. Target Framework & API (View Transitions API vs Framer Motion `AnimatePresence`)
2. `AnimatePresence` Keying (Section 69) → Enforce `key={pathname}` and `mode="wait"` to prevent double-page DOM stacking
3. Vertical Displacement Cap → Keep route movement under $12\text{px}$ to prevent visual scroll shifts

Architect smooth, seamless page and route transitions without layout jumps or frozen exit states.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Page and route transition patterns using the native View Transitions API, Framer Motion AnimatePresence, and Next.js App Router exit animations..
- **DO NOT activate when:** The task falls strictly outside page-transition-animation domain or belongs to a different dedicated specialist.

---

## 3 Page Transition Architectures

### 1. Native Web View Transitions API

The modern web standard for seamless page transitions (works across MPAs and SPAs):

```javascript
// Native JS navigation trigger
function navigateToPage(url) {
  if (!document.startViewTransition) {
    window.location.href = url;
    return;
  }

  document.startViewTransition(async () => {
    await updateDOMForUrl(url);
  });
}
```

```css
/* CSS View Transition Customization */
::view-transition-old(root) {
  animation: 200ms cubic-bezier(0.4, 0, 1, 1) both fade-out;
}
::view-transition-new(root) {
  animation: 300ms cubic-bezier(0, 0, 0.2, 1) both fade-in;
}

/* Shared Element Transition (e.g. Card Image to Detail Hero) */
.hero-image {
  view-transition-name: product-hero-image;
}
```

### 2. Next.js App Router + Framer Motion (`AnimatePresence`)

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function RouteLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
