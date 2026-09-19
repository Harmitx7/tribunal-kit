---
name: page-transition-animation
description: "Use when Page and route transition patterns using the native View Transitions API, Framer Motion AnimatePresence, and Next.js App Router exit animations."
version: 5.0.0
last-updated: 2026-09-13
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

## 🛠️ Technical Architecture & Reference Recipes

---

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
