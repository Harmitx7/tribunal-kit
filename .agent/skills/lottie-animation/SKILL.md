---
name: lottie-animation
description: Lottie and dotLottie integration, playback control, hover/click triggers, runtime theming, and performance optimization for React/Vue/Web.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Vector Animation & Lottie Integration
  tier: pro
  co-requires: [60fps-animation, text-to-lottie]
  trigger-signals:
    strong: [lottie-animation, dotLottie, Lottie React, Lottie playback, vector animation JSON]
    weak: [lottie, json animation]
---

# Lottie Animation — dotLottie & Runtime Control

Integrate lightweight, vector-based Lottie animations with interactive trigger controls and runtime color theming.

---

## 3 Lottie Integration Recipes

### 1. React dotLottie Interactive Player (`@dotlottie/react-player`)
```tsx
import React, { useRef } from "react";
import { DotLottiePlayer, Controls } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

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

---

## 🤖 LLM-Specific Traps

1. **Embedding Massive Uncompressed Lottie JSONs**: Importing 2MB JSON files inline into JavaScript bundles.
2. **Autoplay Loops Everywhere**: Setting `autoplay loop` on 10 offscreen icons, causing massive CPU idle usage.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `performance-optimizer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are dotLottie (`.lottie`) binary assets preferred over raw uncompressed `.json`?
✅ Is playback triggered intentionally via hover, click, or visible viewport intersection?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
