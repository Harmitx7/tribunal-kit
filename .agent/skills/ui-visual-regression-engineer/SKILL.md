---
name: ui-visual-regression-engineer
description: "Conducts automated pixel-level visual regression testing, perceptual image diffing (SSIM / delta E), and DOM structural variance analysis between baseline and candidate UI screenshots. Identifies unintended layout shifts, font reflows, color shifts, clipping defects, and component rendering regressions across releases."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - browser-audit
  - playwright-best-practices
  - webapp-testing
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  baselineScreenshotPath: "string"
  candidateScreenshotPath: "string"
  diffThreshold: "number"
outputs:
  visualDiffReport: "object"
  regressionScore: "number"
  diffArtifactPath: "string"
trigger:
  - "visual-regression-engineer"
  - "screenshot-diff"
  - "ui-diffing"
  - "visual-regression-test"
---

# UI Visual Regression Engineer — Automated Pixel & DOM Diffing

## Mandatory Pre-Flight Context Inspection
Before running or interpreting visual regression diffs, inspect these 5 critical parameters:
1. **Deterministic Render State**: Ensure animations are disabled (`prefers-reduced-motion: reduce`), fonts are fully rendered (`document.fonts.ready`), and network idle is achieved prior to capturing screenshots.
2. **Tolerance Threshold Configuration**: Configure perceptual difference threshold (typically $\le 0.01$ or 1% pixel mismatch) to accommodate antialiasing variance without missing true regressions.
3. **Viewport & DPI Parity**: Guarantee baseline and candidate screenshots share identical viewport dimensions, device scale factor (DPI), and color profile.
4. **Mask Dynamic Content**: Mask non-deterministic content (timestamps, avatars, dynamic user IDs) with neutral placeholders before diff calculation.
5. **Diff Artifact Output**: Output high-contrast difference heatmaps (highlighting changed pixels in magenta) for clear human inspection.

## Activation Boundaries
- **Activate when:** Verifying UI changes against existing baselines, running pre-merge visual CI checks, detecting unintended styling regressions, or validating multi-theme visual parity.
- **DO NOT activate when:** Auditing headless backend APIs or validating database query performance.

## 🔁 Multi-Pass Visual Regression Protocol

| Pass | Phase | Core Action | Observable Target |
|:---|:---|:---|:---|
| **Pass 1** | **Pre-Flight Masking** | Identify dynamic timestamps/data and apply screenshot masks. | Deterministic Render |
| **Pass 2** | **Capture Candidate** | Render candidate page in headless browser and capture viewport PNG. | Candidate Screenshot |
| **Pass 3** | **Perceptual Pixel Diff** | Compute pixel delta and SSIM (Structural Similarity Index) against baseline. | Pixel Diff Heatmap |
| **Pass 4** | **DOM Structural Compare** | Compare computed bounding boxes to isolate specific shifting elements. | Element Delta Map |
| **Pass 5** | **Verdict & Reporting** | Issue PASS/FAIL verdict based on configured regression threshold. | Visual Regression Report |

---

## 🛠️ Technical Architecture & Regression Recipes

### 1. Programmatic Visual Diffing Recipe
```javascript
const path = require('path');
const fs = require('fs');

async function evaluateVisualDiff(baselinePng, candidatePng, threshold = 0.01) {
  // Uses Tribunal-Kit's native browser comparison utility
  const { compareScreenshots } = require('../../src/browser/compare');

  const diffResult = await compareScreenshots(baselinePng, candidatePng, {
    diffColor: [255, 0, 128], // Luminous magenta for diff overlay
    threshold,
  });

  console.log(`Mismatch Percentage: ${(diffResult.mismatchRatio * 100).toFixed(2)}%`);
  console.log(`Regression Detected: ${diffResult.mismatchRatio > threshold}`);

  return diffResult;
}
```

### 2. Regression Tolerance Matrix

| Component Type | Permissible Pixel Mismatch | Required Action on Breach |
|:---|:---:|:---|
| Global Shell & Navigation | $0.00\%$ | Immediate release block; revert change. |
| Typography & Headlines | $\le 0.02\%$ | Inspect for unintended font family or weight fallback. |
| Data Visualizations & Charts | $\le 0.10\%$ | Verify scale coordinates and tick labels. |
| Dynamic Content Cards | $\le 0.05\%$ | Verify container bounding box didn't shift. |

---

## 🏛️ Tribunal Verification & Guardrails

### 🛑 Verification-Before-Completion (VBC) Protocol
1. Verify screenshot capture occurred after network idle and font load completion.
2. Confirm diff mismatch ratio is below the defined tolerance threshold.
3. Verify diff heatmap artifact is persisted to `benchmarks/artifacts/` on regression failure.

