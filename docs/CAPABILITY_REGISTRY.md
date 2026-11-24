# Tribunal Kit: Comprehensive Capability Registry

**Document:** `docs/CAPABILITY_REGISTRY.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Audit Standard:** Zero-Trust Implementation Verification Protocol

---

## 1. Classification Taxonomy

Each capability is classified according to source-code verification evidence:

- **IMPLEMENTED:** Implementation directly verified in active source code and covered by tests.
- **PARTIALLY IMPLEMENTED:** Functionality exists in source, but requirements remain partially unverified or dependent on optional dependencies.
- **EXPERIMENTAL:** Available in codebase but marked as non-production or active research.
- **DEPRECATED:** Maintained for backward compatibility but scheduled for future removal.
- **PLANNED:** Documented in roadmap/PRDs but not yet implemented in source.

---

## 2. Master Capability Inventory

| Capability ID | Name & Domain                                | Implementation Location                                    | Entry Point                     | Status                    | Test & Verification Evidence                                                                        |
| :------------ | :------------------------------------------- | :--------------------------------------------------------- | :------------------------------ | :------------------------ | :-------------------------------------------------------------------------------------------------- |
| **CAP-001**   | Dual-Engine Core Routing                     | `bin/wrapper.js`                                           | `bin/wrapper.js`                | **IMPLEMENTED**           | `test/unit/cli_contract.test.js`; executes `tribunal-core` or falls back to `src/cli.js`.           |
| **CAP-002**   | Lazy CLI Dispatcher                          | `src/cli.js`, `src/commands/*.js`                          | `src/cli.js`                    | **IMPLEMENTED**           | `test/unit/cli_contract.test.js`; all 37 commands verified in `src/commands/`.                      |
| **CAP-003**   | Compiled Rust Core Engine                    | `crates/core/src/main.rs`                                  | `crates/core` binary            | **IMPLEMENTED**           | `cargo test --manifest-path crates/core/Cargo.toml`; 94/94 tests passing.                           |
| **CAP-004**   | Fast AST Parsing (oxc)                       | `crates/core/src/commands/ast_extractor.rs`                | `tk ast-extract`                | **IMPLEMENTED**           | `cargo test ast_extractor`; TypeScript and TSX syntax error resilience verified.                    |
| **CAP-005**   | Canonical Activity Protocol                  | `src/activity/`                                            | `src/activity/index.js`         | **IMPLEMENTED**           | `test/unit/activity_system.test.js`; typed schema v1.0.0, 4 renderers, secret redaction.            |
| **CAP-006**   | Cycle-Safe WeakMap Traversal                 | `src/activity/schema.js`                                   | `deepClone`, `redactSecrets`    | **IMPLEMENTED**           | `test/unit/activity_contract_phase1.test.js`; circular references safely resolve to `'[Circular]'`. |
| **CAP-007**   | Codebase Intelligence & Slicing              | `src/commands/understand.js`                               | `tk understand`                 | **IMPLEMENTED**           | `test/unit/codebase_intelligence.test.js`; 10 subcommands (`overview`, `trace`, `impact`, etc.).    |
| **CAP-008**   | Blast Radius & Concentric Rings              | `.agent/scripts/blast_radius_engine.js`                    | `tk understand impact`          | **IMPLEMENTED**           | `test/unit/codebase_intelligence_cross_module.test.js`; concentric depth rings 1..N.                |
| **CAP-009**   | 28-Reviewer Wave Pipeline                    | `src/execution/`, `.agent/workflows/tribunal-full.md`      | `tk validate`, `/tribunal-full` | **IMPLEMENTED**           | `test/unit/wave_selection.test.js`; 3 partitioned waves, 28 specialized reviewers.                  |
| **CAP-010**   | Formal State Machine Engine                  | `src/runtime_reliability/state_machine_engine.js`          | `StateMachineEngine`            | **IMPLEMENTED**           | `test/unit/agent_runtime.test.js`; 10 formal states with immutable terminal transitions.            |
| **CAP-011**   | Hierarchical Cancellation Trees              | `src/runtime_reliability/cancellation_context.js`          | `CancellationContext`           | **IMPLEMENTED**           | `test/unit/agent_runtime.test.js`; Web API `AbortSignal` binding and cascading cleanup.             |
| **CAP-012**   | Quorum Consensus ($\Delta\text{Critical}=0$) | `src/runtime_reliability/quorum_and_aggregation_engine.js` | `QuorumAndAggregationEngine`    | **IMPLEMENTED**           | `test/unit/agent_runtime.test.js`; non-masking safety invariant verified.                           |
| **CAP-013**   | Tamper-Evident Checkpoints                   | `src/runtime_reliability/checkpoint_recovery_engine.js`    | `CheckpointRecoveryEngine`      | **IMPLEMENTED**           | `test/unit/agent_runtime.test.js`; SHA-256 state hashing and drift detection.                       |
| **CAP-014**   | In-Process Fault Injection                   | `src/runtime_reliability/fault_injection_engine.js`        | `FaultInjectionEngine`          | **IMPLEMENTED**           | `test/unit/agent_runtime.test.js`; network drops, rate limits, corrupt JSON simulation.             |
| **CAP-015**   | Closed-Loop Design Quality Loop              | `src/design_intelligence/quality_loop.js`                  | `executeDesignQualityLoop`      | **IMPLEMENTED**           | `test/unit/ui_art_direction_engine.test.js`; 9-step quality lifecycle verified.                     |
| **CAP-016**   | OKLCH Color & Contrast Math                  | `src/design_intelligence/color_harmony.js`                 | `colorHarmony`                  | **IMPLEMENTED**           | `test/unit/ui_color_harmony_engine.test.js`; WCAG AA / APCA contrast checking.                      |
| **CAP-017**   | Supply Chain SBOM & Integrity                | `src/supply_chain/`                                        | `src/supply_chain/index.js`     | **IMPLEMENTED**           | `test/unit/supply_chain_security.test.js`; CycloneDX/SPDX SBOM generation.                          |
| **CAP-018**   | Malicious Package Detection                  | `src/supply_chain/malicious_package_engine.js`             | `MaliciousPackageEngine`        | **IMPLEMENTED**           | `test/unit/supply_chain_malicious_packages.test.js`; typosquatting & install script traps.          |
| **CAP-019**   | Model Context Protocol (MCP)                 | `bin/mcp-server.js`, `src/mcp/`                            | `bin/mcp-server.js`             | **IMPLEMENTED**           | `test/unit/mcp_server.test.js`; 34 registered tools with Zod input validation.                      |
| **CAP-020**   | HTTP / WebSocket Rules Proxy                 | `bin/proxy-server.js`, `bin/tk-proxy.js`                   | `tk-proxy`                      | **IMPLEMENTED**           | `test/unit/cli_contract.test.js`; intercepts `/v1/messages` to inject rules.                        |
| **CAP-021**   | Universal Agent Adapters                     | `bin/adapter-install.js`                                   | `tk-adapt`                      | **IMPLEMENTED**           | Auto-detects and installs bridges for Claude Code, Cursor, Windsurf, Aider, Copilot.                |
| **CAP-022**   | 4-Type Taxonomy Memory                       | `src/intelligence/case_memory.js`, `crates/core`           | `tk memory`                     | **IMPLEMENTED**           | `cargo test memory`; Semantic, Procedural, Episodic, and Working memory tiers.                      |
| **CAP-023**   | Case Law Precedent DB                        | `src/intelligence/case_law.js`                             | `tk case`                       | **IMPLEMENTED**           | `test/unit/case_law_manager.test.js`; records and searches historical rejections.                   |
| **CAP-024**   | Subagent-Driven Development (SDD)            | `src/commands/sdd.js`, `crates/core`                       | `tk sdd`                        | **IMPLEMENTED**           | `cargo test sdd`; brief extraction, task slicing, and context diff packaging.                       |
| **CAP-025**   | System-1 Fast Inference                      | `src/system1/`                                             | `tk system1`                    | **PARTIALLY IMPLEMENTED** | Heuristics and decision engine verified; ONNX models optional (`onnxruntime-node`).                 |
| **CAP-026**   | Browser Audit & Sentinel                     | `src/browser/`                                             | `tk audit-web`, `tk heal`       | **IMPLEMENTED**           | `test/unit/browser_sentinel.test.js`; Playwright DOM deconstruction and runtime heal.               |
| **CAP-027**   | Web Navigation & Trimming                    | `src/browser/driver.js`, `trimmer.js`                      | `tk browse`                     | **IMPLEMENTED**           | `test/unit/browser_trimmer.test.js`; token-bounded HTML pruning (<4KB).                             |
| **CAP-028**   | Mutation Testing Engine                      | `src/verification/mutation_testing_engine.js`              | `tk mutate`                     | **IMPLEMENTED**           | `test/unit/verification_mutation.test.js`; AST operator mutation to test test-suites.               |
| **CAP-029**   | Contract & Differential Testing              | `src/verification/contract_engine.js`                      | `tk contract`                   | **IMPLEMENTED**           | `test/unit/verification_contract.test.js`; precondition/postcondition assertion checks.             |
| **CAP-030**   | Recursive Self-Improvement (RSI)             | `src/evolution/rsi_engine.js`                              | `tk rsi`                        | **EXPERIMENTAL**          | Dual-loop continuous auto-tuning and instinct extraction based on git diffs.                        |
