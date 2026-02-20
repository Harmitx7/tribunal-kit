---
name: tailwind-patterns
description: Tailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Tailwind CSS v4 Patterns

> Tailwind is a constraint system. Use the constraints — don't fight them.
> The moment you write arbitrary values everywhere, you've lost the benefit.

---

## v4 Key Changes

Tailwind CSS v4 switches from JavaScript configuration to CSS-first configuration.

```css
/* v4: configure via CSS @theme, not tailwind.config.js */
@import "tailwindcss";

@theme {
  --color-brand: oklch(65% 0.25 250);
  --font-sans: "Inter", sans-serif;
  --spacing-xs: 0.25rem;
  --radius-card: 1rem;
}
```

```ts
// v3: tailwind.config.js (still supported but not preferred in v4)
module.exports = {
  theme: {
    extend: {
      colors: { brand: '#3B82F6' }
    }
  }
}
```

---

## Design Token Architecture

Tailwind works best when design tokens are defined once and referenced everywhere.

```css
@theme {
  /* Color primitives */
  --color-gray-50:  oklch(98% 0.002 250);
  --color-gray-900: oklch(15% 0.005 250);

  /* Semantic aliases — what you actually use in markup */
  --color-bg:       var(--color-gray-50);
  --color-text:     var(--color-gray-900);
  --color-primary:  oklch(65% 0.25 250);

  /* Typography scale */
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;

  /* Spacing scale — use these, not arbitrary values */
  --spacing-1:  0.25rem;
  --spacing-2:  0.5rem;
  --spacing-4:  1rem;
  --spacing-8:  2rem;
  --spacing-16: 4rem;
}
```

---

## Component Patterns

### Extracting Repeated Classes

When the same class combination appears 3+ times, extract it:

```css
/* ❌ Repeated across many elements */
<button class="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">

/* ✅ Extracted into a component class */
@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
    background: var(--color-primary);
    color: white;
    
    &:hover {
      background: oklch(from var(--color-primary) calc(l - 0.05) c h);
    }
  }
}
```

### Container Queries

v4 makes container queries first-class:

```html
<!-- Parent sets the query context -->
<div class="@container">
  <!-- Child responds to parent size, not viewport size -->
  <div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    ...
  </div>
</div>
```

Use container queries for components that need to respond to their container, not the viewport (e.g., a card that can be placed in a sidebar or a main column).

---

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| `[400px]` arbitrary values everywhere | Breaks the constraint system | Add to `@theme` and use the token |
| Mixing inline `style=` with Tailwind | Inconsistent, hard to maintain | Move to `@theme` variables |
| `!important` on Tailwind classes | Specificity arms race | Fix the class conflict instead |
| Classes not in source file | Tailwind purges them in build | Don't construct class names dynamically |

### Dynamic Class Pitfall

```ts
// ❌ Tailwind cannot detect this — will be purged in production
const color = isDanger ? 'red' : 'green';
<div class={`bg-${color}-500`}>

// ✅ Use full class names that Tailwind can statically detect
const className = isDanger ? 'bg-red-500' : 'bg-green-500';
<div class={className}>
```

---

## Dark Mode

```css
/* v4 dark mode via CSS media query */
@layer base {
  :root {
    --color-bg: oklch(98% 0.002 250);
    --color-text: oklch(15% 0.005 250);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: oklch(12% 0.005 250);
      --color-text: oklch(95% 0.002 250);
    }
  }
}

/* Or use class-based dark mode (for user-controlled toggle) */
/* Configure: darkMode: 'class' in tailwind config */
```

---

## Performance Rules

- Tailwind JIT generates only the CSS actually used — don't add classes "just in case"
- `@layer components` and `@layer utilities` prevent specificity issues
- Check bundle size with `npx vite-bundle-visualizer` after adding many custom styles
