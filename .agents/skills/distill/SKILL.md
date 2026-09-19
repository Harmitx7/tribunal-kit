---
name: distill
description: "Use when Simplify noisy interfaces by removing non-essential visual and operational complexity. Use when a UI has too many options, crowded toolbars, redundant text, or unnecessary visual containers."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - quieter
  - clarify
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Distill — UX Simplification & Decluttering

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## The 4 Distillation Steps

### 1. Identify & Remove Visual Noise

- **Container Reduction**: Eliminate unnecessary nested cards, boxes inside boxes, and decorative borders. Use whitespace instead of lines to separate content blocks.
- **Icon Pruning**: Remove decorative icons that restate obvious text labels (e.g. an envelope icon next to a button that clearly says "Send Email").

### 2. Collapse Secondary Actions

- **Primary vs Overflow**: Keep only 1 primary action button and max 1 secondary button visible. Hide tertiary actions inside an overflow dropdown (`...` menu).
- **Progressive Disclosure**: Hide advanced settings or non-essential controls behind an "Advanced Settings" accordion or popover.

### 3. Trim Copy & Microcopy

- **Cut Conversational Filler**: Strip verbose instructions. Change _"Please fill out the form below to register your account"_ to _"Create account"_.
- **Shorten Button Labels**: Change _"Click here to update your profile settings"_ to _"Save profile"_.

### 4. Group Related Fields

- **Consolidate Form Inputs**: Merge separate "First Name" and "Last Name" fields into "Full Name" if separate values aren't strictly required. Merge city/state/zip into single address lookup where possible.
