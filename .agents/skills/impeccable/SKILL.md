---
name: impeccable
description: Use when Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - better-colors
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Impeccable — Production-Grade Frontend Craft

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `impeccable` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Flagship design engineering skill for creating production-grade, anti-generic frontend interfaces with supreme craftsmanship, visual hierarchy, typography, spatial systems, and micro-interactions.
- **DO NOT activate when:** The task falls outside the `impeccable` domain or is managed by a different dedicated specialist.

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

## Core Pillars of Impeccable UI

### 1. Typography & Typographic Rhythm

- **Optical Sizing & Tracking**: Large display headings (32px+) require tight letter-spacing (`letter-spacing: -0.03em`). Small caption text (12px) requires positive tracking (`letter-spacing: +0.01em`).
- **Tabular Numbers**: Any numeric data that updates, increments, or displays in columns MUST use `font-variant-numeric: tabular-nums` or `font-feature-settings: "tnum"` to prevent visual jitter.
- **Text Wrapping & Balance**: Headings MUST use `text-wrap: balance` to prevent typographic orphans. Body paragraphs MUST use `text-wrap: pretty` (where supported) or max `65ch` width.

### 2. Color Systems & Gamut Precision

- **OKLCH Color Space**: Prefer `oklch()` over `hsl()` or `hex` for smooth perceptual uniformity across hue and lightness shifts.
- **Subtle Surface Steps**: Define surface colors with small perceptual lightness steps ($L \pm 2\%$) to create hierarchy without harsh dividers.
- **Adaptive Contrast**: Text contrast MUST adapt automatically across light/dark themes with high legibility ratios ($\ge 7:1$ for primary, $\ge 4.5:1$ for secondary).

### 3. Motion & Micro-Interactions

- **Intentional Motion**: Animations exist ONLY to convey spatial continuity, provide press feedback, or indicate state changes.
- **Duration Constraints**: Micro-interactions $\le 160\text{ms}$; dropdowns/popovers $\le 220\text{ms}$; page transitions $\le 300\text{ms}$.
- **Physically Grounded Entrances**: Elements scale in from `scale(0.96)` and opacity `0`, anchored to their trigger origin.
- **DOM Entry (@starting-style)**: Use `@starting-style` with `transition-behavior: allow-discrete` for smooth `display: none` to `display: block` entrance animations without JS overhead.

### 4. Layout Mechanics & Spatial Math

- **8px Grid System**: Every margin, padding, gap, and height MUST derive from an 8px grid (or 4px micro-grid).
- **Asymmetrical Balance**: Avoid cookie-cutter centered layouts for SaaS apps. Use strong left-aligned structural axes with generous negative space.
- **Container Queries**: Components adjust layout based on container size (`@container`), not viewport size (`@media`), making them context-agnostic.
- **WCAG 2.2 AA Target Size (SC 2.5.8)**: All interactive targets MUST measure at least `24x24px` CSS pixels (min `44x44px` for touch).

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
