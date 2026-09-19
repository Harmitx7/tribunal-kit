---
name: fixing-accessibility
description: "Use when Audit and fix HTML accessibility issues including ARIA labels, keyboard navigation, focus management, color contrast, and form errors. Use when adding interactive controls, forms, dialogs, or reviewing WCAG compliance."
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
