---
name: harden
description: "Use when Make interfaces production-resilient with robust empty states, error boundaries, loading skeletons, offline indicators, and internationalization (i18n) layout support."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - polish
  - baseline-ui
  - resilience-reviewer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Harden — Production UI Resilience & Edge Case Protection

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 5 Resilience Domains

### 1. Zero-Data Empty States

- Never render empty blank slates or blank boxes.
- Always render a dedicated empty state component featuring:
  - Contextual icon or subtle illustration
  - Clear heading explaining the zero state (_"No active projects found"_)
  - Secondary helper copy (_"Get started by creating your first project."_)
  - Prominent primary action CTA button (_"Create Project"_)

### 2. Error Boundary UI & Retry Hooks

- Wrap high-risk component trees in React/framework Error Boundaries.
- Display localized inline error callouts with explicit "Retry" action buttons rather than crashing the full page view.

### 3. Cumulative Layout Shift (CLS) Loading Skeletons

- Match skeleton placeholder dimensions EXACTLY to incoming data elements.
- Use animated pulse keyframes (`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`).

### 4. Extreme String Expansion (i18n)

- German, French, and Spanish strings are 30% - 50% longer than English.
- Avoid fixed button or container widths (`width: 120px`). Use `min-width` with flexible auto sizing and `flex-wrap: wrap` or text truncation.

### 5. Offline & Network Disconnection Handling

- Detect `navigator.onLine` state and display subtle offline status banners.
- Disable mutation buttons during offline mode with explicit tooltip explanation.
