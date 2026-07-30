---
name: create-design-md
description: Create or update a DESIGN.md from an existing product repository or public website, with evidence-based design tokens and guidance. Use when asked to document an interface's design language, reconstruct its visual system, extract design tokens, or give coding agents persistent UI context.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - baseline-ui
  - better-ui
  - better-colors
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Create DESIGN.md — Evidence-Based Design System Specification

---

## Mandatory Pre-Flight Context Inspection

Before extracting design tokens or authoring `DESIGN.md`, you MUST inspect:
1. Operating Mode (Section 22) → Choose Repository Mode (scan `globals.css` / `theme.ts` / primitives) or URL Mode (3-proof observation)
2. Contract Schema (Section 41) → Enforce strict 5-section layout (Identity, Colors, Typography, Spacing/Geometry, Motion)
3. Read-Only Safety (Section 86) → NEVER mutate product source code while extracting tokens or creating `DESIGN.md`

Generate or update an authoritative `DESIGN.md` file for a product repository or website by extracting verified design tokens, components, and layout guidance.

---

## 1. Operating Modes

### Repository Mode (Source Code Available)
1. Scan existing global CSS, Tailwind config, tokens, custom properties (`--color-*`, `--font-*`), and UI primitives (`components/ui/`).
2. Order of inspection:
   - Global variables / tokens (`index.css`, `globals.css`, `theme.ts`)
   - Reusable primitives & variants (`button`, `card`, `dialog`, `input`)
   - Page routes and layouts
3. Record canonical values with exact code references.

### URL Mode (Public Web Page)
1. Inspect computed styles, loaded stylesheets, and DOM element roles at Desktop (1440px) and Mobile (375px) breakpoints.
2. Require 3 proofs before documenting a value:
   - **Observation**: Visible or computed on rendered element.
   - **Basis**: Measured or recurs across sampled pages.
   - **Consequence**: Directly influences UI implementation decisions.

---

## 2. DESIGN.md Contract Schema

Output must strictly adhere to the following schema structure:

```markdown
# DESIGN.md — Product Design System

## 1. Visual Identity & Brand Foundations
- **Core Philosophy**: (e.g. Quiet editorial minimalism with dense information display)
- **Primary Aesthetic**: (e.g. Subtly tinted dark mode, OKLCH color space)

## 2. Color System & Tokens
- **Backgrounds**: `--bg-surface` (`oklch(0.14 0.015 250)`), `--bg-surface-raised` (`oklch(0.19 0.02 250)`)
- **Text & Foreground**: `--text-main` (`oklch(0.96 0.01 250)`), `--text-muted` (`oklch(0.68 0.02 250)`)
- **Accents**: `--color-primary` (`oklch(0.55 0.22 260)`)
- **Borders & Dividers**: `1px solid rgba(255, 255, 255, 0.08)`

## 3. Typography & Scale
- **Headings**: Inter / SF Pro Display, `letter-spacing: -0.025em`, `text-wrap: balance`
- **Body**: Inter / SF Pro Text, `line-height: 1.5`, `max-width: 65ch`
- **Data / Numbers**: `font-variant-numeric: tabular-nums`

## 4. Spacing, Geometry & Layers
- **Spatial Grid**: 8px system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`)
- **Border Radius Math**: $\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}_{\text{inner}}$
- **Shadows & Elevation**: Ambient multi-layered shadows (`0 4px 12px -2px rgba(0,0,0,0.08)`)

## 5. Micro-Interactions & Motion
- **Button Press**: `transform: scale(0.97)` on `:active` (`120ms` spring)
- **Hover Transitions**: Specific property transitions (no `transition: all`)
```

---

## Anti-Slop Table

| Anti-Pattern | DESIGN.md Standard | Rationale |
| --- | --- | --- |
| Documenting random inline styles | Documenting recurring design tokens only | Establishes enforceable product intent |
| Guessing token names from raw hex | Extracting verified CSS variables (`var(--...)`) | Ensures 1:1 code compatibility |
| Over-documenting minor one-off pages | Documenting core reusable component primitives | Focuses on systemic design guidelines |

---

## 🤖 LLM-Specific Traps

1. **Modifying Product Source**: Changing source files during design document generation. `create-design-md` is strictly read-only on product code.
2. **Inventing Token Names**: Creating fake token names not present in the codebase.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Did I base all documented tokens on verified codebase or computed style evidence?
✅ Is the generated DESIGN.md saved at the root of the target project?
✅ Does the document follow the standardized 5-section schema contract?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Validate `DESIGN.md` against existing CSS variables to ensure zero token mismatches.
