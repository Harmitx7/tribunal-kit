---
name: ui-design-director
description: "Formulates bespoke art direction, visual theme presets, and authoritative Design Decision Records (DDR) prior to frontend implementation. Translates product category, user persona, and brand attributes into structured OKLCH palettes, spatial formulas, typography hierarchies, and strict anti-slop exclusions."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - frontend-design
  - better-colors
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  productCategory: "string"
  brandAttributes: "array"
  targetAudience: "string"
outputs:
  designDecisionRecord: "object"
  artDirectionSpecs: "object"
  antiSlopExclusions: "array"
trigger:
  - "design-director"
  - "art-direction"
  - "visual-direction"
  - "formulate-ddr"
---

# UI Design Director — Bespoke Art Direction & DDR Formulation

## Mandatory Pre-Flight Context Inspection
Before issuing design direction or formulating a Design Decision Record, inspect these 5 critical parameters:
1. **Product Category & Archetype**: Map domain (`DEV_TOOL`, `B2B_SAAS`, `FINTECH`, `CONSUMER_MOBILE`, `DATA_DENSE`) to an authoritative visual preset (`TECHNICAL_UTILITARIAN`, `MODERN_PRODUCT_CRAFT`, `DENSE_ANALYTICAL`, `MINIMAL_EDITORIAL`, `SOFT_APPROACHABLE`).
2. **Audience Cognitive Load**: Determine information density tolerance, scanning speed requirements, and technical literacy of end users.
3. **Contrast & Compliance Floor**: Enforce APCA / WCAG 2.2 AA contrast floors ($\Delta L \ge 0.45$ in OKLCH) before aesthetic flourishes.
4. **Anti-Slop Boundaries**: Exclude default AI tropes (generic purple gradients, unnested border radii, centered empty cards, floating amorphous blobs).
5. **Architectural Target**: Verify whether design decisions target Tailwind v4, CSS Custom Properties, or design system tokens.

## Activation Boundaries
- **Activate when:** Starting a new frontend feature, building a new interface screen, redesigning existing UI flows, or establishing art direction for a project.
- **DO NOT activate when:** Executing isolated CSS bug fixes, micro-copy typo adjustments, or running headless browser automated tests.

## 🔁 Multi-Pass Art Direction Protocol

| Pass | Phase | Core Action | Observable Target |
|:---|:---|:---|:---|
| **Pass 1** | **Category Mapping** | Analyze product domain and select foundational visual archetype. | Visual Preset Key |
| **Pass 2** | **Color & Palette Strategy** | Derive OKLCH color harmony scale (surface-0 through surface-3, text, primary accent, neutral chrome). | OKLCH Color Tokens |
| **Pass 3** | **Spatial & Radius Formulation** | Establish base grid (8pt), nested radius invariants ($R_o = R_i + P$), and surface elevation steps. | Spatial Geometry Spec |
| **Pass 4** | **Anti-Slop Vetting** | Cross-examine token choices against AI slop anti-patterns (no purple gradients, no floating pills). | Anti-Slop Exclusion List |
| **Pass 5** | **DDR Synthesis & Seal** | Compile complete machine-readable and markdown Design Decision Record (DDR). | Authoritative DDR Artifact |

---

## 🛠️ Technical Architecture & Direction Recipes

### 1. Visual Archetype Selection Matrix
```javascript
const { selectArtDirectionPreset, buildDesignDecisionRecord } = require('../../src/design_intelligence/art_direction_engine');

// Select appropriate preset based on product domain
const preset = selectArtDirectionPreset('DEV_TOOL');
// Output: TECHNICAL_UTILITARIAN
// Surface: oklch(0.12 0.01 260), Text: oklch(0.96 0.005 260), Accent: oklch(0.72 0.16 150) (terminal emerald)
// Radii: outer: 8px, inner: 4px, baseGrid: 8px
```

### 2. Design Decision Record (DDR) Schema
Every DDR must contain these immutable structural sections:
```markdown
# Design Decision Record (DDR): [Feature Name]
- **Visual Direction:** TECHNICAL_UTILITARIAN | MODERN_PRODUCT_CRAFT | DENSE_ANALYTICAL | MINIMAL_EDITORIAL | SOFT_APPROACHABLE
- **Core Intent:** High scannability, zero cognitive fatigue, ergonomic density.
- **Color Architecture (OKLCH):**
  - `--surface-0`: `oklch(0.12 0.01 260)` (deep canvas)
  - `--surface-1`: `oklch(0.16 0.012 260)` (card background)
  - `--text-primary`: `oklch(0.96 0.005 260)` ($\Delta L = 0.84$ against canvas)
  - `--accent-primary`: `oklch(0.72 0.16 150)` (luminous emerald)
- **Spatial Geometry:**
  - Base Unit: 8px
  - Container Radius ($R_o$): 16px
  - Child Padding ($P$): 12px
  - Inner Element Radius ($R_i$): $R_o - P = 4\text{px}$
- **Anti-Slop Exclusions:**
  - ❌ BANNED: Purple/violet primary brand accents (`#7c3aed`, `oklch(0.6 0.25 290)`).
  - ❌ BANNED: `transition: all`.
  - ❌ BANNED: Drop shadows without 1px luminous borders in dark mode.
```

---

## 🏛️ Tribunal Verification & Guardrails

### 🛑 Verification-Before-Completion (VBC) Protocol
1. Verify that the DDR specifies mathematical nested radii ($R_o = R_i + P$).
2. Confirm contrast ratio between `--text-primary` and `--surface-0` meets $\Delta L \ge 0.45$.
3. Ensure at least 3 specific anti-slop exclusions are enumerated in the DDR.

