# Tribunal-Kit CLI & TUI Integration & Terminal Experience Optimization (Phase 8)

## Overview

Phase 8 elevates Tribunal-Kit's Command-Line Interface (CLI) and Terminal User Interface (TUI) into a robust, secure, aesthetically refined, and machine-friendly terminal presentation layer.

Building upon the canonical activity system, lifecycle state machines, context-aware announcements, execution telemetry, and MCP optimizations established in Phases 1–7, Phase 8 eliminates fragmented console outputs, broken panel geometries, repetitive status messages, ANSI escape leakage in automated pipelines, and terminal injection vulnerabilities.

---

## 1. Core Operating Principles

1. **Strict Output Channel Separation**:
   - Machine-readable requests (`--json`) strictly emit parseable, unadulterated JSON envelopes to `stdout`.
   - Human-readable interactive UI (banners, progress bars, reviewer grids, action trees, boxes) is suppressed when `--json` or `--quiet` is specified.
   - Diagnostic errors use standardized logger formats without polluting stdout data pipes.

2. **Accurate Terminal Column Geometry (`visibleWidth`)**:
   - Monospace terminal cells do not correlate 1:1 with UTF-16 `.length` or Unicode code points.
   - East Asian (CJK) full-width characters and emojis occupy 2 terminal columns.
   - ANSI escape codes, zero-width spaces/joiners, and combining diacritical marks occupy 0 columns.
   - `visibleWidth` computes exact column occupancy, guaranteeing panel box borders align flawlessly.

3. **Terminal Control Code & Injection Defense (`sanitizeTerminal`)**:
   - Strips destructive terminal control codes (`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`).
   - Neutralizes standalone carriage return (`\r`) sequences to prevent log-line spoofing attacks.
   - Eliminates Operating System Command (OSC) window title escapes (`\x1b]0;...\x07`).
   - Redacts sensitive credentials (Bearer tokens, JWTs, private keys, API keys).
   - Enforces length bounds to protect against terminal buffer overflows.

4. **Environment-Adaptive Capabilities**:
   - Automatic detection of `isTTY`, `hasColor`, `hasTrueColor`, and `isUtf8`.
   - Adheres strictly to the `NO_COLOR` standard (when `process.env.NO_COLOR` is present, ANSI styling is omitted).
   - Provides clean ASCII glyph fallbacks (`+`, `!`, `x`, `*`, `|`, `-`) when running in non-UTF-8 or legacy console environments.

5. **Authoritative Execution Telemetry Alignment**:
   - Terminal progress bars reflect actual execution evidence.
   - Indeterminate or unmetered tasks display `[unmetered]` rather than fabricating a deceptive `0%`.
   - Caps indeterminate execution at 99% when `requireTerminalConfirmation: true` until terminal verification is authoritatively confirmed.

6. **Leak-Free Event Loop & Terminal Hygiene**:
   - All animated interval timers use `.unref()` to prevent hanging automated test suites or CI runners.
   - Terminal cursor state (`\x1b[?25h`) is restored cleanly upon `SIGINT`, process exit, or error.

---

## 2. API & Component Architecture

### `visibleWidth(text)` & `visibleLength(text)`
Calculates the exact number of monospace terminal columns a string will occupy:
```javascript
const { visibleWidth } = require('tribunal-kit/tui');

visibleWidth('Standard ASCII');              // => 14
visibleWidth('\x1b[92mColored Text\x1b[0m'); // => 12 (ANSI stripped)
visibleWidth('Code 架构');                   // => 9 (5 ASCII + 4 for 2 CJK characters)
visibleWidth('Launch 🚀 now');               // => 13 (11 ASCII + 2 for emoji)
visibleWidth('test\u200B');                  // => 4 (zero-width space = 0)
```

### `sanitizeTerminal(input, options)`
Sanitizes untrusted terminal inputs against ANSI injection, control character abuse, and secret leakage:
```javascript
const { sanitizeTerminal } = require('tribunal-kit/tui');

// Destructive control code removal
sanitizeTerminal('log\x07bell\x08back');
// => "logbellback"

// Carriage return log-spoofing neutralization
sanitizeTerminal('Running...\r[MALICIOUS] Succeeded!');
// => "Running... [MALICIOUS] Succeeded!"

// Secret token redaction
sanitizeTerminal('Token: Bearer eyJhbGciOiJIUzI1Ni...ID');
// => "Token: [REDACTED_TOKEN]"
```

### `renderPanel(title, lines, options)`
Renders high-density, Neo-Brutalist bordered panels with precise geometric box alignment:
```javascript
const { renderPanel, RGB } = require('tribunal-kit/tui');

renderPanel('System Architecture', [
  '• Components: 12 verified',
  '• Blast Radius: Ring 1 (Low)',
  '• Health Score: 98/100',
], {
  width: 50,
  borderColor: RGB.SLATE_700,
  titleColor: RGB.WHITE,
  accessory: 'v9.3.0',
});
```
**Features:**
- Multi-line strings in lines are automatically split across separate bordered rows.
- Overflowing lines and titles are cleanly truncated with `...` to protect box boundaries.
- Responsive width calculation adapts to narrow console environments (`cols < 36`).

### `renderProgressBar(label, percentage, options)`
Renders a telemetry-grounded ANSI progress bar:
```javascript
const { renderProgressBar, RGB } = require('tribunal-kit/tui');

// Determinate
renderProgressBar('Audit Progress', 75, { width: 30, color: RGB.CYAN });
// => "  Audit Progress  [██████████████████████░░░░░░░] 75%"

// Indeterminate (Unmetered)
renderProgressBar('Scanning Files', null, { width: 30 });
// => "  Scanning Files  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] [unmetered]"
```

### `renderReviewerGrid(completedCount)`
Renders the 28-reviewer parallel execution matrix with responsive columns (3 columns on wide displays, 2 on medium, 1 on compact/mobile):
```javascript
const { renderReviewerGrid } = require('tribunal-kit/tui');

renderReviewerGrid(28); // Displays all 28 Tribunal reviewers verified
```

---

## 3. Machine-Readable Separation (`--json`)

When running automated pipelines or agentic subprocesses, commands like `tk validate --json` emit strict JSON data structures without decorative framing:

```bash
tk validate --file payload.json --json
```

**Output:**
```json
{
  "valid": true,
  "target": "/workspace/payload.json",
  "format": "json",
  "timestamp": "2026-10-30T17:15:00.000Z"
}
```

If validation fails:
```json
{
  "valid": false,
  "target": "/workspace/payload.json",
  "error": "Unexpected token '}' at position 42",
  "timestamp": "2026-10-30T17:15:00.000Z"
}
```

---

## 4. Verification & Invariants Summary

| Invariant | Implementation Mechanism | Verified In Suite |
|---|---|---|
| **Visible Column Parity** | `visibleWidth()` accounts for CJK & Emojis | `test/unit/cli_tui_phase8.test.js` |
| **Control Code Defense** | `sanitizeTerminal()` strips `\x00-\x1F`, neutralizes `\r` | `test/unit/cli_tui_phase8.test.js` |
| **Secret Redaction** | Pattern matching for Bearer tokens, JWTs, API keys | `test/unit/cli_tui_phase8.test.js` |
| **Panel Box Alignment** | `innerWidth` padding with `visibleWidth` & multi-line split | `test/unit/cli_tui_phase8.test.js` |
| **Telemetry Truthfulness** | Indeterminate states render `[unmetered]`, 99% cap | `test/unit/cli_tui_phase8.test.js` |
| **NO_COLOR Adherence** | Plain text fallback when `NO_COLOR` is detected | `test/unit/cli_tui_phase8.test.js` |
| **Clean JSON Output** | Suppresses banners & ANSI when `--json` flag is active | `test/unit/cli_tui_phase8.test.js` |
| **Zero Hanging Timers** | Shimmer intervals use `.unref()` and handle `SIGINT` | `test/unit/tui.test.js` |

