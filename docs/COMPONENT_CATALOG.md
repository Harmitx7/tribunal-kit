# Tribunal Kit: Component Catalog

**Document:** `docs/COMPONENT_CATALOG.md`  
**Version:** `9.5.0` [VERIFIED: `package.json`]  
**Classification:** Authoritative Module, Class, and Service Inventory

---

## 1. Top-Level Architectural Hubs (By Inbound Fan-In)

According to static analysis executed by `tk understand overview`:

1. `src/utils/logger.js` — **45 dependents** (Centralized logging and diagnostic stream)
2. `src/security/boundary.js` — **26 dependents** (Security perimeter, SSRF, identifier validation)
3. `src/utils/helpers.js` — **24 dependents** (Shared string and environment helpers)
4. `src/activity/index.js` — **23 dependents** (Canonical activity engine and presentation facade)
5. `src/evolution/engine.js` — **20 dependents** (Self-tuning and mutation engine)
6. `src/intelligence/case_memory.js` — **17 dependents** (Persistent 4-type memory tier)
7. `src/execution/provider_adapter.js` — **16 dependents** (LLM provider abstractions)
8. `src/activity/types.js` — **16 dependents** (Canonical event constants and schemas)
9. `bin/mcp-server.js` — **15 dependents** (Model Context Protocol JSON-RPC server)
10. `src/utils/path_containment.js` — **14 dependents** (Filesystem boundary validator)

---

## 2. Ingress & Binaries Layer (`bin/`)

| File / Component         | Type                    | Responsibility                                          | Key Classes / Functions                                  |
| :----------------------- | :---------------------- | :------------------------------------------------------ | :------------------------------------------------------- |
| `bin/wrapper.js`         | Executable              | Platform binary resolver and fallback runner            | `getBinaryPath()`, `RUST_COMMANDS`                       |
| `bin/mcp-server.js`      | Executable Service      | Standalone Model Context Protocol server (34 tools)     | `McpServer`, `run_tribunal_audit`, `tribunal_understand` |
| `bin/proxy-server.js`    | Service                 | Local HTTP/WebSocket proxy for LLM request interception | `startProxyServer()`, `injectRulesPayload()`             |
| `bin/tk-proxy.js`        | Executable              | CLI wrapper for the proxy server                        | `parseProxyArgs()`, `main()`                             |
| `bin/adapter-install.js` | Executable (`tk-adapt`) | Auto-detects and installs host IDE/CLI rules bridges    | `ADAPTERS`, `installMcpConfig()`                         |
| `bin/global-store.js`    | Module                  | SQLite / in-memory shared store for cross-agent memory  | `initializeGlobalStore()`                                |
| `bin/spawn-agent.js`     | Module                  | Spawns child agent processes with piped stdio           | `spawnAgent()`                                           |

---

## 3. Compiled Native Core Layer (`crates/core`)

| Module / File                      | Responsibility                                              | Key Structs / Functions                           |
| :--------------------------------- | :---------------------------------------------------------- | :------------------------------------------------ |
| `src/main.rs`                      | Main native entry point and CLI subcommand dispatcher       | `main()`, `Cli`, `Commands` enum                  |
| `src/commands/ast_extractor.rs`    | High-speed AST extraction via `oxc_parser`                  | `extract_ast()`, `OxcAstWrapper`                  |
| `src/commands/memory.rs`           | 4-type taxonomy memory engine and recency search            | `MemoryStore`, `MemoryEntry`, `recall()`          |
| `src/commands/dag_scheduler.rs`    | Kahn's algorithm parallel wave scheduler & cycle detector   | `schedule_dag()`, `DagNode`                       |
| `src/commands/security.rs`         | Strict path traversal containment and git revision checking | `assert_within_root()`, `validate_git_revision()` |
| `src/commands/context_compress.rs` | Comment/whitespace pruning preserving code & `// VERIFY`    | `compress_context()`, `strip_comments()`          |
| `src/tui/reviewer_grid.rs`         | Unicode terminal grid rendering for 28 reviewers            | `render_reviewer_grid()`                          |

---

## 4. Canonical Activity & Telemetry Subsystem (`src/activity/`)

| Component                 | Responsibility                                                | Exports & Key Primitives                                                             |
| :------------------------ | :------------------------------------------------------------ | :----------------------------------------------------------------------------------- |
| `schema.js`               | Event contract validation, secret redaction, and deep cloning | `createActivityEvent()`, `validateActivityEvent()`, `deepClone()`, `redactSecrets()` |
| `lifecycle.js`            | State machine governing activity events                       | `LIFECYCLE_TRANSITIONS`, `assertValidTransition()`, `isTerminalState()`              |
| `tracker.js`              | Operation registry and state tracking                         | `ActivityTracker`, `OperationRegistry`, `defaultRegistry`                            |
| `resolver.js`             | Context-aware announcement resolution                         | `AnnouncementIntelligence`, `AnnouncementDeduplicator`                               |
| `environment.js`          | Host environment detection (Claude, Cursor, Windsurf, CI)     | `detectEnvironment()`, `getHostCapabilities()`                                       |
| `renderers/markdown.js`   | High-density Linear/Cursor-restrained markdown formatting     | `MarkdownRenderer`, `formatCompletionSummary()`                                      |
| `renderers/terminal.js`   | ANSI 24-bit / 256-color terminal renderer with ASCII fallback | `TerminalRenderer`, `renderTerminal()`                                               |
| `renderers/structured.js` | Machine-readable JSON streaming for telemetry pipelines       | `StructuredRenderer`, `renderStructured()`                                           |

---

## 5. Codebase Intelligence Subsystem (`src/commands/understand.js`, `.agent/scripts/`)

| Module                      | Responsibility                                              | Key Functions                                             |
| :-------------------------- | :---------------------------------------------------------- | :-------------------------------------------------------- |
| `understand.js`             | CLI command entry point for `tk understand`                 | `cmdUnderstand()`, `resolveRoute()`                       |
| `codebase_intelligence.js`  | Central coordinator and autonomous investigation engine     | `runCodebaseIntelligenceCli()`, `investigateHypothesis()` |
| `architecture_extractor.js` | Extracts imports, routes, and package boundaries from AST   | `extractArchitectureFacts()`, `parseAstImports()`         |
| `architecture_mapper.js`    | Builds module dependency graph and computes fan-in hubs     | `buildDependencyTopology()`, `detectCycles()`             |
| `blast_radius_engine.js`    | Computes concentric depth rings for proposed changes        | `calculateBlastRadius()`, `assignRiskTier()`              |
| `trace_engine.js`           | Traces control and data flow from ingress triggers to tests | `traceExecutionFlow()`                                    |

---

## 6. Agent Runtime Reliability & Recovery (`src/runtime_reliability/`)

| Module                             | Responsibility                                             | Key Classes / Functions                          |
| :--------------------------------- | :--------------------------------------------------------- | :----------------------------------------------- |
| `index.js`                         | Barrel export and resilient workflow orchestrator          | `executeResilientWorkflow()`                     |
| `state_machine_engine.js`          | Formally verified 10-state lifecycle automaton             | `StateMachineEngine`, `TERMINAL_STATES`          |
| `failure_classifier.js`            | 14-category normalized failure classifier                  | `FailureClassifier`, `classifyError()`           |
| `retry_and_timeout_engine.js`      | Bounded exponential backoff with full jitter               | `RetryAndTimeoutEngine`, `calculateBackoff()`    |
| `cancellation_context.js`          | Hierarchical cancellation context trees with `AbortSignal` | `CancellationContext`, `createChild()`           |
| `quorum_and_aggregation_engine.js` | Multi-agent quorum consensus with non-masking invariant    | `QuorumAndAggregationEngine`, `computeVerdict()` |
| `checkpoint_recovery_engine.js`    | Tamper-evident execution checkpoints with SHA-256 state    | `CheckpointRecoveryEngine`, `saveCheckpoint()`   |
| `resource_guard_engine.js`         | Concurrency limits and circular wait deadlock detector     | `ResourceGuardEngine`, `acquire()`               |
| `fault_injection_engine.js`        | In-process synthetic fault injector                        | `FaultInjectionEngine`, `injectFault()`          |

---

## 7. UI Engineering & Design Intelligence (`src/design_intelligence/`)

| Module                           | Responsibility                                             | Key Functions                                      |
| :------------------------------- | :--------------------------------------------------------- | :------------------------------------------------- |
| `index.js`                       | Barrel export and 9-step Design Quality Loop               | `executeDesignQualityLoop()`                       |
| `art_direction_engine.js`        | Art direction preset selector and DDR builder              | `buildDesignDecisionRecord()`, `selectPreset()`    |
| `color_harmony_engine.js`        | OKLCH color parsing and APCA/WCAG AA contrast checking     | `parseOklch()`, `isWcagAaCompliant()`              |
| `spatial_layout_engine.js`       | Fluid typography clamps and concentric border radii math   | `generateFluidClamp()`, `verifyConcentricRadius()` |
| `component_state_engine.js`      | Audits interactive states (hover, focus, active, disabled) | `auditInteractiveStates()`                         |
| `visual_defect_analyzer.js`      | Detects AI design clichés (purple gradients, jank)         | `analyzeVisualDefects()`                           |
| `browser_verification_bridge.js` | Playwright bridge for live rendering verification          | `verifyBrowserRendering()`                         |

---

## 8. Supply Chain & Vulnerability Security (`src/supply_chain/`)

| Module                         | Responsibility                                           | Key Classes                                     |
| :----------------------------- | :------------------------------------------------------- | :---------------------------------------------- |
| `index.js`                     | Unified supply chain audit coordinator                   | `runSupplyChainAudit()`                         |
| `sbom_engine.js`               | Generates standard CycloneDX and SPDX SBOM documents     | `SbomEngine`, `generateSbom()`                  |
| `malicious_package_engine.js`  | Typosquatting, post-install script trap detection        | `MaliciousPackageEngine`, `auditDependencies()` |
| `license_compliance_engine.js` | SPDX license compatibility and restriction checker       | `LicenseComplianceEngine`, `checkCompliance()`  |
| `package_integrity_engine.js`  | Cryptographic SHA-512 tarball integrity verification     | `PackageIntegrityEngine`, `verifyIntegrity()`   |
| `dependency_graph_engine.js`   | Transitive dependency tree and phantom package detection | `DependencyGraphEngine`, `buildGraph()`         |
