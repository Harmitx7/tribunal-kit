---
name: marquee-loop
description: Hardware-accelerated, seamless, continuous looping marquees for logo rows, testimonials, and announcements with pause-on-hover accessibility.
version: 4.0.0
last-updated: 2026-09-07
skills:
  - 60fps-animation
  - company-logos
  - accessible-animation
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Marquee Loop — Hardware-Accelerated Continuous Tickers

---

## Mandatory Pre-Flight Context Inspection

Before implementing marquee loop tracks, you MUST inspect:

1. DOM Structure (Section 24) → Duplicate item tracks MUST be rendered with `aria-hidden="true"` to prevent screen reader redundancy
2. Hover Accessibility (Section 50) → Enforce `animation-play-state: paused` on `:hover` and `:focus-within`
3. Reduced Motion Fallback (Section 61) → Collapse marquee into static wrapped flex grid when `prefers-reduced-motion: reduce` is active

Build seamless 60fps infinite marquee tracks that pause on hover and respect accessibility settings.


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Hardware-accelerated, seamless, continuous looping marquees for logo rows, testimonials, and announcements with pause-on-hover accessibility..
- **DO NOT activate when:** The task falls strictly outside marquee-loop domain or belongs to a different dedicated specialist.

---

## The Seamless CSS Marquee Recipe

```html
<div class="marquee-container" aria-label="Partner logos">
  <div class="marquee-track">
    <!-- Original Items -->
    <div class="marquee-content">...items...</div>
    <!-- Duplicate Items for Seamless Infinite Loop -->
    <div class="marquee-content" aria-hidden="true">...items...</div>
  </div>
</div>
```

```css
.marquee-container {
  display: flex;
  overflow: hidden;
  user-select: none;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.marquee-track {
  display: flex;
  flex-shrink: 0;
  gap: 2rem;
  animation: marquee-slide 25s linear infinite;
}

.marquee-container:hover .marquee-track {
  animation-play-state: paused;
}

@keyframes marquee-slide {
  from { transform: translateX(0%); }
  to { transform: translateX(-50%); }
}

/* Reduced Motion Override */
@media (prefers-color-scheme: dark) { ... }
@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none;
    flex-wrap: wrap;
    justify-content: center;
  }
}
```

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
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
