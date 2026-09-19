---
name: adapt
description: "Use when Adapt designs across breakpoints, devices, platform constraints, touch vs mouse input, and container queries. Use when making a UI responsive or optimizing for mobile/tablet."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - mobile-design
  - building-native-ui
  - tailwind-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Adapt — Responsive Adaptation & Container Queries

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Adaptation Mechanics

### 1. Container Queries (`@container`) over Viewport Media Queries (`@media`)

- Components should adapt based on their parent container's width, NOT the global browser window size:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card-layout {
    display: grid;
    grid-template-columns: 120px 1fr;
  }
}
```

### 2. Touch Target Sizing (Min 44x44px)

- Interactive targets on mobile/touch interfaces MUST maintain a minimum tap target size of `44x44px` (or `48x48px` for Android), even if the visual icon is smaller (`16px`).

### 3. Drawer on Mobile -> Modal on Desktop

- Complex popovers or dialogs on mobile screens should render as bottom sheets (drawers) with drag-to-dismiss handles, automatically morphing into centered modals on desktop viewports ($\ge 768\text{px}$).

### 4. Fluid Typography & Spacing

- Use `clamp()` for fluid scaling without abrupt media query jumps:
  $$\text{FontSize} = \text{clamp}(1\text{rem}, 0.8\text{rem} + 1\text{vw}, 1.75\text{rem})$$
