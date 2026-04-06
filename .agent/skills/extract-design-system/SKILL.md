---
name: extract-design-system
description: Design system extraction and tokenization mastery. Identifying repeated HTML/CSS patterns, extracting CSS variables, generating design tokens (colors, spacing, typography), building reusable component schemas, and standardizing ad-hoc styles into cohesive global systems. Use when refactoring messy CSS into a unified design system.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Extract Design System — Tokenization Mastery

---

## 1. The Token Extraction Protocol

When reviewing a messy, legacy UI file (`<div style="background: #e23e2a; border-radius: 6px; padding: 12px">`), the agent must extract these hardcoded values into Global Tokens.

### Tier 1: Core Design Tokens (The Foundation)
Tokens should be semantic, not literal. `color-brand` > `color-red`.

```css
:root {
  /* Colors (HSL is preferred for programmatic manipulation) */
  --brand-primary: 360, 76%, 53%; /* The specific red */
  --surface-default: 0, 0%, 100%;
  --surface-muted: 210, 40%, 96%;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  
  /* Space / Geometry (8px grid scale) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  
  /* Radaii */
  --radius-sm: 4px;
  --radius-md: 6px;    /* Extracted from the 6px legacy element */
}
```

### Tier 2: The Refactor 
(Using Tailwind v4 CSS-First as the standard delivery mechanism)

```css
@theme {
    --color-primary: hsl(var(--brand-primary));
    --spacing-3: var(--space-3);
    --radius-md: var(--radius-md);
}
```

---

## 2. Standardizing the 3 "C" Configurations 

If building a design system inside React/Next.js, standardize the system through 3 primary mechanisms.

1. **Colors (Dark Mode First):** Every single color extracted must have an inverse defined for `[data-theme='dark']`.
2. **Container Queries:** Media queries (`@media (min-width)`) define the *device*. Container queries (`@container (min-width)`) define the *component context*. Always extract component sizing to rely on container-driven layouts for ultimate reusability.
3. **Compound Variants (CVA):** Group extracted CSS classes into logical component states rather than passing 10 boolean props.

```typescript
// ✅ Efficient Extracted Component Architecture
import { cva } from "class-variance-authority";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors", // Base
  {
    variants: {
      intent: {
        primary: "bg-primary text-white hover:bg-primary/90",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input hover:bg-accent",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 py-2",     // Extracted standard size
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "default",
    },
  }
);
```

---

## 3. Auditing the Accessibility Baseline

A Design System must mandate accessibility at the token level, preventing developers from manually breaking contrast ratios later.

1. Extracted primary text colors must hit a **4.5:1 contrast ratio** against the extracted background surfaces.
2. Focus rings must be decoupled and standardized globally (`ring-2 ring-primary ring-offset-2`).

---
