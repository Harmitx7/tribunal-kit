# Tailwind CSS v4 Architecture, Design Tokens & Theming

> **Authority**: Tailwind CSS v4 Official Documentation (`https://tailwindcss.com/docs/`)  
> **Applicable Domains**: Frontend Architecture, Design Systems, Modern CSS, Web UI  
> **Status**: Verified Production Specification  

---

## 1. Zero-Config CSS-First Architecture

Tailwind CSS v4 abandons JavaScript configuration files (`tailwind.config.js`) in favor of pure, native CSS configuration via `@theme` directives and modern CSS variables:

```css
/* main.css */
@import "tailwindcss";

@theme {
  /* Colors generate bg-*, text-*, border-* utilities */
  --color-primary-50: #f0fdf4;
  --color-primary-500: #22c55e;
  --color-primary-900: #14532d;
  
  --color-surface-bg: #09090b;
  --color-surface-card: #18181b;
  --color-surface-border: #27272a;

  /* Typography */
  --font-display: "Cabinet Grotesk", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Elevation and Radius */
  --radius-subtle: 4px;
  --radius-card: 12px;
}
```

---

## 2. Dynamic Dark Mode Theming

Implement theme switching cleanly using semantic CSS variables referenced inside the `@theme` block:

```css
:root {
  --background: #ffffff;
  --foreground: #09090b;
  --muted: #f4f4f5;
  --border: #e4e4e7;
}

.dark {
  --background: #09090b;
  --foreground: #fafafa;
  --muted: #27272a;
  --border: #3f3f46;
}

@theme {
  --color-bg: var(--background);
  --color-text: var(--foreground);
  --color-muted: var(--muted);
  --color-border: var(--border);
}
```

Components consume semantic utilities directly: `<div class="bg-bg text-text border border-border">`.

---

## 3. Custom Utilities with `@utility` Directive

Define custom utility classes using the v4 `@utility` block instead of arbitrary classes:

```css
@utility glass-card {
  background-color: rgb(24 24 27 / 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgb(255 255 255 / 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

@utility text-glow {
  text-shadow: 0 0 16px var(--color-primary-500);
}
```

---

## 4. Native Container Queries & Variants

Tailwind v4 features first-class container queries:

```html
<!-- Parent defines container context -->
<div class="@container">
  <!-- Child adjusts layout based on container width rather than viewport -->
  <div class="flex flex-col @sm:flex-row @lg:grid @lg:grid-cols-3 gap-4">
    <div class="p-4 bg-surface-card rounded-card">Item A</div>
    <div class="p-4 bg-surface-card rounded-card">Item B</div>
    <div class="p-4 bg-surface-card rounded-card">Item C</div>
  </div>
</div>
```

---

## 5. Tailwind v4 Design System Checklist

- [ ] Configuration defined in native CSS using `@theme` without legacy `tailwind.config.js`.
- [ ] Theme colors use functional semantic aliases (`--color-bg`, `--color-border`) rather than hardcoded palette names.
- [ ] No arbitrary magic values (`p-[13px]`, `w-[347px]`); all measurements map to spacing scale tokens.
- [ ] Container queries (`@container`) used for component-level responsiveness.
- [ ] Dark mode implemented via class or media query variant bound to CSS variables.
