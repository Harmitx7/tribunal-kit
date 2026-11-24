# Tribunal Kit: Development Roadmap

**Document:** `docs/DEVELOPMENT_ROADMAP.md`  
**Current Milestone:** `v9.5.0` (Certified Production Baseline) [VERIFIED]  
**Audit Standard:** Fact-Based Separation of Implemented, In-Flight, and Planned Work

---

## 1. Existing Production Capabilities (v9.5.0 Certified)

- **Dual-Engine Core:** Sub-10ms CLI command execution via compiled Rust binary (`tribunal-core`) with transparent Node.js fallback.
- **Canonical Activity Intelligence (Phases 1–12):** Typed schema v1.0.0, cycle-safe WeakMap cloning, secret redaction, and multi-host renderers.
- **Codebase Intelligence & Cognition (Phases 12–20):** Seven-skill exploration system, static AST parsing via oxc, concentric blast radius calculation, and dead-code detection.
- **Agent Runtime Reliability (Domain E):** 10-state formal FSM, hierarchical cancellation context trees with `AbortSignal`, 14-category failure normalization, non-masking quorum consensus, and tamper-evident checkpoints.
- **UI Engineering & Design Intelligence (Domain F):** 9-step Design Quality Loop, OKLCH color math, anti-slop rules, and interactive state auditing across 398 skills.
- **Model Context Protocol (MCP) Server:** Standalone JSON-RPC server with 34 production tools and token-efficient response optimization.

---

## 2. Active Work in Progress (Branch & PR Level)

- **CI Root-Cause Remediation (`fix/ci-root-cause-remediation`):**
  - _Context:_ Documented in [docs/PLAN-release-ci-remediation.md](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/docs/PLAN-release-ci-remediation.md).
  - _Scope:_ Hardening GitHub Actions matrix builds for cross-platform platform binary releases, ensuring smooth optional dependency installations without native toolchain errors on bare Linux/Windows runners.
- **ESLint Warning Scrubbing:**
  - _Scope:_ Cleaning up 519 unused variable warnings in legacy scripts and test fixtures by applying canonical `_` prefix conventions.

---

## 3. Explicitly Documented Future Initiatives

- **System-1 Local Neural Classifier Expansion:**
  - _Documented in:_ `docs/PLAN-ai-reliability-domain.md`.
  - _Goal:_ Distill lightweight (quantized <20MB) ONNX embedding models for sub-millisecond local anomaly detection, reducing LLM token consumption by an estimated 65%.
- **Cross-Repository Case Law Federation:**
  - _Goal:_ Enable teams to federate and share verified Case Law precedents (`.agent/data/caselaw.json`) across organizational monorepos via encrypted git submodules or S3 buckets.

---

## 4. Newly Identified Engineering Opportunities (Analyst Recommendations)

These items are recommended by this audit but are not yet formally scheduled:

1. **Automated ESLint Warning Remediation Script:** A targeted script in `scripts/clean-lint-warnings.js` to automatically prefix unused test fixture variables with `_`.
2. **Native Musl / Alpine Rust Builds:** Providing static musl libc Linux binaries for Docker environments that do not include GNU libc.
3. **Interactive Terminal TUI Dashboard (`tk cockpit`):** Leveraging the existing `src/tui/` and `crates/core/src/tui/` primitives into a persistent full-screen terminal dashboard for monitoring active multi-agent swarms.
