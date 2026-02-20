---
description: Plan and implement UI
---

# /ui-ux-pro-max — Advanced UI/UX Design Mode

$ARGUMENTS

---

This command activates the highest-fidelity UI/UX workflow. It combines deep design thinking, component architecture, and real-time feedback — not just "generate a pretty layout."

> This is not a shortcut. It's a full design session.

---

## What Makes This Different From `/create`

`/create` builds features. `/ui-ux-pro-max` obsesses over the craft:

- Color decisions backed by contrast ratios and optical principles — not "looks nice"
- Typography choices based on reading distance, weight hierarchy, and scale
- Layout that solves the actual user flow, not the common template
- Interaction states for every element (hover, focus, active, loading, error, empty)
- Accessibility by default — not retrofitted

---

## Design Rules (Always Active in This Mode)

### Color
- No purple/violet as primary color — most overused AI design choice
- All text must pass WCAG AA contrast (4.5:1 minimum)
- Color palette derived from a single base hue with rotational logic — not random picks
- No pure black backgrounds (`#000`) — use `#090909` to `#121212` for perceived depth

### Typography
- Google Fonts only if you have the `<link>` to prove it exists — no invented font names
- Minimum 16px body text on mobile
- Line height between 1.4–1.6 for body, 1.1–1.2 for headings
- No more than 3 font weights in one component

### Layout
- No standard hero (left text / right illustration) without a compelling reason
- Section max-width: 1200px for content, 720px for text-heavy content
- 8px spacing grid — all padding and margin values are multiples of 8

### Interaction
- Every interactive element has: default, hover, focus, active, and disabled states
- Focus rings must be visible — never `outline: none` without a styled alternative
- Loading states for anything async — no silent spinners
- Error states with actionable copy — not just "Error occurred"

---

## The Design Session Protocol

### Step 1 — Problem Before Pixels

Answer these before designing anything:

```
Who is the user?              (not "general users" — a specific persona)
What is the one thing this UI must make easy?
What is the emotional tone?   (serious, playful, professional, urgent)
What does the user do after this screen?
```

### Step 2 — Layout Skeleton (No Colors yet)

Define the structure:
- What regions exist? (nav, hero, content, sidebar, footer)
- What is the visual hierarchy? (#1 most important thing → #2 → #3)
- What flows from top to bottom when the user scrolls?

### Step 3 — Color + Typography System

Pick once, use consistently:

```
Base hue:         [HSL value]
Primary:          [hue, full saturation]
Background:       [hue, 2–5% saturation, 6–12% lightness for dark]
Surface:          [background + 4–6% lightness]
Text primary:     [96–98% lightness on dark]
Text secondary:   [65–70% lightness on dark]
Accent:           [complementary hue, high saturation]
```

### Step 4 — Component Build (Tribunal: logic + frontend)

Every component built goes through `/tribunal-frontend` before being shown.

### Step 5 — Interaction Layer

Define CSS transitions for every state change:
```css
transition: all 0.15s ease;   /* for micro-interactions */
transition: all 0.25s ease;   /* for layout transitions */
```

### Step 6 — Accessibility Audit

```
✅ All images have alt attributes
✅ Focus order follows visual order
✅ Color is not the only indicator of state (add icon or text)
✅ Touch targets minimum 44px × 44px on mobile
✅ ARIA roles on custom interactive elements
```

---

## 🏛️ Anti-Hallucination Rules for UI

- **No invented Google Fonts** — verify every font name at fonts.google.com before using it
- **No invented CSS properties** — `backdrop-filter` needs vendor prefix in some browsers; write `// VERIFY: check browser support`
- **Contrast ratios must be real** — don't claim AA compliance without checking the actual ratio
- **No placeholder images** — generate real images or use a placeholder service with documented URL format

---

## Output Format

Each step produces:

```
📐 Layout skeleton: [description or ASCII diagram]

🎨 Color system:
   Background:   #[hex]
   Surface:      #[hex]
   Primary text: #[hex]
   Accent:       #[hex]
   Contrast:     [ratio]:1 → AA [pass|fail]

🧱 Component: [name]
   Tribunal: [verdict]

♿ Accessibility:
   [checklist result]
```

---

## Usage

```
/ui-ux-pro-max design a SaaS dashboard homepage
/ui-ux-pro-max build a pricing page that converts
/ui-ux-pro-max create a mobile-first landing page for a productivity app
/ui-ux-pro-max redesign the login and registration flow
```
