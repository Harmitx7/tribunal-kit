---
name: svg-animation
description: Use when Master-grade SVG vector animation, stroke draw-on physics, multi-path orchestration, path morphing, offset-path motion trajectories, and hardware-accelerated 120fps vector graphics.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - morphing-icons
  - 60fps-animation
  - motion-engineering
  - accessible-animation
  - review-animations
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# SVG Animation — Precision Vector Engineering & Motion Synthesis

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `svg-animation` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Master-grade SVG vector animation, stroke draw-on physics, multi-path orchestration, path morphing, offset-path motion trajectories, and hardware-accelerated 120fps vector graphics.
- **DO NOT activate when:** The task falls outside the `svg-animation` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

SVG motion represents the intersection of analytical geometry and hardware-accelerated browser compositing. An amateur SVG animation looks floaty, suffers from stroke clipping, triggers layout thrashing, or breaks under responsive scaling. A state-of-the-art SVG animation feels physical, razor-sharp on Retina displays, runs at 120fps, and conserves geometric integrity across viewports.

---


---

## 1. Vector Coordinate Systems & Rendering Fidelity

### The `viewBox` Coordinate Contract

An SVG coordinate system is defined by its `viewBox="min-x min-y width height"`. Never omit `viewBox` in favor of hardcoded `width` and `height` attributes:

```svg
<!-- ✅ Scalable, responsive, mathematically normalized -->
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" class="w-full h-auto">
  <path d="..." vector-effect="non-scaling-stroke" />
</svg>
```

- **Subpixel Antialiasing**: Force browser subpixel rasterization quality using `shape-rendering: geometricPrecision;` and `text-rendering: geometricPrecision;`.
- **Center-Point Calibration**: By default, SVG elements transform around the SVG canvas origin `(0, 0)`, NOT their own center. In CSS, always enforce:
  ```css
  .svg-rotating-element {
    transform-box: fill-box;
    transform-origin: center;
  }
  ```

---

## 2. Stroke Draw-On Physics (Zero-Layout-Shift Mastery)

### A. The Dynamic Path-Length Calibration Pattern (DOM / React)

Guessing `stroke-dasharray` causes premature completion or clipped tails. Always calculate or normalize:

```tsx
import React, { useRef, useLayoutEffect, useState } from 'react';

export function PrecisionDrawPath({ d, className }: { d: string; className?: string }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [length, setLength] = useState<number>(0);

  useLayoutEffect(() => {
    if (pathRef.current) {
      const totalLength = pathRef.current.getTotalLength();
      setLength(totalLength);
    }
  }, [d]);

  return (
    <svg viewBox="0 0 200 200" className={className} fill="none">
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: length || 1000,
          strokeDashoffset: length ? 0 : 1000,
          transition: length ? 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          willChange: 'stroke-dashoffset',
        }}
      />
    </svg>
  );
}
```

### B. Multi-Path Sequential Stroke Orchestration (Staggered Draw-On)

For complex vector artwork with multiple independent strokes, orchestrate execution via staggered CSS custom properties or Framer Motion variant trees:

```tsx
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const strokeVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        type: 'spring',
        stiffness: 70,
        damping: 18,
        restDelta: 0.001,
      },
      opacity: { duration: 0.15 },
    },
  },
};

export function ArchitecturalVectorSchematic() {
  return (
    <motion.svg
      viewBox="0 0 400 300"
      fill="none"
      className="w-full max-w-xl text-indigo-500"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.path
        d="M 50 150 H 350"
        stroke="currentColor"
        strokeWidth="2"
        variants={strokeVariants}
      />
      <motion.path
        d="M 120 70 L 200 150 L 280 70"
        stroke="currentColor"
        strokeWidth="2"
        variants={strokeVariants}
      />
      <motion.circle
        cx="200"
        cy="150"
        r="40"
        stroke="currentColor"
        strokeWidth="1.5"
        variants={strokeVariants}
      />
    </motion.svg>
  );
}
```

---

## 3. Advanced Path Morphing & Shape Interpolation

Path morphing interpolates vector points across coordinate states. If two paths have unequal coordinate counts or mismatching curve segments (`C`, `S`, `Q`, `A`), browsers will either pop abruptly or produce inverted visual folding.

### Rules for Flawless Path Morphing:

1. **Equal Point Density**: Ensure both start and end paths contain identical numbers of Bézier anchors and command types.
2. **Clockwise Continuity**: Draw both shapes in identical directional winding (both clockwise or both counter-clockwise) to avoid intermediate self-intersecting twist anomalies.
3. **GSAP MorphSVG Optimization**: When using GSAP `MorphSVGPlugin`, specify `type: 'rotational'` and calibrate `shapeIndex` to minimize coordinate travel distance.

```typescript
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

export function morphVectorShape(targetSelector: string, endShapeD: string) {
  gsap.to(targetSelector, {
    morphSVG: {
      shape: endShapeD,
      type: 'rotational', // Smooth rotational alignment
      shapeIndex: 'auto',
    },
    duration: 0.85,
    ease: 'power3.out',
  });
}
```

---

## 4. Motion Paths & Trajectories (`offset-path`)

To animate elements traveling along complex vector contours without raster blur or manual math:

```css
.orbiting-particle {
  /* Define the motion trajectory path */
  offset-path: path('M 20,50 C 40,10 60,10 80,50 S 120,90 140,50');
  offset-rotate: auto;
  animation: travel-track 4s linear infinite;
}

@keyframes travel-track {
  from {
    offset-distance: 0%;
  }
  to {
    offset-distance: 100%;
  }
}
```

---

## 5. Compositor Isolation & GPU Performance Budgets

1. **Avoid Costly SVG Filters at 60fps**: SVG `<filter>` primitives such as `<feGaussianBlur>`, `<feTurbulence>`, and `<feDisplacementMap>` are CPU/GPU rasterization heavyweights. Never animate filter parameters (`stdDeviation`, `baseFrequency`) continuously. Instead, pre-render SVG filter buffers and animate container opacity or transform.
2. **Promote Vector Containers to Dedicated Compositor Layers**:
   ```css
   .vector-accelerated-layer {
     will-change: transform;
     transform: translateZ(0);
   }
   ```
3. **Avoid Re-rendering `d` Attributes in Hot Loops**: Updating raw path strings (`d="M..."`) in JavaScript 60 times per second triggers full DOM parsing. Use WebGL/Canvas for >100 dynamic procedural curves; reserve SVG for precision interactive UI elements and iconography.

---

## 6. Cutting-Edge Production Recipes

### Recipe 1: Neon Laser Conduit with Ambient Glow & Particle Pulse

```tsx
import { motion } from 'framer-motion';

export function GlowingLaserConduit() {
  return (
    <svg viewBox="0 0 600 200" fill="none" className="w-full max-w-2xl overflow-visible">
      <defs>
        <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
        <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background Track Guide */}
      <path
        d="M 20 100 C 150 20, 250 180, 380 100 S 500 40, 580 100"
        stroke="#1e293b"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      {/* Glowing Animated Pulse Path */}
      <motion.path
        d="M 20 100 C 150 20, 250 180, 380 100 S 500 40, 580 100"
        stroke="url(#laserGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#laserGlow)"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0.25, pathOffset: 0 }}
        animate={{ pathOffset: [0, 1] }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </svg>
  );
}
```

### Recipe 2: Interactive SVG Wave Audio Visualizer

```tsx
import React, { useId } from 'react';
import { motion } from 'framer-motion';

export function AudioWaveVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const gradientId = useId();
  const bars = [16, 32, 20, 44, 28, 52, 36, 60, 24, 40, 18];

  return (
    <div className="flex items-center gap-1.5 h-16 px-4 bg-neutral-900 rounded-xl border border-neutral-800">
      <svg className="w-0 h-0 absolute">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      {bars.map((height, i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full origin-bottom"
          style={{ background: `url(#${gradientId})`, backgroundColor: '#38bdf8' }}
          animate={
            isPlaying
              ? {
                  height: [12, height, 8, height * 0.8, 12],
                  transition: {
                    duration: 0.85,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.08,
                    ease: [0.33, 1, 0.68, 1],
                  },
                }
              : { height: 6 }
          }
        />
      ))}
    </div>
  );
}
```

---

## 7. Accessibility & WCAG 2.2 Vector Standards

1. **Meaningful vs Decorative Vectors**:
   - **Decorative Vectors**: Must include `aria-hidden="true"` and `focusable="false"`.
   - **Informational / Meaningful Vectors**: Must include `role="img"`, a descriptive `<title id="title-id">`, and `<desc id="desc-id">` referenced by `aria-labelledby="title-id desc-id"`.
2. **Reduced Motion Adaptation**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     path,
     circle,
     rect {
       stroke-dashoffset: 0 !important;
       transition-duration: 0.01ms !important;
       animation-duration: 0.01ms !important;
     }
   }
   ```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **The Instant Pop Trap** | Conditionally unmounting elements without animated interpolation | Use AnimatePresence or coordinate morphs with continuous geometry |
| **Layout Thrashing** | Animating width, height, top, or left inside animation loops | Animate composite-only transform (translate3d, scale) and opacity |
| **Sluggish Duration** | Setting micro-interaction transitions to 600ms+ causing interface lag | Cap interactive feedback at 160ms–240ms with snappy ease-out curves |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `motion-reviewer` · `ui-ux-auditor`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Does animation maintain 60fps/120fps using transform and opacity?
✅ Is optical mass conserved across state interpolations without volume collapse?
✅ Is duration capped within micro-interaction budgets (160ms–280ms)?
✅ Is prefers-reduced-motion respected with graceful instant fallbacks?
✅ Did I prevent layout thrashing and continuous geometry mutations?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
