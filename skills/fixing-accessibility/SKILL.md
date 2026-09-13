---
name: fixing-accessibility
description: Use when Audit and fix HTML accessibility issues including ARIA labels, keyboard navigation, focus management, color contrast, and form errors. Use when adding interactive controls, forms, dialogs, or reviewing WCAG compliance.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - audit-and-fix
  - build-primitive
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Fixing Accessibility — WCAG 2.2 AA Audit & Remediation

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `fixing-accessibility` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Audit and fix HTML accessibility issues including ARIA labels, keyboard navigation, focus management, color contrast, and form errors. Use when adding interactive controls, forms, dialogs, or reviewing WCAG compliance.
- **DO NOT activate when:** The task falls outside the `fixing-accessibility` domain or is managed by a different dedicated specialist.

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

## 1. Priority Priority Matrix (WCAG 2.2 AA)

| Priority | Category                         | Critical Requirements                                                                                                                                                                                             |
| -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | **Accessible Names**             | Every icon button MUST have `aria-label` or `aria-labelledby`. Decorative icons MUST have `aria-hidden="true"`.                                                                                                   |
| **P2**   | **Keyboard Access**              | All interactive controls MUST be reachable and operable via `Tab` / `Shift+Tab`, `Space`, `Enter`. NEVER use `<div>` or `<span>` as clickable elements without `role="button"`, `tabIndex={0}`, and key handlers. |
| **P3**   | **Focus & Dialogs (SC 2.4.11)**  | Modals/Dialogs MUST trap focus within the dialog container while open, return focus on close, dismiss on `Escape`, and ensure focused items are **never fully obscured by sticky headers/footers**.               |
| **P4**   | **Focus Appearance (SC 2.4.13)** | Focus indicators MUST be clearly visible (`:focus-visible`), achieve at least **3:1 contrast** against adjacent background, and have a min **2px thickness**.                                                     |
| **P5**   | **Target Size (SC 2.5.8)**       | Interactive controls MUST measure at least **24x24 CSS pixels** (min **44x44px** recommended for mobile touch targets) or have sufficient non-intersecting spacing.                                               |
| **P6**   | **Color & Contrast**             | Text MUST satisfy WCAG AA 4.5:1 ratio (3.0:1 for large text). Color alone MUST NOT be the only indicator of state or error.                                                                                       |
| **P7**   | **Form Validation**              | Inputs MUST have explicit `<label>` or `aria-labelledby`. Errors MUST use `aria-invalid="true"` and `aria-describedby` pointing to error text.                                                                    |

---

## 2. Accessible Code Patterns

### Icon-Only Button

```tsx
// ✅ SAFE & ACCESSIBLE
<button
  type="button"
  onClick={onClose}
  className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
  aria-label="Close dialog"
>
  <XIcon className="w-5 h-5" aria-hidden="true" />
</button>
```

### Accessible Modal Dialog Focus Trap

```tsx
// ✅ SAFE & ACCESSIBLE
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
>
  <div className="bg-surface p-6 rounded-xl max-w-md w-full">
    <h2 id="dialog-title" className="text-xl font-bold">
      Confirm Deletion
    </h2>
    <p id="dialog-description" className="text-muted mt-2">
      This action cannot be undone.
    </p>
    {/* Actions */}
  </div>
</div>
```

---

## Anti-Slop Table

| Violation                            | Accessible Fix                                                               | Impact                                              |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `<div onClick={submit}>Submit</div>` | `<button type="button" onClick={submit}>Submit</button>`                     | Fixes screen reader announcement & keyboard trigger |
| `<button><TrashIcon /></button>`     | `<button aria-label="Delete item"><TrashIcon aria-hidden="true" /></button>` | Gives screen reader clear accessible name           |
| `outline: none` in CSS               | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`    | Restores visible keyboard focus indicator           |

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
| **Hardcoded Secret Pattern** | Committing API keys, tokens, or private salts into source code | Load credentials strictly via runtime environment variables and secret stores |
| **Prompt Injection Surface** | Directly concatenating untrusted user input into LLM system prompts | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are user inputs sanitized and treated as untrusted at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive customer data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
