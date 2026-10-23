# Tribunal-Kit — Terminal UI (TUI) Current State Audit & Architectural Reverse-Engineering

**Document Version:** 1.0.0  
**Audit Target:** `tribunal-kit/src/tui/`, `tribunal-kit/src/cli.js`, `tribunal-kit/src/utils/logger.js`, `crates/core/src/tui/`  
**Date:** 2026-10-23  
**Status:** COMPLETE (Zero-code-modification audit pass)

---

## 1. Executive Summary

Tribunal-Kit currently operates a hybrid command-line presentation system:
1. A **legacy 16-color standard logger** (`src/utils/logger.js`) utilized by older CLI commands (`tk help`, `tk learn`, `tk case`, etc.).
2. A **bespoke, zero-dependency ANSI TrueColor TUI subsystem** (`src/tui/`) providing brand banners, action trees, braille shimmer spinners, reviewer swarm matrices, bordered panels, and interactive multi-select wizards.
3. A **mirrored Rust native TUI engine** (`crates/core/src/tui/`) providing token parity in the compiled binary core.

While the existing `src/tui` implementation demonstrates high taste and fast startup (<15ms), the interface suffers from architectural fragmentation, visual inconsistencies between commands, layout bugs in border drawing, lack of dynamic terminal resize handling, and an absence of a unified full-dashboard layout for long-running workflows (`tk rsi`, `tk marathon`, `tk arch`).

---

## 2. Codebase Discovery & Entry Point Inventory

### 2.1 CLI Dispatch & Entry Points
- **`bin/wrapper.js`**: Primary binary wrapper executed by `npm` or global install. Attempts to execute the native Rust core (`crates/core`) when installed; falls back to Node.js runtime `src/cli.js`.
- **`src/cli.js`**: Core Node.js CLI dispatcher. Uses custom argument parser (`parseArgs`) and lazy-loads command handlers (`loadCmd`) on demand to keep startup I/O under ~15ms.
- **`bin/tk-proxy.js`**: Interception proxy for AI agent tool calls and command wrappers.
- **`bin/mcp-server.js`**: Model Context Protocol (MCP) server communicating over JSON-RPC stdio. Requires clean stdout isolation (TUI output redirected to stderr or disabled).
- **`crates/core/src/main.rs`**: Rust native CLI binary mirroring CLI commands for ultra-fast native execution.

### 2.2 TUI Component Architecture (`src/tui/`)
The current presentation layer is entirely custom-crafted with **zero runtime npm dependencies** (beyond standard Node.js stdlib `readline`, `child_process`, `fs`, `path`):

| Module | LOC | Primary Responsibility | Current Status |
| :--- | :--- | :--- | :--- |
| `theme.js` | 174 | Color palettes (Slate, Zinc, Flame, Emerald), TrueColor/TTY detection, UTF-8/ASCII glyph sets, ANSI formatting helpers, cursor escape sequences | Stable, but lacks 256-color fallback palette; detection logic for UTF-8 has Windows CMD edge-cases |
| `banner.js` | 70 | Brand header card (`renderBanner`), Flame-colored pill badge, version display, section headers (`renderSectionHeader`) | Functional, but layout calculation uses fixed 64-84 column bounds; right pill spacing calculation has minor arithmetic flaws |
| `panel.js` | 58 | Bordered content boxes (`renderPanel`) with header titles and accessory metadata | **Defect identified:** Divider line uses `treeMid` (`├──`, 3 chars) + `boxH` repeat, causing horizontal overflow by 2 characters |
| `progress.js` | 43 | Horizontal bar visualization (`renderProgressBar`), key-value metric formatting (`renderMetric`) | Functional, basic linear fill (`█` / `░`) |
| `reviewer-grid.js` | 90 | 1 to 3 column matrix rendering status for all 28 Tribunal reviewers running concurrently | Functional, but non-interactive; renders as static dump or simple fallback |
| `shimmer.js` | 90 | Real-time braille spinner (`ShimmerSpinner`), sinusoidal RGB TrueColor wave gradient text (`renderShimmerText`) | Visually impressive (Brainless style), but lacks non-TTY timer cleanup on abnormal process interruption |
| `tree.js` | 122 | Hierarchical action tree (`ActionTree`) with timed stagger steps, connecting timeline pipes, success/warning/error nodes | High usability; standard across `tk init`, `tk validate` |
| `wizard.js` | 149 | Interactive terminal checklist (`WizardPrompt`) with raw mode `readline`, arrow keys, Space toggle, non-TTY fallback | High utility; lacks page-scrolling for long lists (> terminal height); lacks resize re-draw |

---

## 3. Command Output Analysis & Presentation Typology

Existing commands follow three distinct presentation tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIBUNAL-KIT COMMAND PRESENTATION SPECTRUM                                  │
├────────────────────────────────┬────────────────────────────────────────────┤
│ Tier 1: Legacy Text Stream     │ tk help, tk case, tk compile, tk align     │
│ (Basic 16-color logger.js)     │ - Simple console logs with standard cyan/  │
│                                │   yellow/gray ANSI escapes                 │
│                                │ - Minimal structure, no cohesive branding │
├────────────────────────────────┼────────────────────────────────────────────┤
│ Tier 2: Action Tree & Banners  │ tk init, tk update, tk validate            │
│ (ActionTree + banner.js)       │ - Flame pill banner                        │
│                                │ - Vertical connected tree nodes            │
│                                │ - 28-reviewer status grid                  │
├────────────────────────────────┼────────────────────────────────────────────┤
│ Tier 3: Structured Dashboard   │ tk status, tk rsi status                   │
│ (Custom layout in command)     │ - Category icon headers, status badges     │
│                                │ - Circuit breaker health metrics           │
│                                │ - IDE bridge connection status             │
└────────────────────────────────┴────────────────────────────────────────────┘
```

### Architectural Fragmentation
- **Inconsistent Theme Abstractions**: `src/utils/logger.js` defines `C.cyan`, `C.gray`, `ok()`, `warn()`, `err()` using 16-color ANSI escapes (`\x1b[96m`), whereas `src/tui/theme.js` defines TrueColor RGB arrays (`RGB.SLATE_900`, `RGB.FLAME`) using 24-bit sequences (`\x1b[38;2;R;G;Bm`).
- **Uncoordinated Output Channels**: `logger.js` writes `ok()` and `log()` to `console.log` and `err()` to `console.error`. `ShimmerSpinner` writes progress to `process.stderr`. `WizardPrompt` writes to `process.stdout`.
- **Command-Specific Rendering Duplication**: `src/commands/rsi.js` and `src/commands/status.js` hand-craft their own divider lines (`─`.repeat(58)) and spacing rather than utilizing a shared `renderPanel` or unified metric card primitive.

---

## 4. Discovered Defects & Limitations

1. **Divider Alignment Defect in `panel.js`**:
   Line 39 of `src/tui/panel.js`:
   ```javascript
   console.log(`  ${color(RGB.SLATE_700, g.treeMid + g.boxH.repeat(innerWidth + 2) + '┤')}`);
   ```
   `g.treeMid` is `'├──'` (3 glyphs). The top border is `'╭' + g.boxH.repeat(innerWidth + 2) + '╮'`. Because `'├──'` is 3 characters while `'╭'` is 1 character, the horizontal separator is 2 characters wider than the box itself, breaking terminal geometry on boxed displays.

2. **Incomplete ANSI Stripping Regex**:
   Padding calculations in `panel.js` and `banner.js` rely on:
   ```javascript
   text.replace(/\x1b\[[0-9;]*m/g, '')
   ```
   This regex fails to strip cursor positioning sequences (`\x1b[2K`, `\x1b[?25l`), 24-bit background color resets, or URL hyperlink escapes (`OSC 8`), resulting in misaligned right borders whenever styled substrings are passed.

3. **Terminal Resize Blindness (`SIGWINCH`)**:
   Neither `WizardPrompt`, `renderReviewerGrid`, nor `renderPanel` binds to `process.stdout.on('resize')`. If the developer adjusts their terminal emulator window during interaction, lines wrap and artifacts accumulate.

4. **Wizard Overflow on Small Viewports**:
   `WizardPrompt` computes re-draw line clearance using:
   ```javascript
   process.stdout.write(`\x1b[${options.length + 5}A\r`);
   ```
   If the list of options exceeds `process.stdout.rows - 5`, the cursor moves above the scroll buffer, causing runaway terminal corruption and duplicate lines.

5. **Monochrome / Accessibility Gaps**:
   Several diagnostic states in `rsi.js` rely on color differentiation (e.g. green vs red circuit breaker badges) without redundant text symbols or tactile bracket labels when `NO_COLOR` is active.

---

## 5. Constraint & Architectural Guardrails

1. **Preserve Near-Zero Runtime Overhead**:
   Tribunal-Kit currently starts in **~12-15 milliseconds**. Heavy full-screen TUI frameworks (e.g. `blessed`, `ink` with React runtime) introduce 80-150ms startup latency and 40+ transitive dependencies. The new TUI must maintain this lightweight, instant-on execution.
2. **Backward-Compatible Public Interfaces**:
   All public exports of `src/tui/index.js` (`renderBanner`, `renderSectionHeader`, `ActionTree`, `ShimmerSpinner`, `renderReviewerGrid`, `WizardPrompt`, `renderPanel`, `renderProgressBar`, `renderMetric`) must maintain existing signatures.
3. **Stdio / CI / Non-TTY Cleanliness**:
   Automation environments, Unix pipes (`tk status | cat`), and MCP servers (`bin/mcp-server.js`) must receive clean, unescaped, machine-readable streams without ANSI garbage or terminal cursor codes.
4. **Platform Parity**:
   Must execute cleanly on Windows Terminal, PowerShell, CMD, macOS Terminal, iTerm2, Kitty, Alacritty, Ghostty, Linux VT, and VS Code integrated terminal.
