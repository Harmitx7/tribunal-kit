---
name: web-design-guidelines
description: Review UI code for Next-Generation Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Next-Gen Web Interface Review Guidelines (Pro-Max Level)

> Good UI is invisible. Users think about their task, not about the interface.
> Great UI anticipates the task and reacts at the speed of thought.

---

## Review Trigger

Load this skill when asked to:
- Review or audit a UI
- Check accessibility compliance (WCAG 3.0 / APCA)
- Improve UX & Cognitive Safety
- Check a site against best practices

---

## Extreme Review Categories

### 1. Neuro-Inclusivity & Accessibility (WCAG 3.0 APCA Base)

Non-negotiable baseline for any public interface in 2026+:

| Check | How to Verify |
|---|---|
| **APCA Contrast** | Ensure Lc (Lightness Contrast) is > 75 for body text, > 60 for large text. (Do not rely solely on old WCAG 2.1 4.5:1 math). |
| **Cognitive Safety** | Check if `prefers-reduced-motion` is respected. No infinite spinning loaders. |
| **Keyboard Fluidity** | Tab order must follow visual order. Focus states cannot be just a 1px dotted line; use `outline: 2px solid var(--focus-color); outline-offset: 2px;`. |
| **Semantic AI Context** | Images must have `alt` tags, but complex charts need full `<details>` breakdowns for screen readers and AI agents crawling the site. |
| **Interaction Buffers** | Are touch targets mathematically ≥48px (Fitts' Law)? |

### 2. Extreme Core Web Vitals (CWV)

Drop the old 2022 standards. The new baseline for premium web:

| Metric | Premium Target | Common Failures |
|---|---|---|
| **LCP** (Largest Contentful Paint) | **< 1.5s** | Missing `fetchpriority="high"` on hero images. Heavy client-side React rendering blocking the paint. |
| **INP** (Interaction to Next Paint) | **< 100ms** | Main thread blocked by React hydrate. Use `startTransition` or Web Workers for heavy JS. |
| **CLS** (Cumulative Layout Shift) | **0.00** | Missing `width` and `height` on images. Late-loading web fonts (use `font-display: optional`). |

### 3. Energy Efficiency & Sustainability

Code has a carbon footprint and a battery cost.

- **OLED Pure Black:** Does the dark mode use `#000` or `#010101` to physically turn off pixels?
- **Animation Tax:** Are animations using CPU-heavy properties (`margin`, `width`) instead of GPU-accelerated ones (`transform`, `opacity`)?
- **Asset Weight:** Are images AVIF/WebP? Are fonts subsetted Variable Fonts?

### 4. Visual Design Quality (Pro-Max)

Evaluate these brutally honestly:

- **Mathematical Spacing:** Does spacing follow a strict scale (e.g., 4, 8, 16, 24, 32) or is it a mess of arbitrary pixels?
- **Fluid Typography:** Is text using `clamp()` to scale, or does it awkwardly jump at breakpoints?
- **The "Purple Ban":** Is the site heavily relying on deep purple/violet as a primary color? (Flag this as an overused AI-generated cliché).
- **Z-Axis Depth:** Are shadows realistic (multi-layered CSS shadows) or flat and cheap (`box-shadow: 0 4px 6px #000`)?
- **Micro-Interactions:** Do buttons scale down slightly on `:active`? Do elements use spring-physics easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`)?

### 5. AI & Streaming UX

- **Zero-Wait States:** If the app is waiting for an LLM/Server response, does it show a static spinner (BAD) or stream the skeleton/content (GOOD)?
- **Optimistic UI:** Do likes/saves update the UI *instantly* before the server confirms?

---

## Common Review Findings

| Finding | Severity | Fix |
|---|---|---|
| Missing/Weak focus styles | High | Add visible `:focus-visible` with offset |
| `margin`/`padding` animated | High | Change to `transform: translate()` |
| Touch targets under 48px | High | Increase padding/min-height |
| Layout shifts on load (CLS > 0) | High | Pre-allocate space for async content/images |
| Linear CSS transitions | Medium | Upgrade to spring-based `cubic-bezier` curves |
| Purple as primary color | Low/Brand | Rethink palette — overused AI design cliché |

---

## Audit Format Template

When reporting a UI review, use this exact brutal structure:

```markdown
## UI/UX Pro-Max Review: [Component/Page Name]

### ♿ Neuro-Inclusivity & A11y
- [BLOCKER] [Finding with specific element and fix]
- [WARN] [Finding]

### ⚡ Performance & Energy (CWV)
- [Finding]

### 🎨 Visual & Spatial Quality
- [Finding]

### 🛠️ Interaction & Physics
- [Finding]

### Summary
X blockers, Y warnings, Z suggestions.
Recommended action before shipping: [specific steps]
```

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Web Design Guidelines Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



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
