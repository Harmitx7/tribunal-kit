---
name: better-typography
description: "Use when building, styling, optimizing, and auditing better typography components, responsive layouts, design systems, and frontend state."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "better"
  - "typography"
---

# Better Typography — Web Typography & Font Engineering

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `better-typography` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when building, styling, optimizing, and auditing better typography components, responsive layouts, design systems, and frontend state.
- **DO NOT activate when:** The task falls outside the `better-typography` domain or is managed by a different dedicated specialist agent.


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

## 1. Modular Type Scales & Line Cadence

Scale font sizes using a consistent multiplier ($1.25$ Major Third or $1.20$ Minor Third):

```css
:root {
  --font-size-xs: 0.75rem; /* 12px - Labels, Badges */
  --font-size-sm: 0.875rem; /* 14px - Meta, Caption */
  --font-size-base: 1rem; /* 16px - Body Text */
  --font-size-lg: 1.125rem; /* 18px - Lead Body */
  --font-size-xl: 1.375rem; /* 22px - Subheadings */
  --font-size-2xl: 1.75rem; /* 28px - H3 */
  --font-size-3xl: 2.25rem; /* 36px - H2 */
  --font-size-4xl: 3rem; /* 48px - H1 Hero */

  /* Line Heights proportional to font size */
  --line-height-heading: 1.15;
  --line-height-body: 1.5;
  --line-height-tight: 1.25;
}
```

---

## 2. Line Length (Measure) & Text Wrapping

- **Optimal Line Length (Measure)**: Body text MUST be constrained between **45 to 75 characters** per line (`max-width: 65ch`).
- **Heading Balancing**: Always apply `text-wrap: balance` to headings (`h1`-`h4`) to eliminate single-word widows.
- **Paragraph Wrapping**: Use `text-wrap: pretty` for long body paragraphs to prevent awkward line breaks.

```css
h1,
h2,
h3,
h4 {
  text-wrap: balance;
  letter-spacing: -0.025em;
  line-height: var(--line-height-heading);
}

p {
  max-width: 65ch;
  text-wrap: pretty;
  line-height: var(--line-height-body);
}
```

---

## 3. OpenType Features & Tabular Numbers

- **Tabular Numbers for Data & Timers**: Use `font-variant-numeric: tabular-nums` (or `tnum`) for data tables, counters, prices, and timestamps so numbers align vertically without jumping when values update.
- **Font Smoothing**: Enable crisp font smoothing on macOS/iOS:

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Anti-Slop Table

| Anti-Pattern                                | Typography Solution                  | Rationale                                        |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| Full-width body text (`width: 100%`)        | `max-width: 65ch`                    | Prevents eye fatigue across wide desktop screens |
| Single-word widows on headings              | `text-wrap: balance`                 | Creates balanced visual hierarchy                |
| Jittering numbers in data tables            | `font-variant-numeric: tabular-nums` | Keeps columns strictly aligned                   |
| Default browser line-height (`1.2` on body) | `line-height: 1.5`                   | Improves reading comfort                         |

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
