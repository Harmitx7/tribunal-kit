---
name: pricing-page
description: "Use when SaaS pricing table architecture, billing cycle toggles (Monthly/Annual), feature comparison matrices, tier highlighting, and conversion optimization."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - landing-page
  - compact-landing
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Pricing Page — SaaS Pricing Architecture & Comparison Grids

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Pricing Table Rules

### 1. The Billing Cycle Toggle (Monthly vs Annual)

- Provide a clear segmented control or switch for **Monthly** / **Annual (Save 20%)**.
- Display an explicit "Save 20%" badge next to the annual option.
- Smoothly transition price numbers when toggling billing frequencies using `font-variant-numeric: tabular-nums`.

### 2. Tier Visual Hierarchy (Max 3-4 Tiers)

- **Hobby / Starter**: Quiet surface, border outline, ghost CTA button (_"Start free"_).
- **Pro / Business (Featured Tier)**: Prominent accent border, subtle glow/gradient header, "Most Popular" pill badge, solid primary CTA button (_"Start 14-day trial"_).
- **Enterprise**: Solid dark surface or neutral card, contact sales CTA (_"Talk to sales"_).

### 3. Price Display Formatting

- Big bold price numeral (`3.5rem` font size) + billing cadence label (`/month billed annually` in smaller muted text).
- Always include `$0` or `Free` tier explicitly if available.

### 4. Feature Checklist Consistency

- Group bullet points with green checkmark icons (`✓`).
- Explicitly list features included vs excluded (using muted dashed icons or opacity for missing features).
