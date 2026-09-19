---
name: lottie-animation
description: "Use when Lottie and dotLottie integration, playback control, hover/click triggers, runtime theming, and performance optimization for React/Vue/Web."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - motion-engineering
  - micro-interaction
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Lottie Animation — dotLottie & Runtime Control

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 3 Lottie Integration Recipes

### 1. React dotLottie Interactive Player (`@dotlottie/react-player`)

```tsx
import React, { useRef } from 'react';
import { DotLottiePlayer, Controls } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

export function InteractiveLottieIcon() {
  const lottieRef = useRef<any>(null);

  return (
    <div
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
      className="w-12 h-12 cursor-pointer"
    >
      <DotLottiePlayer
        ref={lottieRef}
        src="/animations/success-check.lottie"
        autoplay={false}
        loop={false}
      />
    </div>
  );
}
```

### 2. Runtime Color Injection / Theming

Pass custom CSS variable overrides to dotLottie players to dynamically recolor vector paths at runtime without re-downloading JSON assets.

### 3. Performance & Lazy Loading

- Use `.lottie` (dotLottie format) instead of uncompressed `.json` Lottie files to achieve **80% smaller bundle file sizes**.
- Lazy-load offscreen Lottie animations using `IntersectionObserver`.
