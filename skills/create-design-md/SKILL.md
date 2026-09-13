---
name: create-design-md
description: Use when Create or update a DESIGN.md from an existing product repository or public website, with evidence-based design tokens and guidance. Use when asked to document an interface's design language, reconstruct its visual system, extract design tokens, or give coding agents persistent UI context.
version: 5.0.0
last-updated: 2026-09-13
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

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `create-design-md` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Create or update a DESIGN.md from an existing product repository or public website, with evidence-based design tokens and guidance. Use when asked to document an interface's design language, reconstruct its visual system, extract design tokens, or give coding agents persistent UI context.
- **DO NOT activate when:** The task falls outside the `create-design-md` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


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

| Anti-Pattern                         | DESIGN.md Standard                               | Rationale                              |
| ------------------------------------ | ------------------------------------------------ | -------------------------------------- |
| Documenting random inline styles     | Documenting recurring design tokens only         | Establishes enforceable product intent |
| Guessing token names from raw hex    | Extracting verified CSS variables (`var(--...)`) | Ensures 1:1 code compatibility         |
| Over-documenting minor one-off pages | Documenting core reusable component primitives   | Focuses on systemic design guidelines  |

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
