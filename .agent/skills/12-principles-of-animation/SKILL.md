---
name: 12-principles-of-animation
description: "Use when Application of Disney's 12 Principles of Animation (Squash & Stretch, Anticipation, Staging, Follow Through, Slow In & Slow Out, Arc, Secondary Action, Timing, Exaggeration, Solid Drawing, Appeal) to modern web UI motion."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - motion-engineering
  - 60fps-animation
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# 12 Principles of Animation — Web UI Motion Theory

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The 6 Essential Web Principles

### 1. Squash & Stretch (Scale Elasticity)

- Compress elements slightly on impact (e.g. button press down `scale(0.97)`), then stretch slightly on release (`scale(1.02)` -> `scale(1)`).
- **Rule**: Preserve overall volume. If height decreases by 5%, width must expand by 5%.

### 2. Anticipation (Pre-Motion Cue)

- Before a major movement (e.g. modal sliding up), perform a micro-backwards movement (e.g. shift down `2px` for `40ms`) to prepare the user's eye.

### 3. Staging (Focus & Spatial Hierarchy)

- Direct user attention to one primary animation at a time. Never animate competing layout elements across different regions simultaneously.

### 4. Slow In & Slow Out (Easing Curves)

- Objects in nature start slow, accelerate, and decelerate gradually. Use strong ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`) for UI entrances.

### 5. Arcs (Natural Curvilinear Trajectories)

- Human arms and physical objects move in curved arcs rather than mechanical straight lines. When moving elements across 2D space, use parabolic bezier curves or `offset-path`.

### 6. Follow Through & Overlapping Action

- Secondary elements (e.g. badge text inside a sliding card) lag slightly behind the main container (stagger delay 30ms - 50ms), creating organic physical realism.
