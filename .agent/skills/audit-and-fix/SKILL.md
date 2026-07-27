---
name: audit-and-fix
description: Accessibility auditing and remediation workflow combining detection, prioritization, and practical code fixes for WCAG 2.2 AA compliance issues.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Accessibility Auditing & Remediation
  tier: pro
  co-requires: [web-accessibility-auditor, fixing-accessibility]
  trigger-signals:
    strong: [audit-and-fix, accessibility audit, WCAG remediation, fix accessibility, a11y audit, AccessLint]
    weak: [a11y check, accessibility fix]
---

# Audit and Fix — Accessibility Remediation Workflow

Systematically audit HTML/JSX markup against WCAG 2.2 AA standards, prioritize accessibility violations, and apply verified code fixes.

---

## 4-Step Remediation Pipeline

### 1. Automated Violation Detection
Scan component code for:
- Missing `alt` tags on `<img>` elements.
- Form controls (`<input>`, `<select>`) missing associated `<label>` or `aria-label`.
- Buttons with icon-only content missing `aria-label`.
- Non-interactive elements (`<div>`, `<span>`) with `onClick` handlers missing `role="button"` and `tabIndex={0}`.

### 2. Prioritization Matrix

| Severity Level | Violation Type | Remediation Action |
| --- | --- | --- |
| 🔴 **Blocker (Level A)** | Inaccessible form inputs, un-trapped focus in modal, zero keyboard access | Add explicit `<label>`, focus trap, and keyboard handlers immediately. |
| 🟠 **Critical (Level AA)** | Low text contrast ratio ($< 4.5:1$), missing ARIA states on custom dropdowns | Adjust text colors to OKLCH contrast targets; add `aria-expanded`. |
| 🟡 **Moderate (Level AA)** | Missing landmark regions (`<main>`, `<nav>`, `<header>`), heading hierarchy gaps | Wrap layout blocks in semantic HTML5 tags. |

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

## 🤖 LLM-Specific Traps

1. **Adding Redundant ARIA**: Adding `role="button"` to native `<button>` tags (valid HTML5 buttons don't need redundant roles).
2. **Deleting Decorative SVGs from Screen Readers**: Forgetting `aria-hidden="true"` on decorative icons inside labeled buttons.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `accessibility-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all icon-only buttons provided with descriptive `aria-label` attributes?
✅ Are decorative SVG icons hidden from screen readers with `aria-hidden="true"`?
✅ Do custom interactive controls support Enter and Space key triggers?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
