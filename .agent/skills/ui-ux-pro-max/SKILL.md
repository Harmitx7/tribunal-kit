---
name: ui-ux-pro-max
description: The Picasso Protocol — Elite UI/UX design mastery for web and mobile. Covers visual identity systems, spatial composition, typography mathematics, color science (OKLCH), motion choreography, responsive architecture, dark mode engineering, and anti-AI-slop aesthetics. The definitive skill for building interfaces that feel designed by a human creative director, not an algorithm.
version: 2.0.0
last-updated: 2026-04-29
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# UI/UX Pro Max v2.0 — The Picasso Protocol

> "Good design is obvious. Great design is transparent." — Joe Sparano

This skill transforms AI-generated interfaces from generic "AI slop" into portfolio-grade work indistinguishable from a senior designer's output. Every section is a weapon against mediocrity.

---

## 🚨 Hallucination Traps (Read First — Violations = Instant Rejection)

```
❌ Purple/violet primary color              → ✅ The #1 AI cliché. Use amber, teal, coral, slate, or warm neutrals.
❌ Inter/Roboto/Arial as body font          → ✅ Generic. Use Geist, Satoshi, Cabinet Grotesk, General Sans, or Clash Display.
❌ Hero: left-text + right-image            → ✅ Lazy. Use full-bleed, editorial overlap, or typographic-only hero.
❌ Mesh gradient backgrounds                → ✅ The new stock photo. Use grain, solid contrast, or layered depth.
❌ Border-radius: 8px on everything         → ✅ Monotonous. Mix sharp (2px) and soft (20px+) radii for hierarchy.
❌ Gray text (#888) on white (#fff)         → ✅ Fails WCAG AA (3.7:1). Minimum contrast ratio is 4.5:1.
❌ "Bento box" grid for everything          → ✅ Overused. Directional flow, overlap, or editorial asymmetry.
❌ Card → Card → Card with even spacing     → ✅ Visual monotony. Vary sizes, break the grid, create tension.
❌ box-shadow: 0 2px 8px rgba(0,0,0,0.1)   → ✅ Default AI shadow. Use layered multi-shadow for realism.
❌ Animating opacity + translateY on load   → ✅ Every AI does this. Use clip-path reveals, blur-in, or scale-from-origin.
❌ Using px for font-size                   → ✅ Use rem (scales with user preference) or clamp() for fluid type.
❌ White (#FFFFFF) backgrounds              → ✅ Harsh. Use off-white (#FAFAF8, #F5F3EF) or tinted neutrals.
```

---

## 1. The Identity System (Decide Before You Code)

Before writing a single `div`, commit to a **visual identity**. This is the most important decision.

### The Spectrum of Intention
```
PICK ONE direction — do NOT blend without purpose:

Brutalist         → Raw, exposed structure, monospace, high-contrast, no rounded corners
Editorial         → Magazine-inspired, dramatic type scale, generous whitespace, serif headlines
Neo-Glassmorphism → Translucent layers, blur, light borders, floating panels, depth
Soft Minimal      → Warm neutrals, subtle shadows, rounded forms, breathing room
Dark Luxury       → True black (#09090B), gold/amber accents, thin weights, restrained motion
Neon Cyberpunk    → Dark base, vivid saturated accents, glow effects, sharp geometry
Organic Natural   → Earth tones, rounded blobs, hand-drawn feel, textured backgrounds
Swiss Precision   → Grid-locked, Helvetica-lineage type, clinical whitespace, no decoration
Retro Analog      → Warm grain, rounded type, muted palettes, physical texture
```

### Identity Lockfile (Define These 7 Tokens)
```css
/* EVERY project must define these before any component work */
:root {
  --font-display: 'Clash Display', sans-serif;   /* Headlines — characterful */
  --font-body: 'Satoshi', sans-serif;             /* Body — readable */
  --font-mono: 'JetBrains Mono', monospace;       /* Code — purposeful */

  --radius-sharp: 2px;                            /* Tags, badges */
  --radius-default: 12px;                         /* Cards, inputs */
  --radius-soft: 24px;                            /* Buttons, pills */

  --shadow-subtle: 0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.04);
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-dramatic: 0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
}
```

---

## 2. Color Science (OKLCH Over HSL Over HEX)

**OKLCH** is the modern standard: perceptually uniform, CSS-native, and predictable across lightness levels. HSL lies about perceived brightness (yellow at 50% L looks brighter than blue at 50% L). OKLCH fixes this.

```css
:root {
  /* OKLCH: oklch(lightness% chroma hue) */
  --primary: oklch(65% 0.25 250);            /* Vivid teal */
  --primary-hover: oklch(55% 0.25 250);      /* Same hue, darker */
  --primary-subtle: oklch(95% 0.03 250);     /* Tinted background */

  --danger: oklch(60% 0.25 25);              /* Warm red */
  --success: oklch(70% 0.18 155);            /* Natural green */
  --warning: oklch(80% 0.15 80);             /* Amber */

  /* Neutral scale — tinted with brand hue for cohesion */
  --gray-50: oklch(98% 0.005 250);
  --gray-100: oklch(95% 0.008 250);
  --gray-200: oklch(90% 0.01 250);
  --gray-400: oklch(70% 0.01 250);
  --gray-600: oklch(45% 0.01 250);
  --gray-900: oklch(15% 0.01 250);
}

/* Dark mode — invert lightness, preserve chroma */
@media (prefers-color-scheme: dark) {
  :root {
    --gray-50: oklch(8% 0.005 250);
    --gray-100: oklch(12% 0.008 250);
    --gray-200: oklch(18% 0.01 250);
    --gray-400: oklch(40% 0.01 250);
    --gray-600: oklch(65% 0.01 250);
    --gray-900: oklch(95% 0.01 250);
  }
}
```

### Palette Rules
```
1. Primary: ONE dominant hue. Never two competing saturated colors.
2. Accent: Complementary or analogous to primary, used sparingly (<10% of surface area).
3. Neutrals: Tint your grays with the primary hue (5-10 chroma). Pure gray (#808080) looks dead.
4. Semantic: Red=danger, Green=success, Amber=warning — never override these cultural meanings.
5. Contrast: Large text (≥24px) needs 3:1 ratio. Body text needs 4.5:1. Use oklch lightness to guarantee this.
```

---

## 3. Typography Mathematics

Typography is 80% of UI design. Get this right and everything else follows.

### The Type Scale (Musical Intervals)
```css
/* Major Third scale (1.25 ratio) — balanced for UI */
:root {
  --text-xs: clamp(0.64rem, 0.5vw + 0.5rem, 0.75rem);    /* 10-12px */
  --text-sm: clamp(0.8rem, 0.6vw + 0.6rem, 0.875rem);    /* 12-14px */
  --text-base: clamp(1rem, 0.8vw + 0.7rem, 1.125rem);    /* 16-18px */
  --text-lg: clamp(1.25rem, 1vw + 0.8rem, 1.5rem);       /* 20-24px */
  --text-xl: clamp(1.563rem, 1.5vw + 1rem, 2rem);        /* 25-32px */
  --text-2xl: clamp(1.953rem, 2vw + 1.2rem, 2.5rem);     /* 31-40px */
  --text-3xl: clamp(2.441rem, 3vw + 1.5rem, 3.5rem);     /* 39-56px */
  --text-hero: clamp(3.052rem, 5vw + 1.5rem, 6rem);      /* 48-96px */
}

/* Typographic rules */
h1, h2, h3 {
  font-family: var(--font-display);
  letter-spacing: -0.02em;    /* Tighten headlines */
  line-height: 1.1;           /* Tight leading for large type */
  text-wrap: balance;         /* CSS native text balancing */
}

p, li {
  font-family: var(--font-body);
  line-height: 1.6;           /* Generous leading for readability */
  max-width: 65ch;            /* Optimal reading measure */
}

/* Optical kerning for hero text */
.hero-title {
  font-size: var(--text-hero);
  font-weight: 700;
  letter-spacing: -0.04em;    /* Aggressive tightening at large sizes */
  line-height: 0.95;          /* Negative leading for drama */
}
```

### Font Pairing Rules
```
WINNING PAIRS (character + readability):
  Display: Clash Display     + Body: Satoshi          → Modern editorial
  Display: Playfair Display  + Body: Source Sans 3     → Luxury editorial
  Display: Space Grotesk     + Body: General Sans      → Tech-forward
  Display: Fraunces          + Body: Inter              → Warm approachable
  Display: Cabinet Grotesk   + Body: Switzer           → Swiss contemporary

FORBIDDEN:
  ❌ Inter + Inter (monotonous)
  ❌ Roboto + Roboto (Android system default)
  ❌ Any two display fonts together (visual conflict)
  ❌ Thin weights (<300) for body text at <16px (unreadable)
```

---

## 4. Spatial Composition — Breaking the Grid

The best designs follow a grid, then intentionally break it at key moments for drama.

### The 8px Spatial System
```css
:root {
  --space-1: 0.25rem;  /* 4px  — micro: icon gap */
  --space-2: 0.5rem;   /* 8px  — tight: tag padding */
  --space-3: 0.75rem;  /* 12px — compact: list item gap */
  --space-4: 1rem;     /* 16px — default: input padding */
  --space-5: 1.5rem;   /* 24px — card padding */
  --space-6: 2rem;     /* 32px — section gap */
  --space-8: 3rem;     /* 48px — major section break */
  --space-10: 4rem;    /* 64px — page section */
  --space-16: 8rem;    /* 128px — hero breathing room */
}
```

### Layout Techniques That Stand Out
```css
/* 1. Asymmetric two-column (not 50/50) */
.layout-asymmetric {
  display: grid;
  grid-template-columns: 2fr 1fr;   /* 66/33 split — creates visual tension */
  gap: var(--space-8);
}

/* 2. Overlap / Negative margin (elements bleeding into each other) */
.card-featured {
  margin-top: -4rem;                  /* Pull into previous section */
  position: relative;
  z-index: 2;
}

/* 3. Full-bleed breakout from container */
.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);     /* Escape any container */
}

/* 4. Broken grid — one element escapes alignment */
.grid-broken > :nth-child(3) {
  grid-column: 1 / -1;               /* Span full width */
  transform: rotate(-1deg);          /* Subtle tilt = handmade feel */
}
```

---

## 5. Motion Choreography (Not Just Animation)

Motion should tell a story. Every animation needs a **purpose**: feedback, orientation, or delight.

### The Motion Hierarchy
```
Priority 1: FEEDBACK    — Button press, toggle, form validation (instant, <100ms)
Priority 2: ORIENTATION — Page transitions, modal open/close (200-400ms)
Priority 3: DELIGHT     — Scroll reveals, hover effects, loading states (300-800ms)

NEVER animate for decoration alone. Every motion answers: "What just happened?" or "Where am I?"
```

### CSS-First Motion Library
```css
/* Custom easing — never use 'ease' or 'linear' */
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);    /* Snappy exit */
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1); /* Overshoot */
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1); /* Dramatic */
  --spring: cubic-bezier(0.22, 1.2, 0.36, 1);         /* Bounce feel */
}

/* Staggered reveal — the single most impactful animation pattern */
.stagger-children > * {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeUp 0.6s var(--ease-out-expo) forwards;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 80ms; }
.stagger-children > *:nth-child(3) { animation-delay: 160ms; }
.stagger-children > *:nth-child(4) { animation-delay: 240ms; }

@keyframes fadeUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Clip-path reveal — more sophisticated than fade */
.reveal-clip {
  clip-path: inset(100% 0 0 0);
  animation: clipReveal 0.8s var(--ease-out-expo) forwards;
}
@keyframes clipReveal {
  to { clip-path: inset(0 0 0 0); }
}

/* Magnetic hover (cursor follows) — for buttons and cards */
.magnetic {
  transition: transform 0.3s var(--spring);
}
.magnetic:hover {
  transform: translate(var(--mx, 0), var(--my, 0)) scale(1.02);
}

/* Reduce motion — MANDATORY accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Multi-Shadow Realism

Flat shadows look AI-generated. Real shadows have layers.

```css
/* Layered shadow system — physics-based */
.elevation-1 {
  box-shadow:
    0 1px 2px rgba(0,0,0,0.03),
    0 2px 4px rgba(0,0,0,0.03),
    0 4px 8px rgba(0,0,0,0.03);
}

.elevation-2 {
  box-shadow:
    0 2px 4px rgba(0,0,0,0.02),
    0 4px 8px rgba(0,0,0,0.03),
    0 8px 16px rgba(0,0,0,0.04),
    0 16px 32px rgba(0,0,0,0.04);
}

.elevation-3 {
  box-shadow:
    0 4px 8px rgba(0,0,0,0.02),
    0 8px 16px rgba(0,0,0,0.04),
    0 16px 32px rgba(0,0,0,0.06),
    0 32px 64px rgba(0,0,0,0.08);
}

/* Colored shadow (matches card content) */
.card-accent {
  box-shadow:
    0 8px 24px oklch(65% 0.15 250 / 0.2),  /* Tinted with primary */
    0 2px 4px rgba(0,0,0,0.04);
}
```

---

## 7. Dark Mode Engineering (Not Just Invert)

Dark mode is a separate design system, not a filter.

```css
/* Wrong: Just swap black and white */
/* Right: Reduce contrast, shift depth model, adjust chroma */

[data-theme="dark"] {
  --bg-base: oklch(8% 0.005 250);      /* Near-black, not pure #000 */
  --bg-surface: oklch(13% 0.008 250);  /* Cards — slightly lighter */
  --bg-elevated: oklch(18% 0.01 250);  /* Modals — even lighter */

  --text-primary: oklch(93% 0.005 250);   /* Not pure white — too harsh */
  --text-secondary: oklch(65% 0.01 250);

  /* Borders become lighter in dark mode, not darker */
  --border: oklch(22% 0.01 250);

  /* Shadows become ambient glows or disappear entirely */
  --shadow-medium: 0 4px 12px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.05);

  /* Saturated colors DECREASE chroma in dark mode to avoid eye strain */
  --primary: oklch(70% 0.18 250);  /* Lower chroma than light mode */
}

/* Key rules:
   1. Dark backgrounds use INCREASING lightness for elevation (opposite of light mode)
   2. Never use pure #000000 unless targeting OLED (then use it ONLY for the base layer)
   3. Reduce image brightness: img { filter: brightness(0.9); }
   4. Invert shadows: dark mode cards don't cast shadows — they glow or use borders
*/
```

---

## 8. Responsive Architecture

Don't think "desktop then mobile." Think "content then container."

```css
/* Container queries > media queries for components */
.card-grid {
  container-type: inline-size;
  container-name: card-grid;
}

@container card-grid (min-width: 600px) {
  .card-grid-inner {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container card-grid (min-width: 900px) {
  .card-grid-inner {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Fluid spacing that scales with viewport */
.section {
  padding-block: clamp(2rem, 6vw, 6rem);
  padding-inline: clamp(1rem, 4vw, 4rem);
}

/* Mobile touch targets */
@media (pointer: coarse) {
  button, a, input, select {
    min-height: 48px;   /* Thumb-friendly */
    min-width: 48px;
  }
}
```

---

## 9. Texture & Atmosphere

The difference between "AI-generated" and "designed" is atmosphere.

```css
/* Noise grain overlay — adds physical texture */
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.4;
}

/* Gradient mesh — subtle background depth */
.atmosphere {
  background:
    radial-gradient(ellipse at 20% 50%, oklch(95% 0.03 250 / 0.5), transparent 50%),
    radial-gradient(ellipse at 80% 20%, oklch(95% 0.03 30 / 0.3), transparent 50%),
    oklch(98% 0.005 250);
}

/* Glassmorphism — done correctly */
.glass {
  background: oklch(100% 0 0 / 0.6);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid oklch(100% 0 0 / 0.15);
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}
```

---

## 10. Mobile-Specific Design Rules

```
TOUCH PSYCHOLOGY:
  • Bottom 40% of screen = primary actions (thumb zone)
  • Top 25% = destructive/rare actions (stretch zone)
  • 48px minimum touch target (visual size can be 24px with padding expanding hitbox)
  • Spring physics (stiffness: 400, damping: 15) for all interactive animations

PLATFORM RESPECT:
  • iOS: Rounded 12px corners, system blur, SF Symbols icon style, sheet presentations
  • Android: Material You dynamic color, 4dp grid, ripple feedback, edge-to-edge
  • NEVER make iOS look like Android or vice versa — respect each platform's language

PERFORMANCE:
  • Only animate transform + opacity (GPU composited)
  • Never animate width, height, margin, padding (layout recalc = jank)
  • FlashList over FlatList over ScrollView for lists (10x perf difference)
  • Cancel all animations on unmount (memory leak prevention)
```

---

## 11. The Anti-AI-Slop Checklist

Before submitting ANY UI, verify against this list:

```
□ Does it have a clear visual identity, or does it look like "default"?
□ Is the font pairing distinctive (not Inter + Inter)?
□ Are colors OKLCH-based and tinted (not flat gray)?
□ Are shadows multi-layered (not single box-shadow)?
□ Is there at least ONE grid-breaking element for visual tension?
□ Does motion serve a PURPOSE (feedback/orientation/delight)?
□ Is dark mode a separate design, not just inverted colors?
□ Are touch targets 48px+ on mobile (pointer: coarse)?
□ Does prefers-reduced-motion disable ALL animations?
□ Is contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text?
□ Is the hero section NOT "left text, right image"?
□ Is the primary color NOT purple/violet?
```

If any answer is NO, the design is not ready for production.

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Picasso Protocol: UI Recommendation ━━━━━━━━━━━━━━━━
Identity:    [chosen visual direction from Section 1]
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────────────
Anti-Slop:   ✅ Passed (12/12 checks)
             or ❌ Failed: [specific check that failed]
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
**Active reviewers: `logic-reviewer` · `security-auditor` · `ui-ux-auditor` · `accessibility-reviewer`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
4. **AI-Slop Convergence:** Producing the same purple-gradient, Inter-font, bento-grid layout that every AI defaults to.



Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
✅ Does this UI pass the Anti-AI-Slop Checklist (Section 11)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?
- [ ] Have I verified the design passes the Anti-AI-Slop Checklist?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
