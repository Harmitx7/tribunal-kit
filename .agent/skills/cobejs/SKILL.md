---
name: cobejs
description: Build lightweight, hardware-accelerated 3D interactive animated globes and web orbs using Cobe WebGL.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: 3D Graphics & Canvas Visuals
  tier: pro
  co-requires: [60fps-animation, threejs-fundamentals]
  trigger-signals:
    strong: [cobejs, Cobe globe, 3D animated globe, interactive WebGL globe, Cobe orb]
    weak: [globe component, 3D globe]
---

# Cobe JS — Lightweight 3D WebGL Globe Visuals

Integrate ultra-fast, 5KB WebGL interactive globes for landing page hero sections and interactive location maps.

---

## Cobe Canvas Setup Recipe (React)

```tsx
import React, { useEffect, useRef } from "react";
import createGlobe from "cobe";

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
        { location: [51.5074, -0.1278], size: 0.05 },   // London
        { location: [35.6762, 139.6503], size: 0.05 },  // Tokyo
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005; // Smooth rotation
      },
    });

    return () => globe.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
    />
  );
}
```

---

## 🤖 LLM-Specific Traps

1. **Forgetting Canvas Destroy Cleanup**: Failing to call `globe.destroy()` on component unmount, causing WebGL context leaks.
2. **Missing `aspectRatio: 1`**: Failing to constrain aspect ratio, causing globe canvas stretching.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `performance-optimizer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is `globe.destroy()` invoked in the unmount cleanup function?
✅ Is `devicePixelRatio` set to match high-DPI screens without GPU slowdown?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
