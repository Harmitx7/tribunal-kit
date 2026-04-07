---
name: tailwind-patterns
description: Tailwind CSS v4+ mastery. CSS-first configuration, @theme directive, container queries, scroll-driven animations, logical properties, clamp(), fluid typography, responsive design, dark mode, custom variants, component extraction, and performance optimization. Use when styling with Tailwind, building design systems, or optimizing CSS output.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Tailwind CSS v4+ — CSS-First Mastery

---

## v4 Configuration (CSS-First)

### The @theme Directive

```css
/* app.css — THE configuration file in Tailwind v4 */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-50: oklch(0.97 0.02 250);
  --color-primary-100: oklch(0.93 0.04 250);
  --color-primary-500: oklch(0.55 0.18 250);
  --color-primary-600: oklch(0.48 0.18 250);
  --color-primary-700: oklch(0.40 0.16 250);
  --color-primary-900: oklch(0.25 0.10 250);

  --color-surface: oklch(0.99 0.00 0);
  --color-surface-alt: oklch(0.96 0.00 0);
  --color-text: oklch(0.15 0.00 0);
  --color-text-muted: oklch(0.45 0.00 0);

  /* Typography */
  --font-sans: "Inter", "system-ui", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Spacing (extends the default scale) */
  --spacing-18: 4.5rem;
  --spacing-88: 22rem;

  /* Border radius */
  --radius-pill: 9999px;
  --radius-card: 1rem;

  /* Shadows */
  --shadow-card: 0 1px 3px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.06);
  --shadow-elevated: 0 10px 25px oklch(0 0 0 / 0.1), 0 4px 10px oklch(0 0 0 / 0.05);

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ❌ HALLUCINATION TRAP: Tailwind v4 does NOT use tailwind.config.js
   ❌ module.exports = { theme: { extend: { ... } } }  ← REMOVED in v4
   ✅ Use @theme { } directive in your CSS file
   ✅ @import "tailwindcss" replaces the three @tailwind directives */
```

### Dark Mode

```css
/* Tailwind v4 dark mode with @theme */
@theme {
  --color-surface: oklch(0.99 0.00 0);
  --color-text: oklch(0.15 0.00 0);
}

/* Dark variant — override variables */
@variant dark {
  @theme {
    --color-surface: oklch(0.13 0.02 260);
    --color-text: oklch(0.93 0.00 0);
  }
}

/* Usage in HTML: */
/* <div class="bg-surface text-text dark:bg-surface dark:text-text"> */
/* With the @variant dark override, classes "just work" in dark mode */
```

```html
<!-- Dark mode toggle pattern -->
<html class="dark">
  <body class="bg-surface text-text transition-colors duration-300">
    <!-- Automatically uses dark @theme values -->
  </body>
</html>
```

### Custom Variants

```css
/* @variant — custom selector-based variants */
@variant scrolled (&:where([data-scrolled]));
@variant hocus (&:hover, &:focus-visible);

/* Usage: */
/* <nav class="scrolled:shadow-elevated hocus:ring-2"> */
```

---

## Layout Patterns

### Flexbox

```html
<!-- Centered hero -->
<section class="flex min-h-svh flex-col items-center justify-center gap-6 px-6">
  <h1 class="text-5xl font-bold tracking-tight">Hero Title</h1>
  <p class="max-w-2xl text-center text-lg text-text-muted">Subtitle text</p>
  <div class="flex gap-3">
    <button class="rounded-pill bg-primary-600 px-6 py-3 text-white">Primary</button>
    <button class="rounded-pill border border-primary-600 px-6 py-3 text-primary-600">Secondary</button>
  </div>
</section>

<!-- Sidebar layout -->
<div class="flex min-h-svh">
  <aside class="w-64 shrink-0 border-r border-gray-200 p-4">Sidebar</aside>
  <main class="flex-1 overflow-y-auto p-6">Content</main>
</div>

<!-- ❌ HALLUCINATION TRAP: Use min-h-svh (small viewport height), NOT min-h-screen
     min-h-screen = 100vh (broken on mobile — includes browser chrome)
     min-h-svh = 100svh (accounts for mobile browser chrome)
     min-h-dvh = 100dvh (dynamic — updates as chrome shows/hides) -->
```

### CSS Grid

```html
<!-- Auto-fit responsive grid (no breakpoints needed) -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
  <div class="rounded-card bg-surface p-6 shadow-card">Card 1</div>
  <div class="rounded-card bg-surface p-6 shadow-card">Card 2</div>
  <div class="rounded-card bg-surface p-6 shadow-card">Card 3</div>
</div>

<!-- Dashboard grid with named areas -->
<div class="grid grid-cols-[240px_1fr] grid-rows-[64px_1fr] min-h-svh">
  <header class="col-span-2 border-b">Header</header>
  <aside class="border-r p-4">Sidebar</aside>
  <main class="overflow-y-auto p-6">Content</main>
</div>

<!-- Bento grid -->
<div class="grid auto-rows-[180px] grid-cols-3 gap-4">
  <div class="col-span-2 row-span-2 rounded-2xl bg-primary-100">Large</div>
  <div class="rounded-2xl bg-surface-alt">Small 1</div>
  <div class="rounded-2xl bg-surface-alt">Small 2</div>
  <div class="col-span-3 rounded-2xl bg-primary-50">Full width</div>
</div>
```

### Container Queries

```html
<!-- Container queries — component-level responsiveness -->
<div class="@container">
  <div class="flex flex-col gap-3 @sm:flex-row @sm:items-center @lg:gap-6">
    <img class="size-16 rounded-full @sm:size-20" src="avatar.jpg" alt="">
    <div>
      <h3 class="text-lg font-semibold @lg:text-xl">User Name</h3>
      <p class="text-sm text-text-muted @lg:text-base">Description</p>
    </div>
  </div>
</div>

<!-- Named container -->
<div class="@container/card">
  <div class="@md/card:grid @md/card:grid-cols-2">
    <!-- Responds to the card container's width, not viewport -->
  </div>
</div>

<!-- ❌ HALLUCINATION TRAP: Container queries use @sm, @md, @lg (with @ prefix)
     NOT sm:, md:, lg: — those are VIEWPORT breakpoints
     @sm = container >= 320px   (component-level)
     sm: = viewport >= 640px    (page-level) -->
```

---

## Typography

### Fluid Typography with clamp()

```html
<!-- Fluid heading — scales smoothly from 2rem to 4rem -->
<h1 class="text-[clamp(2rem,5vw,4rem)] font-bold leading-tight tracking-tight">
  Responsive Heading
</h1>

<!-- Fluid body text -->
<p class="text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-text-muted">
  Body text that scales with viewport
</p>

<!-- Prose (for long-form content) -->
<article class="prose prose-lg mx-auto max-w-3xl dark:prose-invert">
  <!-- @tailwindcss/typography plugin handles all typography -->
  <h1>Article Title</h1>
  <p>Paragraph with <a href="#">links</a> and <code>code</code>.</p>
</article>
```

### Font Loading

```css
/* @font-face in your CSS (Tailwind v4 approach) */
@font-face {
  font-family: "Inter";
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/inter-variable.woff2") format("woff2");
}

@theme {
  --font-sans: "Inter", system-ui, sans-serif;
}
```

---

## Component Patterns

### Button System

```html
<!-- Base button with variants -->
<button class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
               text-sm font-medium transition-all duration-150
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500
               active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50">
  Button Text
</button>

<!-- Primary variant -->
<button class="... bg-primary-600 text-white shadow-sm hover:bg-primary-700">Primary</button>

<!-- Ghost variant -->
<button class="... text-text hover:bg-gray-100 dark:hover:bg-gray-800">Ghost</button>

<!-- Destructive variant -->
<button class="... bg-red-600 text-white hover:bg-red-700">Delete</button>

<!-- Icon button -->
<button class="grid size-10 place-items-center rounded-lg hover:bg-gray-100"
        aria-label="Settings">
  <svg class="size-5" ...></svg>
</button>
```

### Input System

```html
<!-- Text input -->
<div class="space-y-1.5">
  <label for="email" class="text-sm font-medium text-text">Email</label>
  <input id="email" type="email" placeholder="you@example.com"
    class="w-full rounded-lg border border-gray-300 bg-surface px-3.5 py-2.5
           text-sm text-text placeholder:text-text-muted
           transition-colors duration-150
           focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
           disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
  />
  <p class="text-xs text-red-500">Error message here</p>
</div>

<!-- Checkbox -->
<label class="flex items-center gap-2.5 text-sm">
  <input type="checkbox"
    class="size-4 rounded border-gray-300 text-primary-600
           focus:ring-2 focus:ring-primary-500/20" />
  Remember me
</label>
```

### Card Pattern

```html
<div class="group overflow-hidden rounded-card bg-surface shadow-card
            transition-shadow duration-200 hover:shadow-elevated">
  <div class="aspect-video overflow-hidden bg-gray-100">
    <img src="cover.jpg" alt="Cover"
      class="size-full object-cover transition-transform duration-300
             group-hover:scale-105" />
  </div>
  <div class="space-y-2 p-5">
    <span class="inline-block rounded-full bg-primary-100 px-2.5 py-0.5
                 text-xs font-medium text-primary-700">Category</span>
    <h3 class="text-lg font-semibold text-text line-clamp-2">Card Title</h3>
    <p class="text-sm text-text-muted line-clamp-3">Description text...</p>
  </div>
</div>
```

### Modal / Dialog

```html
<!-- Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50
            backdrop-blur-sm animate-fade-in">
  <!-- Modal -->
  <div class="w-full max-w-md rounded-2xl bg-surface p-6 shadow-elevated animate-slide-up"
       role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title" class="text-lg font-semibold">Dialog Title</h2>
    <p class="mt-2 text-sm text-text-muted">Dialog description.</p>

    <div class="mt-6 flex justify-end gap-3">
      <button class="rounded-lg px-4 py-2 text-sm hover:bg-gray-100">Cancel</button>
      <button class="rounded-lg bg-primary-600 px-4 py-2 text-sm text-white
                     hover:bg-primary-700">Confirm</button>
    </div>
  </div>
</div>
```

---

## Responsive Design Rules

```html
<!-- Tailwind breakpoints (mobile-first) -->
<!-- sm: 640px  │ md: 768px  │ lg: 1024px  │ xl: 1280px  │ 2xl: 1536px -->

<!-- Stack on mobile, row on tablet+ -->
<div class="flex flex-col gap-4 md:flex-row md:items-center">
  <div class="md:w-1/2">Left</div>
  <div class="md:w-1/2">Right</div>
</div>

<!-- Hide/show at breakpoints -->
<nav class="hidden lg:flex">Desktop nav</nav>
<button class="lg:hidden">☰ Mobile menu</button>

<!-- Responsive padding -->
<section class="px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
  <div class="mx-auto max-w-7xl">Content</div>
</section>

<!-- Responsive grid -->
<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <!-- Cards -->
</div>
```

---

## Animations & Transitions

### Transition Utilities

```html
<!-- Smooth hover transitions -->
<a class="text-text-muted transition-colors duration-150 hover:text-primary-600">Link</a>

<!-- Transform transitions -->
<div class="transition-transform duration-300 hover:-translate-y-1 hover:scale-105">
  Hover me
</div>

<!-- Combined transition -->
<button class="rounded-lg bg-primary-600 px-4 py-2 text-white
               transition-all duration-200
               hover:bg-primary-700 hover:shadow-lg
               active:scale-95">
  Click me
</button>
```

### Custom Keyframe Animations

```css
@theme {
  --animate-bounce-in: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --animate-spin-slow: spin 3s linear infinite;
  --animate-pulse-soft: pulse-soft 2s ease-in-out infinite;
}

@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Scroll-Driven Animations (CSS Native)

```css
/* Progress bar that fills as user scrolls */
.scroll-progress {
  animation: grow-width linear;
  animation-timeline: scroll();
}

@keyframes grow-width {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

```html
<div class="scroll-progress fixed top-0 left-0 z-50 h-1 w-full origin-left bg-primary-600"></div>
```

---

## Performance

### Purging & Bundle Size

```css
/* Tailwind v4 automatically tree-shakes unused CSS at build time */
/* No manual purge configuration needed */

/* @source — explicitly add content paths for scanning */
@source "../components/**/*.tsx";
@source "../pages/**/*.tsx";

/* ❌ HALLUCINATION TRAP: Tailwind v4 does NOT use purge: [] config
   ❌ purge: ['./src/**/*.{html,tsx}']  ← REMOVED in v4
   ✅ Uses automatic content detection based on your project structure
   ✅ Use @source directive for custom paths */
```

### Avoiding Bloat

```html
<!-- ✅ GOOD: Use component extraction for repeated patterns -->
<!-- Create a .btn class in CSS instead of repeating 15 utilities -->

<!-- ❌ BAD: One-off arbitrary values everywhere -->
<div class="mt-[13px] mr-[7px] p-[11px] text-[15px]">
  <!-- Every arbitrary value = unique CSS rule = bundle bloat -->
</div>

<!-- ✅ GOOD: Use your design scale -->
<div class="mt-3 mr-2 p-3 text-sm">
  <!-- Maps to existing utilities = zero extra CSS -->
</div>
```

### Component Extraction (When to @apply)

```css
/* Use @apply ONLY for highly reused component patterns */
/* Do NOT @apply everything — it defeats Tailwind's purpose */

.btn {
  @apply inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5
         text-sm font-medium transition-all duration-150
         focus-visible:outline-2 focus-visible:outline-offset-2
         active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50;
}

.btn-primary {
  @apply btn bg-primary-600 text-white shadow-sm hover:bg-primary-700
         focus-visible:outline-primary-500;
}

/* ❌ HALLUCINATION TRAP: @apply is for component patterns shared across files
   If a pattern appears in only 1-2 places, just use inline utilities
   Over-extracting with @apply = recreating regular CSS with extra steps */
```

---

## Accessibility with Tailwind

```html
<!-- Focus visible (keyboard only, not mouse click) -->
<a class="rounded-lg focus-visible:outline-2 focus-visible:outline-primary-500
          focus-visible:outline-offset-2">
  Keyboard accessible link
</a>

<!-- Screen reader only text -->
<button>
  <svg class="size-5" aria-hidden="true"></svg>
  <span class="sr-only">Close menu</span>
</button>

<!-- Motion-safe / motion-reduce -->
<div class="motion-safe:animate-bounce-in motion-reduce:animate-none">
  <!-- Only animates if user hasn't enabled "reduce motion" -->
</div>

<!-- Forced colors mode (high contrast) -->
<button class="bg-primary-600 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]">
  Accessible button
</button>
```

---
