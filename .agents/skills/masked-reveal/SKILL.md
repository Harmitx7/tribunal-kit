---
name: masked-reveal
description: "Use when Editorial, typography-driven, and cinematic visual entrance reveals using CSS clip-path, SVG alpha/luminance masking, progressive blurs, and parallax counter-scaling."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - framer-motion-expert
  - motion-engineering
  - review-animations
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Masked Reveal — Editorial, Typography & Cinematic Masking

---

## 🛠️ Technical Architecture & Reference Recipes

Amateur page entrances use generic whole-page opacity fades or abrupt translations. High-end editorial and Awwwards-caliber interfaces use masked reveals: elements unveil along razor-sharp geometric clip boundaries, staggered typographic lines rise through hidden overflow thresholds, and imagery emerges with subtle counter-scaling parallax.

---

---

## 1. The Performance & Technology Hierarchy

| Method                          | Syntax                                   | Performance               | Ideal Use Case                                        |
| :------------------------------ | :--------------------------------------- | :------------------------ | :---------------------------------------------------- |
| **CSS `clip-path: inset()`**    | `inset(0 100% 0 0)`                      | **Ultra (Compositor)**    | Directional curtain wipes, image cards, banners       |
| **CSS `clip-path: polygon()`**  | `polygon(0 0, 100% 0, 85% 100%, 0 100%)` | **High (Compositor/GPU)** | Slanted luxury reveals, angled geometric cuts         |
| **CSS `clip-path: circle()`**   | `circle(0% at 50% 50%)`                  | **High (Compositor/GPU)** | Spotlight iris reveals, expanding hero portals        |
| **CSS `mask-image` Gradient**   | `linear-gradient(to right, ...)`         | **Moderate (GPU Raster)** | Soft feathered edges, progressive blur masks          |
| **SVG `<mask>` / `<clipPath>`** | `<mask id="...">`                        | **Moderate (GPU Raster)** | Liquid fluid morphs, text silhouettes, custom vectors |

---

## 2. Five Production-Grade Editorial Recipes

### Recipe 1: Luxury Editorial Image Wipe with Counter-Scale Parallax

A luxury brand hero image reveal combining an angled polygon clip with counter-scaling:

```tsx
import React from 'react';
import { motion } from 'framer-motion';

export function EditorialImageReveal({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl aspect-[16/10] bg-neutral-900">
      {/* Outer Motion Wrapper for Mask Clip */}
      <motion.div
        className="w-full h-full will-change-[clip-path]"
        initial={{ clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' }}
        whileInView={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{
          duration: 1.1,
          ease: [0.77, 0, 0.175, 1], // Editorial cinematic curve
        }}
      >
        {/* Inner Counter-Scaling Image */}
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover will-change-transform"
          initial={{ scale: 1.15 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: 1.4,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </motion.div>
    </div>
  );
}
```

### Recipe 2: Split-Text Line Wipe (Awwwards Typography Stagger)

Lines emerge from an invisible threshold with strict WCAG screen reader accessibility:

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface SplitLineRevealProps {
  lines: string[];
  className?: string;
}

export function SplitLineReveal({ lines, className = '' }: SplitLineRevealProps) {
  const fullText = lines.join(' ');

  return (
    <h2 className={`font-serif tracking-tight ${className}`}>
      {/* Screen reader full accessible text */}
      <span className="sr-only">{fullText}</span>

      {/* Visual split animation */}
      <span aria-hidden="true" className="block">
        {lines.map((line, index) => (
          <span key={index} className="block overflow-hidden pb-1">
            <motion.span
              className="block will-change-transform"
              initial={{ y: '110%', rotateZ: 2 }}
              whileInView={{ y: '0%', rotateZ: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.85,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1], // Emil Kowalski responsive curve
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </span>
    </h2>
  );
}
```

### Recipe 3: Interactive Cursor Spotlight Reveal (`mask-image`)

Reveals a glowing blueprint or hidden background directly beneath the user’s cursor:

```tsx
import React, { useRef, useState } from 'react';

export function CursorSpotlightReveal({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-8 rounded-3xl bg-neutral-950 border border-neutral-800 overflow-hidden"
    >
      {/* Base Layer Content */}
      <div className="relative z-10 text-neutral-400">{children}</div>

      {/* Spotlight Illuminated Layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background:
            'radial-gradient(circle 280px at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.15), transparent 80%)',
          WebkitMaskImage: `radial-gradient(circle 220px at ${mousePos.x}px ${mousePos.y}px, black 20%, transparent 100%)`,
          maskImage: `radial-gradient(circle 220px at ${mousePos.x}px ${mousePos.y}px, black 20%, transparent 100%)`,
        }}
      />
    </div>
  );
}
```

### Recipe 4: Radial Expanding Iris Portal

```css
@keyframes iris-expand {
  0% {
    clip-path: circle(0% at 50% 50%);
  }
  100% {
    clip-path: circle(120% at 50% 50%);
  }
}

.iris-reveal-trigger {
  animation: iris-expand 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: clip-path;
}
```

### Recipe 5: Inverted Scroll-Driven Mask Curtain (CSS View-Timeline)

Pure CSS scrubbed mask reveal driven by scroll progress without any JavaScript bundle:

```css
@supports (animation-timeline: view()) {
  @keyframes scroll-unmask {
    from {
      clip-path: inset(0 0 100% 0);
    }
    to {
      clip-path: inset(0 0 0% 0);
    }
  }

  .scroll-unmask-card {
    view-timeline-name: --card-scroll;
    view-timeline-axis: block;
    animation: scroll-unmask ease-out both;
    animation-timeline: --card-scroll;
    animation-range: entry 15% cover 45%;
  }
}
```

---

## 3. Mobile GPU Optimization & Paint Budgets

1. **Clip-Path vs SVG Mask Performance**:
   - `clip-path` calculations operate inside GPU scissor tests or geometry rasterization passes.
   - SVG `mask-image` with alpha textures requires an off-screen render buffer that multiplies GPU memory on high-resolution screens (e.g., iPhone Retina 3x). Never apply full-screen alpha masks to more than 2 elements concurrently on mobile.
2. **Preventing Overflow Scrollbars**:
   - Always ensure elements animating `transform: translateY(110%)` live inside an explicitly sized container with `overflow: hidden` to prevent transient layout scrollbars from flickering on Windows/Android browsers.
