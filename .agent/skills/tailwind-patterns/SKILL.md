---
name: tailwind-patterns
description: Tailwind CSS v4+ principles for extreme frontend engineering. CSS-first configuration, scroll-driven animations, logical properties, advanced container style queries, and `@property` Houdini patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Tailwind CSS v4+ Pro-Max Patterns

> Tailwind is not inline styles. It is a highly-tuned, statically extracted token constraint system.
> The moment you write arbitrary values everywhere (`w-[317px]`), you've lost the benefit. The moment you ignore CSS-first `@theme`, you are writing legacy code.

---

## v4+ Key Paradigm: CSS-First & Generative

Tailwind CSS v4+ completely removes the need for `tailwind.config.js`. Everything is a native CSS variable controlled via `@theme`.

```css
/* v4+: configure via CSS @theme */
@import "tailwindcss";

@theme {
  /* Generative Color Base via OKLCH */
  --hue-brand: 250;
  
  --color-brand-base: oklch(65% 0.25 var(--hue-brand));
  --color-brand-surface: oklch(15% 0.02 var(--hue-brand));
  
  /* Fluid Typography Native Setup */
  --font-sans: "Inter Variable", sans-serif;
  --text-fluid-body: clamp(1rem, 0.8rem + 1vw, 1.25rem);
  
  /* Logical Padding variables (RTL/LTR native) */
  --spacing-fluid-inline: clamp(1rem, 5vw, 3rem);
}
```

---

## Bleeding-Edge Architectures

### 1. Logical Properties (Mandatory for i18n)
Never use physical properties (`ml-4`, `pr-2`, `w-screen`) in modern web development. They break on Right-To-Left (RTL) languages or horizontal writing modes.
- **Use `ms-4` (margin-start)** instead of `ml-4`.
- **Use `px-4` / `pi-4` (padding-inline)** instead of explicit left/right.
- **Use `dvw` / `dvh` (dynamic viewport)** instead of `vw` / `vh` to account for mobile browser UI shifts.

### 2. Container Style Queries
v4+ makes container queries (`@container`) first-class. A component should not care about the viewport; it only cares about where it is placed.

```html
<!-- Parent sets the query context -->
<div class="@container">
  <!-- Child responds to parent size, not browser window size -->
  <div class="grid grid-cols-1 @md:grid-cols-2 @[800px]:grid-cols-3">
    ...
  </div>
</div>
```

**Advanced Querying:** Container queries can now query *styles*, not just sizes.
*(Always use `// VERIFY: CSS Style Queries browser support` if heavily relying on them).*

### 3. Native Scroll-Driven Animations
CSS `@scroll-timeline` natively hooks into scroll position without JS listeners. Integrate this directly into Tailwind workflows.

```css
@layer utilities {
  .animate-on-scroll {
    animation: fade-in-up linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 30%;
  }
}
```

---

## Houdini `@property` Patterns

To animate gradients or specific variable values, you must declare them explicitly in your main CSS to allow the browser to interplate them.

```css
@property --angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@layer utilities {
  .animated-gradient-border {
    background: conic-gradient(from var(--angle), transparent, var(--color-brand-base));
    animation: rotate 3s linear infinite;
  }
}
@keyframes rotate { to { --angle: 360deg; } }
```

---

## Extreme Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| `[400px]` arbitrary values | Breaks the constraint system | Add to `@theme` and use the token |
| `w-screen` / `h-screen` | Causes scrollbars / mobile jumps | Use `w-dvw` and `h-dvh` |
| `!important` | Specificity arms race | Correct the layer ordering or CSS specificity |
| String concatenation for classes | Tailwind purges them | Use `clsx` or `tailwind-merge` properly |

### Dynamic Class Pitfall & `tailwind-merge`

```tsx
// ❌ Tailwind cannot detect this — will be purged
const color = isDanger ? 'red' : 'green';
<div class={`bg-${color}-500`}>

// ✅ Use full class names
const className = isDanger ? 'bg-red-500' : 'bg-green-500';

// 🚀 PRO-MAX LEVEL: Use tailwind-merge to prevent clash bugs
import { twMerge } from 'tailwind-merge';
export const Button = ({ className }) => (
  <button className={twMerge('px-4 py-2 bg-blue-500 rounded-md', className)}>
    Click
  </button>
)
```

---

## True OLED Dark Mode via CSS

Do not rely on Javascript to toggle simple dark modes if it can be avoided. Media queries prevent FOUC (Flash of Unstyled Content).

```css
/* v4 dark mode via CSS media query */
@layer base {
  :root {
    --color-bg: oklch(98% 0.002 250);
    --color-text: oklch(15% 0.005 250);
  }

  /* OLED optimization: True 0% lightness */
  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: oklch(0% 0 0); 
      --color-text: oklch(95% 0.002 250);
    }
  }
}
```

---

## Performance Rules
- **Layer Splitting:** `@layer components` and `@layer utilities` prevent specificity issues and allow Tailwind's engine to order CSS correctly.
- **Do not install plugins without measuring:** Heavy plugins (like unpruned icon libraries) destroy CSS parsing times.
- **Validate DOM Depth:** Tailwind encourages flat HTML. Avoid nested `<div class="flex">` chains that go 10 layers deep; rebuild with CSS Grid.

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Tailwind Patterns Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Tailwind Patterns
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

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
