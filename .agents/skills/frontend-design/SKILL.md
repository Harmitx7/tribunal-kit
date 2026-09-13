---
name: frontend-design
description: Use when Design engineering principles for React/Next.js. Relative color syntax (OKLCH), spatial grid math, fluid container queries, and contrast validation.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - baseline-ui
  - better-colors
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Frontend Design — Technical Spacing & Color Science

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `frontend-design` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Design engineering principles for React/Next.js. Relative color syntax (OKLCH), spatial grid math, fluid container queries, and contrast validation.
- **DO NOT activate when:** The task falls outside the `frontend-design` domain or is managed by a different dedicated specialist.

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

## 1. Relative Color Syntax & OKLCH Theme Tokens

Perceptually uniform color science ensures stable contrast. Use CSS **Relative Color Syntax** to derive state colors dynamically:

```css
:root {
  /* base color values */
  --color-primary: oklch(62% 0.21 250); /* Brand electric blue */

  /* Deriving hover states dynamically: reduce lightness, preserve chroma and hue */
  --color-primary-hover: oklch(from var(--color-primary) calc(l - 0.08) c h);
  --color-primary-active: oklch(from var(--color-primary) calc(l - 0.12) c h);

  /* Backgrounds */
  --bg-surface: oklch(100% 0 0);
  --text-main: oklch(20% 0.02 250);
}

[data-theme='dark'] {
  --bg-surface: oklch(14% 0.008 250);
  --text-main: oklch(93% 0.003 250);
}
```

---

## 2. Spatial Grid Math & Radius Tokens

Enforce an 8px spatial grid calculated mathematically to ensure alignment precision:

```css
:root {
  --base-grid: 8px;

  --space-xs: calc(var(--base-grid) * 0.5); /* 4px  - icon gaps */
  --space-sm: calc(var(--base-grid) * 1); /* 8px  - tag paddings */
  --space-md: calc(var(--base-grid) * 2); /* 16px - inputs */
  --space-lg: calc(var(--base-grid) * 3); /* 24px - card padding */
  --space-xl: calc(var(--base-grid) * 4); /* 32px - section gaps */
}
```

### Nested Radius Formula

Ensure component inner borders track correctly:
`outer_radius = inner_radius + padding_inner`
If container padding is `16px` and inner content radius is `8px`, then container outer radius must be exactly `24px` (`8px + 16px`).

---

## 3. Responsive Layouts & Container Queries

Avoid viewport-level media queries for self-contained components. Use container queries to make components portable:

```css
.component-wrapper {
  container-type: inline-size;
  container-name: component;
}

@container component (min-width: 450px) {
  .inner-layout {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }
}
```

---

## 4. APCA Contrast Guidelines

Ensure that typography meets the APCA Lc guidelines:

- Lc > 75 for body text elements.
- Lc > 60 for large titles and headings.
- Lc > 45 for secondary input labels and border guides.

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
