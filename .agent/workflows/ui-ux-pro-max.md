---
description: Plan and implement cutting-edge advanced UI/UX. Creates distinctive, production-grade frontend interfaces with high design quality that avoid generic AI aesthetics. Now uses a modular swarm architecture to decompose layout, styling, and motion tasks.
required-skills: ui-ux-researcher, frontend-design, emil-design-eng, motion-engineering, agent-organizer, parallel-agents
---

# /ui-ux-pro-max — Advanced UI/UX Design

$ARGUMENTS

---

## $CONTEXT_REQUIRED

```
Read BEFORE designing:
□ Current UI components       → Follow project idioms and design systems
□ .agent/skills/frontend-design/SKILL.md → Refresh UI guidelines
```

---

## When to Use /ui-ux-pro-max

| Use `/ui-ux-pro-max` when...              | Use instead when...                     |
| :---------------------------------------- | :-------------------------------------- |
| Building a visually distinctive interface | Functional-only component → `/generate` |
| Design quality is the primary goal        | Fast page needed → `/enhance`           |
| Creating from a design brief              | Bug fix in UI → `/debug`                |
| Mobile + web parity required              |                                         |

---

## Phase 1 — Design Intent (Mandatory)

Answer these before any design work:

```
1. Who is the user? (developer tools feel different from consumer apps)
2. What emotion should the interface evoke? (calm focus, urgent speed, playful delight)
3. What is the ONE thing users do most? (hero interaction gets maximum design attention)
4. What existing interfaces does the user love? (don't copy — understand the WHY)
5. What makes this interface DIFFERENT from every competitor?
```

---

## Phase 2 — Design Identity

Every interface built by /ui-ux-pro-max has a distinct visual identity:

```
Forbidden defaults (generic AI aesthetics):
❌ Purple/violet as primary color
❌ Left text / right image hero section
❌ Mesh gradient backgrounds
❌ Bento grid as the only layout
❌ Emoji as icons
❌ shadcn without explicit user request

Distinctive alternatives:
✅ Signal orange, acid green, warm slate, deep red — intentional palettes
✅ Typographic-first hero sections
✅ Grain textures, solid contrast, radial depth
✅ Asymmetric or broken-grid layouts
✅ SVG icons (lucide-react or custom)
✅ Motion that communicates meaning (not decoration)
```

---

## Phase 3 — Interaction Craft

Every interactive element has 4 states designed:

```
1. Default:  The base state
2. Hover:    Indicates interactability (cursor change, subtle lift, color shift)
3. Active:   Confirms click/press (scale down, darker, haptic feedback on mobile)
4. Disabled: Communicates unavailability (reduced opacity, cursor change, tooltip why)
```

Micro-animations are required, not optional:

```
Entry animations:  elements fade/slide in on mount
State transitions: smooth color + scale changes (150–200ms)
Loading states:    skeleton screens, not spinners (skeleton shows shape)
Error shake:       invalid form input shakes (4px left-right)
Success pulse:     confirmed actions pulse green briefly
```

---

## Phase 4 — Swarm Implementation (Modular Generation)

Instead of a single agent generating the entire UI, `/ui-ux-pro-max` leverages a Fan-Out/Fan-In swarm architecture using `.agent/scripts/swarm_dispatcher.js`. The Supervisor decomposes the component into a structured JSON contract for three specialized workers:

### Worker 1: Layout Architect (`frontend-specialist`)
- **Focus**: Semantic HTML, accessibility tree, and component composition.
- **Rules**: Zero styling, just the raw structure and React state logic.
- **WCAG Checks**: Keyboard navigation, screen reader semantics (role, label).

### Worker 2: Styling & Token Specialist (`frontend-design`)
- **Focus**: Applies Tailwind classes and design tokens based on the Phase 2 Identity.
- **Rules**: Must enforce color contrast (4.5:1 minimum) and spacing scale; strictly avoids generic AI defaults.

### Worker 3: Motion Engineer (`motion-engineering` + `emil-design-eng`)
- **Focus**: Injects GSAP, Framer Motion, or CSS springs for micro-interactions (Phase 3).
- **Rules**: Enforces Emil Kowalski's non-negotiable UI standards: all UI animations <300ms, popovers are origin-aware, entering elements strictly use `ease-out`, and `prefers-reduced-motion` is honored.

**Execution Flow**:
1. Supervisor builds the JSON contract for the 3 workers.
2. Dispatches workers in parallel via `swarm_dispatcher.js`.
3. Fan-in synthesis merges the layout, styles, and motion into the final component file.
4. Final code is routed through `/tribunal-frontend` (which now includes the `review-animations` strict UI constraint gate) for the Human Gate.

---

## Phase 5 — Design Verification

Before finalizing:

```
□ Open in mobile viewport (375px) — does it work?
□ Open in dark mode — does it look intentional?
□ Keyboard-navigate through the critical path — is it complete?
□ Screenshot and ask: "Would I scroll past this on Dribbble?"
□ Screen reader test with VoiceOver or NVDA
```

---

---

## Usage Examples

```
/ui-ux-pro-max design a SaaS dashboard for an analytics platform
/ui-ux-pro-max redesign the checkout flow with better conversion UX
/ui-ux-pro-max create an onboarding flow for a developer tool
/ui-ux-pro-max design the landing page hero section with distinctive layout
/ui-ux-pro-max create a data visualization dashboard with real-time updates
```

---

## After /ui-ux-pro-max — Next Steps

| Outcome                   | Next Command                           |
| :------------------------ | :------------------------------------- |
| Design complete           | → `/preview start` to see it in action |
| Need responsive checks    | → `/review` or manual viewport testing |
| Needs backend integration | → `/tribunal-backend` to hook up APIs  |

---
