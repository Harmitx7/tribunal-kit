---
name: build-primitive
description: Build foundational, unstyled, accessible UI primitives from scratch with strong ARIA attributes, keyboard navigation, focus traps, and state management. Use when creating custom Headless UI components (Dialog, Combobox, Accordion, Popover, Menu).
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Build foundational, unstyled, accessible UI primitives from scratch with strong ARIA attributes, keyboard navigation, focus traps, and state management. Use when creating custom Headless UI components (Dialog, Combobox, Accordion, Popover, Menu)..
- **DO NOT activate when:** The task falls strictly outside build-primitive domain or belongs to a different dedicated specialist.

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
