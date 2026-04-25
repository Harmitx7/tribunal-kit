---
name: extract-design-system
description: Design system extraction and tokenization mastery. Identifying repeated HTML/CSS patterns, extracting CSS variables, generating design tokens (colors, spacing, typography), building reusable component schemas, and standardizing ad-hoc styles into cohesive global systems. Use when refactoring messy CSS into a unified design system.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Creating CSS variables for every possible value -> ✅ Only tokenize values that appear 3+ times across components
- ❌ Extracting a design system before the UI is stable -> ✅ Wait until patterns are proven by real usage before standardizing
- ❌ Naming tokens by appearance (`--blue-500`) instead of purpose (`--color-primary`) -> ✅ Semantic names survive theme changes

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


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
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


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
