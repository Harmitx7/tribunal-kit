---
name: cobejs
description: "Use when Build lightweight, hardware-accelerated 3D interactive animated globes and web orbs using Cobe WebGL."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - motion-engineering
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Cobe JS — Lightweight 3D WebGL Globe Visuals

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## Cobe Canvas Setup Recipe (React)

```tsx
import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.3,
      dark: 1, // OLED dark mode theme
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 0.5],
      glowColor: [0.1, 0.1, 0.2],
      markers: [
        { location: [37.7595, -122.4367], size: 0.05 }, // San Francisco
        { location: [51.5074, -0.1278], size: 0.05 }, // London
        { location: [35.6762, 139.6503], size: 0.05 }, // Tokyo
      ],
      onRender: state => {
        state.phi = phi;
        phi += 0.005; // Smooth rotation
      },
    });

    return () => globe.destroy();
  }, []);

  return (
    <canvas ref={canvasRef} style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: 1 }} />
  );
}
```
