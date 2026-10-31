---
name: ui-responsive-engineer
description: "Enforces responsive viewport adaptation, CSS container queries, fluid typography clamps, CSS Subgrid, and mobile ergonomics. Eliminates horizontal viewport spillage, guarantees minimum 44x44px touch targets on mobile devices, and structures components to adapt gracefully from 320px mobile screens to 4K ultrawide displays."
version: 1.0.0
last-updated: 2026-10-30
skills:
  - adapt
  - better-ui
  - mobile-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  componentMarkup: "string"
  targetBreakpoints: "array"
  containerQuerySupport: "boolean"
outputs:
  responsivePatch: "string"
  overflowAuditReport: "object"
  touchTargetReport: "object"
trigger:
  - "responsive-engineer"
  - "container-queries"
  - "fluid-layout"
  - "viewport-adaptation"
---

# UI Responsive Engineer — Fluid Layouts & Mobile Adaptation

## Mandatory Pre-Flight Context Inspection
Before modifying or validating responsive layouts, inspect these 5 critical parameters:
1. **Fluid Type & Spacing Clamps**: Verify that typography and spacing utilize mathematical `clamp(min, preferred, max)` formulas rather than stepped breakpoint jumps.
2. **Container Query Preference**: Prefer `@container` (container queries) over `@media` (viewport queries) for reusable component modularity.
3. **Horizontal Overflow Prevention**: Ensure no element causes an unintended horizontal scrollbar at 320px viewport width (`overflow-x: clip` or `overflow-x: auto` on tables).
4. **Mobile Touch Target Floor**: Verify all interactive elements (buttons, links, inputs, icons) provide an effective touch target area of at least $44 \times 44\text{px}$ on touch devices.
5. **Subgrid & Alignment Preservation**: Use CSS Subgrid (`grid-template-rows: subgrid`) on card lists to keep headers, descriptions, and action bars aligned across variable-length sibling cards.

## Activation Boundaries
- **Activate when:** Designing or testing responsive layouts, adding mobile viewports, fixing horizontal overflow bugs, converting media queries to container queries, or auditing touch targets.
- **DO NOT activate when:** Auditing purely server-side logic, executing color-only changes, or testing backend API schemas.

## 🔁 Multi-Pass Responsive Engineering Protocol

| Pass | Phase | Core Action | Observable Target |
|:---|:---|:---|:---|
| **Pass 1** | **Viewport Stress Test** | Simulate component layout at 320px, 375px, 768px, 1024px, 1440px, and 2560px. | Overflow/Clipping Check |
| **Pass 2** | **Fluid Clamp Generation** | Replace rigid font sizes with `clamp(minRem, preferredVw, maxRem)` formulas. | Fluid Typography Clamps |
| **Pass 3** | **Container Query Refactor** | Define `@container` context on parent wrappers and `@container (min-width: ...)` on children. | Component-Level Adaptability |
| **Pass 4** | **Touch Target Fortification** | Add padding, negative margins, or min-size constraints (`min-h-[44px] min-w-[44px]`). | Ergonomic Touch Targets |
| **Pass 5** | **Subgrid & Flex Wrapping** | Wrap tags, paginate tables, and enforce subgrid row alignment. | Clean Aligned Presentation |

---

## 🛠️ Technical Architecture & Responsive Recipes

### 1. Fluid Typography Math & Implementation
```javascript
const { generateFluidClamp } = require('../../src/design_intelligence/spatial_layout_engine');

// Generate fluid clamp between 320px (min) and 1280px (max) viewport widths
const h1Size = generateFluidClamp(2.0, 3.5, 320, 1280);
// Result: clamp(2rem, 1.5000rem + 2.5000vw, 3.5rem)
```

```css
/* Responsive Container & Fluid Scales in CSS */
.dashboard-card-container {
  container-type: inline-size;
  container-name: card-grid;
}

.responsive-card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3;
  padding: clamp(1rem, 0.8rem + 1vw, 2rem);
}

@container card-grid (max-width: 480px) {
  .responsive-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
```

### 2. Touch Target Enforcement in Tailwind v4
```html
<!-- Interactive icon button with 44px touch floor -->
<button
  type="button"
  aria-label="Settings"
  className="relative p-2 rounded-[6px] hover:bg-[var(--surface-1)] focus-visible:outline-2 active:scale-[0.98] before:absolute before:inset-0 before:m-auto before:h-[44px] before:w-[44px]"
>
  <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  </svg>
</button>
```

---

## 🏛️ Tribunal Verification & Guardrails

### 🛑 Verification-Before-Completion (VBC) Protocol
1. Verify component markup renders without horizontal overflow at 320px viewport width.
2. Confirm all button and input elements meet minimum $44 \times 44\text{px}$ touch target requirement.
3. Validate typography utilizes `clamp()` formulas for headline and display text.

