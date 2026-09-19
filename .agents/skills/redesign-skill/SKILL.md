---
name: redesign-skill
description: "Use when Audit and upgrade existing interfaces to premium visual quality while preserving product functionality and business logic."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - taste-skill
  - better-ui
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Redesign Skill — UI Upgrade Methodology

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Redesign Upgrade Steps

### Step 1: Logic & State Isolation

Before touching CSS or HTML layout:

- Extract all state hooks (`useState`), event handlers (`onClick`), and API props. **Zero business logic may be deleted or altered.**

### Step 2: Spatial & Typographic Grid Overhaul

- Replace arbitrary pixel margins with an 8px spatial system (`gap-4`, `p-6`).
- Apply modular font scaling (`text-sm`, `text-base`, `text-2xl`, `text-4xl`) with `text-wrap: balance` on headings.

### Step 3: Color & Surface Elevation Upgrade

- Replace raw `#fff` / `#000` colors with an OKLCH surface hierarchy (`--bg-base`, `--bg-surface`, `--bg-elevated`).
- Replace hard black borders with subtle 8% opacity surface borders and multi-layered ambient shadows.

### Step 4: Micro-Interaction & Polish Pass

- Add `:active` scale press feedback (`scale(0.97)`), smooth hover state transitions, and keyboard focus rings (`:focus-visible`).
