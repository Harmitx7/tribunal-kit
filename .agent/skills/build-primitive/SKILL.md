---
name: build-primitive
description: Build foundational, unstyled, accessible UI primitives from scratch with strong ARIA attributes, keyboard navigation, focus traps, and state management. Use when creating custom Headless UI components (Dialog, Combobox, Accordion, Popover, Menu).
version: 3.0.0
last-updated: 2026-07-30
skills:
  - react-specialist
  - baseline-ui
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Build Primitive — Headless & Accessible UI Primitives

---

## Mandatory Pre-Flight Context Inspection

Before building headless UI primitives, you MUST inspect:
1. WAI-ARIA Design Patterns (Section 24) → Attach exact roles (`dialog`, `combobox`, `tablist`), `aria-expanded`, and ID associations (`aria-labelledby`, `aria-describedby`)
2. Focus Traps & Restoration (Section 29) → Trap focus inside modals on open; return focus to trigger on close; dismiss on `Escape`
3. Data Attributes (Section 41) → Expose clean `data-state="open|closed"` and `data-disabled` attributes for unstyled CSS consumer integration

Build rock-solid, framework-agnostic or React headless UI primitives with complete ARIA pattern compliance, keyboard control, and focus management.

---

## 4 Rules for UI Primitives

### 1. Complete ARIA Pattern Compliance
- **Dialog / Modal**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{titleId}"`, `aria-describedby="{descId}"`.
- **Combobox / Autocomplete**: `role="combobox"`, `aria-expanded="{isOpen}"`, `aria-autocomplete="list"`, `aria-controls="{listboxId}"`.
- **Tabs**: Tablist `role="tablist"`, Tab `role="tab"`, `aria-selected="{isActive}"`, `aria-controls="{panelId}"`, TabPanel `role="tabpanel"`.

### 2. Focus Management & Focus Traps
- **Modal Focus Lock**: When a dialog opens, trap focus within the modal container. On close, return focus to the element that triggered it.
- **Escape Key Dismiss**: Pressing `Escape` MUST close popovers, modals, and dropdown menus instantly.

### 3. Keyboard Navigation Sequences
- **Listbox / Menu Navigation**:
  - `ArrowDown`: Move active descendant down.
  - `ArrowUp`: Move active descendant up.
  - `Home`: Move to first item.
  - `End`: Move to last item.
  - `Enter` / `Space`: Select highlighted item.

### 4. Zero Unnecessary Styling
- Primitives MUST output clean data attributes (`data-state="open|closed"`, `data-disabled`, `data-highlighted`) so consumers can style them effortlessly with CSS or Tailwind variants.

---

## 🤖 LLM-Specific Traps

1. **Forgetting `type="button"`**: Omitting `type="button"` on custom trigger buttons inside forms, causing unintended form submissions.
2. **Missing `aria-expanded`**: Toggle triggers missing `aria-expanded` attributes.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `accessibility-reviewer` · `type-safety`**

### ✅ Pre-Flight Self-Audit

```
✅ Are all WAI-ARIA roles and states correctly attached?
✅ Is keyboard navigation fully implemented (Arrow keys, Enter, Escape)?
✅ Is focus trapped inside modals and restored to the trigger upon exit?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
