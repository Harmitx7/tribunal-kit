---
name: masked-reveal
description: CSS clip-path, SVG masking, and layered entrance reveals for images, hero banners, and text blocks.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Visual Masking & Entrance Motion
  tier: pro
  co-requires: [60fps-animation, framer-motion-expert]
  trigger-signals:
    strong: [masked-reveal, clip-path reveal, SVG mask animation, curtain reveal, text mask reveal]
    weak: [mask effect, clip path animation]
---

# Masked Reveal — Clip-Path & Layered Entrances

Create editorial, high-end visual reveals using CSS `clip-path` and SVG masks.

---

## 3 Masked Reveal Patterns

### 1. CSS `clip-path` Curtain Reveal
```css
@keyframes curtain-reveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

.reveal-image-curtain {
  animation: curtain-reveal 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
}
```

### 2. Radial Spotlight Clip Reveal
```css
@keyframes circle-expand {
  from { clip-path: circle(0% at 50% 50%); }
  to { clip-path: circle(150% at 50% 50%); }
}

.spotlight-reveal {
  animation: circle-expand 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### 3. Masked Text Line Wipe (Editorial Typography)
Wrap text lines inside overflow-hidden wrappers and animate inner text lines upward:
```css
.text-line-wrapper {
  overflow: hidden;
}
.text-line-inner {
  transform: translateY(100%);
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.text-line-wrapper.is-visible .text-line-inner {
  transform: translateY(0%);
}
```

---

## 🤖 LLM-Specific Traps

1. **Missing `overflow: hidden` on Line Wrappers**: Text showing outside container boundaries during line wipe animations.
2. **Heavy GPU Mask Layers**: Applying multiple full-screen SVG masks simultaneously on lower-end mobile devices.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `motion-reviewer` · `frontend-reviewer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are text line wipes enclosed inside `overflow: hidden` wrappers?
✅ Is `clip-path: inset()` used for linear curtain wipes for maximum performance?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
