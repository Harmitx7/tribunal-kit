---
name: frontend-design
description: Design thinking for web UI. Micro-interactions, visual hierarchy, typography scaling, HSL color palettes, spacing systems, and CSS-first UI logic. Avoid generic AI aesthetics.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
routing:
  domain: general
  tier: basic
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

## 1. Modern Color Systems (OKLCH & HSL)

Never use raw flat HEX colors. Use OKLCH (perceptually uniform) or HSL to build scalable, harmonic themes.

```css
:root {
  /* OKLCH perceptual uniformity: lightness (0-100%), chroma (0-0.37), hue (0-360) */
  --brand-primary: oklch(62% 0.21 275);
  --brand-hover: oklch(from var(--brand-primary) calc(l - 0.1) c h); /* Relative Color Syntax */
  
  --bg-base: oklch(98% 0.005 240);
  --bg-surface: oklch(100% 0 0);
  --text-main: oklch(20% 0.02 240);
  --text-muted: oklch(50% 0.02 240);
}

/* Light/Dark mode via native light-dark() function or OLED media query */
:root {
  color-scheme: light dark;
  --bg-surface: light-dark(oklch(100% 0 0), oklch(15% 0.01 240));
  --text-main: light-dark(oklch(20% 0.02 240), oklch(95% 0.01 240));
}
```

---

## 2. Spatial Systems & Container Queries

Design relies on structural rhythm and component-level adaptability.

- **Base Spacing Grid (8px)**: Micro `4px`, `8px` | Component `16px`, `24px` | Section `48px`, `64px`, `96px`
- **Nested Border Radius Formula**: `outer_radius = inner_radius + padding`
- **Fluid Typography**: Use `clamp()` and `cqi` container units over macro media queries.

```css
/* Container Queries for Portable Components */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card-body {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5cqi;
  }
}

/* Typographic Balance */
h1, h2, h3 {
  font-size: clamp(2rem, 4vw + 1rem, 4rem);
  letter-spacing: -0.02em;
  text-wrap: balance; /* Prevents awkward multiline headline breaks */
}

p {
  font-size: 1rem;
  max-width: 65ch;
  text-wrap: pretty; /* Eliminates typographical orphans in body text */
}
```

---

## 3. Interaction & Entry Motion (@starting-style)

A premium UI reacts to user actions instantly and provides smooth DOM mount transitions.

```css
/* Physical press feedback */
.btn {
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.15s ease;
}
.btn:active {
  transform: scale(0.97);
}

/* Entry/Exit Animations for DOM Elements (@starting-style) */
.toast {
  display: none;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s ease, transform 0.25s ease, display 0.25s allow-discrete;
}
.toast.is-open {
  display: flex;
  opacity: 1;
  transform: translateY(0);
}
@starting-style {
  .toast.is-open {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

---

## 4. Modern Glassmorphism & Multi-Layer Depth

Avoid flat 1px borders and muddy single shadows. Use multi-layered elevation.

```css
.card {
  background: light-dark(rgba(255, 255, 255, 0.8), rgba(20, 20, 25, 0.8));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.12));
  border-radius: 16px;
  box-shadow: 
    0 1px 2px oklch(0% 0 0 / 0.05),
    0 4px 12px oklch(0% 0 0 / 0.08);
}
```

---

## 5. Accessibility (WCAG 2.2 AA Standards)

Design is broken if it excludes users.
- ✅ **SC 2.5.8 Target Size**: Interactive controls must be at least `24x24px` CSS pixels (min `44x44px` for touch targets).
- ✅ **SC 2.4.11 Focus Not Obscured**: Focused elements must never be completely hidden by sticky headers/footers.
- ✅ **SC 2.4.13 Focus Appearance**: Visible focus rings must achieve `3:1` contrast ratio with a minimum 2px perimeter offset.
- ✅ **Color Alone**: Never rely solely on color to convey state (pair error alerts with icons).

```css
button:focus-visible, a:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 3px;
}
```

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
