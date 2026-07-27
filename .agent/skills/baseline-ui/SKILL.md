---
name: baseline-ui
description: Quickly deslop UI code by fixing spacing, hierarchy, typography, contrast, and small layout issues. Use when the interface needs a fast cleanup or polish pass.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: UI Cleanup & Refinement
  tier: basic
  co-requires: [better-ui, frontend-design]
  trigger-signals:
    strong: [baseline-ui, deslop, cleanup ui, fix spacing, visual hierarchy, fix alignment]
    weak: [tidy up, fix css, layout cleanup]
---

# Baseline UI — Fast Deslopping & Hierarchy Cleanup

Enforces an opinionated UI baseline to clean up sloppy code and prevent AI-generated interface slop without changing product architecture or feature scope.

---

## 1. Stack & System Constraints

- **Tailwind CSS Defaults**: MUST use Tailwind CSS default utilities unless custom values already exist or are explicitly requested.
- **Animation Primitives**: MUST use `motion/react` (formerly `framer-motion`) when JavaScript animation is required.
- **Utility Class Merging**: MUST use `cn` utility (`clsx` + `tailwind-merge`) for dynamic class logic.
- **Accessible Component Primitives**: MUST use established accessible primitives (`Base UI`, `React Aria`, `Radix`) for anything with keyboard or focus behavior. Prefer `Base UI` for new unstyled primitives.
- **Destructive Actions**: MUST use an `AlertDialog` for destructive or irreversible actions.
- **Loading States**: SHOULD use structural skeletons for loading states instead of plain spinners.

---

## 2. The 5-Step UI Deslop Protocol

1. **Fix Spacing Violations**: Replace hardcoded arbitrary margins/paddings (`margin-top: 13px`, `padding: 7px 11px`) with an 8px grid system (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
2. **Establish Typographic Hierarchy**: Max 3 font sizes per component context. Headings bold/semibold with tight letter-spacing (`-0.025em`) and `text-wrap: balance`. Body text regular with `1.5` line height.
3. **Elevate Contrast Ratios**: Eliminate low-contrast gray-on-gray text. Ensure text meets minimum WCAG AA 4.5:1 ratio against background.
4. **Clean Up Borders & Dividers**: Replace harsh 100% opaque black/white borders with subtle 8%-12% opacity borders (`border-color: rgba(255,255,255,0.08)` or `var(--border)`).
5. **Enforce Container Alignment & Active Feedback**: Align text left with action buttons, group related controls with flex gaps, and add instant press feedback (`scale(0.97)`) on all interactive targets.

---

## Anti-Slop Table

| Slop Pattern | Baseline Fix | Rationale |
| --- | --- | --- |
| `color: #888` on dark background | `color: var(--text-muted)` (min 4.5:1 ratio) | Improves readability and WCAG compliance |
| `padding: 15px 23px` | `padding: 16px 24px` | Aligns to 8px structural grid |
| `border: 1px solid black` | `border: 1px solid rgba(0,0,0,0.1)` | Removes harsh, distracting lines |
| Mixed font sizes (13px, 14px, 15px) | Standardized scale (12px, 14px, 16px) | Establishes clear visual hierarchy |
| Plain text buttons without states | Rounded button with hover/active press feedback | Indicates clickability and tactile response |

---

## 🤖 LLM-Specific Traps

1. **Re-architecting when asked to deslop**: Modifying component state, context, or props when only CSS/visual cleanup was requested.
2. **Rebuilding native accessibility by hand**: Writing custom keyboard listener loops instead of using primitives (`Base UI`, `Radix`).

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

### ✅ Pre-Flight Self-Audit

```
✅ Did I retain existing product logic and HTML structure?
✅ Are all spacing values aligned to standard multiples (4/8/12/16/24/32)?
✅ Is text contrast WCAG AA compliant and are icon buttons labeled with aria-label?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

Inspect UI layout across desktop and mobile viewports in browser preview to verify visual polish.
