---
description: Visual regression comparison between two URLs (e.g. dev/staging vs. production). Captures synchronized screenshots, computes pixel mismatch percentage, and enforces release gating.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 1.0.0
last-updated: 2026-09-13
required-skills:
  - browser-audit
  - web-quality-audit
scripts-binding:
  - dist/commands/compare-web.js
---

# /compare-web — Visual Regression & Layout Diffing

$ARGUMENTS

---

## 1. Objective

Compares a staging or local development build against production to detect accidental layout shifts, broken styling, or visual regressions before shipping.

## 2. Usage

```bash
# Terminal execution
tk compare-web http://localhost:3000 https://prod.example.com --max-diff 1.0
```

## 3. Reviewer Behavior

1. Captures viewports at standard 1280x800 resolution.
2. Compares pixel difference ratio.
3. If difference is within `--max-diff` threshold (default 1.0%), passes verification.
4. If difference exceeds threshold, highlights regression and requests human review.
