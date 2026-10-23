# Tribunal-Kit — Next-Generation Terminal UI: Design Specification (Concept F)

**Document Version:** 1.0.0  
**Phase:** Phase 3 & Phase 4 — Design & Terminal Engineering Specification  
**Status:** PROPOSED FOR HUMAN APPROVAL

---

## 1. Brand Identity & Visual System

### 1.1 Signature Visual Elements
1. **Brand Wordmark:**
   - **TrueColor / Unicode:**
     `  \x1b[48;2;225;75;45m\x1b[38;2;255;255;255m\x1b[1m TRIBUNAL-KIT \x1b[0m  v9.2.9  [Fortress Mode · Rust Core]`
   - **Monochrome / Fallback:**
     `  [TRIBUNAL-KIT] v9.2.9 — Anti-Hallucination Governance Layer`
2. **Signature Palette (OKLCH-Aligned RGB):**
   - **Flame Primary Accent:** RGB `[225, 75, 45]` (`#e14b2d`) — Punchy, authoritative orange-red. Never used as a giant solid fill, but as a razor-sharp identifier.
   - **Deep Charcoal Canvas:**
     - `SLATE_950` `[9, 9, 11]` (#09090b)
     - `SLATE_900` `[15, 15, 20]` (#0f0f14)
     - `SLATE_800` `[28, 28, 35]` (#1c1c23)
     - `SLATE_700` `[45, 45, 55]` (#2d2d37) for subtle border framing.
   - **Neutral Zinc Typography:**
     - `PURE_WHITE` `[255, 255, 255]` / `WHITE` `[250, 250, 250]` for headers and active tokens.
     - `ZINC_200` `[228, 228, 231]` for primary body text.
     - `ZINC_400` `[161, 161, 170]` for secondary metadata.
     - `ZINC_600` `[82, 82, 91]` for inactive, muted, and connector lines.
   - **Semantic Signals:**
     - `EMERALD` `[35, 195, 105]` (#23c369) — Certified, passed, healthy.
     - `CYAN` `[56, 189, 248]` (#38bdf8) — Paths, targets, active counts.
     - `AMBER` `[245, 158, 11]` (#f59e0b) — Pending gates, warnings, quotas.
     - `ROSE` `[244, 63, 94]` (#f43f5e) — Circuit trip, hallucination detected, error.

---

## 2. Complete Component Library Specification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIBUNAL TUI COMPONENT INVENTORY                                            │
├────────────────────┬─────────────────────────┬──────────────────────────────┤
│ Component          │ Function                │ Visual Anatomy               │
├────────────────────┼─────────────────────────┼──────────────────────────────┤
│ 1. BrandHeader     │ Top brand & mode status │ [ TRIBUNAL-KIT ] v9.2.9      │
│ 2. SectionHeading  │ Division of domains     │   ── Swarm Telemetry ───     │
│ 3. StatusBadge     │ Semantic state pill     │ [✔ CERTIFIED] [⚠ QUARANTINE] │
│ 4. CardPanel       │ Fixed/bordered box      │ ╭─ Box Header ─────────────╮ │
│ 5. KeyValueTable   │ Aligned metrics         │   Rollback Ratio:   0.0%     │
│ 6. ActionTree      │ Timeline workflow       │   ⏺ Step 1 ── ✔ Done         │
│ 7. ReviewerGrid    │ Parallel swarm matrix   │   ✔ logic-auditor ✔ security │
│ 8. ShimmerSpinner  │ Active work feedback    │   · ⠋ Verifying... (0.4s)    │
│ 9. ProgressBar     │ Deterministic progress  │   [██████████░░░░░░] 68%     │
│ 10. WizardPrompt   │ Interactive multi-select│   ➜ [✔] Cursor  [ ] Windsurf │
│ 11. CommandFooter  │ Keyboard shortcuts      │   [Space] Toggle [Enter] Ok  │
└────────────────────┴─────────────────────────┴──────────────────────────────┘
```

### Detailed Component Contracts

#### 1. `renderBanner(version, quiet, options)`
- **Purpose:** Identifies the application, version, active engine (Rust Core / JS Core), and fortress governance mode.
- **Rules:**
  - When `quiet` is true or process is in non-interactive stdout piping, output is suppressed or rendered as clean 1-line text to `stderr`.
  - Strip ANSI before calculating space count to guarantee zero overflow at any width.

#### 2. `renderPanel(title, lines, options)` (Fixed Architecture)
- **Purpose:** Encloses structured diagnostics, error dossiers, or summary tables in clean micro-borders.
- **Bug Fix Incorporated:**
  - Header divider uses `├` (1 char) + `─` repeat (`innerWidth` chars) + `┤` (1 char), maintaining exact character-for-character parity with `╭` + `─` + `╮`.
  - ANSI stripping uses complete sequence regex `/\x1b\[[0-9;?]*[a-zA-Z]/g` to ensure accurate visual width calculations.

#### 3. `renderReviewerGrid(completedCount, options)`
- **Purpose:** Visualizes all 28 Tribunal reviewers running concurrently in an auto-responsive matrix.
- **Width adaptation:**
  - Width ≥ 110 cols: 3 columns (10 rows).
  - 72 cols ≤ Width < 110 cols: 2 columns (14 rows).
  - Width < 72 cols: 1 column (compact list or single-line progress summary).

#### 4. `ActionTree` (Timeline Architecture)
- **Purpose:** Communicates progressive execution (e.g. `tk init`, `tk learn`) with connected vertical connector glyphs.
- **Glyphs:**
  - Step initiation: `⏺` (`GLYPHS.bullet`)
  - Intermediate branch: `│ ├──` (`GLYPHS.boxV` + `GLYPHS.treeMid`)
  - Sub-step success: `✔` (`GLYPHS.success`) in `EMERALD`
  - Sub-step warning: `⚠` (`GLYPHS.warning`) in `AMBER`
  - Sub-step error: `✖` (`GLYPHS.failure`) in `ROSE`
  - Completion cap: `└──` (`GLYPHS.treeEnd`) with bold confirmation message.

#### 5. `WizardPrompt` (Safe Interactive Selection)
- **Purpose:** User selection without external heavy dependencies.
- **Defects Addressed:**
  - Calculates terminal row height (`process.stdout.rows`). If options exceed viewport height, enables scrollable virtual windowing instead of throwing cursor above buffer.
  - Gracefully falls back to numbered stdin questions or default summary when `!process.stdin.isTTY`.

---

## 3. Real Terminal Conditions & Responsive Matrix

The interface must adapt deterministically across terminal widths and environments:

| Environment / Width | Visual Adaptation Strategy |
| :--- | :--- |
| **Wide Viewport (≥ 120 × 40)** | Full multi-column layout; 3-column reviewer matrix; expansive side-by-side card panels; rich metadata pills. |
| **Standard Viewport (80 × 24)** | Balanced 2-column reviewer matrix; panels capped at 76 columns; ActionTree indentation at 2 spaces. |
| **Compact Viewport (60 × 20)** | Single-column reviewer matrix; panels collapse borders to clean indented blocks; long file paths truncate from left (`.../src/tui/wizard.js`). |
| **Narrow / Mobile Viewport (40 × 12)** | All decorative borders stripped; single-line status pills; minimal essential text only. |
| **Monochrome (`NO_COLOR=1`)** | All ANSI color codes stripped; brackets used for status: `[OK]`, `[WARN]`, `[FAIL]`; ASCII glyphs replace Unicode (`*`, `+`, `x`). |
| **CI / Non-TTY (`!isTTY`)** | Spinners disabled; raw text emitted without cursor repositioning; stderr separation preserved for CLI pipes. |
| **Windows Command Prompt (cmd.exe)** | Automatic ASCII fallback glyphs (`+`, `-`, `|`) if UTF-8 code page (65001) is not active. |

---

## 4. Accessibility & Safety Rules

1. **Dual-Encoding Status:** Never rely on color alone. Every status has both a distinct glyph/text and color:
   - Success: `✔ [PASS]` in `EMERALD`
   - Failure: `✖ [FAIL]` in `ROSE`
   - Warning: `⚠ [WARN]` in `AMBER`
   - Running: `⠋ [RUNNING]` in `FLAME`
2. **Reduced Motion:** If `process.env.REDUCED_MOTION === '1'` or `process.env.CI === '1'`, shimmer waves and braille spinners are replaced with static text indicators.
3. **Fail-Visible Exception Handling:** Unhandled rejections or runtime errors must never be swallowed by a TUI component or hidden behind a broken cursor. The terminal cursor is automatically restored (`\x1b[?25h`) on `SIGINT`, `SIGTERM`, and `uncaughtException`.
