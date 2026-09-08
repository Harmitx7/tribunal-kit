---
name: audit-and-fix
description: Accessibility auditing and remediation workflow combining detection, prioritization, and practical code fixes for WCAG 2.2 AA compliance issues.
version: 4.0.0
last-updated: 2026-09-07
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

---

## Mandatory Pre-Flight Context Inspection

Before performing accessibility audits or fixes, you MUST inspect:

1. Automated Violation Detection (Section 24) → Audit markup for missing `alt`, un-labeled inputs/buttons, and `onClick` on non-interactive elements
2. Prioritization Matrix (Section 31) → Fix Level A blockers (forms, focus traps, keyboard access) before addressing contrast or landmark regions
3. Anti-Redundant ARIA rule (Section 60) → Do NOT add `role="button"` to native `<button>` tags; apply `aria-hidden="true"` to decorative inner SVGs

Systematically audit HTML/JSX markup against WCAG 2.2 AA standards, prioritize accessibility violations, and apply verified code fixes.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Accessibility auditing and remediation workflow combining detection, prioritization, and practical code fixes for WCAG 2.2 AA compliance issues..
- **DO NOT activate when:** The task falls strictly outside audit-and-fix domain or belongs to a different dedicated specialist.

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

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
