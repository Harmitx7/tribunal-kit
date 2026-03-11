---
description: Plan and implement cutting-edge advanced UI/UX
---

# /ui-ux-pro-max — Advanced Cutting-Edge UI/UX Design Mode

$ARGUMENTS

---

This command activates the absolute highest-fidelity UI/UX workflow, meant for 2026+ web and mobile standards. It combines deep neuro-inclusive design thinking, spatial UI concepts, advanced component architecture, and generative styling. This is not just "generate a pretty layout" — it is the creation of a responsive, living, and hyper-optimized interface.

> This is a full state-of-the-art design session. We are pushing pixels, physics, and perceptual psychology.

---

## When to Use This vs Other Commands

| Use `/ui-ux-pro-max` when... | Use something else when... |
|---|---|
| You need pixel-perfect, award-worthy UI craft | Standard UI is acceptable → `/create` |
| Design system, color system, typography all need definition | Just one component → `/generate` |
| You want accessibility, motion, and spatial design all considered | Quick functional prototype → `/create` |
| Neuro-inclusive + APCA contrast standards are required | Speed matters over design quality → `/create` |

---

## What Makes This Different From `/create`

`/create` builds standard features. `/ui-ux-pro-max` obsesses over extreme craft and futuristic patterns:

- **Generative & Algorithmic Color**: Using OKLCH/LCH for perceptual uniformity, not just picking hex codes that "look nice."
- **Fluid & Variable Typography**: Designing with `clamp()`, `ch` units, and Variable Fonts for infinite scaling, not fixed breakpoints.
- **Adaptive Psychology & Neuro-Inclusivity**: Respecting `prefers-reduced-motion`, varying cognitive load based on context, and utilizing OLED battery-saving true black themes.
- **Advanced Micro-Interactions**: Spring-physics based animations and scroll-driven interactions instead of static, linear CSS transitions.
- **Spatial & Contextual UI**: Considering z-axis depth (glass, blurs, multi-layered shadows) and contextual adaptation (UI conforming to user behavior).

---

## Extreme Design Rules (Always Active in This Mode)

### Generative Color & Light
- **No purple/violet as primary color** — the most overused "AI design" cliché is banned.
- Color palettes must be derived using algorithmic relationships (e.g., OKLCH lightness/chroma stepping).
- **True Black & OLED Optimization**: Use `#000000` or `#010101` for deep backgrounds on mobile/PWA to save battery, utilizing high-contrast borders for separation instead of gray backgrounds.
- Contrast must pass **WCAG 3.0 APCA** (Advanced Perceptual Contrast Algorithm) standards for readability, not just older WCAG 2.1 math.

### Fluid & Variable Typography
- Use system variable fonts or explicitly loaded modern Variable Fonts to reduce network requests.
- Body text uses **fluid typography** `clamp(1rem, 0.8rem + 1vw, 1.25rem)` to scale linearly between screen sizes.
- strict adherence to max line lengths (`max-w-[65ch]`) to prevent cognitive fatigue.

### Spatial & Layout Architecture
- Standard hero layouts (left text / right image) are prohibited unless explicitly justified. Use asymmetric, dynamic, or scroll-locked interactive hero sections.
- The Z-axis matters: build depth using multi-layer shadows or contextual background blurs (`backdrop-filter`) carefully applied for performance.
- Use **Logical Properties** (`margin-inline`, `padding-block`) exclusively to enforce automatic RTL (Right-to-Left) and LTR compatibility.

### Advanced Interaction & Physics
- Linear easing (`ease`, `linear`) is banned for layout shifts. You must use **spring physics** or custom `cubic-bezier` curves for natural, organic motion.
- **Scroll-Driven Animations**: UI elements should react to scroll position natively using modern CSS `@scroll-timeline` or performant JS Observers.
- **Zero-Wait UI**: Streaming UI components (like React Server Components or Optimistic UI updates) must be designed so the user never sees a raw loading spinner for action responses.

---

## The Pro-Max Design Protocol

### Step 1 — Perceptual & Contextual Mapping

Before painting a pixel, determine:

```
Who is the specific user persona?
What is the cognitive load capacity here? (e.g., dashboard = high data density, landing page = low friction)
What is the desired emotional & visceral impact?
How will the UI adapt to user input?
```

### Step 2 — Spatial Layout Skeleton (No Colors yet)

Define the structural architecture with depth in mind:
- What is the structural grid? (Subgrid, Container Queries)
- What exists on the Z-axis? (What floats, what is grounded?)
- How does the layout mutate on scroll?

### Step 3 — Generative Color + Fluid Typography System

Define the algorithmic base:

```css
/* Example OKLCH System */
Base hue:         [OKLCH Hue Value]
Surface (Dark):   oklch(15% 0.02 [Hue])
Surface (OLED):   oklch(0% 0 0)
Text Primary:     oklch(96% 0.01 [Hue])
Accent:           oklch(70% 0.25 [Complementary Hue])
```

### Step 4 — Component Build (Tribunal: logic + frontend)

Every component built goes through `/tribunal-frontend` before being shown.
Focus on **Container Queries** (`@container`) so components contextualize themselves based on where they map, not window width.

### Step 5 — Physics & Interaction Layer

Define organic movement:
```css
/* Spring-like organic transition */
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```
Ensure all interactions check for `@media (prefers-reduced-motion: reduce)`.

### Step 6 — Extreme Accessibility Audit

```
✅ APCA Contrast verified.
✅ Logical properties used for full i18n support.
✅ Touch targets mathematically enforce Fitts' Law (>48px minimum).
✅ Cognitive boundaries respected (No sudden layout shifts, CLS = 0).
✅ Screen reader flows tested via semantic HTML5.
```

---

## 🏛️ Anti-Hallucination Rules for UI

- **No invented CSS properties** — Do not guess syntax for scroll timelines or `@property` declarations; write `// VERIFY: check browser compatibility` if using bleach-edge CSS.
- **No placeholder images** — generate real structural visualizations or use SVG abstractions.
- **Do not invent React/Next.js features** that don't exist in the current stable or canary builds.

---

## Output Format

Each step produces a high-fidelity summary:

```
📐 Spatial Layout: [description of grid, container queries, and z-axis layers]

🎨 Generative Color:
   [OKLCH base mapped variables]
   APCA Contrast Check: [Pass/Fail for Text/Bg combinations]

🧱 Component Schema:
   [Name] + [State transitions: Hover, Focus, Active, Skeleton]
   Tribunal: [Verdict]

♿ Neuro-Inclusive Audit:
   [Compliance with cognitive safety, motion reduction, and touch targets]
```

---

## Cross-Workflow Navigation

| After /ui-ux-pro-max produces output... | Do this |
|---|---|
| Component code is ready for merge | `/tribunal-frontend` for React/hooks audit |
| Performance-critical animations written | `/tribunal-performance` to check for jank |
| Color + contrast system defined | Document in the design system, then `/create` components |
| Accessibility audit is required | Additional review with `accessibility-reviewer` via `/review [component]` |

---

## Usage

```
/ui-ux-pro-max design a generative AI prompt dashboard
/ui-ux-pro-max build an e-commerce checkout with extreme conversion optimization
/ui-ux-pro-max create a spatial WebXR-inspired landing page
/ui-ux-pro-max redesign a high-frequency trading interface for minimum cognitive load
```
