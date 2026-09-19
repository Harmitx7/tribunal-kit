---
name: swiss-design
description: "Use when International Typographic Style (Swiss Design) principles for web interfaces. Strict grid discipline, asymmetric layouts, bold typographic contrast, flush-left un-justified text, and mathematical negative space."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - typeset
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Swiss Design — International Typographic Style for Web

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 Swiss Design Pillars

### 1. Strict Grid Alignment

- Every layout element MUST align strictly to a visible or invisible 12-column grid.
- Border dividers use thin, sharp 1px solid lines matching `--foreground` opacity (e.g. `border-color: rgba(0,0,0,0.15)`).

### 2. High-Contrast Sans-Serif Typography

- Use clean grotesque sans-serif fonts (Helvetica, Inter, Geist, Neue Haas Grotesk).
- Pair large bold display titles (`3rem+`, `font-weight: 700`, `letter-spacing: -0.03em`) with clean flush-left, rag-right body copy (`text-align: left`).

### 3. Asymmetric Structural Balance

- Reject centered, symmetrical layouts. Align headings and content to strong left vertical axes, using generous negative space to anchor visual weight.

### 4. Mathematical Numbering & Labels

- Use small uppercase metadata badges (`SECTION 01 // OVERVIEW`) with tracking (`letter-spacing: 0.08em`) and monospace or tabular numbers (`font-variant-numeric: tabular-nums`).
