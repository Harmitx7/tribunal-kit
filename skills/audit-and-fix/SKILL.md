---
name: audit-and-fix
description: "Use when Use for dual-purpose remediation: Accessibility auditing (WCAG 2.2 AA) and Deep Backend Security Remediation (Cloudflare protocols, Auth, CSRF, JWT)."
version: 5.0.0
last-updated: 2026-09-13
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
---

# Audit and Fix — Accessibility Remediation Workflow

---

## 🛠️ Technical Architecture & Reference Recipes

---

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
