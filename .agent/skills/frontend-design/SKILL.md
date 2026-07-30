---
name: frontend-design
description: Design engineering principles for React/Next.js. Relative color syntax (OKLCH), spatial grid math, fluid container queries, and contrast validation.
version: 3.0.0
last-updated: 2026-07-30
skills:
  - baseline-ui
  - better-colors
  - better-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Frontend Design — Technical Spacing & Color Science

---

## Mandatory Pre-Flight Context Inspection

Before implementing front-end designs or CSS layout systems, you MUST inspect:
1. Relative Color Syntax (Section 16) → Derive hover/active states dynamically with `oklch(from var(--color-primary) calc(l - 0.08) c h)`
2. Nested Radius Math (Section 54) → Enforce `outer_radius = inner_radius + padding_inner` for nested card containers
3. APCA Contrast Thresholds (Section 81) → Ensure Lc > 75 for body text, Lc > 60 for headings, and Lc > 45 for borders and labels

This skill guides the implementation of responsive layout systems, color science, and spatial tokens.

---

## 1. Relative Color Syntax & OKLCH Theme Tokens

Perceptually uniform color science ensures stable contrast. Use CSS **Relative Color Syntax** to derive state colors dynamically:
```css
:root {
  /* base color values */
  --color-primary: oklch(62% 0.21 250);       /* Brand electric blue */
  
  /* Deriving hover states dynamically: reduce lightness, preserve chroma and hue */
  --color-primary-hover: oklch(from var(--color-primary) calc(l - 0.08) c h);
  --color-primary-active: oklch(from var(--color-primary) calc(l - 0.12) c h);
  
  /* Backgrounds */
  --bg-surface: oklch(100% 0 0);
  --text-main: oklch(20% 0.02 250);
}

[data-theme="dark"] {
  --bg-surface: oklch(14% 0.008 250);
  --text-main: oklch(93% 0.003 250);
}
```

---

## 2. Spatial Grid Math & Radius Tokens

Enforce an 8px spatial grid calculated mathematically to ensure alignment precision:
```css
:root {
  --base-grid: 8px;
  
  --space-xs:  calc(var(--base-grid) * 0.5);  /* 4px  - icon gaps */
  --space-sm:  calc(var(--base-grid) * 1);    /* 8px  - tag paddings */
  --space-md:  calc(var(--base-grid) * 2);    /* 16px - inputs */
  --space-lg:  calc(var(--base-grid) * 3);    /* 24px - card padding */
  --space-xl:  calc(var(--base-grid) * 4);    /* 32px - section gaps */
}
```

### Nested Radius Formula
Ensure component inner borders track correctly:
`outer_radius = inner_radius + padding_inner`
If container padding is `16px` and inner content radius is `8px`, then container outer radius must be exactly `24px` (`8px + 16px`).

---

## 3. Responsive Layouts & Container Queries

Avoid viewport-level media queries for self-contained components. Use container queries to make components portable:
```css
.component-wrapper {
  container-type: inline-size;
  container-name: component;
}

@container component (min-width: 450px) {
  .inner-layout {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }
}
```

---

## 4. APCA Contrast Guidelines

Ensure that typography meets the APCA Lc guidelines:
*   Lc > 75 for body text elements.
*   Lc > 60 for large titles and headings.
*   Lc > 45 for secondary input labels and border guides.

---

## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
