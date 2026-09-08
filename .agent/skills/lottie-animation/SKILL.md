---
name: lottie-animation
description: Lottie and dotLottie integration, playback control, hover/click triggers, runtime theming, and performance optimization for React/Vue/Web.
version: 4.0.0
last-updated: 2026-09-07
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

## Mandatory Pre-Flight Context Inspection

Before integrating Lottie animations, you MUST inspect:

1. Asset Format (.lottie vs .json) → Prefer compressed `.lottie` (dotLottie) assets for 80% smaller bundle file sizes
2. Playback Triggers (Section 34) → Bind playback to user hover/click or viewport intersection instead of aggressive continuous looping
3. Package Manifest (`package.json`) → Verify `@dotlottie/react-player` or `lottie-web` library dependencies

Integrate lightweight, vector-based Lottie animations with interactive trigger controls and runtime color theming.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Lottie and dotLottie integration, playback control, hover/click triggers, runtime theming, and performance optimization for React/Vue/Web..
- **DO NOT activate when:** The task falls strictly outside lottie-animation domain or belongs to a different dedicated specialist.

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
