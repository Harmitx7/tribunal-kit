---
name: build-primitive
description: "Use when Build foundational, unstyled, accessible UI primitives from scratch with strong ARIA attributes, keyboard navigation, focus traps, and state management. Use when creating custom Headless UI components (Dialog, Combobox, Accordion, Popover, Menu)."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - react-specialist
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Build Primitive — Headless & Accessible UI Primitives

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Rules for UI Primitives

### 1. Complete ARIA Pattern Compliance

- **Dialog / Modal**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{titleId}"`, `aria-describedby="{descId}"`.
- **Combobox / Autocomplete**: `role="combobox"`, `aria-expanded="{isOpen}"`, `aria-autocomplete="list"`, `aria-controls="{listboxId}"`.
- **Tabs**: Tablist `role="tablist"`, Tab `role="tab"`, `aria-selected="{isActive}"`, `aria-controls="{panelId}"`, TabPanel `role="tabpanel"`.

### 2. Focus Management & Focus Traps

- **Modal Focus Lock**: When a dialog opens, trap focus within the modal container. On close, return focus to the element that triggered it.
- **Escape Key Dismiss**: Pressing `Escape` MUST close popovers, modals, and dropdown menus instantly.

### 3. Keyboard Navigation Sequences

- **Listbox / Menu Navigation**:
  - `ArrowDown`: Move active descendant down.
  - `ArrowUp`: Move active descendant up.
  - `Home`: Move to first item.
  - `End`: Move to last item.
  - `Enter` / `Space`: Select highlighted item.

### 4. Zero Unnecessary Styling

- Primitives MUST output clean data attributes (`data-state="open|closed"`, `data-disabled`, `data-highlighted`) so consumers can style them effortlessly with CSS or Tailwind variants.
