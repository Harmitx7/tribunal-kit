---
name: progressive-blur
description: Smooth progressive backdrop blurs, depth overlays, and modern glassmorphism using CSS mask-image and multi-layered backdrop filters without GPU performance drops.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Glassmorphism & Depth Engineering
  tier: pro
  co-requires: [frontend-design, 60fps-animation]
  trigger-signals:
    strong: [progressive-blur, backdrop blur, glassmorphism, depth overlay, progressive backdrop, frosted glass]
    weak: [blur effect, blur background]
---

# Progressive Blur — Multi-Layered Glassmorphism & Depth

Architect high-performance, progressive backdrop blurs and frosted glass interfaces that feel tactile and fluid.

---

## 3 Progressive Blur Techniques

### 1. Multi-Step Masked Progressive Blur
To prevent harsh edge cutoffs in blurred headers or footers, blend 4 progressive blur layers using linear gradient masks:

```css
.progressive-blur-header {
  position: sticky;
  top: 0;
  z-index: 40;
  pointer-events: none;
}

.blur-layer-1 {
  backdrop-filter: blur(2px);
  mask: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%);
}

.blur-layer-2 {
  backdrop-filter: blur(8px);
  mask: linear-gradient(to bottom, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 65%);
}

.blur-layer-3 {
  backdrop-filter: blur(16px);
  mask: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,1) 100%);
}
```

### 2. Glass Card Depth Recipe
```css
.glass-card {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .glass-card {
    background: rgba(18, 18, 20, 0.70);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }
}
```

### 3. GPU Hardware Acceleration Protection
Backdrop blurs can cause frame drops if animated directly.
- **Rule**: Never animate `backdrop-filter: blur()` properties during scroll or transitions. Animate `opacity` of a static blurred pseudo-element instead!

---

## 🤖 LLM-Specific Traps

1. **Animating `backdrop-filter` radius**: Animating `blur(0px)` to `blur(20px)` on every frame, which tanks GPU performance to under 20fps.
2. **Missing vendor prefixes**: Forgetting `-webkit-backdrop-filter` for Safari compatibility.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `performance-optimizer`**

### ✅ Pre-Flight Self-Audit

```
✅ Are `-webkit-backdrop-filter` vendor prefixes present?
✅ Is `opacity` animated instead of directly interpolating `backdrop-filter` radius?
✅ Is dark mode contrast preserved over frosted glass surfaces?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
