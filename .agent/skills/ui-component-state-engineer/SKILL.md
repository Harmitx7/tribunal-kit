---
name: ui-component-state-engineer
description: "Architects and enforces complete 5-state interactive contracts (default, hover, focus-visible, active/pressed, and disabled) across all interactive component targets. Eliminates inert or lifeless UI elements, ensures perceptible focus rings, and guarantees physical press feedback across buttons, inputs, selects, and controls."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - better-ui
  - review-animations
  - web-accessibility-auditor
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  componentTargets: "array"
  stateDefinitions: "object"
outputs:
  stateContractReport: "object"
  stateClasses: "string"
  missingStates: "array"
trigger:
  - "component-state-engineer"
  - "interactive-states"
  - "state-contract"
  - "5-state-audit"
---

# UI Component State Engineer — 5-State Interactive Contracts

## Mandatory Pre-Flight Context Inspection
Before signing off on interactive components, inspect these 5 critical parameters:
1. **Complete 5-State Contract**: Every clickable or focusable element MUST implement explicit styles for all 5 states:
   - `default`: Base resting visual state.
   - `hover`: Pointer presence indication (subtle background/border shift).
   - `focus-visible`: High-contrast keyboard focus ring (`focus-visible:outline-2`).
   - `active`: Tactile physical depression (`active:scale-[0.98]`).
   - `disabled`: Dimmed opacity (`disabled:opacity-50`) and pointer event suppression.
2. **Keyboard Distinction**: Use `:focus-visible` rather than `:focus` to prevent unsightly focus rings during mouse/touch clicks while preserving them for keyboard navigation.
3. **Hardware-Accelerated Feedback**: Ensure `:active` and `:hover` states utilize CSS `transform` and `opacity` rather than repainting box dimensions.
4. **Form Input State Coverage**: Form controls must also handle `invalid` / `error`, `read-only`, and `loading` states with distinct visual indicators.
5. **Programmatic Verification**: Verify state compliance using `auditInteractiveStates()` from `src/design_intelligence/component_state_engine.js`.

## Activation Boundaries
- **Activate when:** Creating or modifying buttons, links, inputs, checkboxes, toggles, menu items, or tabs, or auditing interactive feedback quality.
- **DO NOT activate when:** Working on static layout cards without clickable triggers or authoring server-side endpoints.

## 🔁 Multi-Pass Component State Protocol

| Pass | Phase | Core Action | Observable Target |
|:---|:---|:---|:---|
| **Pass 1** | **Target Identification** | Extract all interactive targets (`<button>`, `<a>`, `<input>`, `<select>`). | Interactive Inventory |
| **Pass 2** | **Hover & Active Hookup** | Add subtle hover surface transitions and `active:scale-[0.98]` press physics. | Tactile Pointer States |
| **Pass 3** | **Focus-Visible Ring Binding** | Bind high-contrast outline (`outline-2 outline-offset-2 outline-accent`). | Keyboard Focus Ring |
| **Pass 4** | **Disabled & Loading States** | Add `disabled:opacity-50 disabled:pointer-events-none` and loading spinner state. | Inert State Guardrails |
| **Pass 5** | **State Audit & Certification** | Run `auditInteractiveStates()` to certify full 5-state contract compliance. | Certified State Contract |

---

## 🛠️ Technical Architecture & State Recipes

### 1. Complete 5-State Interactive Button Recipe
```html
<button
  type="button"
  className="
    /* 1. Default (Resting) */
    px-4 py-2 rounded-[8px] font-medium text-sm
    bg-[var(--accent-primary)] text-[var(--accent-contrast)]
    border border-[oklch(1_0_0/0.12)] shadow-sm
    transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out

    /* 2. Hover */
    hover:bg-[oklch(from_var(--accent-primary)_l_c_h/0.92)]
    hover:border-[oklch(1_0_0/0.2)]

    /* 3. Focus-Visible */
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--accent-primary)]

    /* 4. Active (Pressed) */
    active:scale-[0.98] active:duration-75

    /* 5. Disabled */
    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
  "
>
  Confirm Action
</button>
```

### 2. Programmatic 5-State Audit
```javascript
const { auditInteractiveStates } = require('../../src/design_intelligence/component_state_engine');

const classString = 'px-4 py-2 hover:bg-surface-1 focus-visible:ring-2 active:scale-[0.98] disabled:opacity-50';
const audit = auditInteractiveStates('primary-button', classString);

// audit.isCompliant === true
// audit.missingStates === []
// audit.pressScaleFactor === 0.98
```

---

## 🏛️ Tribunal Verification & Guardrails

### 🛑 Verification-Before-Completion (VBC) Protocol
1. Confirm all interactive elements pass `auditInteractiveStates()`.
2. Verify zero interactive elements suppress focus outlines without a `:focus-visible` replacement.
3. Confirm `:active` press scale feedback is present on all primary and secondary buttons.

