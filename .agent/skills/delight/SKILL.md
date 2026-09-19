---
name: delight
description: "Use when Inject micro-moments of delight, subtle surprise interactions, personality, and tactile feedback into user interfaces. Use when building success celebrations, copy-to-clipboard feedback, empty states, or playful UI elements."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - whimsy-injector
  - micro-interaction
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Delight — Micro-Moments of Tactile UI Polish

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 5 Micro-Delight Patterns

### 1. The Morphing State Checkmark

- When clicking "Copy Link" or "Save", morph the button icon or label smoothly into a checkmark icon with a quick spring bounce (`scale(1.15) -> scale(1)` over `180ms`), holding for 1.5 seconds before morphing back.

### 2. Micro-Confetti & Particle Bursts

- On completing a key milestone (e.g. completing onboarding, submitting a project), trigger a lightweight 12-particle CSS/canvas burst anchored directly to the submit button.

### 3. Tactile Drag & Reorder Haptics

- When dragging list items, elevate the item with a slight tilt ($2^\circ$), drop shadow increase, and scale (`scale(1.02)`), giving a physical card feeling.

### 4. Playful Empty State Animations

- Transform boring zero-data states with subtle floating illustrations, witty microcopy, and a prominent primary action button.

### 5. Keyboard Shortcut Badges with Tooltips

- Display subtle keyboard shortcut hints (e.g. `⌘K` or `Ctrl+K`) inside inputs or hover tooltips that respond with a subtle keypress press animation when pressed.
