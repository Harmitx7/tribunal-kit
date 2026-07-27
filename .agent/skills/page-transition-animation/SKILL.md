---
name: page-transition-animation
description: Page and route transition patterns using the native View Transitions API, Framer Motion AnimatePresence, and Next.js App Router exit animations.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Route Transitions & Navigation Motion
  tier: pro
  co-requires: [framer-motion-expert, 60fps-animation]
  trigger-signals:
    strong: [page-transition-animation, View Transitions API, page transition, route transition, Next.js exit animation, shared element transition]
    weak: [route animation, page animation]
---

# Page Transition Animation — Native & Framework Route Motion

Architect smooth, seamless page and route transitions without layout jumps or frozen exit states.

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
"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

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

## 🤖 LLM-Specific Traps

1. **Broken Next.js App Router Exits**: Forgetting to set a unique `key={pathname}` on `AnimatePresence` children, causing exit animations to be skipped entirely.
2. **Excessive Vertical Displacement**: Animating pages from `y: 100px` down, causing jarring vertical scroll shifts. Keep route shifts under `12px`.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is `document.startViewTransition` feature-detected with fallback for older browsers?
✅ Is `mode="wait"` set on `AnimatePresence` to prevent double-page DOM stacking?
✅ Is vertical page movement subtle ($\le 12\text{px}$) during transitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
