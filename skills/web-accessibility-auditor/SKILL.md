---
name: web-accessibility-auditor
description: Use when Web Accessibility (a11y) mastery. WCAG 2.2 AA standards, semantic HTML, ARIA attributes, keyboard navigation, focus management, screen reader compatibility, color contrast, and dynamic content announcements. Use when building UI components or auditing frontend code for accessibility compliance.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - fixing-accessibility
  - audit-and-fix
  - build-primitive
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Web Accessibility (a11y) — Inclusive UI Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `web-accessibility-auditor` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Web Accessibility (a11y) mastery. WCAG 2.2 AA standards, semantic HTML, ARIA attributes, keyboard navigation, focus management, screen reader compatibility, color contrast, and dynamic content announcements. Use when building UI components or auditing frontend code for accessibility compliance.
- **DO NOT activate when:** The task falls outside the `web-accessibility-auditor` domain or is managed by a different dedicated specialist.

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


## Hallucination Traps (Read First)

- ❌ Adding `role='button'` to a `<div>` instead of using `<button>` -> ✅ Native HTML elements have built-in keyboard and screen reader support
- ❌ Using `aria-label` on elements that already have visible text -> ✅ Redundant ARIA overrides visible text for screen readers; use only when needed
- ❌ Color as the only indicator of state -> ✅ Always pair color with icon, text, or pattern for colorblind users (1 in 12 males)
- ❌ Assuming accessibility is a checklist to run at the end -> ✅ Build accessible from the start; retrofitting is 10x more expensive

---

---

## 1. Semantic HTML over `<div>` Soup

The first rule of ARIA: **Use native HTML elements whenever possible.**

```html
<!-- ❌ BAD: Meaningless markup, screen readers see nothing, no keyboard focus -->
<div class="submit-button" onclick="submit()">Submit</div>

<!-- ✅ GOOD: Native semantic element (inherits focus, Enter/Space key behavior) -->
<button type="submit" class="button">Submit</button>

<!-- ❌ BAD: Div as a link -->
<div onclick="goToPath('/about')">About Us</div>

<!-- ✅ GOOD: Native anchor -->
<a href="/about">About Us</a>
```

### Layout Semantics

Replace `<div class="x">` with meaning:

- `<header>` / `<footer>`
- `<nav>` (Main navigations)
- `<main>` (The primary content)
- `<article>` (Self-contained content blocks)
- `<aside>` (Sidebars, callouts)

---

## 2. Keyboard Navigation & Focus Management

Every interactive element MUST be keyboard accessible.

```css
/* ❌ BAD: Removing focus outlines ruins keyboard navigation */
*:focus {
  outline: none;
}

/* ✅ GOOD: Using :focus-visible for keyboard users only */
*:focus {
  outline: none;
} /* Hide for click */
*:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

### Managing Focus in Modals (Dialogs)

When a modal opens:

1. Focus must move into the modal (first focusable element).
2. Focus must be trapped inside the modal (Tabbing loops inside it).
3. Background must be hidden from screen readers (`aria-hidden="true"`).
4. `Escape` key must close it.
5. When closed, focus returns to the button that opened it.

```html
<!-- ✅ BEST: Use the native <dialog> element. It handles focus trapping automatically! -->
<dialog id="myModal">
  <h2>Settings</h2>
  <button formmethod="dialog">Close</button>
</dialog>
<script>
  document.getElementById('myModal').showModal();
</script>
```

---

## 3. ARIA Roles & Attributes

When you build complex custom widgets (like tabs or accordions), you must apply ARIA attributes to tell screen readers what it is and what state it's in.

```html
<!-- Example: Custom Accordion/Disclosure -->
<!-- ❌ BAD: Screen reader sees plain text, doesn't know it's expandable -->
<div class="accordion">
  <div class="header">Advanced Settings</div>
  <div class="content" style="display: none;">...</div>
</div>

<!-- ✅ GOOD: ARIA provides context -->
<div class="accordion">
  <button aria-expanded="false" aria-controls="panel-id" id="header-id">Advanced Settings</button>
  <div id="panel-id" role="region" aria-labelledby="header-id" hidden>...</div>
</div>
```

**Crucial ARIA states:**

- `aria-expanded="true/false"`: For accordions, dropdowns, menus.
- `aria-hidden="true"`: Removes decorative icons/containers from the screen reader tree.
- `aria-pressed="true/false"`: For toggle buttons.
- `aria-invalid="true"`: For invalid form fields.

---

## 4. Forms & Labels

**Every input must have an associated label.** `placeholder` is NOT a label (it disappears when typing, causing cognitive loss).

```html
<!-- ❌ BAD -->
<input type="text" placeholder="Email Address">

<!-- ✅ GOOD: Explicit linking via id/for -->
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

<!-- ✅ GOOD: Implicit wrapping -->
<label>
  Email Address
  <input type="email" name="email">
</label>

<!-- Accessible Error Messages -->
<label for="username">Username</label>
<input
  type="text"
  id="username"
  aria-invalid="true"
  aria-describedby="username-error"

<span id="username-error" role="alert" class="error-msg">Username is already taken</span>
```

---

## 5. Live Regions (Dynamic Updates)

When content changes dynamically without a page reload (e.g., Toast notifications, AI responding, search results updating), the screen reader needs to be notified.

```html
<!-- 
  role="alert": Interrupts the user immediately (e.g., error).
  role="status" (or aria-live="polite"): Waits until the user pauses, then announces.
-->
<div aria-live="polite" class="sr-only">
  <!-- JavaScript injects: "3 items found" here, screen reader reads it aloud -->
</div>
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
