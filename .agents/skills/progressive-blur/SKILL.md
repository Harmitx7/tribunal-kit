---
name: progressive-blur
description: "Use when Smooth progressive backdrop blurs, depth overlays, and modern glassmorphism using CSS mask-image and multi-layered backdrop filters without GPU performance drops."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - better-colors
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Progressive Blur — Multi-Layered Glassmorphism & Depth

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 3 Progressive Blur Techniques

### 1. Multi-Step Masked Progressive Blur

To prevent harsh edge cutoffs in blurred headers or footers, blend 4 progressive blur layers using linear gradient masks:

```css
.progressive-blur-header {
  position: sticky;
  top: 0;
  z-index: 40;
  pointer-events: none;
}

.blur-layer-1 {
  backdrop-filter: blur(2px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 25%);
}

.blur-layer-2 {
  backdrop-filter: blur(8px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 65%);
}

.blur-layer-3 {
  backdrop-filter: blur(16px);
  mask: linear-gradient(to bottom, rgba(0, 0, 0, 1) 65%, rgba(0, 0, 0, 1) 100%);
}
```

### 2. Glass Card Depth Recipe

```css
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .glass-card {
    background: rgba(18, 18, 20, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }
}
```

### 3. GPU Hardware Acceleration Protection

Backdrop blurs can cause frame drops if animated directly.

- **Rule**: Never animate `backdrop-filter: blur()` properties during scroll or transitions. Animate `opacity` of a static blurred pseudo-element instead!
