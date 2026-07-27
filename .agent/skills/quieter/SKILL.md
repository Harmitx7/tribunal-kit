---
name: quieter
description: Tone down overly loud, noisy, visually aggressive, or distracting designs while maintaining high visual quality. Use when a UI feels cluttered, overwhelming, tacky, or visually hyperactive.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Visual Design & Restraint
  tier: pro
  co-requires: [distill, swiss-design, compact-landing]
  trigger-signals:
    strong: [quieter, tone down, too loud, visual noise, too aggressive, tacky, calm ui, simplify visual]
    weak: [subdue, tone down colors, lessen contrast]
---

# Quieter — Visual Restraint & Calm Interface Design

Reduce visual noise, eliminate unnecessary color competition, and restore calm focus to chaotic interfaces.

---

## 5 Restraint Tactics

### 1. Palette Subjugation
- **Reduce Primary Colors**: Limit saturated colors to a single primary action. Turn secondary accent colors into subtle monochrome tones (`oklch(0.92 0.01 240)`).
- **Mute Background Surfaces**: Replace multi-colored cards or high-saturation gradient backgrounds with quiet, neutral monochrome surfaces.

### 2. De-emphasize Borders & Outlines
- **Subtle Surface Elevation**: Replace harsh 100% black/white borders with subtle surface background differences ($L \pm 3\%$) or ultra-light 5% opacity borders.

### 3. Subdue Typography Scaling
- **Reduce Font Weight Spikes**: Replace heavy 900 bold display headings with refined semibold (`600`) or medium (`500`) typography.
- **Normalize Font Sizes**: Reduce font size jumps between section headers and subheaders to create smooth visual harmony.

### 4. Calm Motion & Animations
- **Eliminate Continuous Animations**: Remove spinning gradient borders, pulsing badges, and bouncing icons. Restrict motion exclusively to user-initiated actions.
- **Shorten Transitions**: Keep hover state transitions subtle and fast ($\le 150\text{ms}$).

### 5. Expand Negative Space
- **Increase Padding**: Give content room to breathe by increasing section paddings by 25%-50%, reducing cognitive overload.

---

## 🤖 LLM-Specific Traps

1. **Making Text Unreadable**: Reducing color saturation so much that text fails WCAG AA contrast (below 4.5:1).
2. **Stripping Functional Indicators**: Removing error/warning colors when reducing palette noise. Keep functional colors crisp.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `frontend-reviewer` · `ui-ux-auditor`**

### ✅ Pre-Flight Self-Audit

```
✅ Are saturated colors restricted to primary actions?
✅ Did I retain minimum 4.5:1 text contrast for all body and label copy?
✅ Has unnecessary layout animation or pulsing been eliminated?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
