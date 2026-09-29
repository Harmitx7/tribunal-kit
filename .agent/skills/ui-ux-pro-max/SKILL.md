---
name: ui-ux-pro-max
description: "Use when building, styling, optimizing, and auditing ui ux pro max components, responsive layouts, design systems, and frontend state."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - ui-reasoning-engine
  - product-aware-heuristics
  - frontend-design
  - web-design-guidelines
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# UI/UX Pro Max v3.0 — The Picasso Protocol

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `ui-ux-pro-max` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when building, styling, optimizing, and auditing ui ux pro max components, responsive layouts, design systems, and frontend state.
- **DO NOT activate when:** The task falls outside the `ui-ux-pro-max` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Picasso Protocol Design Invariants

1. **Anti-Cliché Palette Discipline**:
   Never use purple (#7c3aed / #8b5cf6) as primary brand color. Curate characterful palettes: Obsidian + Signal Orange, Slate + Electric Cyan, or Bone White + Deep Emerald.
2. **Intentional Typography Pairing**:
   Pair an expressive display font (e.g., Clash Display, Syne, Cabinet Grotesk, Newsreader) with an ultra-readable neutral body font (e.g., Geist Sans, Plus Jakarta Sans, General Sans).
3. **Fluid Layout Bounds & Asymmetry**:
   Break repetitive bento grids. Use asymmetric column spans (e.g. 7:5 or 8:4), overlapping cards, and ambient grain overlays.

---

## 🚨 Design Governance Guardrails (REJECTION Rules)

- ❌ **Primary Purple Accents:** Banned. Use electric blue, signal orange, coral, warm slate, or natural sage.
- ❌ **Inter/Roboto Defaults:** Banned. Display titles must use characterful display fonts; body text uses readable body options.
- ❌ **Left Text/Right Image Hero:** Banned. Use full-bleed, asymmetric overlap, or typographical layouts.
- ❌ **Radial Mesh Backgrounds:** Banned. Use ambient grain overlay, solid high-contrast depth, or radial tinting.
- ❌ **Bento Box Grid Overuse:** Banned. Break the grid intentionally for visual interest.
- ❌ **Flat Glassmorphic Panels:** Banned. Translucency should only be used as a rare overlay, not for main containers.
- ❌ **No States Feedback:** Banned. Every control must have styled states (Hover, Focus-visible, Active, Disabled).

---

## 1. Color Gamuts & Display-P3 Color Science

Use dynamic OKLCH variables to access the wider Display-P3 color spectrum for stunning vibrancy. Perceptually uniform lightness ensures stable contrast:

```css
:root {
  /* oklch(Lightness Chroma Hue / Alpha) */
  --color-primary: oklch(65% 0.22 250); /* Brand electric blue */
  --color-primary-hover: oklch(58% 0.22 250); /* Darker active state */
  --bg-base: oklch(0.08 0.005 250); /* OLED base background */
  --bg-surface: oklch(0.12 0.008 250); /* Stepped card surface */
  --border-subtle: oklch(22% 0.01 250 / 0.4); /* Hairline separator */
}
```

### Color Gamut Guidelines

- **Display-P3 Saturated Accents:** When targeting high-end modern screens, use chroma values between `0.20` and `0.28`.
- **Stepped Neutral Contrast:** Stepped neutral surfaces must increase by `0.04` Lightness increments (e.g., base `0.08` → surface `0.12` → raised `0.16` → overlay `0.20`) to create physical depth without color tint deviations.

---

## 2. Typographical Tracking & scaling

Headings must use `clamp()` for fluid sizing and tight negative letter spacing (tracking) to prevent loose display layouts:

| Token         | Clamp Value                  | Weight | Line Height | Tracking           |
| :------------ | :--------------------------- | :----- | :---------- | :----------------- |
| `--text-hero` | `clamp(2.5rem, 6vw, 4.5rem)` | 800    | 0.95        | `-0.04em` (Tight)  |
| `--text-h1`   | `clamp(2.0rem, 4vw, 3.0rem)` | 700    | 1.05        | `-0.03em`          |
| `--text-h2`   | `clamp(1.5rem, 3vw, 2.0rem)` | 600    | 1.15        | `-0.02em`          |
| `--text-body` | `1rem`                       | 400    | 1.60        | `0` (Normal)       |
| `--text-sm`   | `0.875rem`                   | 400    | 1.50        | `+0.005em` (Loose) |

- **BALANCED Headings:** Always declare `text-wrap: balance` on all dynamic title elements to prevent visual orphans.
- **Reading Measures:** Paragraph widths must be clamped to `65ch` max width (`max-width: 65ch`) to reduce cognitive scan overhead.

---

## 3. Depth Shadows & Layering Math

Flat shadows look cheap. Premium interfaces use physics-based multi-layered shadows to simulate light occlusion:

```css
/* Stepped ambient + key shadow coefficients */
.elevation-md {
  box-shadow:
    0 1px 2px oklch(0% 0 0 / 0.05),
    /* Ambient shadow */ 0 4px 12px oklch(0% 0 0 / 0.08),
    /* Key shadow */ 0 0 1px oklch(100% 0 0 / 0.12); /* Hairline luminous stroke */
}
```

- In dark themes, shadows should drop in opacity and be accompanied by luminous hairlines (`border: 1px solid oklch(100% 0 0 / 0.08)`) instead of thick black shadows.

---

## 4. Interaction States & Transitions

All buttons and active controls must define styled properties for:

- `hover`, `focus-visible`, `active`/`pressed`, and `disabled` states.
- Use spring easing curves: `cubic-bezier(0.34, 1.56, 0.64, 1)`.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard navigation, contrast ratio >= 4.5:1) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
