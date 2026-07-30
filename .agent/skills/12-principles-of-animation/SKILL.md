---
name: 12-principles-of-animation
description: Application of Disney's 12 Principles of Animation (Squash & Stretch, Anticipation, Staging, Follow Through, Slow In & Slow Out, Arc, Secondary Action, Timing, Exaggeration, Solid Drawing, Appeal) to modern web UI motion.
version: 3.0.0
last-updated: 2026-07-30
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

## Mandatory Pre-Flight Context Inspection

Before applying animation principles to web components, you MUST inspect:
1. Target interaction pattern → Identify applicability of Squash & Stretch, Anticipation, Slow In/Out, or Follow Through
2. Volume-Preservation Rule (Section 26) → Keep UI squash/stretch subtle (max 2%-4%); if height scales to 0.97, width MUST scale to 1.03
3. Staging Rules (Section 31) → Direct user focus with sequential motion rather than competing simultaneous animations

Translate Disney's 12 classic principles of animation into modern CSS, Web API, and Framer Motion code patterns.

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

---

## 🤖 LLM-Specific Traps

1. **Extreme Distortion**: Applying 30% squash and stretch to text buttons, causing distorted unreadable font rendering. Keep UI squash/stretch subtle (max 2% - 4%).
2. **Mechanical Linear Motion**: Using `linear` easing for UI elements entering the screen.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Is squash & stretch volume-preserving ($Width \times Height \approx 1$)?
✅ Are entrance animations using custom `ease-out` curves?
✅ Is motion staged to lead user focus sequentially?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
