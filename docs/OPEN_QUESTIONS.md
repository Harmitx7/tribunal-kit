# Tribunal Kit: Open Technical Questions & Clarifications

**Document:** `docs/OPEN_QUESTIONS.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Audit Standard:** Areas Requiring Human Architect Confirmation

---

## 1. System-1 ONNX Neural Model Weights Hosting

- **Context:** `src/system1/` contains the architecture for local sub-millisecond anomaly detection and intent classification, referencing `@receptron/laya` and `onnxruntime-node`.
- **Question:** Where are the canonical ONNX model weights intended to be distributed?
  - _Option A:_ Published as separate optional npm packages (e.g., `@tribunal-kit/model-fast-classifier`).
  - _Option B:_ Downloaded on-demand during `tk init` from Hugging Face Hub or GitHub Releases.
  - _Option C:_ Kept as purely optional extensions, maintaining the current zero-download rule-based heuristics as the default.
- **Impact:** Determines whether offline/air-gapped developer environments can utilize full System-1 capabilities.

---

## 2. ESLint Unused Variable Remediation Timeline

- **Context:** Running `npm run lint` (`eslint .`) exits with code 0 (zero errors) but outputs 519 warnings for unused variables in test fixtures and `.agent/scripts/`.
- **Question:** Should a dedicated maintenance pass be scheduled to systematically rename these variables with leading underscores (e.g. `_options`, `_actionName`), or should ESLint rules be relaxed for the `test/` directory?
- **Impact:** Eliminates diagnostic noise during local development and CI execution without altering runtime behavior.

---

## 3. Dual-Workspace Mirroring Policy & Tooling

- **Context:** The development environment contains both `cli project/` (the root workspace) and `tribunal-kit/` (the git repository), with mirrored governance directories (`.agent`, `.claude`, `AGENTS.md`).
- **Question:** What is the authoritative workflow for maintaining parity between these two locations?
  - _Option A:_ Inner repository (`tribunal-kit/`) is always edited first, and `npm run sync` updates the root workspace mirror.
  - _Option B:_ The workspace root is treated as an active test installation of Tribunal Kit.
- **Impact:** Prevents developer confusion or accidental merge conflicts caused by editing root mirror files directly.

---

## 4. Precompiled Native Binary Distribution Matrix

- **Context:** `package.json` lists optional dependencies for `@tribunal-kit/core-{darwin,linux,win32}-{arm64,x64}`.
- **Question:** Are all 6 platform binaries compiled and published to npm automatically upon tagging a release in GitHub Actions, or is local compilation via `cargo build --release` recommended for local development?
- **Impact:** Clarifies installation instructions for users who do not have local Rust toolchains installed.
