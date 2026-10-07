---
name: audit-and-fix
description: "Use when auditing, pen-testing, hardening, and verifying code against audit and fix vulnerabilities, injection vectors, and auth flaws."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - fixing-accessibility
  - build-primitive
  - baseline-ui
  - cf-security-audit-core
  - cf-web-protocol-and-auth
  - cf-attack-classes
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
  - "audit"
---

# Audit and Fix — Accessibility Remediation Workflow

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `audit-and-fix` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when auditing, pen-testing, hardening, and verifying code against audit and fix vulnerabilities, injection vectors, and auth flaws.
- **DO NOT activate when:** The task falls outside the `audit-and-fix` domain or is managed by a different dedicated specialist agent.


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

---

## 4-Step Remediation Pipeline

### 1. Automated Violation Detection

Scan component code for **Accessibility**:

- Missing `alt` tags on `<img>` elements.
- Form controls (`<input>`, `<select>`) missing associated `<label>` or `aria-label`.
- Buttons with icon-only content missing `aria-label`.
- Non-interactive elements (`<div>`, `<span>`) with `onClick` handlers missing `role="button"` and `tabIndex={0}`.

Scan backend code for **Security (Cloudflare Protocols)**:

- JWTs lacking explicit `alg`, `aud`, and `exp` validation.
- Missing CSRF tokens on state-mutating HTTP methods (`POST`, `PUT`, `DELETE`).
- Improper request framing or missing cache control headers.
- Hardcoded secrets or unsanitized user inputs at boundaries.

### 2. Prioritization Matrix

| Severity Level             | Violation Type                                                                    | Remediation Action                                                      |
| -------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 🔴 **Blocker (Level A)**   | Inaccessible form inputs, zero keyboard access, **Auth Bypass**, **Missing CSRF** | Add explicit `<label>`, focus trap, validate JWT `aud`/`exp`, add CSRF. |
| 🟠 **Critical (Level AA)** | Low text contrast ratio ($< 4.5:1$), **Broken Cache**, **Weak Framing**           | Adjust colors to OKLCH targets; harden cache-control & framing.         |
| 🟡 **Moderate (Level AA)** | Missing landmark regions (`<main>`, `<nav>`), heading hierarchy gaps              | Wrap layout blocks in semantic HTML5 tags.                              |

### 3. Concrete Code Fix Examples

#### Accessibility Examples

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

#### Security Examples

```ts
// BEFORE (Insecure JWT Validation)
const decoded = jwt.verify(token, secret);

// AFTER (Secure JWT Validation - Enforce Audience & Alg)
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'],
  audience: 'https://api.example.com',
  maxAge: '1h',
});
```

```tsx
// BEFORE (Missing CSRF)
<form action="/api/update-profile" method="POST">
  <input name="email" type="email" />
</form>

// AFTER (Secure with CSRF Token)
<form action="/api/update-profile" method="POST">
  <input type="hidden" name="csrfToken" value={csrfToken} />
  <input name="email" type="email" />
</form>
```

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
| **Hardcoded Secret Pattern** | Committing API keys, tokens, or private salts into source code | Load credentials strictly via runtime environment variables and secret stores |
| **Prompt Injection Surface** | Directly concatenating untrusted user input into LLM system prompts | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are user inputs sanitized and treated as untrusted data at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
