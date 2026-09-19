---
name: transitions-dev
description: "Use when Production-ready CSS transition patterns for web apps with drop-in snippets for cards, modals, dropdowns, panels, and accordions."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - micro-interaction
  - 60fps-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Transitions Dev — Production CSS Transition Snippets

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Production Snippets

### 1. Card Lift & Shadow Scale

```css
.tx-card {
  transition:
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 200ms ease,
    border-color 200ms ease;
}
.tx-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1);
}
```

### 2. Accordion Expand/Collapse (`grid-template-rows`)

Animate element height smoothly without hardcoding fixed pixel heights:

```css
.tx-accordion-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.tx-accordion-content[data-state='open'] {
  grid-template-rows: 1fr;
}
.tx-accordion-inner {
  overflow: hidden;
}
```

### 3. Slide & Fade Modal Overlay

```css
.tx-modal-overlay {
  transition: opacity 200ms ease;
}
.tx-modal-content {
  transition:
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease;
}
.tx-modal-content[data-state='closed'] {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
.tx-modal-content[data-state='open'] {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### 4. Sliding Tab Highlight (`layoutId` or CSS Variables)

```css
.tx-tab-indicator {
  transition:
    transform 200ms cubic-bezier(0.2, 0, 0, 1),
    width 200ms ease;
}
```
