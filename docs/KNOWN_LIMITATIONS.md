# Tribunal Kit: Known Limitations & Technical Debt

**Document:** `docs/KNOWN_LIMITATIONS.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Audit Standard:** Objective Repository Discrepancy & Gap Analysis

---

## 1. Known Technical Debt

### 1.1 ESLint Unused Variable Warnings (519 Warnings)

- **Status:** [VERIFIED: `npm run lint`]
- **Description:** Running `eslint .` produces zero errors but emits 519 `no-unused-vars` warnings across `.agent/scripts/`, `test/unit/`, and `src/commands/`.
- **Root Cause:** Test fixtures import helper functions or destructure parameters (e.g. `actionName`, `taskQuery`, `options`) that are retained for API signature parity but not actively asserted in that specific test case.
- **Impact:** Low risk; does not cause runtime errors, but generates verbose output during CI linting.
- **Remedy:** Prefix unused parameters with `_` or configure ESLint ignore patterns for mock fixtures.

### 1.2 Dual-Workspace Mirror Drift Risk

- **Status:** [DOCUMENTED & VERIFIED: `CHANGELOG.md#L148`, `scripts/sync-skills.js`]
- **Description:** The project structure contains both an inner repository (`tribunal-kit/`) and a root workspace mirror (`cli project/`). Files such as `.agent/`, `.claude/`, `AGENTS.md`, and `CLAUDE.md` exist in both locations.
- **Impact:** If an engineer or agent edits files in one location without running `npm run sync` or `node scripts/sync-skills.js`, the mirrors can diverge.
- **Remedy:** Always execute `npm run sync` after modifying master rules or skill definitions.

---

## 2. Incomplete & Optional Features

### 2.1 System-1 Neural Fast-Path Inference

- **Status:** [PARTIALLY IMPLEMENTED: `src/system1/`, `package.json#L146-L147`]
- **Description:** System-1 inference is designed to use lightweight local ONNX models via `onnxruntime-node` and `@receptron/laya` for sub-millisecond intent and anomaly classification.
- **Limitation:** `onnxruntime-node` is listed under `optionalDependencies`. In environments where native binary compilation is unavailable or fails, System-1 seamlessly falls back to deterministic rule-based heuristics. Real neural inference is unverified in environments without optional bindings.

### 2.2 Native Binary Precompilation Coverage

- **Status:** [DOCUMENTED: `package.json#L148-L153`, `bin/wrapper.js`]
- **Description:** Sub-10ms execution relies on precompiled platform binaries (`@tribunal-kit/core-{darwin,linux,win32}-{arm64,x64}`).
- **Limitation:** In custom container environments (e.g., Alpine musl Linux) or architectures without published precompiled packages, the system falls back to the pure JavaScript runtime, which incurs a ~150-250ms Node startup overhead.

---

## 3. Unsupported Scenarios & Environmental Boundaries

### 3.1 Headless Browser Testing in Restricted Sandboxes

- **Description:** `src/browser/` features (`tk audit-web`, `tk heal`, `tk_browser_navigate`) depend on Playwright.
- **Limitation:** In headless Linux containers without X11/Wayland dependencies (`libgbm`, `libasound2`, font packages) or in secure terminal sandboxes with network blocking, live browser auditing will fail with socket or missing dependency errors.

### 3.2 Windows Filesystem Quirks

- **Description:** Windows drive letter casing (`c:\` vs `C:\`) and verbatim namespace prefixes (`\\?\C:\...`) can produce string mismatches in naive path comparisons.
- **Remedy:** Tribunal Kit uses `stripVerbatimPrefix` and `path.resolve` in `src/utils/path_containment.js`, but custom scripts must always use canonical helpers rather than raw string matching.
