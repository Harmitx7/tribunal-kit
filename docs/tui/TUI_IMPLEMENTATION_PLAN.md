# Tribunal-Kit — Next-Generation Terminal UI: Architecture & Implementation Plan

**Document Version:** 1.0.0  
**Phase:** Phase 6 — Architecture & Step-by-Step Implementation  
**Status:** PROPOSED FOR HUMAN APPROVAL

---

## 1. Dependency Analysis & Architecture Decision

### 1.1 Dependency Evaluation
We evaluated popular external terminal libraries for Tribunal-Kit:

| Library | Bundle Size / Dependencies | Cold Startup Impact | Suitability for Tribunal-Kit | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Ink** (React for CLI) | ~15MB / ~42 deps | +90ms - 140ms | ❌ Too heavy; violates zero-dependency ethos; slows CLI startup | **REJECTED** |
| **Blessed** | ~2MB / ~12 deps | +45ms - 70ms | ❌ Unmaintained; leaks memory on exit; breaks Windows CMD | **REJECTED** |
| **Rich / Textual** | Python runtime | N/A | ❌ Incompatible (Tribunal-Kit CLI core is Node.js + Rust) | **REJECTED** |
| **Chalk / Picocolors** | 5-10KB / 1 dep | +2ms | ⚠️ Redundant; Tribunal-Kit already has native TrueColor engine | **REJECTED** |
| **Native Zero-Dependency Enhanced TUI** | **0 dependencies** | **< 1ms** | ✅ Instant startup (<15ms); 100% control over platform parity | **RECOMMENDED** |

**Architectural Decision:** We will **NOT** add any external npm dependencies to `package.json`. The redesign will be implemented natively using Node.js standard libraries (`readline`, `process`, `child_process`, `fs`, `path`) and clean ANSI escape code sequencing.

---

## 2. Architectural Structure & Module Map

```
tribunal-kit/src/tui/
├── index.js            # Unified export surface (backward compatible)
├── theme.js            # Unified tokens, TrueColor, 16-color, NO_COLOR, ASCII fallback, ANSI regex
├── banner.js           # Responsive brand cards, version pills, section headers
├── panel.js            # Defect-free bordered containers & key-value matrices
├── progress.js         # Smooth progress bars & formatted telemetry metrics
├── reviewer-grid.js    # Adaptive 1/2/3-column 28-reviewer parallel status board
├── shimmer.js          # TrueColor sinusoidal shimmer wave & braille spinner
├── tree.js             # Timeline-connected ActionTree
└── wizard.js           # Viewport-safe interactive checklist with scrollable windowing
```

---

## 3. Incremental Implementation Phases (Post-Approval)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5-STEP INCREMENTAL EXECUTION SEQUENCE                                       │
├─────────┬───────────────────────────┬───────────────────────────────────────┤
│ Step 1  │ Baseline Test Verification│ Run existing test suite; record       │
│         │                           │ passes (11/11 in tui.test.js)         │
├─────────┼───────────────────────────┼───────────────────────────────────────┤
│ Step 2  │ TUI Foundation & Bug Fixes│ - Fix panel.js border arithmetic      │
│         │                           │ - Robust ANSI-stripping regex         │
│         │                           │ - Reconcile logger.js with theme.js   │
├─────────┼───────────────────────────┼───────────────────────────────────────┤
│ Step 3  │ Highest-Value Screens     │ - Redesign `tk status` dashboard      │
│         │                           │ - Redesign `tk rsi status` cockpit    │
│         │                           │ - Modernize `tk --help` command menu  │
├─────────┼───────────────────────────┼───────────────────────────────────────┤
│ Step 4  │ Interactive Upgrades      │ - Add viewport scroll to wizard.js    │
│         │                           │ - Add resize SIGWINCH listeners       │
├─────────┼───────────────────────────┼───────────────────────────────────────┤
│ Step 5  │ Regression & Verification │ - Run test:unit and test:all          │
│         │                           │ - Inspect 40, 60, 80, 120 col widths  │
│         │                           │ - Verify CI / NO_COLOR / pipes        │
└─────────┴───────────────────────────┴───────────────────────────────────────┘
```

---

## 4. Blast Radius: Files Targeted vs Files Untouched

### Files Targeted for Enhancement (Only After Approval)
1. `src/tui/theme.js` — Add comprehensive ANSI-stripping utility (`stripAnsi`), terminal width auto-detection with fallback, and unified 16-color compatibility bridges.
2. `src/tui/panel.js` — Fix the 2-character divider alignment bug; integrate `stripAnsi`.
3. `src/tui/banner.js` — Add responsive spacing calculation that prevents wrapping at narrow widths.
4. `src/tui/wizard.js` — Add virtual window scrolling to prevent cursor overflow on small terminal viewports.
5. `src/commands/status.js` — Elevate `tk status` to a rich, high-density system dashboard with card framing and clear IDE bridge statuses.
6. `src/commands/rsi.js` — Elevate `tk rsi status` to the Concept F Cockpit layout with clear benchmark vault badges and circuit-breaker telemetry.
7. `src/cli.js` (`cmdHelp`) — Modernize the help screen with clean category grouping, styled command flags, and aligned descriptions.
8. `test/unit/tui.test.js` — Add unit tests covering `panel.js` border alignment, `stripAnsi` correctness, narrow-width rendering, and `NO_COLOR` safety.

### Files That Remain Strictly Untouched
- **Core Governance & Security:** `src/security/`, `src/intelligence/`, `src/synthesis/`, `src/system1/`
- **Recursive Self-Improvement Backend Logic:** `src/evolution/`, `src/evaluation/`, `benchmarks/`
- **Native Rust Code:** `crates/core/` (unless matching token updates are approved later)
- **Agent Rules & Prompts:** `AGENTS.md`, `CLAUDE.md`, `.agent/`
- **Public CLI Argument Parser:** `parseArgs` in `src/cli.js` (flags, arguments, and exit codes remain 100% identical).
