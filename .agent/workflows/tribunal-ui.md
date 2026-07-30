---
description: Specialized UI/UX Tribunal. Runs UX + Visual + Interaction + Anti-Pattern + Product Heuristics + Accessibility + Visual Auditor reviewers. Use for all visual designs, component layouts, and design-system reviews.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - ui-reasoning-engine
  - product-aware-heuristics
  - ui-ux-pro-max
  - frontend-design
  - web-design-guidelines
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# /tribunal-ui — Dedicated UI/UX Review Pipeline

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before executing dedicated UI/UX audits or design-system reviews, you MUST inspect:
1. Active Design Tokens & Guidelines (`DESIGN.md`, CSS custom properties) → Confirm typography scale, color system, and corner radius tokens
2. Product Domain Category → Select category heuristics (Dashboard, E-Commerce, Landing Page, Mobile App, Marketing)
3. 7-Reviewer Dedicated UI Gate → Run ux-auditor, visual-auditor, interaction-auditor, anti-pattern-auditor, product-heuristics, a11y-auditor, and visual-auditor before passing designs

---

## When to Use /tribunal-ui

| Use `/tribunal-ui` when... | Use instead when... |
| :--- | :--- |
| Auditing visual hierarchy & rhythm | Reviewing backend routing → `/tribunal-backend` |
| Verifying interactive states and hover/focus | Reviewing database transaction code → `/tribunal-database` |
| Checking responsive behavior and ergonomics | Doing general logical code checks → `/tribunal-frontend` |
| Banning generic AI templates & purple gradients | |
| Testing accessibility compliance (WCAG 2.2 AA) | |

---

## 7 Specialized UI Reviewers (Running Simultaneously)

### 1. ux-reviewer
*   **Focus:** Hick's Law, Fitts's Law, cognitive load, scanning patterns, scannability, and progressive disclosure.
*   **Check:** Are primary action targets separated from destructive ones? Is choice overload prevented?

### 2. visual-reviewer
*   **Focus:** Typographical scaling, alignment, margins, 8px grid discipline, and line lengths.
*   **Check:** Do Display headings balanced-wrap (`text-wrap: balance`)? Is negative space utilized?

### 3. interaction-reviewer
*   **Focus:** Full interactive state styling (Default, Hover, Active/Pressed, Disabled, Focus-visible, Loading).
*   **Check:** Is there scale-down active click feedback? Are focus outlines visible and offset?

### 4. anti-pattern-reviewer
*   **Focus:** Blocking generic AI visual clichés.
*   **Check:** Blocks purple/violet primary colors, radial mesh gradients, bento grid overload, flat cards lacking depth, and card-in-card overlap.

### 5. product-reviewer
*   **Focus:** Matching the UI structure to product category heuristics (SaaS, DevTool, AI Interface, Landing, Fintech).
*   **Check:** Tabular numbers used for financial data? Monospace code snippets for DevTools? Typing skeleton streams for AI?

### 6. accessibility-reviewer
*   **Focus:** WCAG 2.2 Level AA compliance.
*   **Check:** Minimum target size 24px (standard AA) and 44px (touch). Semantic headings, accessible ARIA names, and keyboard trap focus in dialogs.

### 7. ui-visual-auditor (Closed-Loop Visual Gate)
*   **Focus:** Screenshot or DOM layout verification.
*   **Check:** Checks vertical overflow, layout shifts (CLS), alignment shifts, and contrast ratios.

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: Maker must fix and resubmit before Human Gate
If any reviewer → ⚠️ WARNING:  highlighted at Human Gate, must fix before deploy
If all reviewers → ✅ APPROVED: Passes to Human Gate for writing approval
```
