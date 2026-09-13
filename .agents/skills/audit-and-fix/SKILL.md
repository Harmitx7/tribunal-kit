---
name: audit-and-fix
description: Use when Accessibility auditing and remediation workflow combining detection, prioritization, and practical code fixes for WCAG 2.2 AA compliance issues.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - fixing-accessibility
  - build-primitive
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Audit and Fix — Accessibility Remediation Workflow

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `audit-and-fix` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Accessibility auditing and remediation workflow combining detection, prioritization, and practical code fixes for WCAG 2.2 AA compliance issues.
- **DO NOT activate when:** The task falls outside the `audit-and-fix` domain or is managed by a different dedicated specialist.

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

## 4-Step Remediation Pipeline

### 1. Automated Violation Detection

Scan component code for:

- Missing `alt` tags on `<img>` elements.
- Form controls (`<input>`, `<select>`) missing associated `<label>` or `aria-label`.
- Buttons with icon-only content missing `aria-label`.
- Non-interactive elements (`<div>`, `<span>`) with `onClick` handlers missing `role="button"` and `tabIndex={0}`.

### 2. Prioritization Matrix

| Severity Level             | Violation Type                                                                   | Remediation Action                                                     |
| -------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 🔴 **Blocker (Level A)**   | Inaccessible form inputs, un-trapped focus in modal, zero keyboard access        | Add explicit `<label>`, focus trap, and keyboard handlers immediately. |
| 🟠 **Critical (Level AA)** | Low text contrast ratio ($< 4.5:1$), missing ARIA states on custom dropdowns     | Adjust text colors to OKLCH contrast targets; add `aria-expanded`.     |
| 🟡 **Moderate (Level AA)** | Missing landmark regions (`<main>`, `<nav>`, `<header>`), heading hierarchy gaps | Wrap layout blocks in semantic HTML5 tags.                             |

### 3. Concrete Code Fix Examples

```tsx
// BEFORE (Inaccessible)
<div onClick={submitForm} className="btn">Submit</div>

// AFTER (Accessible)
<button type="submit" onClick={submitForm} className="btn">Submit</button>
```

```tsx
// BEFORE (Icon Only Button)
<button onClick={openSettings}><SettingsIcon /></button>

// AFTER (Accessible Icon Button)
<button onClick={openSettings} aria-label="Open settings"><SettingsIcon aria-hidden="true" /></button>
```

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
