---
name: frontend-design
description: Design thinking for web UI. Micro-interactions, visual hierarchy, typography scaling, HSL color palettes, spacing systems, and CSS-first UI logic. Avoid generic AI aesthetics.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Frontend Design — Dense Reference

## Hallucination Traps (Read First)
- ❌ Purple gradient backgrounds (`from-purple-500 to-blue-500`) → ✅ The worst AI UI cliché. Use high-contrast solid colors, grain, or sophisticated HSL mono-palettes.
- ❌ Hardcoded pixels (`font-size: 14px`) → ✅ Use `rem` for accessibility and scaling (`1rem = 16px`).
- ❌ Gray text (`#888`) on white → ✅ Fails WCAG contrast. Text must be `4.5:1` ratio.
- ❌ Generic sans-serif → ✅ Inter, Geist, Roboto Mono, or system-ui. Typography is 80% of design.
- ❌ "Bento Box" grids for everything → ✅ Overused pattern. Use directional flow or asymmetric layouts.
- ❌ Symmetrical layouts out of laziness → ✅ Tension and blank space (negative space) drive premium feel.
- ❌ Infinite scrolling without context → ✅ Provide clear footers or logical pagination markers.
- ❌ Over-animating everything (`all elements fade in`) → ✅ Animate state changes (hover, focus, submit), not static entry layout unless scrollytelling.

---

## 1. Color Theory (HSL over HEX)

Never use raw flat HEX colors. Use HSL to build cohesive scales.

```css
:root {
  /* HSL allows programmatic adjustment of lightness/saturation */
  --hue: 220; 
  --sat: 80%;
  
  --bg-base: hsl(var(--hue), 15%, 98%);
  --bg-surface: hsl(var(--hue), 20%, 100%);
  
  --text-main: hsl(var(--hue), 40%, 10%);
  --text-muted: hsl(var(--hue), 20%, 40%);
  
  --primary: hsl(var(--hue), var(--sat), 50%);
  --primary-hover: hsl(var(--hue), var(--sat), 40%); /* Darken via L */
}

/* OLED Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-base: hsl(var(--hue), 10%, 2%);
    --bg-surface: hsl(var(--hue), 10%, 6%);
    --text-main: hsl(var(--hue), 20%, 95%);
    --text-muted: hsl(var(--hue), 10%, 60%);
  }
}
```

## 2. Spatial Systems & Grid Mathematics

Design relies on structural rhythm. Use an **8px base system**.

- **Micro padding**: `4px`, `8px` (Tags, List items)
- **Component padding**: `16px`, `24px` (Cards, Inputs, Modals)
- **Section spacing**: `48px`, `64px`, `96px` (Page sections)
- **Line height**: Body `1.5`, Headings `1.1` or `1.2`.

```css
/* Fluid Typography (Clamp) */
h1 {
  /* Min 2rem, fluidly scale between 480px-1200px, Max 4rem */
  font-size: clamp(2rem, 5vw, 4rem);
  letter-spacing: -0.02em; /* Tighten large text */
}

p {
  font-size: 1rem;
  max-width: 65ch; /* Optimal reading length */
}
```

---

## 3. Interaction & "Juice" (Micro-interactions)

A premium UI reacts to the user instantly and smoothly. Focus on state transitions.

```css
/* Smooth generic transition */
.btn {
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Active Depth - The physical button push */
.btn:active {
  transform: scale(0.97);
}

/* Hardware-Accelerated Shadows */
.card {
  box-shadow: 0 4px 6px -1px rgba(0,0,0, 0.1), 0 2px 4px -1px rgba(0,0,0, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: translateY(-4px); /* Float effect */
  box-shadow: 0 20px 25px -5px rgba(0,0,0, 0.1), 0 10px 10px -5px rgba(0,0,0, 0.04);
}
```

---

## 4. Modern Glassmorphism & Depth

Flat design is dead. Modern UI uses depth, layering, and blur.

```css
/* Frosted Glass */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
```

---

## 5. Forms and High-Friction UI

Forms are where users drop off. They must be flawless.

- **Auto-focus** the first input on modal open.
- **Labels** must be visible outside the input (not just placeholders).
- **Validation** happens `onBlur` (when leaving), NOT `onChange` (typing).
- **Submit buttons** show loading spinners, disable inputs, and prevent double-clicks.

```css
/* Focus-visible: Only show ring for keyboard nav, not mouse clicks */
button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

## 6. Accessibility (WCAG 2.2 AA)

Design is fundamentally broken if it excludes users.

- ✅ Interactive elements need `aria-label` if not visually labeled.
- ✅ Custom dropdowns/selects must support Arrow Keys and Escape.
- ✅ Color alone cannot convey state (Error text must have an icon too `❌ Password invalid`).
- ✅ Hide decorative SVG/icons from screen readers `aria-hidden="true"`.
