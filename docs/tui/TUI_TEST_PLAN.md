# Tribunal-Kit — Next-Generation Terminal UI: Test & Quality Gate Plan

**Document Version:** 1.0.0  
**Phase:** Phase 10 — Automated Quality Gates & Verification  
**Status:** PROPOSED FOR HUMAN APPROVAL

---

## 1. Overview & Verification Strategy

The Terminal UI overhaul must be backed by deterministic automated test gates that guarantee:
1. Zero visual breakage across varying terminal column widths.
2. Robustness in headless CI environments (`NO_COLOR=1`, `CI=1`, non-TTY streams).
3. Complete protection against cursor locking or unhandled terminal corruptions.
4. Absolute preservation of CLI return codes and machine-readable `--json` flags.

---

## 2. Test Suite Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TUI AUTOMATED TEST SUITE                                                    │
├────────────────────┬────────────────────────────────────────────────────────┤
│ Test Module        │ Verification Scope                                     │
├────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Theme & Tokens  │ RGB mappings, TrueColor vs 16-color, UTF-8/ASCII glyphs│
│ 2. ANSI Stripping  │ SGR codes, 24-bit RGB, cursor movements, OSC 8 links   │
│ 3. Panel Geometry  │ Exact character width parity between top, mid & bottom │
│ 4. Banner Reflow   │ Padding arithmetic at 40, 60, 80, and 120 columns      │
│ 5. Reviewer Grid   │ Column reflow (3-col, 2-col, 1-col) & non-TTY fallback │
│ 6. ActionTree      │ Timeline connectivity, glyph rendering, timing bypass  │
│ 7. Wizard Prompt   │ Navigation, toggle logic, non-interactive summary      │
│ 8. Process Safety  │ Cursor restoration on SIGINT/uncaughtException         │
└────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 3. Concrete Test Cases to Add / Verify

### Test Group 1: Geometry & ANSI Length Invariants
```javascript
test('stripAnsi correctly handles complex ANSI and TrueColor sequences', () => {
  const styled = '\x1b[38;2;225;75;45m\x1b[1mTribunal\x1b[0m \x1b[2K\x1b[?25lTest';
  expect(stripAnsi(styled)).toBe('Tribunal Test');
});

test('renderPanel produces identical visible length for top, mid, and bottom borders', () => {
  const lines = ['Status: Operational', 'Reviewers: 28/28'];
  const output = capturePanelOutput('Test Panel', lines, { width: 60 });
  const rowLengths = output.map(r => stripAnsi(r).length);
  // All boxed lines must have identical character width
  expect(new Set(rowLengths).size).toBe(1);
});
```

### Test Group 2: Viewport Width Resilience (Narrow to Wide)
- **40 columns:** Confirm zero horizontal text wrapping; borders collapse or wrap gracefully without breaking terminal line-ends.
- **60 columns:** Confirm `renderReviewerGrid` collapses cleanly to single or double column without word collision.
- **80 columns (Standard):** Confirm 2-column grid and panel symmetry.
- **120+ columns (Wide):** Confirm 3-column grid and centered or bounded banner layout.

### Test Group 3: Non-TTY & CI Environment Gaps
- `process.stdout.isTTY = false`: Banners and review grids must render as clean line-by-line text without braille spinner escape codes.
- `NO_COLOR=1`: Output must contain zero `\x1b[` escape sequences. Status indicators must render with brackets (e.g. `[PASS]`, `[FAIL]`, `[WARN]`).

### Test Group 4: Command Regression Protection
- `tk status` exits 0 and renders all active agents, workflows, skills, scripts, and IDE bridges.
- `tk status --json` emits 100% valid, machine-readable JSON without any ANSI codes.
- `tk rsi status` exits 0 and reports benchmark vault certification, circuit-breaker ratio, and daemon PID.
- `tk rsi status --json` emits valid JSON without ANSI codes.
- `tk validate` validates payload schemas with reviewer grid display.
