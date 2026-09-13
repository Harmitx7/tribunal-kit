---
name: baseline-ui
description: Use when Quickly deslop UI code by fixing spacing, hierarchy, typography, contrast, and small layout issues. Use when the interface needs a fast cleanup or polish pass.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - better-ui
  - frontend-design
  - better-colors
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Baseline UI — Fast Deslopping & Hierarchy Cleanup

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `baseline-ui` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Quickly deslop UI code by fixing spacing, hierarchy, typography, contrast, and small layout issues. Use when the interface needs a fast cleanup or polish pass.
- **DO NOT activate when:** The task falls outside the `baseline-ui` domain or is managed by a different dedicated specialist.

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

## 1. Stack & System Constraints

- **Tailwind CSS Defaults**: MUST use Tailwind CSS default utilities unless custom values already exist or are explicitly requested.
- **Animation Primitives**: MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required.
- **Utility Class Merging**: MUST use `cn` utility (`clsx` + `tailwind-merge`) for dynamic class logic.
- **Accessible Component Primitives**: MUST use established accessible primitives (`Base UI`, `React Aria`, `Radix`) for anything with keyboard or focus behavior. Prefer `Base UI` for new unstyled primitives.
- **Destructive Actions**: MUST use an `AlertDialog` for destructive or irreversible actions.
- **Loading States**: SHOULD use structural skeletons for loading states instead of plain spinners.

---

## 2. The 5-Step UI Deslop Protocol

1. **Fix Spacing Violations**: Replace hardcoded arbitrary margins/paddings (`margin-top: 13px`, `padding: 7px 11px`) with an 8px grid system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
2. **Establish Typographic Hierarchy**: Max 3 font sizes per component context. Headings bold/semibold with tight letter-spacing (`-0.025em`) and `text-wrap: balance`. Body text regular with `1.5` line height.
3. **Elevate Contrast Ratios**: Eliminate low-contrast gray-on-gray text. Ensure text meets minimum WCAG AA 4.5:1 ratio against background.
4. **Clean Up Borders & Dividers**: Replace harsh 100% opaque black/white borders with subtle 8%-12% opacity borders (`border-color: rgba(255,255,255,0.08)` or `var(--border)`).
5. **Enforce Container Alignment & Active Feedback**: Align text left with action buttons, group related controls with flex gaps, and add instant press feedback (`scale(0.97)`) on all interactive targets.

---

## Anti-Slop Table

| Slop Pattern                        | Baseline Fix                                    | Rationale                                   |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `color: #888` on dark background    | `color: var(--text-muted)` (min 4.5:1 ratio)    | Improves readability and WCAG compliance    |
| `padding: 15px 23px`                | `padding: 16px 24px`                            | Aligns to 8px structural grid               |
| `border: 1px solid black`           | `border: 1px solid rgba(0,0,0,0.1)`             | Removes harsh, distracting lines            |
| Mixed font sizes (13px, 14px, 15px) | Standardized scale (12px, 14px, 16px)           | Establishes clear visual hierarchy          |
| Plain text buttons without states   | Rounded button with hover/active press feedback | Indicates clickability and tactile response |

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
