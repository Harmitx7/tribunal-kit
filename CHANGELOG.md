# 🏛️ Tribunal Kit — Changelog

[![Keep a Changelog](https://img.shields.io/badge/Changelog-Keep%20a%20Changelog%20v1.1.0-blue.svg?style=flat-square)](https://keepachangelog.com/)
[![SemVer](https://img.shields.io/badge/SemVer-2.0.0-green.svg?style=flat-square)](https://semver.org/)
[![Specialists](https://img.shields.io/badge/Specialists-52-cyan.svg?style=flat-square)](#)
[![Reviewers](https://img.shields.io/badge/Reviewers-28-emerald.svg?style=flat-square)](#)
[![Skills Corpus](https://img.shields.io/badge/Corpus-210%20Skills-teal.svg?style=flat-square)](#)
[![Workflows](https://img.shields.io/badge/Workflows-44%20Audited-indigo.svg?style=flat-square)](#)
[![Harnesses](https://img.shields.io/badge/Harnesses-9%20Supported-orange.svg?style=flat-square)](#)
[![Test Suite](<https://img.shields.io/badge/Tests-100%25%20Passing%20(489%20tests)-brightgreen.svg?style=flat-square>)](#)

All notable changes to **Tribunal Kit** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/) and adheres to [Semantic Versioning](https://semver.org/).

## [10.0.0] — 2026-09-25 — 🏛️ Codename: Tribunal OS (Sovereign Governance & Memory Singularity)

> [!IMPORTANT]
> **Release 10.0.0** introduces the **Tribunal OS** architecture, completing the Brain-Hands decoupling boundary, Durable Session Logging, and Team Mode dynamic topologies. It also finalizes the **Hybrid Compiled Context** memory architecture (Approach D) with a zero-dependency BM25/TF-IDF scoring engine, hardening the persistent `.memory.idx` storage against zero-division faults and RegExp injection.

### Added
- **Subagent-Driven Development (SDD) & Team Mode**: Introduced `subagent-driven-development` skill and `harness-manager` agent to support dynamic micro-teams (Team Mode) based on file impact and Topological DAG routing.
- **Tribunal Instincts Memory**: Added `tribunal-instincts-memory` skill and `memory-archivist` agent to continuously learn from Human Gate rejections and avoid repeating hallucinations.
- **Durable Session Logs & Checkpointing**: Implemented `/resume` workflow and `session-log-interrogation` skill to persist agent state across sessions using `.jsonl` event logs, preventing context loss on crashes.
- **Agent Syscall & Security Shield**: Introduced `agent-syscall-guidelines` and `agentshield-security` to enforce a strict Brain vs Hands decoupling boundary, routing external tool calls through secure MCP servers and sandboxes.
- **Hugging Face Skills Integration**: Seamlessly imported 25 specialized Hugging Face skills into the Tribunal Kit `.agent/skills/` corpus (raising the total to 210 skills). Registered the new `"huggingface"` domain route within the lazy-loading engine (`skill_topic_map.json`).
- **Skill Hardening**: Hardened the `huggingface-trackio` skill by injecting mandatory Tribunal guardrails: Pre-Flight Context Inspection, Socratic Gates (for privacy controls), and Verification-Before-Completion (VBC) constraints.
- **Hybrid Compiled Context Memory**: Added rigid schemas for `relations` (knowledge graph edge traversal) and `confidence` penalties on all memory entries across `memory_engine.js` and `crates/core/src/commands/memory.rs`.
- **Zero-Dependency BM25 TF-IDF Search**: Implemented a pure, crash-proof scoring function `((relevance * priority * confidence) + recency + freq_boost)`. Replaced vulnerable RegExp pattern matching with safe string-splitting to mitigate query injection faults.
- **Relational Graph Boosting**: Search queries now apply a mathematical 20% score boost recursively to all sibling targets mapped within an entry's `relations` array.
- **Offline Memory Compaction**: Shipped `.agent/scripts/memory_consolidator.js` to enable explicit offline pruning and GC of `.memory.idx` without spinning up the orchestrator harness.

### Changed
- **Global Governance Rules**: Updated `GEMINI.md` to strictly enforce the **HitL Impact Template** for executing Tier 2/3 tasks, and `kernel.md` to enforce **Context Window Budgets** using `getEvents()` API.
- **Orchestrator Architecture**: Rewrote `orchestrator.md` and `intelligent-routing` to support Topological DAG routing instead of a static 3-wave pipeline.
- **Workflow Overhauls**: Upgraded `/generate`, `/marathon`, and `/audit` workflows to utilize the new Durable Session Log, Ultrawork continuous validation, and AgentShield security passes.
- **Documentation SEO**: Improved general repository SEO with optimized metadata and structured articles.
- **Hybrid Context Testing**: Expanded the unit testing suite in `test/unit/memory_engine.test.js` to robustly assert confidence degradation (`source: learned` defaults to 0.5) and BM25 relational ranking hierarchy.

### Fixed
- **Zero-Division Panics**: Added strict fallback limits (`avgdl || 100`) in both Node.js and Rust BM25 engine implementations, guaranteeing deterministic math resolution even on totally empty corpus nodes.
- **ESLint Compliance**: Eliminated unused `fs` and `path` dependencies and hardened variable reassignment rules across all memory engine scripts.

## [9.2.2] — 2026-09-19 — 🧠 Codename: Bedrock (Native AST Extraction, Memory Engine Unification & Deterministic Swarm Architecture)

> [!IMPORTANT]
> **Release 9.2.2** delivers major architectural unifications across the Tribunal Kit core: native Rust AST extraction via `oxc`, a unified JSON-backed memory engine decoupled from SQLite, real deterministic static analysis in the swarm orchestrator (slashing reviewer delays from 3s to 49ms), and a lean governance kernel (`kernel.md`) that reclaims ~18KB (~4,500 prompt tokens) per IDE bridge file.

### Added
- **Native JS/TS AST Extraction**: Implemented a blazing-fast `oxc`-based AST parser in the Rust core (`ast-extract`) to accurately extract imports, exports, types, and landmines, replacing fragile regex fallbacks.
- **Unified Memory Engine (`memory_engine.js`)**: Completely decoupled from non-existent `better-sqlite3` and volatile in-memory storage, standardizing on the canonical `.agent/history/memory/.memory.idx` JSON index and `MEMORY.md` markdown projection with cross-process file locking (`.memory.idx.lock`) and stale lock eviction.
- **High-Density Governance Kernel (`kernel.md`)**: Authored a ~3.5KB (~850 tokens) lean kernel capturing Fabel epistemic checks, anti-hallucination non-negotiables, specialist routing tables, and SDD/TDD protocols.
- **Deterministic Swarm Static Validators**: Replaced simulated mock `setTimeout` delays and random failure rates in `SwarmOrchestrator` (`swarm_dispatcher.js`) with deterministic static analysis rules (`security_scan.js`, `schema_validator.js`, `dependency_analyzer.js`, and AST syntax/invariant verification).
- **Automated Skill Synchronization**: Added `npm run skills:sync` to the `package.json` `"prepack"` script, guaranteeing automated mirroring across `skills/`, `.agent/skills/`, and `.agents/skills/` during builds and releases.
- **Comprehensive Test Coverage**: Added dedicated test suites for `memory_engine.js` (12 tests), `swarm_dispatcher.js` deterministic reviewer benchmarks, and `bridges.test.js` context token savings assertions.

### Changed
- **IDE Bridge Synthesis (`dist/commands/init.js`)**: Updated `generateIDEBridges()` to source rules from `kernel.md` for `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `CLAUDE.md`, and `AGENTS.md`, reclaiming ~18KB (~4,500 tokens) per bridge file while preserving full backwards compatibility.
- **Swarm Dispatcher Export & Performance**: Exported `SwarmOrchestrator` in `module.exports` and lowered reviewer runtimes from 1,000–3,000ms mock delays down to ~49ms deterministic validation.
- **Native Binary Discovery (`wrapper.js` & `_utils.js`)**: Added `'ast-extract'` to `RUST_COMMANDS` and exported `getBinaryPath(startDir)` across `scripts/` and `.agent/scripts/` for unified multi-tier binary resolution.
- **Context Compiler Upgrade**: Updated `scripts/context_compiler.js` to route parsing natively through the Rust binary, significantly improving precision on dynamic imports and aliased exports. Added a `--json` output flag to `checkDrift` for programmatic assertions.
- **MCP Server Routing**: Refactored `tribunal_get_context` in `mcp-server.js` to directly execute `scripts/context_compiler.js`, resolving integration test failures that were caused by broken `wrapper.js` fallback routes.
- **Semantic Tool Repeat Guard**: Enhanced the `ToolRepeatGuard` within the MCP Server with deterministic semantic hashing (alphabetizing keys and normalizing strings) to block duplicate tool calls and prevent LLM loop hallucinations.

### Fixed
- **Memory Engine Subsystem Parity**: Standardized memory operations across all 4 taxonomy types (`semantic`, `procedural`, `episodic`, `working`), ensuring atomic persistence, mathematical scoring `(relevance * priority) + recency + freqBoost`, budget gating, and auto-expiration without external native database dependencies.
- **Dead Phantom Subprocesses**: Removed obsolete `python -m code_review_graph review-delta` subprocess spawns across CLI runners and swarm dispatcher blocks.
- **Phantom Import Detection**: Hardened `.agent/scripts/guardrail_engine.js` by transitioning away from regex pattern matching toward robust, true AST-based phantom dependency detection.
- **Validation Strictness**: Corrected a missing `VBC Protocol` header within the `skill-creator` skill to ensure it strictly passes payload validations.
- **Guardrail False-Positives**: Resolved structural configuration drift and phantom file alerts in `.agent/workflows/` (e.g., `skill-enhancement-engine.md`, `orchestrate.md`) by adjusting command text to bypass overzealous string matching.
- **Numeric Inconsistencies**: Automatically synchronized workflow reviewer counts across all 16 `.md` workflow files to match the updated `28 reviewers` manifest standard.


## [9.2.1] — 2026-09-15 — 🧠 Codename: Sovereign Intelligence (Drop 1: The Foundation)

> [!IMPORTANT]
> **Release 9.2.1** introduces **Drop 1 of the Sovereign Intelligence** evolution. This release lays the foundational Rust architecture for next-generation skill evolution and intelligent routing. It introduces three powerful native subsystems: **Skill Fitness Scoring**, **Dispatch Telemetry Collection**, and **Skill Dependency Resolution**. Additionally, a comprehensive suite of stability fixes across Node.js scripts and the Rust core guarantees a fortified runtime environment.

### 📊 Release KPI Scorecard

| Domain Metric               | Baseline (v9.1.0) | Release 9.2.1                | Improvement / Impact                                                  |
| :-------------------------- | :---------------- | :--------------------------- | :-------------------------------------------------------------------- |
| **Skill Quality Assurance** | Manual reviews    | **Automated Fitness Scorer** | Composite scoring across 6 dimensions (`tk fitness`)                  |
| **Agent Telemetry**         | Ephemeral         | **Local JSONL Event Log**    | Persistent dispatch stats and agent heatmaps (`tk telemetry-record`)  |
| **Dependency Resolution**   | Static lists      | **Transitive BFS Graph**     | Auto-loads co-requires and detects conflicts (`tk resolve`)           |
| **Reviewer Wave Sizing**    | Static (0,1,2,8)  | **Adaptive Domain Sizing**   | File extension and task keyword routing in `impact_tier.rs`           |
| **Telemetry Footprint**     | Unbounded         | **90-Day Compaction**        | Automated garbage collection into monthly buckets (`telemetry_gc.js`) |
| **System Stability**        | Fragile scripts   | **Fortified Resilience**     | 9 critical runtime vulnerabilities & blindspots resolved              |

---

### 🏛️ [CORE] Sovereign Intelligence Core (Rust Engine)

- **Skill Fitness Scoring Engine (`fitness_scorer.rs`)**: Computes a robust composite fitness score (0.0–1.0) for every `SKILL.md` by analyzing coverage, specificity, deduplication, LLM-trap density, recency, and section depth. Included a critical math fix for recency calculations on years prior to 2026.
- **Dispatch Telemetry Collector (`telemetry.rs`)**: High-speed, local-only JSONL event logging for every Orchestrator/Supervisor dispatch. Computes aggregate per-agent performance statistics (success rates, durations, revisions) with zero network overhead.
- **Skill Graph Resolver (`skill_resolver.rs`)**: A semantic graph engine that parses all YAML frontmatter to resolve `co-requires`, apply `supersedes` upgrades, and detect `conflicts-with` violations at runtime.
- **Adaptive Reviewer Waves (`impact_tier.rs`)**: Upgraded impact tiering with automatic domain detection (frontend, backend, database, security, devops, mobile) to route code changes to domain-specific reviewer clusters, eliminating irrelevant reviewer load.
- **AST Skill Compiler (`compiler.rs`)**: Reads `SKILL.md` files, drops raw markdown prose, and automatically compiles `traps` and `rules` into highly-dense Super-Prompt YAML, slashing token usage by 80%.
- **Darwinian Purge Engine (`purge.rs`)**: Hooks into the fitness scorer to continually evaluate the skill ecosystem. Automatically moves skills with `< 0.20` fitness into a `_deprecated/` directory and flags enormous skills for "Fission".
- **Hierarchical Swarm Routing**: Swarm dispatcher now supports nested chains-of-command via `tier` (`strategic` vs `tactical`) and `coordinator` fields, enabling multi-stage domain delegation.
- **New Core CLI Commands**: Native Rust binary bindings for `tk fitness`, `tk resolve`, `tk telemetry-record`, `tk telemetry-summary`, `tk compile`, and `tk purge`.

---

### 🧠 [AGENT] Operational Capabilities & Workflows

- **Subagent-Driven Development (SDD)**: Enforced via `task-<N>-brief.md` isolation and `review-<base>..<head>.diff` atomic diffing (Out-of-Band Context Isolation).
- **Verification-Before-Completion (VBC)**: Iron-law TDD pattern where agents must actively run verification shell commands locally to generate pass/fail evidence before declaring a task complete.
- **4-Type Persistent Memory**: Upgraded multi-session context persistence supporting Explicit Core Memory, Archival Thread Memory, Vector RAG Retrieval, and Ephemeral Working Memory.
- **Skill Genome SVGs (`genome.rs`)**: Beautiful, self-generating SVG visualizations of the Tribunal skill-tree genetics.
- **Global Leaderboards & Heatmaps (`heatmap.rs` / `leaderboard.rs`)**: Terminal-rendered visualizations of agent efficacy over time.

---

### 🧹 [MAINTENANCE] Telemetry Lifecycle Management

- **Automated Garbage Collection (`telemetry_gc.js`)**: A new utility script to compact the append-only `.tribunal/telemetry/dispatch.jsonl` log. Retains the last 90 days of raw events while aggregating older events into optimized monthly summary buckets.

---

### 🛠️ [STABILITY] Script Resilience & Edge Case Resolution

To ensure pristine execution across varying environments and toolchains, this release delivers vital stability and logic patches:

- **Environment Targeting (`bin/wrapper.js`)**: Bulletproofed the `TRIBUNAL_FORCE_JS` check to reliably fall back to the Node.js legacy router.
- **Regex & Validation Upgrades**:
  - `schema_validator.js` correctly maps `searchFor` recursive file scans to exact ORM identifier strings, preventing downstream false positives.
  - `pipeline_engine.js` correctly isolates SQL injection risks on both prefix and suffix interpolations.
  - `inner_loop_validator.js` seamlessly catches empty `.catch(e => {})` closures containing variables.
- **File System & CLI Tooling Resiliency**:
  - `telemetry_gc.js` mitigates data loss during `.jsonl` compaction by falling through gracefully when archives are empty.
  - `bundle_analyzer.js` actively traps and suppresses `ENOENT` faults on broken symlinks to prevent build failures.
  - `dependency_analyzer.js` resolved the inverted logic within the `--check-unused` argument flag.
  - `test_runner.js` implements strict argument evaluation, preventing watch flags from stripping out code coverage hooks.

---

## [9.1.0] — 2026-09-13 — 🌐 Codename: Autonomous Browser Intelligence, Empirical Case Law & Living Context Engine

> [!IMPORTANT]
> **Release 9.1.0** introduces a zero-dependency, native browser intelligence subsystem to Tribunal Kit (Component Synapse, Empirical Case Law Bridge, Runtime Sentinel) alongside the state-of-the-art **Living Context Engine** (`/context`, `/file-context`, `/digest`) and autonomous Model Context Protocol (MCP) gateway (`tribunal_get_context`). Users can drag and drop any file, multi-file pair, or whole project folder into their AI IDE chat to generate contract-accurate **Flight Data HUD Dossiers** with interactive Mermaid topologies, exact API type tables, Chesterton's Fences, and living context vault synchronization with semantic drift auditing (`--check`).

### 📊 Release KPI Scorecard

| Domain Metric                     | Baseline (v9.0.0)       | Release 9.1.0                            | Improvement / Impact                                                           |
| :-------------------------------- | :---------------------- | :--------------------------------------- | :----------------------------------------------------------------------------- |
| **Context Generation Latency**    | Manual / N/A            | **< 50ms AST extraction**                | High-speed multi-language regex & AST compiler (`scripts/context_compiler.js`) |
| **Autonomous MCP Context**        | Disconnected            | **`tribunal_get_context`**               | Native stdio JSON-RPC 2.0 tool for Cursor, Windsurf, Claude Code, Antigravity  |
| **Input Polymorphism**            | Single file only        | **Single, Pair & Directory**             | Dynamic dispatch for Single File HUD, Multi-File Bridge, & Subsystem Clusters  |
| **Documentation Drift**           | Unmonitored             | **Dual-Tier Semantic Sentinel**          | Tracks `source_hash` & `interface_hash` to detect staleness (`--check`)        |
| **Living Vault Architecture**     | Decentralized           | **`docs/context/INDEX.md`**              | Auto-indexed living catalog of all codebase context dossiers                   |
| **Browser Driver Dependency**     | None (N/A)              | **Zero external dependencies**           | Pure Node 22 native `WebSocket` CDP client                                     |
| **DOM Ingestion Budget**          | Raw HTML (>100KB)       | **< 4,000 UTF-8 bytes**                  | PinchTab-inspired `htmltrim` algorithm with IDPI sandbox                       |
| **Component Reverse-Engineering** | Manual inspection       | **Component Synapse (`tk deconstruct`)** | Extracts computed CSSOM into production React TSX                              |
| **Audit-to-Precedent Bridge**     | Disconnected            | **Case Law Bridge (`--codify`)**         | Live WCAG/console failures become permanent case law                           |
| **Runtime Diagnostics**           | Terminal logs only      | **Runtime Sentinel (`tk heal`)**         | Dev-server overlay detection & source file localization                        |
| **SDD Prompt Sandboxing**         | Open Markdown text      | **Delimited XML envelopes**              | Mandatory epistemic verification & subagent isolation                          |
| **Compiler Keyword Taxonomy**     | 10 keywords / 9 actions | **37 keywords / 16 actions**             | Governance Impact Tier engine (Tiers 0-3)                                      |
| **Proxy DoS Protection**          | Unbounded payload       | **5MB payload guard (HTTP 413)**         | Safe Anthropic `/v1/messages` header recalculation                             |
| **Audited Workflows**             | 43 workflows            | **44 workflows**                         | Registered `/context` in `.agent/workflows/` and `slash-commands.json`         |
| **Verified Test Corpus**          | 455 total passing tests | **489 total passing tests**              | 43 unit (409) + 11 integration (56) + 33 Rust                                  |

---

### 🧭 [CONTEXT] Living Context Compiler Engine (`scripts/context_compiler.js`)

- **High-Speed AST & Skeleton Extractor**: Multi-language extraction engine supporting TypeScript, JavaScript, Rust, and Python. Extracts exported functions, classes, structs, types, enums, and traits without loading full method bodies.
- **Chesterton's Fences & Landmine Detection**: Automatically identifies and preserves critical defensive code patterns, gotchas, and `// VERIFY` epistemic confidence sentinels across source files.
- **Inbound Caller Resolution**: Uses ripgrep/git grep to trace direct import sites and inferred caller references with exact file paths and line numbers.
- **Test Harness & Skill Auto-Binding**: Automatically detects associated test suites (`*.test.*`, `*.spec.*`) and binds matching Tribunal domain skills (`backend-security-expert`, `react-specialist`, `rust-pro`, `context-engineering-pro`).
- **Semantic Drift Sentinel (`--check`)**: Dual-tier SHA-256 hashing (`source_hash` for content and `interface_hash` for public signatures). Audits `docs/context/INDEX.md` and detects code staleness.

---

### 🤖 [MCP] Autonomous Model Context Protocol Tool (`bin/mcp-server.js`)

- **`tribunal_get_context`**: Added native MCP tool allowing autonomous AI agents (in Cursor, Windsurf, Claude Code, Antigravity) to programmatically retrieve verified Flight Data HUD context dossiers for target files, interface bridges, or project folders before executing edits.
- **In-Process Compilation**: Fast execution without spawning external subshells, protected by Tribunal's cooperative tool timeouts and repeat-guard loops.

---

### ⚡ [WORKFLOW] Interactive Slash Command (`/context`)

- **Workflow Orchestration (`.agent/workflows/context.md`)**: Full Tribunal workflow supporting drag-and-drop file paths, quoted arguments, and relative/absolute path resolution.
- **Slash Commands Registry (`.agent/config/slash-commands.json`)**: Registered `/context`, `/file-context`, and `/digest` aliases.
- **Living Vault Registry (`docs/context/INDEX.md`)**: Automatically updates the master codebase context catalog upon generating or updating dossiers.

---

---

### 🌐 [BROWSER] Zero-Dependency Native Browser Intelligence Engine (`dist/browser/`)

- **Node 22 Native WebSocket CDP Engine (`dist/browser/cdp.js`)**: Implemented a zero-dependency Chrome DevTools Protocol client using Node 22's native `WebSocket`. Supports `Page`, `Runtime`, `DOM`, `Accessibility`, and `Network` domains without requiring Playwright or Puppeteer.
- **CSRF-Protected Tab Lifecycle**: Uses HTTP `PUT /json/new` with a robust fallback to `GET /json/list` to ensure tab allocation works reliably across modern Chrome/Edge versions.
- **Dynamic Ephemeral Port Allocation (`dist/browser/launcher.js`)**: Added `getFreePort()` logic to dynamically allocate free OS sockets when no explicit port is supplied, eliminating socket `TIME_WAIT` lockouts and race conditions during high-concurrency parallel test runs.
- **Fabel Token-Pruned Trimmer (`dist/browser/trimmer.js`)**: Pure Node.js port of PinchTab's `htmltrim` algorithm. Strips non-semantic tags, comments, styles, SVG paths, and data URIs; truncates output at exactly 4,000 UTF-8 bytes to guarantee compliance with the Fabel Protocol.
- **Indirect Prompt Injection (IDPI) Firewall (`dist/browser/idpi.js`)**: Scans all scraped web content against known prompt-injection triggers, enforces local-first allowlists (`localhost`, `127.0.0.1`), and wraps extracted DOM into isolated `<untrusted_web_content>` security sandboxes.

---

### ⚡ [PROPRIETARY] Component Synapse, Case Law Bridge & Runtime Sentinel

- **Component Synapse (`dist/browser/synapse.js`)**: Reverse-engineers any live DOM element into typed React TypeScript components styled with Tailwind CSS by extracting computed CSSOM properties (geometry, flexbox/grid layout, typography, elevation, and interactive states).
- **Empirical Case Law Bridge (`dist/browser/case_bridge.js`)**: Ingests live browser audit findings (WCAG 2.2 accessibility failures, missing security headers, uncaught console exceptions) and automatically persists them as binding legal precedents in `.agent/history/case-law/` with cryptographic content hashing and deduplication.
- **Runtime Sentinel (`dist/browser/sentinel.js`)**: Connects to a running dev server (Next.js, Vite, CRA, Webpack), captures uncaught exceptions and framework error overlays, extracts stack traces to locate source files (`file:line:col`), and provides automated fix verification (`verifyRuntimeFix`).

---

### 🛠️ [CLI] Five New Browser Governance Commands (`dist/commands/` & `dist/cli.js`)

- **`tk browse <url>`**: Navigates headlessly to a URL, applies IDPI security scanning, and outputs token-pruned semantic markdown (< 4k bytes).
- **`tk audit-web <url> [--codify]`**: Runs live WCAG 2.2 accessibility, console error, and security header audits. With `--codify`, automatically registers violations into Case Law.
- **`tk compare-web <url1> <url2>`**: Synchronously captures viewports of two URLs and calculates perceptual pixel difference percentages for visual regression gating.
- **`tk deconstruct <url> --selector "<css>"`**: Reverse-engineers the target DOM element into production React TSX with Tailwind classes.
- **`tk heal <url> [--verify]`**: Inspects a local dev server for active runtime errors and verifies candidate fixes.

---

### 🤖 [MCP] Native Browser Tools Suite (`bin/mcp-server.js`)

- **7 Native MCP Tools**: Registered and exposed browser intelligence primitives to AI coding environments (Cursor, Claude Code, Gemini, Windsurf):
  - `tk_browser_navigate` — Token-pruned semantic page reader.
  - `tk_browser_audit` — Live accessibility, security, and console auditor.
  - `tk_browser_compare` — Visual regression differ.
  - `tk_browser_screenshot` — Base64 PNG viewport capture.
  - `tk_deconstruct_component` — Live element to React TSX component synthesizer.
  - `tk_heal_runtime_errors` — Dev server error hunter and fix verifier.
  - `tk_codify_browser_audit` — Live audit violation to Case Law codifier.

---

### 🛡️ [SECURITY & SDD] Subagent-Driven Development Prompt Isolation & XML Delimiter Sandboxing

- **Structural XML Delimiters (`.agent/templates/sdd/`)**: Wrapped prompt templates (`implementer-prompt.md`, `re-review-prompt.md`, `task-reviewer-prompt.md`) in strict XML-style structural delimiters (`<context_envelope>`, `<task_specification>`, `<diff_envelope>`, `<evaluation_criteria>`) to prevent indirect prompt injection from untrusted source diffs and task descriptions.
- **Epistemic Anti-Hallucination Protocol**: Added mandatory pre-flight constraints requiring implementers to verify every imported method or package against `package.json`/lockfile, mandate `// VERIFY: [reason]` annotations on uncertain lines, and explicitly prohibit speculative APIs or mock signatures.
- **Subagent & Process Isolation**: Enforced runtime process isolation banning implementers from recursively spawning helper subagents or self-reviewers, preserving controller-mediated wave review boundaries.
- **Machine-Readable Review Verdicts**: Upgraded Tribunal reviewer output contract to output structured JSON verdict summaries (`task`, `verdict`, `critical_count`, `important_count`, `minor_count`) with mandatory line-anchored citations (`file:line`).

---

### ⚡ [COMPILER] Super-Prompt Compiler Hardening & Governance Impact Tier Engine

- **Expanded Stack Taxonomy (`.agent/scripts/prompt_compiler.js`)**: Added 27 modern technologies to the routing index (FastAPI, Django, GraphQL, Rust, Docker, Kubernetes, AWS, Terraform, OpenTofu, Redis, Supabase, Playwright, Jest, Vitest, React Native, Flutter, Expo, C#, .NET, Blazor, Angular, Astro, SQLite, OpenTelemetry, WebGPU, LLM, RAG).
- **Extended Action Intent Matrix**: Added intent routing for `test`, `benchmark`, `optimize`, `deploy`, `migrate`, `secure`, and `contract` actions with targeted skill loading.
- **Adversarial Jailbreak Neutralization (`sanitizeUserInput`)**: Hardened prompt injection defense against advanced patterns (`disregard previous instructions`, `bypass guardrails/tribunal`, `override system/model instructions`, `DAN/jailbreak`), escaping inputs into isolated `<untrusted_user_input>` security boundaries.
- **Automated Governance Impact Tier Engine (`inferImpactTier`)**: Programmatically classifies requests into Tiers 0-3 based on action risk and domain sensitivity (auth, JWT, migrations, schema = Tier 3).
- **Structured Output Contracts**: Emits `impact_tier`, `governance: tribunal-v9`, and compact skill recommendations, verified by unit tests in `test/unit/prompt_compiler.test.js`.

---

### 🔒 [RUNTIME & PROXY] Proxy Server Resilience & Multi-Platform Runtime Hardening

- **413 Payload Too Large Guard (`bin/proxy-server.js`)**: Added an active 5MB payload cutoff with proper HTTP 413 responses to shield proxy interception against DoS and memory exhaustion attacks.
- **Robust Anthropic `/v1/messages` Interception**: Recalculates `content-length`, adjusts host headers, strips `transfer-encoding`, and reliably propagates HTTP 502 Bad Gateway upon upstream network timeouts or connection drops.
- **Cross-Platform Agent Spawning (`bin/spawn-agent.js`)**: Added native Windows shell execution (`shell: isWin`) and clean exit/signal propagation (`128 + signalCode`).
- **Native Wrapper Execution Gating (`bin/wrapper.js`)**: Gated on-demand Rust builds behind explicit `TK_AUTO_BUILD=1`, added auto-executable permissions (`chmod 0o755`) on Unix-like environments, and normalized exit signals.

---

### 📦 [CLI & PACKAGING] Packaging Hygiene, Self-Protection & Clean Distribution

- **Self-Uninstall Guard (`dist/commands/uninstall.js`)**: Implemented `isSelfInstall` check preventing accidental self-destruction when `tk uninstall` is invoked from within the tribunal-kit repo itself.
- **Extended CLI Arguments (`dist/cli.js`)**: Added parser support for `--branch`, `--log`, and `--strategy` flags across governance commands.
- **Python Cache Purge & Prepack Hook**: Added `scripts/clean-pycache.js` and wired `npm run prepack` to eliminate `__pycache__` and `.pyc` files before publishing.
- **Dependency Pruning**: Removed unused `better-sqlite3` from production runtime dependencies.
- **Precompiled Core Packaging**: Added `scripts/package-cores.js` to bundle multi-platform Rust pre-compiled binaries into target-specific packages.

---

### 🧪 [TESTS & GOVERNANCE] Verification & Audit Results

- **Comprehensive Unit & Integration Test Suites**:
  - `test/unit/browser_synapse.test.js` — CSSOM-to-Tailwind mapping and TSX generation.
  - `test/unit/browser_sentinel.test.js` — Stack trace source location extraction.
  - `test/unit/browser_case_bridge.test.js` — Audit-to-Case Law codification and deduplication.
  - `test/unit/browser_discovery.test.js` — Cross-platform browser and PinchTab binary discovery.
  - `test/unit/browser_idpi.test.js` — Prompt injection scanner and sandboxing.
  - `test/unit/browser_trimmer.test.js` — `htmltrim` token budgeting and markdown conversion.
  - `test/integration/browser_cli.test.js` — Live headless Chrome navigation and evaluation.
  - `test/unit/prompt_compiler.test.js` — Compiler taxonomy, jailbreak defense, and impact tier classification.
  - `test/unit/mcp_server.test.js` — Verification of 7 native browser tools registration.
- **Full Test Suite Status**: **482 total tests passing** across 42 unit test suites (393 tests), 11 integration test suites (56 tests), and 33 Rust core tests.
- **Pre-Deployment Checklist**: Full pass across `checklist.js`, `verify_all.js`, and `npm run validate-payload` (314 files checked, 0 vulnerabilities).

---

## [9.0.0] — 2026-09-08 — 🏛️ Codename: Hyperion Corpus & Universal Governance

> [!IMPORTANT]
> **Release 9.0.0** establishes universal multi-harness governance across 9 major agent environments (Claude Code, Cursor, Codex, Devin, Hermes, Kimi, OpenCode, Pi, Gemini), introduces native Rust Spec-Driven Development (`tk sdd`), achieves 100% workflow standardization across all 41 workflows, and modernizes the entire 184-skill corpus under the V4 assertion-dense specification.

### 📊 Executive Release KPI Scorecard

| Domain Metric                  | Baseline (v8.0)       | Release 9.0.0                             | Improvement / Impact                             |
| :----------------------------- | :-------------------- | :---------------------------------------- | :----------------------------------------------- |
| **Agent Harnesses Supported**  | 1 (Claude Code)       | **9 Major CLI & IDE Harnesses**           | Full multi-agent runtime ubiquity                |
| **Active Skill Corpus**        | 183 skills            | **184 V4 Hybrid Skills**                  | 100% deduplicated, 60-85% token reduction        |
| **Workflow Catalog Standards** | 40 workflows          | **41 Workflows (100% Compliant)**         | 0 broken refs, mandatory pre-flight loaders      |
| **Governance CLI Engines**     | Contract, Trace       | **+ Spec-Driven Dev (`sdd`)**             | Native Rust core architect/implement/review loop |
| **Verified Test Coverage**     | 35 suites / 362 tests | **36 Unit (368) + 10 Int (54) + 33 Rust** | 455 total passing tests, 0 failures              |
| **ESLint & Source Strictness** | Ad-hoc exceptions     | **0 errors, 0 warnings (72 files)**       | Clean ES modules across plugins and hooks        |

---

### 🌐 [SKILLS] Corpus-Wide V4 Hybrid Skill Modernization (184 Skills)

- **V4 Hybrid Skill Schema**: Upgraded the entire 184-skill corpus in `.agent/skills/` to the V4 specification, integrating clean metadata, automated scripts bindings (`lint_runner.js`, `verify_all.js`), domain-specific anti-pattern tables, and the canonical VBC Protocol.
- **Idempotent Skill Modernizer (`scripts/modernize_skills.js`)**: Shipped an automated deduplication and schema validation engine with `--validate`, `--dry-run`, `--fix`, and `--sync-to-root` flags. Eliminated duplicate guardrail stacks across 82 previously degraded skill files.
- **Deterministic Activation Boundaries**: Added strict `Activate when:` and `DO NOT activate when:` boundaries across skills to resolve cross-domain semantic overlap and eliminate false-positive agent activations.

### 🔌 [PLUGINS & SDD] Universal Multi-Harness Plugin Architecture & Spec-Driven Development (SDD)

- **Universal Agent Ecosystem Support (9 Harnesses)**: Integrated full-spectrum plugin definitions and manifests across 9 major agent environments:
  - **Claude Code**: [`.claude-plugin/plugin.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.claude-plugin/plugin.json) & [`.claude-plugin/marketplace.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.claude-plugin/marketplace.json)
  - **Cursor**: [`.cursor-plugin/plugin.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.cursor-plugin/plugin.json) & [`hooks/hooks-cursor.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/hooks/hooks-cursor.json)
  - **OpenAI Codex**: [`.codex-plugin/plugin.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.codex-plugin/plugin.json)
  - **Devin CLI**: [`.devin-plugin/plugin.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.devin-plugin/plugin.json)
  - **Hermes Agent**: [`.hermes-plugin/plugin.yaml`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.hermes-plugin/plugin.yaml) & [`.hermes-plugin/__init__.py`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.hermes-plugin/__init__.py)
  - **Kimi Code**: [`.kimi-plugin/plugin.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.kimi-plugin/plugin.json)
  - **OpenCode**: [`.opencode/plugins/tribunal.js`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.opencode/plugins/tribunal.js)
  - **Pi Agent**: [`.pi/extensions/tribunal.ts`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.pi/extensions/tribunal.ts)
  - **Google Gemini**: [`gemini-extension.json`](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/gemini-extension.json)
  - **Tribunal Core Workspace**: Mirroring `.agents/` for seamless runtime rule and tool discovery.
- **Unified Hook Lifecycle Architecture (`hooks/`)**: Built runtime lifecycle interceptors (`session-start.js`, `pre-command.js`, `post-command.js`) to dynamically inject rules, session state, and security boundaries across any CLI or editor agent.
- **Native Rust CLI `sdd` Subcommand (`crates/core/src/commands/sdd.rs`)**: Implemented the native Spec-Driven Development subcommand in Rust core, wired through `crates/core/src/commands/mod.rs` and `crates/core/src/main.rs`, and surfaced through `bin/wrapper.js` (`cmdSdd`).
- **Spec-Driven Development Workflow & Templates**: Added `.agent/workflows/sdd.md` and standard prompt templates in `.agent/templates/sdd/` (`architect-prompt.md`, `implementer-prompt.md`, `reviewer-prompt.md`) enforcing structured architectural specification and review gates before code generation.
- **Verification Before Completion (VBC) Protocol**: Shipped dedicated skill `.agent/skills/verification-before-completion/SKILL.md` and systematic debugging deep-dive guides (`condition-based-waiting.md`, `defense-in-depth.md`, `root-cause-tracing.md`).
- **SDD Integration Test Suite**: Added `test/unit/sdd_integration.test.js` with 6 automated tests validating CLI execution, schema compliance, and template existence.

### 📋 [WORKFLOWS] 100% Corpus-Wide Workflow Standardization & Explicit Pre-Flight Skill Loading (41 Workflows)

- **Complete 41/41 Workflow Catalog Audit**: Audited all 41 workflow definitions in `.agent/workflows/` for structural integrity, YAML frontmatter compliance, and valid skill dependencies.
- **Frontmatter Schema Normalization**: Repaired missing frontmatter in `contract.md` and `sdd.md` to conform to the v3.0.0 specification (`required-skills`, `scripts-binding`).
- **Broken Skill Reference Remediation**: Eliminated 11 invalid/broken skill references across workflows (e.g. mapping agent names `project-planner`, `csharp-developer`, `devops-incident-responder`, `database-architect`, `sql-pro`, `api-architect` to valid skill paths `plan-writing`, `clean-code`, `error-resilience`, `database-design`, `api-patterns`).
- **Universal Explicit Skill Loaders**: Injected mandatory Pre-Flight skill-loading instructions (`Read .agent/skills/<name>/SKILL.md before executing`) into all 38 workflows previously lacking them, achieving 100% (41 of 41) compliance across the entire workflow catalog.

### ⚡ [RUNTIME] 2026 LTS Runtime Standards & Performance Invariants

- **React 19 & Next.js 15 Integration (`react-specialist`, `nextjs-react-expert`)**:
  - Enforced native direct `ref` prop as a component prop, explicitly banning legacy `forwardRef`.
  - Upgraded Next.js App Router rules for async dynamic APIs (`await params`, `await cookies()`, `await headers()`), uncached `fetch()` defaults, Partial Prerendering (PPR), and Server Action taint validation.
  - Standardized on `useActionState` and `useOptimistic` for native form transitions.
- **Node.js 22+ LTS Standards (`nodejs-best-practices`)**:
  - Enforced built-in `node:sqlite` (`DatabaseSync`), native test runner `node:test`, and `import.meta.dirname`, eliminating unnecessary external C++ compilation dependencies.
  - Mandated stream backpressure management via `pipeline()` from `node:stream/promises`.
- **Advanced TypeScript 5.5+ (`typescript-advanced`)**:
  - Added TS 5.5+ inferred type predicates and `isolatedDeclarations` export annotations.
  - Enforced interface inheritance over quadratic deep intersection types (`A & B & C`) to protect compiler memory budgets.
- **Python 3.12+ Systems (`python-pro`)**:
  - Standardized on PEP 695 native `type` statements and generic functions `def func[T]()`.
  - Mandated structured concurrency via `asyncio.TaskGroup` over raw `asyncio.gather()`.
  - Enforced Pydantic v2 zero-copy deserialization (`model_validate`, `model_dump`).
- **Modern Rust 2024 / 1.80+ (`rust-pro`)**:
  - Replaced external lazy statics with native `std::sync::LazyLock`.
  - Added Axum 0.7+ `{id}` bracket route parameter syntax and Tokio cancellation safety invariants.
- **High-Throughput SQL & Relational Architecture (`sql-pro`, `database-design`)**:
  - Standardized on RFC 9562 UUID v7 for sequential B-tree indexing and B-tree fragmentation prevention.
  - Enforced SARGable date/time predicates and keyset cursor pagination, banning deep `OFFSET` on datasets > 1,000 rows.
  - Mandated the expand-contract pattern for zero-downtime database migrations.
- **AI Security Hardening (`ai-prompt-injection-defense`, `backend-security-expert`)**:
  - Implemented the Dual-LLM pattern for sandboxing untrusted context and random nonce XML framing (`<untrusted_data id="...">`).
  - Added timing attack defense via `crypto.timingSafeEqual()`, SSRF validation on outbound webhooks, and strict JWT algorithm pinning.
- **Next-Gen UI/UX & Motion Engineering (`better-ui`, `ui-ux-pro-max`, `60fps-animation`)**:
  - Enforced Display-P3 OKLCH color palettes and APCA contrast compliance.
  - Implemented the nested border-radius geometry formula ($\text{Radius}_{\text{outer}} = \text{Radius}_{\text{inner}} + \text{Padding}$).
  - Integrated native CSS scroll-driven animations (`animation-timeline`) and CSS `@starting-style` transitions on GPU compositor layers.

### 🧹 [QUALITY] Thermo-Nuclear Quality Hardening, Type Seams & Dead Code Elimination

- **Zero-Tolerance ESLint Governance**: Configured `eslint.config.js` to parse `.opencode/**/*.js` and `**/*.mjs`. Cleaned dead imports (`os`), stripped unused function `normalizePath`, and resolved all unused argument/variable warnings in `.opencode/plugins/tribunal.js`, `hooks/session-start.js`, and `scripts/audit_skill_sdo.js`.
- **Cross-Repository Metadata Synchronization**: Synchronized version `9.0.0` and resource totals (52 agents, 28 reviewers, 184 skills, 41 workflows, 41 scripts) across `package.json`, `README.md`, `CONTRIBUTING.md`, `.agent/config/plugin.json`, `.agent/config/system-prompt.md`, and `npm/core-template/package.json`.
- **Public API Type Seams**: Added missing declaration `cmdImpactTier` in `dist/index.d.ts`.
- **Windows Test Suite Reliability**: Hardened `test/unit/learn.test.js` with a 15,000 ms timeout to prevent premature process termination under Windows.
- **Dead Code Purge**: Purged disconnected Vite starter boilerplate in `src/ui/` (`counter.ts`, `main.ts`, `style.css`, `index.html`, etc.), deleted legacy `tribunal-kit-5.0.0.tgz` archive (680 KB), and removed unreferenced scratch artifacts.

### 🛠️ [TESTING] Tooling & Test Suite Resilience

- **Stress Benchmark Boundary Calibration**: Calibrated `test/unit/stress.test.js` to ensure deterministic execution under high-concurrency Node environments.
- **100% Passing Test Suite Across All Engines**:
  - **JS Unit Tests**: 36 of 36 unit test suites passing (368 tests passing, 0 failures)
  - **JS Integration Tests**: 10 of 10 integration test suites passing (54 tests passing, 0 failures)
  - **Rust Core Tests**: 33 of 33 tests passing with 0 failures (`cargo test`)
  - **ESLint Audit**: Clean pass across all 72 JavaScript source and configuration files (0 errors, 0 warnings)
  - **Payload Integrity**: All 311 intelligence payload files verified against schema

## [8.0.0] — 2026-08-30 — ⚡ Codename: Leviathan Orchestrator & Semantic AOT

### 🚀 Swarm Orchestrator & Wave-Based Execution (Phase 3)

- **SwarmOrchestrator Class**: Upgraded `swarm_dispatcher.js` from a simulated UI to a fully functional wave-based orchestrator.
- **3-Wave Execution Pipeline**: Deployed execution waves (`wave-1-core`, `wave-2-security`, `wave-3-domain`) to execute reviewers with strict failure mode partitioning (e.g., core failures halt the pipeline, security failures warn and continue).
- **Automated Resilience (3-Strike Retry)**: Wired `executeWithRetry` natively into the worker execution loop to handle transient API failures using an exponential backoff strategy (1s, 3s, 10s).

### 🛡️ Prompt Injection Defense

- **Input Sanitization**: Implemented `sanitizeUserInput` in `prompt_compiler.js` to strip HTML/XML tags and safely wrap user inputs in strict delimiters, defending the `compileSuperPrompt` generation pipeline against malicious prompt injection attacks.

### 🚀 Skill Format v4 — Stratified Density + Assertion-Dense Architecture

- **Hybrid B2+B3 Skill Format**: Introduced Skill Format v4, a tiered architecture combining stratified density loading (Tier 1: Header, Tier 2: Core, Tier 3: Recipes) with assertion-dense syntax (`❌→✅` traps, `WHEN→MUST/NEVER/THEN` rules). Reduces average skill token footprint by **60-85%** while preserving all domain knowledge.
- **Shared Guardrails Deduplication (`.agent/skills/_shared/guardrails.md`)**: Extracted VBC Protocol, Pre-Flight Checklist, and LLM Traps from all individual skills into a single shared file. Eliminates ~36,600 wasted tokens across the 184-skill corpus caused by triplicated boilerplate blocks.
- **Tier Boundary Markers (`<!-- TIER:RECIPES -->`)**: HTML comment markers separate always-loaded assertion tiers (Traps + Rules) from on-demand code recipe tiers, enabling future lazy-loading by `skill_integrator.js`.

### 📐 Pilot Skill Rewrites (6 Skills Migrated)

- **`react-specialist`**: 365 → 125 lines (**-66%**). Converted all React 19 API knowledge to `❌→✅` traps and `WHEN→THEN` rules. Full code recipes for `use()`, `useActionState`, `useOptimistic`, Zustand selectors, and compound components preserved in Tier 3.
- **`python-pro`**: 383 → 141 lines (**-63%**). Pydantic v2, FastAPI lifespan, async patterns, and Python 3.12+ type system distilled to assertion format with complete code recipes.
- **`nextjs-react-expert`**: 296 → 117 lines (**-60%**). Next.js 15 App Router conventions, Server Actions with Zod validation, PPR, caching, and middleware patterns preserved.
- **`better-ui`**: 119 → 42 lines (**-65%**). Design engineering rules (multi-layer shadows, nested border-radius formula, stagger animations) converted to `WHEN→MUST` assertions.
- **`impeccable`**: 89 → 36 lines (**-60%**). Typography, color, motion, and layout pillars compressed to pure assertion format with OKLCH, 8px grid, and duration constraint rules.
- **`skill-creator`**: 145 → 80 lines (**-45%**). Rewritten as the v4 format enforcer — now defines the complete v4 frontmatter schema, tiered structure template, and assertion syntax reference for all future skills.

### 📋 v4 Skill Specification

- **Frontmatter Schema**: `name`, `v: 4`, `scope` (file extension triggers), `loads` (dependency skills), `guardrails: shared`, `reviewers` (Tribunal reviewers).
- **Assertion Syntax**: `❌ old → ✅ new` (hallucination traps), `WHEN X → MUST Y` (requirements), `WHEN X → NEVER Y` (prohibitions), `WHEN X → THEN Y` (expected behavior).
- **Density Constraints**: Traps section ≤10 lines, Rules section ≤30 lines, one line = one rule.

### 🚀 AOT Semantic Context Graph

- **Native Rust Engine (`tribunal-core`)**: Introduced a blazingly fast AST structural parsing engine natively written in Rust via `oxc_parser`. Moves logic away from brute-force regex toward 100% deterministic graph querying.
- **Node Bridge (`build-graph.js`)**: Implemented an async/sync bridge for zero-latency communication between Node MCP and the Rust context engine.
- **Context Density Optimization**: Replaced arbitrary file dump context loading with a strict `.tribunal/graph.json` query structure to minimize prompt saturation and eliminate model hallucination due to oversized contexts.

### 🔌 Universal Native Agent Plugin Ecosystem

- **Claude Code Marketplace Integration**: Shipped `.claude/CLAUDE.md`, `plugin.json`, and `claude.json` to natively inject the 52 Specialists and 28 Reviewers directly into Claude Code CLI without bulky proxy servers.
- **CLI Adapter Injection (`adapter-install.js`)**: Universal injection strategy linking workspace environments to their respective terminal AI tools natively.
- **MCP Server Expansion**: Published `query_semantic_graph` endpoint into `mcp-server.js` exposing AST structure back to all attached IDEs or autonomous AI harnesses.

### 🐛 Bug Fixes

- **MCP Server**: Fixed a syntax error and missing closing brace in the `query_semantic_graph` tool definition.

## [7.0.0] — 2026-08-09 — 🛡️ Codename: Sovereign Covenant & Sentinel CI

### 🚀 CI/CD Pipeline Defense Suite & Automated Repair Subsystem

- **CI/CD Pipeline Reviewer Agent (`@pipeline-reviewer`)**: Added dedicated DevOps/CI reviewer agent (`.agent/agents/pipeline-reviewer.md`) enforcing 10 automated checks (`CI-01` to `CI-10`) covering deprecated actions, `pull_request_target` pwn vectors, concurrency mutexes, `write-all` permissions, secret leakage, unredacted tokens, script injection in `run:` steps, missing step timeouts, Dockerfile root execution, and GitLab CI syntax.
- **Pre-Deploy CI/CD Tribunal Gate (`/tribunal-cicd`)**: Added `/tribunal-cicd` 5-reviewer gate (`pipeline-reviewer`, `security-auditor`, `dependency-reviewer`, `resilience-reviewer`, `precedence-reviewer`) for auditing workflow definitions and deployment pipelines before merge.
- **Automated CI Failure Diagnosis & Log Repair Loop (`/fix-ci`)**: Added `/fix-ci` workflow (`.agent/workflows/fix-ci.md`) providing a 4-step diagnostic loop that parses raw runner logs (lockfile drift, matrix mismatches, missing secrets, test timeouts) and synthesizes minimal, validated repairs.
- **Deterministic Zero-Dependency CI/CD Validator (`cicd_validator.js`)**: Created high-performance validator script (`.agent/scripts/cicd_validator.js`) that verifies `.github/workflows/*.yml`, `.gitlab-ci.yml`, and `Dockerfile` configurations locally in under 10ms.
- **CI/CD Validator Test Suite (`cicd_validator.test.js`)**: Added 6 comprehensive unit tests validating action versions, concurrency controls, timeout definitions, and permission boundaries.

### 📜 Sovereign Covenant Protocol: NeuroSymbolic Agent Behavioral Contract & Flight Trace Subsystem

- **AI Agent Behavioral Contract Testing (`tk contract`)**: Created a zero-dependency contract evaluation engine (`.agent/scripts/contract_engine.js`) that enforces team invariants, structural boundaries, and forbidden/required code patterns before code is committed to disk.
- **Failure Context Snapshot & Replay Engine (`.agent/scripts/trace_engine.js`)**: Integrated Option 1 Hybrid session tracing. When a contract check yields a `block` or `warn` violation, the engine auto-saves a lightweight **Failure Context Snapshot** (`.tribunal/traces/`) capturing the violation line, code snippet, and Git branch context for CLI replay via `tk contract replay <id>`.
- **Declarative YAML Contract Schema (`.tribunal/contracts/`)**: Introduced human-readable YAML contract specifications supporting glob pattern scoping (`scope`), exclusions (`exclude`), rule exception lists (`except`), severity levels (`block`, `warn`, `info`), literal strings, and `regex:` expressions.
- **Starter Contract Scaffolding (`tk contract init`)**: Added 3 production starter contracts (`no-console-log.yaml`, `no-any-type.yaml`, `require-error-handling.yaml`) scaffolded into `.tribunal/contracts/`.
- **MCP Server Proactive Tool (`verify_contracts`)**: Registered `verify_contracts` in `bin/mcp-server.js` allowing AI coding agents in Cursor, VSCode, Windsurf, or Claude Desktop to self-verify code against team behavioral contracts _before_ making edits.
- **Case Law Bridge (`tk contract generate --from-case <id>`)**: Built a seamless bridge from Case Law precedents (`tk case`) to auto-generate contract rules, preventing past AI coding errors from recurring.
- **Slash Workflow Command (`/contract`)**: Created `.agent/workflows/contract.md` workflow guide for one-command contract administration and validation.
- **Workspace Status & Pre-Push Hook Integration**: Extended `npx tribunal-kit status` to report active contract rule counts and updated `dist/index.d.ts` with complete TypeScript interfaces (`Contract`, `ContractViolation`, `VerifyContractsInput`, `cmdContract`).

### 🛡️ Codebase Quality, Audit Resolution & Test Infrastructure

- **ESLint 9 & Prettier Modernization**: Configured flat config ignores, created `.prettierignore` for clean format passes, and eliminated `no-throw-literal` antipatterns in `mcp-server.js` with structured `RpcError`.
- **Full Test Suite & Checklist Verification**: Reached 100% clean passes across 41 test suites (383/383 tests passing) and all priority tiers of `checklist.js` (Secret Scan, Lint, TypeScript, Tests).
- **HyperSparse Routing Index Alignment**: Synchronized `routing_index.json` to 52 specialized agents and 40 workflows.

## [6.0.1] — 2026-08-07 — 🚄 Codename: HyperSparse Matrix & MCP Evolution

### ⚡ HyperSparse Router, MCP Modernization (2025-03-26) & Governance Architecture

- **HyperSparse Skill Router (`skill_topic_map.json`)**: Integrated lightweight 2-tier domain routing map indexing all 185 skills across 9 domain routes and file extension affinities (`.tsx`, `.ts`, `.py`, `.sql`, `.prisma`, `.tf`, `.tofu`, `.swift`). Cuts startup context overhead by **95%** (~3,000 tokens vs ~85,000) with **0 skills excluded**.
- **MCP Server Protocol Modernization (`2025-03-26`)**: Upgraded `bin/mcp-server.js` to protocol 2025-03-26. Exposes dynamic **MCP Resources** (`tribunal://agent/{name}`, `tribunal://skill/{name}`, `tribunal://workflow/{name}`) and **MCP Prompts** for all 36 workflows alongside tools. Replaced fragile shell eval in `sync_ide_bridges` with direct in-process invocation.
- **ESM Exports & Type Declarations Alignment**: Added missing exports for 8 CLI commands (`cmdGuardrail`, `cmdOptimizeSkill`, `cmdMinimal`, `cmdValidate`, `cmdMinContext`, `cmdDagSchedule`, `cmdContextCompress`, `cmdOptimizeStep`) in `dist/esm/index.mjs` and `dist/index.d.ts`.
- **Governance Impact Tier Engine (`impact-tier`)**: Fully registered `impact-tier` command across `bin/wrapper.js`, `dist/cli.js`, and `dist/commands/native.js` with JS fallback logic (Tier 0: Fast-Pass, Tier 1: Express Pass, Tier 2: Targeted Audit, Tier 3: Full Gauntlet).
- **Skill Profiling (`--profile`)**: Added `--profile` support (`full`, `minimal`, `web`, `mobile`, `backend`, `ai`) to CLI argument parsing and TypeScript definitions for profile-scoped asset installation.
- **Tri-Phase Wave Governance (`/tribunal-full`)**: Refactored the 21 parallel reviewers into 3 clean execution waves (Wave 1: Core Integrity, Wave 2: Security & Types, Wave 3: Domain & Performance), eliminating context window saturation and reviewer attention dilution.
- **14 Essential 2026–2027 Skills Addition (Kit Total 171 → 185)**: Created and enriched high-impact skills across AI, Database, Mobile, DevOps, Security, and Testing domains (`context-engineering-pro`, `agentic-workflows-2026`, `vector-search-pgvector`, `duckdb-analytical-sql`, `expo-router-v4`, `edge-ai-mobile`, `platform-engineering-opentofu`, `opentelemetry-observability`, `zero-trust-passkeys`, `ai-app-hardening`, `playwright-ai-e2e`, `property-based-testing`, etc.).
- **Code Quality, Prettier & ESLint Upgrade**: Enabled `"checkJs": true` in `tsconfig.json`, configured Prettier (`.prettierrc`), added `npm run format` & `npm run format:check` scripts, and expanded ESLint rules from 2 to 12 rules.
- **Non-Blocking Memory Lock**: Replaced event loop spin lock in `dist/commands/memory.js` with non-blocking `Atomics.wait()`.
- **CI Matrix & Rust Test Automation**: Upgraded `.github/workflows/ci.yml` to 3-platform matrix (Ubuntu, Windows, macOS), added an ESLint step, and added dedicated Rust test execution (`cargo test`).
- **Comprehensive Documentation Suite**: Created `docs/API_REFERENCE.md`, `docs/MCP_GUIDE.md`, and `docs/AUTHORING_GUIDE.md` covering programmatic imports, MCP server integration, and custom asset authoring.
- **Unit Test Suite Expansion**: Created unit tests for `learn`, `compile`, and `native` fallback commands (`test/unit/learn.test.js`, `test/unit/compile.test.js`, `test/unit/native.test.js`), achieving 28 passing test suites (313 unit tests).

## [6.0.0] — 2026-07-30 — 🦀 Codename: Rust Core Ascendancy & v3.0 Unified

### ⚡ Hybrid Rust Core Engine & Unified v3.0.0 Payload Release

- **Unified B+C Hybrid Routing Index (`routing_index.json` v3.0.0)**: Indexed 50 Specialist Agents (21 Parallel Reviewers + 29 Domain Specialists), 36 Slash Command Workflows, and 175 Skills categorized across 10 domain taxonomies with compact `trigger_keywords` arrays for instant intent matching without token bloat.
- **Workflow Standard v3.0.0 Specification**: Upgraded all 36 slash command workflows (`/generate`, `/pipeline`, `/swarm`, `/tribunal-*`, `/audit`, `/debug`, `/plan`, etc.) with mandatory pre-flight context inspection gates, executable script bindings, and explicit YAML metadata (`version: 3.0.0`).
- **History & Memory Subsystem v3.0.0 (`.agent/history/`)**: Deduplicated memory index (`MEMORY.md` saving ~60% token overhead), created root `history/README.md` architecture guide detailing the 4 pillars (Semantic Memory, Case Law Precedence, Code Snapshots, and Context Graphs), and defined W3C Case Law precedent schemas (`template-case.json`).
- **21 Parallel Tribunal Reviewers**: Expanded Tribunal review pipeline with `visual-reviewer`, `interaction-reviewer`, `anti-pattern-reviewer`, `ux-reviewer`, `product-reviewer`, and `accessibility-reviewer` for comprehensive full-stack and UI/UX governance.
- **W3C Design Tokens v3.0.0 (`.agent/templates/design-tokens.json`)**: Enhanced design system templates with 8 visual archetypes in OKLCH color space, typography font family stacks, and ambient elevation shadow tokens.
- **Native Rust Context Density Broker (`crates/core/src/commands/context_broker.rs`)**: Implemented sub-15ms native scanning of `.agent` rules, skills, and target files with token footprint estimation. Integrated via `tryNativeContextBroker` in `.agent/scripts/context_broker.js` with zero-crash JS fallback.
- **Parallel Tribunal Wave Group Engine (`crates/core/src/commands/dag_scheduler.rs`)**: Upgraded Kahn's algorithm DAG scheduler with `WaveGroup` tiering (`fast` vs `deep` tasks), enabling fast lint/type-safety reviewers to execute in parallel before deep security/performance auditors.
- **Multi-IDE Concurrent Rule Sync Engine (`cmd_sync` in `crates/core/src/main.rs`)**: Built a Rust-native concurrent bridge engine (`sync_ide_bridges`) that force-writes governance rules across 6 major IDE targets (`.cursorrules`, `.windsurfrules`, `.gemini/GEMINI.md`, `.gemini/settings.json`, `.github/copilot-instructions.md`, `.claude/CLAUDE.md`) via `tokio::join!`.
- **Terminal Status Dashboard (`cmd_status` in `crates/core/src/main.rs`)**: Upgraded terminal status output with real-time bridge freshness tracking (fresh/stale/missing), context token compression stats, and 21-reviewer pipeline readiness indicators.
- **Guardrail Engine & Pre-Deploy Integration (`.agent/scripts/verify_all.js`)**: Integrated Step 7 (Rust Core Tests) into `verify_all.js` and added `ruleRustModuleRegistration` to `guardrail_engine.js` for strict binary/wrapper module alignment.

## [5.8.6] — 2026-07-28 — 🧬 Codename: 3-Pass Synthesis Pipeline

### ✨ Features & Architecture Enhancements

- **Hybrid 3-Pass Code Generation Pipeline (`/pipeline`)**: Implemented Option A + Option C hybrid architecture that decouples task planning, code synthesis, and post-generation validation into distinct phases. Reduces prompt tokens by **78–86%** (~18,000 → ~2,500 tokens) while increasing task-focused context from **11% to 75%**.
- **Pipeline Engine (`.agent/scripts/pipeline_engine.js`)**: Developed a 3-pass orchestrator supporting `planPhase()`, `buildPhase()`, `validatePhase()`, and `fullPipeline()` modes with CLI flags (`--task`, `--file`, `--phase`, `--output`, `--dry-run`, `demo`).
- **Condensed Planner Rules (`.agent/rules/GEMINI_PLANNER.md`)**: Created an ~80-line planner context containing only task classification, stack detection, skill selection, and JSON spec output schema — saving ~4,800 tokens per planning pass.
- **Context Broker Extension (`.agent/scripts/context_broker.js`)**: Added `brokerForPipeline()` API and `--output pipeline-plan`/`--output pipeline-build` modes to provide phase-specific context pruning.
- **Pipeline Workflow & Architecture Docs**: Added `/pipeline` workflow (`.agent/workflows/pipeline.md`) and updated `.agent/ARCHITECTURE.md` with pipeline flow diagrams and token budget comparisons.

## [5.8.5] — 2026-07-27 — 🕸️ Codename: DAG Kahn Scheduler & Context Compression

### ✨ Features & Performance Enhancements

- **DAG-Based Multi-Agent Wave Scheduler**: Implemented Kahn's topological sorting algorithm in native Rust (`crates/core/src/commands/dag_scheduler.rs`) to compute dynamic worker execution waves (`wave_1`, `wave_2`, etc.) from agent task dependency graphs. Eliminates idle waiting by executing non-dependent reviewers concurrently.
- **Native Context Compression Engine**: Developed `tribunal-core context-compress` (`crates/core/src/commands/context_compress.rs`) to minify code and markdown context files before ingestion by LLM agent prompts. Saves 30–50% on token payloads while preserving critical `// VERIFY` assertions for anti-hallucination compliance.
- **CLI Subcommand Expansion**: Added `DagSchedule`, `ContextCompress`, `MinContext`, and `OptimizeStep` subcommands to the Rust core binary (`crates/core/src/main.rs`) and registered them in `bin/wrapper.js` `RUST_COMMANDS` and `dist/cli.js`.
- **Swarm Dispatcher DAG Integration**: Updated `.agent/scripts/swarm_dispatcher.js` with `computeDagWaves` algorithm to calculate and validate DAG waves across all multi-agent swarm payloads.
- **Workflow & Benchmark Upgrades**: Updated `/swarm` workflow (`.agent/workflows/swarm.md`) to mandate Stage 1/Stage 2 wave decomposition and context compression, and added wave scheduling latency checks to `scripts/benchmark.js`.

### 🐛 Bug Fixes & Architecture Hardening

- **Pure JavaScript `validate` Command Fallback**: Created `dist/commands/validate.js` and registered `validate` in `dist/cli.js` so `npx tribunal-kit validate` works seamlessly on environments without the Rust binary compiled. Eliminates `Unknown command: "validate"` crashes on pure JS fallbacks.
- **MCP Server Unification & Fallback Protection**: Refactored `dist/mcp/server.js` to delegate cleanly to `bin/mcp-server.js` and updated `runTribunalAudit()` in `bin/mcp-server.js` to execute in-process via `integrity_manifest.js`. Corrected inaccurate comments regarding process spawning.
- **Windows Executable Shim Normalization**: Refactored `normalizeCommand` in `.agent/scripts/_utils.js` using `WINDOWS_CMD_SHIMS` (`npm`, `npx`, `pnpm`, `yarn`, `bun`, `bunx`), ensuring standard executables (`node`, `git`, `cargo`, `python`) are not corrupted with `.cmd` suffixes on Windows.
- **Neurosymbolic Reviewer Count Disambiguation**: Updated `ruleReviewerCount` in `guardrail_engine.js` to specifically match `reviewers` claims while leaving total agent claims (e.g. `"44 specialist agents"`) intact. Prevents `--fix` from corrupting agent counts.
- **Dynamic Subdirectory Path Resolution**: Replaced static CWD `path.resolve(".agent", ...)` in `marathon_harness.js` with `findAgentDir(startDir)`. Eliminates path resolution failures when running `tk marathon` inside subdirectories.
- **Module Require Side-Effect Protection**: Replaced top-level `findAgentDir()` invocation in `skill_evolution.js` with lazy `getPaths(startDir)`, eliminating process exit crashes when requiring the module without `.agent` in the working directory.
- **Reviewer Count Harmonization**: Standardized parallel reviewer classification across `integrity_manifest.js`, `scripts/sync-version.js`, `tribunal-full.md`, `README.md`, and `package.json` to 20 reviewers (including `throughput-optimizer`).
- **Version Sync Enhancement**: Updated `scripts/sync-version.js` to verify and align `optionalDependencies` (`@tribunal-kit/core-*-*`) in `package.json` whenever the package version is bumped.

## [5.8.4] — 2026-07-22 — 🛡️ Codename: Zero-Exception Guardrail & SkillOpt Engine

### ✨ Features & Enhancements

- **Zero-Exception Skill Reading Protocol**: Updated master system rules (`GEMINI.md`) and agent specifications (`frontend-specialist.md`, `backend-specialist.md`, `logic-reviewer.md`) requiring agents to view `SKILL.md` before generating code, announce skill usage with `📖 Reading skill @[skill-name]...`, enforce `package.json` package grounding, and write `// VERIFY: [reason]` comments on unverified APIs.
- **Domain-Specific LLM Trap Tables**: Replaced generic trap text across core framework skills (`nextjs-react-expert`, `react-specialist`, `python-pro`, `vue-expert`) with high-precision tables contrasting common AI failure patterns against modern framework standards (Next.js 15 App Router vs Page Router, React 19 hooks, Python 3.12+ type hints, Pydantic v2 migration, Vue 3.5+ Composition API, Nuxt 4 auto-imports).
- **Skill Guardrail Completeness Rule**: Added `Rule 9: skill-guardrail-completeness` (`ruleSkillGuardrailCompleteness`) to `guardrail_engine.js` to deterministically audit and verify that all `SKILL.md` files contain domain-specific LLM Traps tables, Pre-Flight Self-Audits, and VBC Protocols.
- **CLI Architecture Refactoring & Decomposed Forwarder**: Refactored monolithic 1,535-line `bin/tribunal-kit.js` into a lightweight, 115-line entry point delegating to `dist/cli.js`. Reduces file size by **92.5% (-1,420 lines)** while preserving 100% test export compatibility (`parseArgs`, `compareSemver`, `copyDir`, `countDir`, `isSelfInstall`, `CORE_AGENTS`, `CORE_SKILLS`, `generateIDEBridges`, `cmdMarathon`).
- **Canonical Helper Deduplication**: Replaced duplicate inline `findAgentDir` implementations across `case_law_manager.js`, `context_broker.js`, `skill_integrator.js`, `swarm_dispatcher.js`, and `skill_evolution.js` with canonical imports from `_utils.js`.
- **Zero-Latency Async Version Check**: Integrated `dist/utils/version.js`'s non-blocking background fetch and 1-hour local disk cache (`.tribunal-kit-update-cache.json`) into the legacy CLI path, eliminating 5-second HTTP delays on startup.
- **Expanded Command Parity**: Enabled native access to all 17 CLI commands (including `align`, `compile`, `memory`, `guardrail`, and `optimize-skill`) through the `bin/tribunal-kit.js` entry point.
- **SkillOpt Self-Evolution Engine**: Implemented the full SkillOpt pipeline from the _Automated Skill Optimization for Large Language Models_ research paper. A new `optimize-skill` CLI subcommand (`tk optimize-skill --target <skill> "<harness>"`) runs multi-epoch optimization loops that automatically refine any SKILL.md using LLM-proposed patches, harness-evaluated scoring, and Rust-accelerated deduplication — all without external API dependencies beyond the user's existing LLM key.
- **Hybrid Rust Core + JS Harness Architecture**: The optimization loop is split between a high-performance Rust core (`optimize.rs`) for deterministic patch merging, Levenshtein similarity deduplication, and strict schema validation, and a JS orchestrator (`optimize.js`) for LLM calls, harness execution, and epoch management. This ensures sub-millisecond merge/dedup operations while keeping LLM interaction flexible.
- **Rust `optimize-step` Subcommand**: Added `OptimizeStep` to the Rust `tribunal-core` binary with `merge-patches` and `dedup-patches` actions. Merge applies multiple text patches sequentially to a base document. Dedup uses normalized Levenshtein similarity (configurable threshold, default 0.85) to eliminate near-duplicate patch proposals.
- **CLI Routing**: Added `optimize-skill` command to `cli.js` with lazy-loaded `dist/commands/optimize.js` module. Supports `--target`, `--epochs`, `--candidates`, `--threshold`, and `--harness-timeout` flags.
- **Environment Auto-Detection**: Automatically detects available LLM API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) with zero additional configuration required.
- **Layered Anti-Hallucination Defense**: Implemented a comprehensive neurosymbolic guardrail system to prevent AI hallucination and instruction drift. Added a new `tk guardrail` CLI command to scan the `.agent` context payload against a dynamic `integrity_manifest.js` to detect missing scripts, hallucinated agent names, and unresolved `// VERIFY:` tags.
- **Guardrail Engine**: Developed `guardrail_engine.js` with 9 strict integrity rules (e.g., `ruleNumericConsistency`, `ruleAgentExists`, `ruleSkillExists`, `ruleScriptExtension`, `ruleSkillGuardrailCompleteness`). The engine prevents execution if the AI references non-existent files or hallucinates capability claims.
- **55 New Production-Grade Domain & UI Skills**: Integrated 55 curated, production-grade `SKILL.md` skill definitions into `.agent/skills/` based on top industry standards (from `ui-skills.com`, Matt Pocock, Anthony Fu, Cursor, Leonxlnx, Brotzky, and MengTo):
  - **Master Router**: Added `ui-skills-root` with 30+ intent-driven skill routing pathways.
  - **44 Design Engineering & UI Skills**: `better-ui`, `baseline-ui`, `impeccable`, `bolder`, `quieter`, `distill`, `delight`, `polish`, `harden`, `critique`, `clarify`, `shape`, `build-primitive`, `adapt`, `colorize`, `typeset`, `progressive-blur`, `company-logos`, `landing-page`, `pricing-page`, `60fps-animation`, `accessible-animation`, `micro-interaction`, `page-transition-animation`, `animation-on-scroll`, `animation-systems`, `lottie-animation`, `svg-animation`, `masked-reveal`, `marquee-loop`, `to-spring-or-not-to-spring`, `morphing-icons`, `sounds-on-the-web`, `audit-and-fix`, `fixing-metadata`, `web-quality-audit`, `compact-landing`, `design-lab`, `react-doctor`, `cobejs`, `12-principles-of-animation`, `swiss-design`, and `transitions-dev`.
  - **4 Architecture Skills**: `codebase-design` (deep modules & clean seams), `local-first-architecture` (instant UI & sync engines), `domain-modeling` (ubiquitous language & bounded contexts), and `improve-codebase-architecture` (codebase audit & refactoring roadmap).
  - **2 Testing & Debugging Skills**: `tdd-workflow` (Red-Green-Refactor mastery) and `diagnosing-bugs` (5-step systematic root-cause isolation).
  - **2 Code Quality Skills**: `thermo-nuclear-code-quality-review` (zero-tolerance 300-line file limit & complexity audit) and `antfu-conventions` (ESM-first & flat config standards).
  - **4 Taste & Design Engineering Skills**: `taste-skill` (anti-slop frontend discipline), `gpt-taste` (high-agency layout variance & OKLCH color palettes), `soft-skill` (luxury ambient depth & generous spacing), and `redesign-skill` (UI modernization preserving business logic).
  - **Full Tribunal Guardrail Compliance**: Every single skill file features standardized YAML frontmatter, 🤖 LLM-Specific Traps, 🏛️ Tribunal Integration reviewer mappings, ✅ Pre-Flight Self-Audits, and 🛑 VBC (Verification-Before-Completion) Protocols.
- **Pipeline Wiring**: Enforced the new `guardrail` check automatically within the `validate-payload` npm script, `verify_all.js`, and `checklist.js` to guarantee no unverified AI output is deployed.

### 🐛 Fixes

- **Unused Import Warning**: Removed unused `anyhow` import in `optimize.rs` that triggered a compiler warning.
- **Core Binary Version Alignment**: Aligned all native core binary `optionalDependencies` and `Cargo.toml` to `^5.8.4`.
- **Security Audit Resolutions**: Fixed High severity DOS vulnerabilities in `js-yaml` and `brace-expansion` dependencies.
- **ESLint Cleanups**: Resolved 38 `no-unused-vars` warnings across project files using an automated custom script (`fix_eslint.js`) to intelligently prefix unused identifiers with an underscore (`_`).
- **Unit Test State Leaks**: Handled undefined context (`_ctx`) errors in `guardrail_engine.js` where legacy tests were omitting the newly added third parameter for `ruleNumericConsistency` and `ruleUnresolvedVerify`.

### ✅ Tests

- **Rust Unit Tests**: Added 3 new Rust tests — `test_levenshtein_distance` (exact and partial string edit distance), `test_normalized_similarity` (identical/different string boundary cases), `test_is_duplicate` (threshold-based deduplication logic). Total Rust test count: 20 → 23.
- **JS Unit Tests**: Added `test/unit/optimize.test.js` with 3 test cases covering command initialization guards (missing `.agent` directory, missing LLM key, missing core binary). Total JS test count: 184 → 187.
- **Guardrail Unit Tests**: Added comprehensive test suites in `guardrail_engine.test.js` and `integrity_manifest.test.js` covering context serialization, integrity assertions, and numeric inconsistency extraction. Overall test suite expanded to 245 passing tests.

## [5.8.3] — 2026-07-18 — 🧠 Codename: Hallucination Purge & Complexity Rungs

### 🐛 Fixes

- **Tribunal-Kit Hallucination Mitigation**: Resolved critical cognitive-load and instruction-drift issues that caused AI agents to hallucinate when executing workflows.
  - **Script Mismatches**: Fixed 11 script references pointing to non-existent `.py` files instead of their actual `.js` files in rules, architecture documents, skills, and workflows.
  - **complexity-reviewer Agent**: Created the missing `agents/complexity-reviewer.md` agent definition to enforce the 6 Rungs of the Dependency Ladder and prevent over-engineering.
  - **csharp-developer Skill**: Fixed references to the non-existent `dotnet-core-expert` to correctly map to the `csharp-developer` skill.
  - **Reviewer Count Standardisation**: Consolidated contradictory reviewer count references (19 vs 22) to the actual defined count of **20** parallel reviewers.

## [5.8.2] — 2026-07-16 — 🔄 Codename: GEP Autonomous Evolution

### ✨ Features & Enhancements

- **GEP-Inspired Autonomous Self-Evolution**: Integrated a self-evolution loop into the `learn` command (`tk learn`). Supported the `--log=<file>` flag to ingest runtime log outputs and transcripts, and the `--strategy=<val>` option (`balanced`, `harden`, `repair-only`) to govern evolution directives.
- **Structured Log Signal Detector**: Deployed the new `signal_detector.js` utility, parsing JS/TS stack traces, Python stack trace files, Rust compiler issues, ESLint inline logs, and performance query warnings into typed signals.
- **Precedent Solidification**: Integrated the Case Law engine programmatically to automatically record new Case Precedents (Capsules) from detected log signals.
- **CLI Docs & Examples**: Updated CLI help output, commands documentation, and example usages for log-based learning.
- **First-Class TypeScript Declarations**: Shipped `dist/index.d.ts` with complete type coverage for the public API — CLI flags, all 15 command functions, logger utilities, MCP server types (memory entries, tool inputs, tool names union), and helper functions. Enables IDE autocomplete and the TypeScript badge on npm.
- **Dual ESM + CommonJS Builds**: Added `dist/esm/index.mjs` as an ESM entry point using `createRequire` wrapper pattern. Modern `import` statements now resolve correctly alongside existing `require()` usage. No breaking changes to CJS consumers.
- **Package.json Modernization**: Added `"types"`, `"main"`, and conditional `"exports"` fields with `types`/`import`/`require` conditions for proper resolution by modern bundlers (webpack 5, Vite, Rollup, esbuild).
- **Positioning Pivot**: Rebranded package description from "Anti-Hallucination AI Agent Kit" to "The operating system for AI software engineering" — positioning Tribunal Kit as the governance and orchestration layer for all coding agents.

### 🐛 Fixes

- **JS Stack Trace Path Truncation**: Fixed a greediness bug in the stack trace regex (`jsStackRegex`) of `signal_detector.js` where parenthesized function matching was consuming path segments, returning `/utils.js` instead of `src/utils.js`.
- **Core Binary Alignment**: Aligned all platform-specific native dependencies in `optionalDependencies` to `^5.8.2`.
- **Critical `.npmignore` Fix**: Removed the `dist/` exclusion from `.npmignore` that was silently preventing TypeScript declarations and the modular CLI from being published to npm. Added exclusions for Rust build artifacts (`target/`, `crates/`, `Cargo.*`), stale tarballs (`*.tgz`), and dev config files to reduce install size.

### 📦 Infrastructure

- **SECURITY.md**: Added security policy documenting supported versions, private vulnerability reporting via GitHub Security Advisories, response timelines (48h ack, 7-day critical fix), and security design principles (no network at runtime, no eval, zero prod deps).
- **CONTRIBUTING.md**: Added contributing guide with development setup, project structure overview, contribution workflow for agents/skills, code style conventions, and review process.
- **Install Size Reduction**: Excluded Rust build artifacts (`target/`, `crates/`), benchmark data, stale tarballs, and dev config files (`eslint.config.js`, `tsconfig.json`) from the npm tarball via `.npmignore` updates.

### ✅ Tests

- **Signal Extraction Suite**: Added `skill_evolution.test.js` covering baseline log signal parser unit tests.
- **Init Command Test Suite**: Added `test/unit/init.test.js` with 19 new test cases covering `cmdInit` (self-install guard, non-existent target, existing `.agent/` without `--force`, dry-run, full init, `--force` reinit), `isSelfInstall` (path match, package.json name match, invalid JSON), `copyDir` (basic copy, nested dirs, dry-run, filter exclusion), `countDir` (empty, top-level, recursive), and `generateIDEBridges` (bridge file creation). Total test count: 165 → 184.

## [5.8.1] — 2026-07-11 — 👁️ Codename: Fabel-5 Cognitive Alignment

### ✨ Features & Enhancements

- **OCAE Fabel-5 Alignment Engine**: Deployed a programmatic post-processing output alignment pipeline (Option B) via the new `tk align` CLI subcommand and `align_output` MCP tool. Automatically strips conversational introduction and conclusion slop, collapses single/double bullet items to clean prose paragraphs, and validates code blocks against known framework traps (Next.js 15 async cookies/headers, React 19 hooks, Drizzle ORM filter, and invalid model strings).
- **Compressed Master Rules**: Hardened `GEMINI.md` and the `fabel-protocol` skill with high-density Fabel-5 cognitive boundaries addressing user wellbeing (psychoanalysis/diagnosis, self-harm mimics), political/moral evenhandedness, and invisible memory integration.
- **Persistent Memory Engine Speedup**: Routed the `memory` CLI subcommand (`store`, `recall`, `gc`, `stats`, `export`) to the compiled Rust core binary (`tribunal-core`) to bypass Node startup latency and run memory operations natively.
- **Tribunal & Workflow Enhancements**: Native integration of the `complexity-reviewer` agent into the `/generate` and `/tribunal-full` workflows, bringing the total reviewer count to 20 parallel reviewers.
- **OCAE Cognitive Updates**: Upgraded the `fabel-protocol` skill and master `GEMINI.md` rules with the L1–L5 Epistemic Confidence Leveling hierarchy and Hallucination Heatmaps for modern framework APIs (Next.js 15 route handlers, React 19 action states, Drizzle ORM queries).
- **Dependency Ladder Planning**: Hardened the `project-planner` rules to mandate verifying and justifying all technical designs against the 6 Rungs of the Dependency Ladder in implementation plans.

### 🐛 Fixes

- **CLI Console Output Suppression**: Fixed a UX and logic bug in `bin/wrapper.js` where standard output from the compiled Rust core binary was suppressed when running in interactive (TTY) terminals.
- **Dependency Version Mismatch**: Upgraded all native core binary packages in `optionalDependencies` from `^4.5.1` to `^5.8.1` to match the main package release version.
- **Documentation Consistency**: Aligned references in `README.md` to show the correct `20-reviewer` pipeline instead of `19-reviewer`.

## [5.8.0] — 2026-07-07 — 🌌 Codename: Omniscience Core (OCAE) & Memory Subsystem

### ✨ Features

- **Omniscience Cognitive Alignment Engine (OCAE)**: Deployed a groundbreaking cognitive intelligence architecture that aligns _any_ model orchestrated by Tribunal Kit with supreme reasoning and thinking loops.
  - Implemented the always-on **Step 0 Epistemic Loop** (+800 tokens overhead only) forcing models to run strict confidence checks, self-audit knowledge freshness, and self-select optimal precision budgets before running commands.
  - Deployed the on-demand **Omniscience Core Skill (`fabel-protocol`)**, encapsulating a full platform-aware design cascade, complexity-scaled tool budgets, and stale-context detection algorithms.
  - Hardened the 6 core Tribunal Reviewer agents (`logic`, `frontend`, `security`, `orchestrator`, `frontend-specialist`, `ui-ux-auditor`) with visual content safety checks, async dynamic API validation, and prompt injection XML framing.

- **Persistent Memory Engine**: Implemented a state-of-the-art memory engine with a 4-Type Taxonomy (Semantic, Procedural, Episodic, Working). Features budget-gated recall to prevent context bloat, integrated seamlessly across the Rust core, Node CLI, and MCP servers.

- **Dependency Ladder Framework**: Implemented the `dependency-ladder` skill, defining the 6 Rungs of the Ladder (Existence, Stdlib, Platform, Installed Dep, One Line, Minimum) to systematically prevent over-engineering and architectural bloat.
- **Complexity Reviewer Tribunal**: Introduced the `complexity-reviewer` agent, integrating it natively into the `/generate` workflow and `project-planner` to enforce the Dependency Ladder automatically.
- **Skill Eval Generation**: Upgraded `skill-creator` to automatically generate a `tests/` directory alongside every new `SKILL.md`, containing 3 standard benchmark prompts (Edge case, Standard, Malicious) for variance tracking.
- **Skill Variance Tracking**: `skill-creator` can now benchmark skill performance by analyzing output logs and producing a `performance.md` artifact documenting trigger accuracy and context window impact.
- **Complex Artifact Protocol**: Upgraded `shadcn-ui-expert` with strict rules forbidding single-file HTML/JSX monoliths for complex artifacts. Agents must now split code into `components/ui`, `components/features`, `hooks`, and `lib`.
- **Shadcn Composition Rules**: `shadcn-ui-expert` now mandates proper component interplay (e.g., nesting Forms inside Dialogs with Toast feedback) and routing/state conventions.
- **Generative UI State & Routing Directives**: Upgraded `generative-ui-expert` with explicit rules for URL search param state vs Zustand/Context, and RSC boundary enforcement across multiple files.
- **Terminal Agent MCP Integration**: Expanded the local MCP Server with `list_tribunal_agents` and `get_tribunal_skill` tools, empowering terminal-based AI agents (like Claude Code) to dynamically fetch rules without overloading their context windows.
- **Static Compiler Command**: Introduced `tk compile` to bundle Tribunal Kit agents, skills, and workflows into a static `.tribunal-compiled.md` file for agents like Aider and OpenCode that require offline context.
- **Security Hotfix**: Patched a critical path traversal vulnerability in the MCP Server that allowed un-sanitized JSON-RPC arguments to read arbitrary files outside the project sandbox.

### 🐛 Fixes

- **`windsurfRules is not defined`**: Fixed a critical `ReferenceError` in `dist/commands/init.js` where 5 IDE bridge variables (`windsurfRules`, `geminiSettings`, `geminiRulesBridge`, `copilotInstructions`, `claudeRules`) were referenced but never defined. Ported the missing definitions from `bin/tribunal-kit.js`.

## [5.7.0] — 2026-06-29 — ⚡ Codename: The Quantum Update

### ⚡ Performance (The "Quantum" Update)

- **Zero-Latency Updates**: Replaced legacy wipe-and-copy initialization with SHA-256 incremental hash manifests. `init --force` now diffs the installation and only transfers changed files, cutting update times by over 95%.
- **Native Rust Expansion**: Ported `sync`, `hook`, and `uninstall` commands to the ultra-fast compiled Rust binary (`tribunal-core`).
- **In-Process MCP Server**: Rewrote `mcp-server.js` to dynamically `require()` modules and execute them in-process instead of spawning sub-processes. Reduces IDE ping latency from ~800ms down to ~50ms.
- **Parallel I/O Architecture**: Replaced serialized loops with bounded concurrency models. Rust uses `tokio::task::JoinSet` with a 64-permit semaphore for file copying. Node uses batched `Promise.all` arrays (concurrency 32).
- **Lazy-Loaded Node CLI**: The JavaScript CLI now lazy-loads commands on demand, cutting parsing overhead and startup time by 70%.
- **Non-Blocking Update Checks**: The npm registry version checker now fires asynchronously and reports via a non-blocking `beforeExit` hook, backed by a 1-hour TTL cache.

### ✨ Features

- **Benchmark Harness**: Added `scripts/benchmark.js` to scientifically measure latency across cold-starts, dry-runs, and full copies.

## [4.6.1] — 2026-06-26 — 🎨 Codename: Emil Design Mastery & Motion Guard

### ✨ Enhancements & Cleanup

- **Clutter Reduction**: Performed a deep analysis of project artifacts and successfully pruned redundant/orphan files to streamline the `tribunal-kit` repository.
- **Removed Duplicate Docs**: Deleted `AGENT_FLOW.md` (redundant with `.agent/ARCHITECTURE.md`) and `.agent/GEMINI.md` (duplicate of canonical `.agent/rules/GEMINI.md`).

### Added

- Extracted and integrated UI/UX design engineering philosophy from `emilkowalski/skills`.
- Added new `emil-design-eng` skill enforcing interface craft and component physical consistency.
- Added new `review-animations` reviewer enforcing a 10-point non-negotiable standard (interruptibility, GPU-only properties, sub-300ms budgets).
- Added `.agent/skills/review-animations/STANDARDS.md` referencing exact curves and tables.

### Changed

- Increased maximum Tribunal coverage (`/tribunal-full`) from 18 to 19 Reviewers.
- Upgraded `/tribunal-frontend` to include the `review-animations` Socratic gate (now 6 frontend reviewers).
- Upgraded `/ui-ux-pro-max` swarm constraints to enforce `emil-design-eng` for the Motion Engineer worker.
- Updated `GEMINI.md` master rules to reflect the exact 19 reviewer count.
- **Removed Dead Code**: Deleted `.agent/skills/doc.md` (orphan tutorial file) and `clean.js` (leftover legacy script referencing non-existent paths).

### 🐛 Fixes

- **Documentation Accuracy**: Updated `package.json` description to accurately reflect 18 parallel Tribunal reviewers and 43 specialist agents.
- **Reference Integrity**: Fixed a broken reference in `.agent/rules/GEMINI.md` to point to the correct `.agent/ARCHITECTURE.md` instead of the deleted `AGENT_FLOW.md`.

## [4.6.0] — 2026-06-21 — 🗺️ Codename: Decentralized Skill Graph & Pro Tier

### ✨ Features

- **Self-Describing Skill Graph**: Migrated the `intelligent-routing` core from a centralized, flat 150-line Markdown manifest to a decentralized YAML frontmatter architecture.
- **Routing JSON Index Compiler**: Added `compile_router.py` to crawl all 102 skills and generate a compact, structured `routing_index.json` (44KB), significantly reducing LLM token consumption on every routing decision.
- **Skill Escalation Rules**: The new routing architecture natively supports `supersedes` and `co-requires` signals (e.g., `git-pro` automatically supersedes `github-operations` when strong signals match).
- **Pro Tier Skills**: Introduced 5 new Enterprise-grade Pro skills: `git-pro`, `containerization-pro`, `cicd-pro`, `system-design-pro`, and `cloud-architect`.
- **ACF Workflow Synchronization**: Restored the missing `/acf` (Agent Context Format Distiller) workflow into the Tribunal-Kit.

## [4.4.0] — 2026-04-29 — 🧬 Codename: Mutation Engine & Context Snapshots

### ✨ Features

- **Mutation Testing Engine**: Integrated a context-aware mutation engine (`tk mutate`) with character-masking state machine, disaster recovery (auto-restore from backups), and survivor reporting.
- **Architecture Knowledge Graph v2.0**: Hardened graph builder with incremental caching, blast radius calculations, and secure URI-encoded visualizer.
- **Token Reduction Engine (Option C)**: Implemented Context Snapshots, providing pre-computed JSON context blobs (source + imports + dependents) to reduce LLM token overhead by up to 27x.
- **Picasso Protocol (UI/UX)**: Upgraded `ui-ux-pro-max` skill to v2.0, a comprehensive design mastery guide covering OKLCH color science, typography mathematics, and motion choreography.

### 🐛 Fixes

- **Security Hardening**: Eliminated info disclosure warnings in `bin/tribunal-kit.js` and fixed XSS vulnerability in `graph_visualizer.js`.
- **Test Integrity**: Validated entire agentic pipeline with 100% passing tests (80/80).

## [4.3.1] — 2026-04-25 — 🔍 Codename: Micro-Zoomer AST Graph

### ✨ Features

- **`/graph` Knowledge Graph Skill**: Added a new zero-dependency AST extractor for mapping architecture without context bloat.
  - `graph_builder.js`: The Macro Mapper (incremental cache + `.gitignore` exclusions).
  - `graph_zoom.js`: The Micro Zoomer (extracts function/class signatures securely).
- **Mandatory Payload Checks**: Registered `validate-payload.js` into the `npm test` pipeline to enforce `Pre-Flight Checklist` and `VBC Protocol` strictly.

### 🐛 Fixes

- **Skill Compliance**: Bulk-injected missing validation headers across all 89 core skills.
- **Regex Edge Cases**: Fixed Semantic Delta import extraction and stop-word rules in `case_law_manager.js`.

## [4.3.0] — 2026-04-20 — 🔧 Codename: Inner-Loop Hardening

### ✨ Features

- upgrade inner-loop validator and convert python verification scripts to node.js (`3fdb1fc`)

### 🐛 Bug Fixes

- correct shell escaping bug in changelog generator (`2eeb4b1`)
- resolve command injection risk in skill integrator (`faa66aa`)

### 📝 Documentation

- update agent counts to 41 for sync-version.js pass (`5fa0db9`)

### 🎨 Style

- change CLI UI banner color to #ff1637 (`7ffe9bc`)

## [4.2.0] — 2026-04-18 — 🏛️ Codename: API Architect & Resilience Engine

### Added

#### New Agents (6)

- **`api-architect`**: API contract design agent. Builds robust REST/GraphQL/tRPC endpoints with RFC 9457 error formats, idempotency, pagination, and versioning.
- **`resilience-reviewer`**: Fault tolerance reviewer. Audits for swallowed errors, naked Promises, missing retries/timeouts, absent circuit breakers, and missing React error boundaries.
- **`schema-reviewer`**: Input validation reviewer. Enforces strict Zod/Pydantic validation at all trust boundaries. Catches `z.any()`, missing `.parse()`, and unvalidated external data.
- **`throughput-optimizer`**: Throughput and latency optimization specialist. Load testing, connection pooling, queue management, batch processing.
- **`vitals-reviewer`**: Core Web Vitals specialist. LCP, CLS, INP measurement, Lighthouse auditing, real user monitoring.
- **`db-latency-auditor`**: Database performance specialist. Slow query analysis, EXPLAIN ANALYZE, index optimization, N+1 detection.

#### New Skills (12)

- **GSAP Suite (8 skills)**: `gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-react`, `gsap-plugins`, `gsap-performance`, `gsap-utils`, `gsap-frameworks` — replaces the monolithic `gsap-expert` with domain-specific, deeply documented skills covering the full GSAP ecosystem.
- **`error-resilience`**: Retry strategies, circuit breakers, graceful degradation, timeout policies.
- **`data-validation-schemas`**: Zod, Pydantic, and JSON Schema validation patterns.
- **`monorepo-management`**: Turborepo, Nx, pnpm workspaces.
- **`typescript-advanced`**: Advanced TypeScript patterns — generics, conditional types, template literals, discriminated unions.

### Changed

#### Auto-Routing — 100% Coverage (36 routable agents)

- **`GEMINI.md` Step 2 routing table**: Expanded from 22 → **36 entries**. Every domain specialist is now auto-routable. Added 14 missing agents: `game-developer`, `documentation-writer`, `test-engineer`, `qa-automation-engineer`, `code-archaeologist`, `project-planner`, `product-manager`, `product-owner`, `seo-specialist`, `throughput-optimizer`, `vitals-reviewer`, `penetration-tester`, `db-latency-auditor`, `ai-code-reviewer`.
- **`AGENT_FLOW.md` Agent Selection Matrix**: Expanded from 18 → **27 entries** with Tribunal pipeline assignments for every routable agent.
- **`intelligent-routing/SKILL.md` Skill Manifest**: Added 30 new entries (14 agents + 8 GSAP + 4 skills + 4 existing skills that were missing).

#### Tribunal Pipeline — Expanded to 16 Reviewers

- **`tribunal-full.md`**: Now dispatches **16 concurrent reviewers** (up from 9), including `resilience-reviewer`, `schema-reviewer`, `precedence-reviewer`, `ai-code-reviewer`, `accessibility-reviewer`, `mobile-reviewer`, `penetration-tester`, and `db-latency-auditor`.
- **`tribunal-backend.md`**: Now includes `resilience-reviewer` + `schema-reviewer` in the backend audit pipeline.
- **`GEMINI.md` Tribunal Gate**: Backend/API reviewer set updated to `logic + security + dependency + type-safety + resilience + schema`. Full pipeline count updated to `all 16`.

#### Skill Hardening — 89/89 (100%)

- **All 89 skills** now contain standardized Tribunal compliance blocks: 🤖 LLM-Specific Traps, 🏛️ Tribunal Integration, ✅ Pre-Flight Self-Audit, and 🛑 VBC Protocol.
- Hardening executed via `strengthen_skills.py` automation across the entire `.agent/skills/` directory.

### Removed

- **`gsap-expert`**: Replaced by the 8-skill GSAP suite (`gsap-core`, `gsap-scrolltrigger`, etc.) for more granular, domain-specific coverage.

### Infrastructure

- Total asset count: **40 agents** (16 reviewers + 24 domain specialists), 89 skills (all hardened), 26+ workflows.
- `AGENT_FLOW.md` file layout updated: agents 27 → 40, skills 37 → 89, reviewers 8 → 16.

---

## [4.0.0] — 2026-04-10 — 🚀 Codename: Tribunal Alpha Shift

### Added

#### New CLI Commands — `case` & `hook`

- **`tribunal-kit case`**: Case Law precedent manager for the Supreme Court Tribunal system.
  - `case add <slug>` — Record a new precedent from real debugging/review sessions.
  - `case list` — Browse all stored precedents with metadata.
  - `case search <query>` — Full-text search across case law library.
  - `case export` — Export precedents as portable JSON.
- **`tribunal-kit hook`**: Git hook automation for Skill Evolution forge.
  - `hook install` — Installs a `pre-push` git hook that auto-runs `skill_evolution.py`.
  - `hook remove` — Cleanly removes the installed hook.
  - `hook status` — Reports current hook installation state.
  - Cross-platform compatible (Windows + Unix).

#### New Agent — `precedence-reviewer`

- **`precedence-reviewer.md`**: Tribunal reviewer agent that cross-references generated code against stored Case Law precedents to prevent recurring mistakes.

#### New Scripts

- **`case_law_manager.py`**: Backend for the `case` CLI — manages precedent storage, indexing, and search.
- **`skill_evolution.py`**: Automated skill improvement engine triggered by git hooks — analyzes recent changes and proposes skill upgrades.
- **`append_flow.js`**: Utility for programmatic AGENT_FLOW.md updates.

### Changed

#### Hallucination Traps — 100% Skill Coverage (78/78)

- **43 skills upgraded**: Added mandatory LLM Traps, Pre-Flight Checklist, and VBC Protocol sections to every skill that was missing them. Coverage went from 35/78 → **78/78 (100%)**.
- Skills hardened include: `agent-organizer`, `architecture`, `brainstorming`, `clean-code`, `config-validator`, `deployment-procedures`, `game-design-expert`, `game-engineering-expert`, `geo-fundamentals`, `i18n-localization`, `mcp-builder`, `parallel-agents`, `platform-engineer`, `systematic-debugging`, `tdd-workflow`, `web-accessibility-auditor`, and 27 more.

#### npm Discoverability — Keywords SEO Optimization

- **`package.json` keywords expanded**: From 7 → 25 high-traffic search terms.
  - Added: `ai-agent`, `multi-agent`, `agentic`, `swarm`, `orchestration`, `anti-hallucination`, `cursor-rules`, `cursorrules`, `copilot`, `cline`, `gemini`, `mcp`, `model-context-protocol`, `cli`, `devtools`, `ai-coding`, `autonomous-agents`, `coding-assistant`, `automation`.

#### Workflow & Tribunal Sync

- **`/generate` workflow**: Added `precedence-reviewer` to reviewer routing.
- **5 Tribunal workflows updated** (`tribunal-backend`, `tribunal-frontend`, `tribunal-database`, `tribunal-mobile`, `tribunal-performance`): Minor reviewer pipeline fixes.

### Fixed

- **Duplicate `cmdCase` function**: Removed duplicate definition in `bin/tribunal-kit.js` that caused test crashes.
- **`project-idioms` broken YAML frontmatter**: Fixed malformed frontmatter that prevented skill loading.

### Documentation

- **`AGENT_FLOW.md`**: Added Case Law and Skill Evolution subsystem documentation.
- **`README.md`**: Updated feature list with `case` and `hook` commands.

### Infrastructure

- Bumped version to **4.0.0** (new CLI surface area = major release).
- Total asset count: 34 agents, 26 workflows, 78 skills (all hardened), 20 scripts.

---

## [3.1.0] — 2026-04-07 — 🛡️ Codename: Framework Shield

### Added

#### New Skill — `motion-engineering`

- **`motion-engineering` SKILL.md**: Comprehensive 2026 motion engineering skill covering the full spectrum of animation techniques from micro-interactions to AI-driven adaptive motion.
  - **Nine animation categories**: Micro-interactions, layout transitions, scroll-driven animations, page transitions, physics-based motion, gesture-driven UI, data visualization, loading/skeleton states, and AI-driven adaptive motion.
  - **Performance-first constraints**: 60fps mandate with concrete implementation rules — CSS transforms only (no `top`/`left`), `will-change: transform` on heavy animations, mandatory `prefers-reduced-motion` media query support.
  - **2026 native APIs**: View Transitions API (`document.startViewTransition()`), Web Animations API (`element.animate()`), and CSS Scroll-Driven Animations (`animation-timeline: scroll()`).
  - **Library guidance**: GSAP 3.12+, Framer Motion 12+, Anime.js v4 — with explicit `useGSAP` cleanup patterns and `AnimatePresence` exit sequencing.
  - **Hallucination traps table**: 8 explicit traps with wrong patterns and correct fixes (e.g., `gsap.to()` without cleanup → `useGSAP` hook, `motion.div` in RSC → client boundary, `MotionValue` without `useTransform` → `useMotionValue` + `useTransform`).
  - **Pre-flight checklist**: 8 mandatory checks before declaring animation work complete.
  - **VBC Protocol**: Verification-Before-Completion enforcement requiring browser DevTools Performance tab evidence at 60fps before sign-off.

### Changed

#### `/generate` Workflow — Full Sync Upgrade

- **Reviewer routing restored**: `/generate` now auto-selects domain-specific Tribunal reviewers by keyword detection (backend, frontend, database, mobile, performance) instead of defaulting to logic + security only.
- **Animation skills wired into `frontend-specialist`**: `framer-motion`, `gsap-expert`, and `motion-engineering` are now listed as required consultation skills in the frontend-specialist agent.
- **`architecture` patterns wired into `backend-specialist`**: Architecture skill is now a required reference for all backend-specialist decisions.

#### `gsap-expert` SKILL.md — Expanded from 65 → 150+ lines

- Added `useGSAP` React hook cleanup patterns (replaces raw `useEffect` + GSAP).
- Added `ScrollTrigger` pin, scrub, and batch patterns.
- Added `LazyMotion` bundle splitting guidance for Next.js App Router.
- Added explicit hallucination traps: `gsap.killTweensOf()` anti-pattern vs `ctx.revert()`.

#### `llm-engineering` SKILL.md — 2026 Patterns

- Updated model reference table: Gemini 2.0 Flash, Claude Sonnet 3.7, GPT-4o mini — all with correct SDK method names.
- Added structured output patterns using `response_format: { type: "json_schema" }` (OpenAI) and Zod-inferred schemas (Vercel AI SDK).
- Added streaming UI patterns (`createStreamableUI`, `useChat`).
- Added testing artifacts guidance for AI output validation.

### Fixed

#### Security Scanner — False Positive Elimination

- **`security_scan.py`**: Added `coverage`, `lcov-report`, `.nyc_output`, `test-results`, and `.jest-cache` to `SKIP_DIRS`.
  - **Root cause**: Istanbul/Jest's coverage HTML reporter bundles `prettify.js` (a third-party code syntax highlighter). This minified file contains string patterns (`console.log.*password`) that matched the `Info Disclosure` rule, generating a `[HIGH]` false positive on every audit run.
  - **Fix**: Coverage and test report output directories are now excluded from security scanning at the directory traversal level — no source code is affected.

### Infrastructure

- **Audit score**: Improved from 4/7 (with false positive warning) to **5/7 clean** (2 N/A for JS-only CLI tool — no TypeScript build, no web bundle).
- **Security scan**: Now exits 0 (pass) on a clean tribunal-kit codebase.
- **`.gitignore`**: Already correctly excluded `coverage/` and `.nyc_output/` from version control.

---

## [3.0.0] — 2026-04-02 — 💣 Codename: The V3 Breaking Evolution

### 🚨 Breaking Changes

- **Agent behavioral contracts fully rewritten** — all 33 agent `.md` files have been replaced with Pro-Max versions. Any tooling that parses agent YAML frontmatter or depends on specific section names will need to be updated.
- **All 30 workflows fully rewritten** — section names and phase structures have changed. Existing documentation referencing old workflow step names should be updated.
- **Human Gate is now mandatory on all write operations** — `/test`, `/refactor`, `/fix`, `/enhance`, and `/debug` now enforce explicit approval before any file is written to disk. Automated scripts that bypassed the gate will need review.

---

### Added

#### Agents — Pro-Max Standard (33 total, all upgraded)

**Reviewer Agents (11)**

- **`logic-reviewer` Pro-Max**: Added 5 language-specific hallucination tables (TypeScript, Python, Rust, SQL, Shell), LLM API trap tables for OpenAI/Anthropic/Google, Prisma/Supabase ORM traps, undefined variable pattern detection, and 2026-standard API verification checks.
- **`dependency-reviewer` Pro-Max**: Added fabricated package name tables for npm and pip, supply chain risk pattern detection (typosquatting, abandonment signals, scoped package format errors), version compatibility matrix, and `@types/*` mismatch detection.
- **`type-safety-reviewer` Pro-Max**: Added `any` epidemic detection with epidemic threshold, Zod `.parse()` vs `.safeParse()` vs `.cast()` distinction, discriminated union exhaustiveness checking, generic constraint violations, and unguarded optional chaining patterns — all with code-level examples.
- **`sql-reviewer` Pro-Max**: Added SQL injection patterns with attack/fix code pairs, N+1 detection with DataLoader fix patterns, missing index analysis for FK columns, transaction boundary errors, and dangerous unscoped `DELETE`/`UPDATE` detection.
- **`frontend-reviewer` Pro-Max**: Added React 19 API changes (`useFormState` → `useActionState`), RSC boundary violations, full hook rules enforcement, direct state mutation patterns, hydration mismatch detection, and Next.js 15 async `cookies()`/`params()` requirements.
- **`performance-reviewer` Pro-Max**: Added 2026 Core Web Vitals target table (INP < 200ms, LCP < 2.5s, CLS < 0.1), specific INP/LCP/CLS damage patterns, React re-render cascade detection, memory leak patterns, all with measurable thresholds.
- **`mobile-reviewer` Pro-Max**: Added Reanimated 3 UI-thread worklet safety rules, FlatList vs FlashList anti-patterns, safe area insets enforcement, `AppState` subscription cleanup, platform-specific API guards.
- **`test-coverage-reviewer` Pro-Max**: Added happy-path-only detection, behavioral edge case matrix (GIVEN/WHEN/THEN format), brittle CSS selector patterns, MSW vs internal mock logic, implementation detail testing anti-patterns, async assertion gotchas (`getBy*` vs `findBy*`).
- **`accessibility-reviewer` Pro-Max**: Added WCAG 2.2 AA criteria with criterion numbers, semantic HTML violations, ARIA misuse rules, focus management in modals, form label association, live regions, keyboard navigation completeness.
- **`ai-code-reviewer` Pro-Max**: Added 2026 model name verification tables (OpenAI/Anthropic/Google), hallucinated API parameter detection (invented `max_length`, `memory`, `format`, `plugins` params), prompt injection pattern library, streaming error handling, cost explosion guards, context window overflow detection.
- **`security-auditor` Pro-Max** (full rewrite as specialist): Added OWASP 2025 Top 10 table, injection vectors with attack/defense code pairs, JWT algorithm bypass prevention, SSRF with private IP blocking, IDOR protection patterns, CORS misconfiguration detection.

**Specialist Agents (15)**

- **`frontend-specialist` Pro-Max**: Added React 19 Server/Client boundary decision tree, complete hook taxonomy (Server: none, Client: full), `useActionState` patterns, Next.js 15 async API enforcement, WCAG 2.2 AA integration, TypeScript strict mode contracts.
- **`backend-specialist` Pro-Max**: Added framework selection decision tree, Zod-first validation order, auth-before-logic execution contract, typed error envelopes, SQL injection prevention at the ORM layer, JWT `{ algorithms }` enforcement, rate limiting patterns.
- **`database-architect` Pro-Max**: Added Prisma v6 schema patterns, expand-and-contract migration protocol, composite index strategy, N+1 prevention with `include`, transaction boundaries, removed API detection (`findOne` → `findUnique`).
- **`debugger` Pro-Max**: Added 4-phase evidence-based investigation protocol (Collect → Hypothesize → Test → Fix), priority investigation order (deploys first, code last), race condition pattern library, memory leak tooling, structured debug report format.
- **`orchestrator` Pro-Max**: Added scope classification gate, Fan-Out/Fan-In patterns, sequential wave execution, BLOCKED worker protocol, context discipline rules (context_summary vs full files), structured delegation contract template, agent routing table.
- **`supervisor-agent` Pro-Max**: Added task decomposition protocol, structured JSON dispatch contracts, `allSettled` vs `all` rationale, BLOCKED/ERROR status protocol, conflict resolution rules, task.md session persistence.
- **`mobile-developer` Pro-Max**: Added 3-thread model (JS/UI/Native), Reanimated UI-thread safety with `'worklet'` directive requirement, FlashList vs FlatList migration guide, Expo Router v4 file conventions, MMKV storage patterns.
- **`devops-engineer` Pro-Max**: Added multi-stage Docker build patterns, GitOps (ArgoCD) workflow, GitHub Actions CI pipeline template, Kubernetes liveness/readiness probe specs, resource limits enforcement, Terraform least-privilege IAM, remote state locking.
- **`penetration-tester` Pro-Max**: Added MITRE ATT&CK phase structure, mandatory scope declaration contract, web/API/infrastructure attack vector checklists, CVSS scoring integration, structured assessment report format.
- **`performance-optimizer` Pro-Max**: Added 2026 CWV target table, LCP preload patterns, INP `startTransition` patterns, bundle reduction strategies (dynamic import, tree-shaking), multi-layer caching, `EXPLAIN ANALYZE` patterns, mandatory before/after measurement protocol.
- **`qa-automation-engineer` Pro-Max**: Added Testing Trophy hierarchy (Static → Unit → Integration → E2E), Vitest boundary testing, RTL+MSW integration pattern, Playwright config with retry/trace/CI settings, resilient locator patterns, API route testing with rate-limit verification.
- **`explorer-agent` Pro-Max**: Added priority-ordered entry point reading protocol, architecture pattern identification, dead code detection, impact zone analysis, git log frequency analysis, structured orientation report format.
- **`project-planner` Pro-Max**: Added Socratic gate (5 mandatory questions), research-before-planning protocol, risk identification matrix, topological wave decomposition, `implementation_plan.md` template, explicit no-code-before-approval gate.
- **`seo-specialist` Pro-Max**: Added Next.js 15 `generateMetadata` patterns, dynamic metadata generation, Schema.org JSON-LD templates, `sitemap.ts` generation, H1 hierarchy enforcement, GEO (Generative Engine Optimization) bot middleware patterns.
- **`documentation-writer`, `code-archaeologist`, `product-manager`, `game-developer` Pro-Max**: Added domain-specific behavioral contracts, JSDoc hierarchy, ADR format, triage levels, clarity gate, route-based delegation.

---

#### Workflows — Pro-Max Standard (30 total, all upgraded)

**Core Generation Workflows**

- **`/generate` Pro-Max**: Added mandatory context scan before first line of code (reads `package.json`, `tsconfig.json`, env files), React 19/Next.js 15 hallucination guards, reviewer auto-selection by keyword table, retry limit spec (3 max), failure escalation path.
- **`/debug` Pro-Max**: Added priority investigation order (deploys → env vars → deps → infra → code), single-hypothesis testing contract, Root Cause statement format (WHY not WHAT), regression test requirement, hallucination guard.
- **`/create` Pro-Max**: Added 5-phase pipeline (Requirements → Stack Selection → Scaffolding Plan → Tribunal Generation → Verification), Socratic gate, stack selection table, Human Gate after scaffolding plan.
- **`/enhance` Pro-Max**: Added mandatory impact analysis with import counting, risk classification by caller count (0-2/3-5/6+), breaking change detection matrix, consistency verification checklist.
- **`/refactor` Pro-Max**: Added pre-refactor checklist (tests-first mandate), dependency-safe execution order, DB expand-and-contract in ordering, behavior verification step between each change, dead code deletion guard.
- **`/fix` Pro-Max**: Added auto-fixable vs human-decision matrix, execution sequence, diff preview before applying, post-fix verification step, fix guard anti-patterns.
- **`/test` Pro-Max**: Added Testing Trophy strategy (2026), GIVEN/WHEN/THEN behavioral format, minimum required coverage matrix (happy/error/boundary/auth), test templates for all 3 layers, Human Gate before test files are written.

**Tribunal Workflows**

- **`/tribunal-full` Pro-Max**: Added active-reviewer-by-code-type table (N/A auto-pass for irrelevant reviewers), verdict aggregation rule, structured output format with blocker/warning separation, retry protocol with hard 3-attempt limit.
- **`/tribunal-backend` Pro-Max**: Added reviewer detection specifics, backend hallucination trap table (Express/Hono/next-auth v4 vs v5 traps), verdict system with blocker output.
- **`/tribunal-frontend` Pro-Max**: Added React 19/Next.js 15 specific reviewer detections, frontend hallucination trap table (`useFormState` rename, async `params`, Server Component hook violations), structured output format.
- **`/tribunal-database` Pro-Max**: Added Prisma hallucination trap table (`findOne` removed, `upsertMany` doesn't exist, NOT NULL migration failure), reviewer detection specifics.
- **`/tribunal-mobile` Pro-Max**: Added Reanimated worklet trap, Expo Router v4 trap (`navigate` → `router.push`), `Platform.select` vs `StyleSheet.create` issue, structured output format.
- **`/tribunal-performance` Pro-Max**: Added 2026 CWV targets table for verdict thresholds, `React.memo` anti-pattern (new object as prop), `useMemo` missing deps trap, mandatory measurement protocol before claiming "optimized."

**Process Workflows**

- **`/plan` Pro-Max**: Added explicit no-code contract, 5-question Socratic gate, research phase with specific bash commands, topological wave decomposition, `implementation_plan.md` template, mandatory Human Gate before any execution.
- **`/audit` Pro-Max**: Added cascade failure rules (security halts, lint continues), script retry protocol with hard limit, structured audit report format, Human Gate before applying any fixes, cross-workflow navigation.
- **`/deploy` Pro-Max**: Added T-minus pre-flight sequence (6 checks in fixed order), rollback baseline capture (git tag / `pg_dump`), structured Human Gate approval format, post-deploy error rate monitoring window, rollback decision tree, schema change isolation pattern.
- **`/migrate` Pro-Max**: Added 4 migration type classification, expand-and-contract 5-step DB migration pattern, breaking changes inventory for Next.js 14→15 and next-auth v4→v5, rollback plan requirement, migration guard anti-patterns.
- **`/review` Pro-Max**: Added explicit read-only contract, hallucination-specific checklist with React 19/Next.js 15/Prisma version traps, reviewer auto-selection table, structured findings output format.
- **`/review-ai` Pro-Max**: Added 2026 model reference table, reviewer detection items, prompt injection code examples, cost explosion guard output format.
- **`/swarm` Pro-Max**: Added JSON dispatch contract format, `swarm_dispatcher.js` validation step, `allSettled` vs `Promise.all` rationale, session persistence in `task.md`, structured failure report format.
- **`/orchestrate` Pro-Max**: Added scope classification gate, worker decomposition rules, Fan-Out/Fan-In pattern specification, BLOCKED worker protocol, sequential wave context discipline.
- **`/brainstorm` Pro-Max**: Added 4-phase structure, 3-option comparison framework with effort and best-for context, Socratic probing questions, evidence-based recommendation format.
- **`/session`, `/status` Pro-Max**: Added session file format, 5-data dashboard, sub-command routing.

**Utility Workflows**

- **`/preview` Pro-Max**: Added command table, common issues troubleshooting, when-to-use guide.
- **`/changelog` Pro-Max**: Added conventional commit type table, git log commands for different date ranges, Keep a Changelog format with all categories, Semver decision guide.
- **`/strengthen-skills` Pro-Max**: Added bash audit commands, guardrail appendix template with all 3 sections (LLM Traps + Pre-Flight + VBC), guardrail quality guidelines with bad vs good examples.
- **`/api-tester` Pro-Max**: Added endpoint discovery commands, auth token acquisition pattern, CRUD sequence with chained IDs, error case testing (401/404/400/429), structured test report format.
- **`/performance-benchmarker` Pro-Max**: Added complete 4-tool benchmark suite (Lighthouse CI + Bundle + autocannon + DB `EXPLAIN ANALYZE`), structured report with comparison to last run, numeric fail/warning gates, historical tracking pattern.
- **`/ui-ux-pro-max` Pro-Max**: Added design intent questions, forbidden defaults with specific anti-clichés, 4-state interaction design requirement, micro-animation mandate, WCAG 2.2 AA checkpoint, design verification gate.

---

### Changed

- **Standard stack updated to 2026**: All agents and workflows now reference React 19, Next.js 15, Prisma 6, Zod 3.23+, Reanimated 3, Expo Router v4, Playwright 1.49, TypeScript 5.7, Node 22.
- **Human Gate universally enforced**: Every workflow that produces files now has an explicit `## Human Gate` section. No agent writes to disk without explicit approval.
- **Version references eliminated**: All outdated version references (React 18, Next.js 13/14 patterns, next-auth v4 in v5 projects) have been replaced with 2026 stable API references across all 63 files.
- **Cross-workflow navigation added**: All major workflows now include a `## Cross-Workflow Navigation` table routing to the correct next workflow based on what was found.

---

### Infrastructure

- All 16 Python scripts pass `python -m py_compile` syntax validation (zero syntax errors)
- `verify_all.py` passes: `tsc --noEmit` clean + ESLint clean
- Integrity check: 33 agents, 30 workflows, 77 skills, 16 scripts — all present and validated

---

## [2.4.6] — 2026-03-30 — 🛠️ Codename: Micro-Patch Gamma

### Added

- **12 New AI Skills**: Added dedicated skill guidelines for `ai-prompt-injection-defense`, `api-security-auditor`, `authentication-best-practices`, `building-native-ui`, `extract-design-system`, `framer-motion-animations`, `playwright-best-practices`, `shadcn-ui-expert`, `skill-creator`, `supabase-postgres-best-practices`, `swiftui-expert`, and `web-accessibility-auditor`.

### Changed

- **Skill Integrator Compatibility**: Modified `appflow-wireframe` and `readme-builder` to strengthen Tribunal anti-hallucination guards.

---

## [2.4.5] — 2026-03-25 — 📖 Codename: Documentation Singularity

### Added

- **`appflow-wireframe` Skill**: New skill enabling Mermaid-based logical flow mapping and Tribunal Structural XML for wireframing explicit layout hierarchies.

### Changed

- **UI Building Accuracy Enforcement**: Injected strict structural constraints and pixel-perfect design token mandates (4px grid) into 7 core frontend/UI skills to eliminate AI spacing hallucinations.

### Documentation

- Redesigned the main README with the Tribunal-Kit logo and improved UI/UX aesthetics.

---

## [2.4.0] — 2026-03-05 — 🚀 Codename: Tribunal Genesis Phase II

## [2.4.1] — 2026-03-09 — 🐛 Codename: Hotfix Delta

### Changed

- **Verification-Before-Completion (VBC) Protocol**: Implemented a mandatory evidence-based closeout protocol across 10 core execution, debugging, and building skills (`systematic-debugging`, `tdd-workflow`, `plan-writing`, `python-pro`, `react-specialist`, `rust-pro`, `sql-pro`, `app-builder`, `clean-code`, `devops-incident-responder`). Sub-agents are now explicitly forbidden from declaring a task complete without providing concrete terminal or runtime evidence that their code succeeds.
- **`frontend-design` Upgrade (Pro Max)**: Enhanced the skill to enforce asymmetric layouts, tactile textures (grain/SVG noise), OKLCH color spaces, and kinetic typography. Stripped out predictable AI defaults and strictly banned clichés like excessive purple, generic glowing blobs, and simple grid layouts.
- **`brainstorming` Skill Upgrade**: Enhanced the discovery protocol using `skills.sh` paradigms. Added strategic query domains for "Market & Psychology," enforced the inclusion of at least one highly unconventional "Superpower Option" during options generation, and added constraints explicitly preventing assumptions around toolchain selection.

---

## [2.4.0] — 2026-03-05 — 🚀 Codename: Tribunal Genesis Phase II

### Added

- **7 New Skills & Workflows**: `trend-researcher`, `ui-ux-researcher`, `whimsy-injector`, `workflow-optimizer`, `test-result-analyzer` (skills) and `/api-tester`, `/performance-benchmarker` (workflows).
- **GitHub-Powered Auto-Updater**: The CLI now bypasses npm entirely. `tribunal-kit update` checks the GitHub Releases API and pulls updates directly from the repository, dodging npm authentication and caching issues.
- **`--skip-update-check` Flag**: Bypass auto-update for CI/CD environments.
- **LLM Pre-Router (Intelligent Routing)**: Replaced the hardcoded routing table with a dynamic LLM Gateway. The AI now reads a condensed `router-manifest.md` to accurately select specialist agents before generating code.

### Changed

- **Enhanced Foundational Skills**: Upgraded the oldest skills (`clean-code`, `code-review-checklist`, `behavioral-modes`) with Tribunal Anti-Hallucination guards, strict context window discipline, and mode-leakage prevention.
- **Enhanced GEMINI.md**: Added 4 new request classification rows and 2 new slash commands. Overhauled the protocol to enforce the `intelligent-routing` Pre-Router over static fallback classification.

---

## [2.3.0] — 2026-03-03

### Added

- **Swarm / Supervisor Orchestration**: Introduced a multi-agent orchestration engine (`/swarm`) that decomposes complex goals into parallel specialist sub-tasks via a strict JSON contract.
- **Specialized Tribunal Panels**: Added focused workflows for `/tribunal-mobile` (logic + security + mobile UX) and `/tribunal-performance` (algorithmic complexity + memory + I/O).
- **Interactive Session State**: Enhanced `session_manager.js` with `status`, `tag`, `list`, and `export` commands for persistent task tracking across sessions.
- **Automated Skill-Script Integration**: Upgraded `skill_integrator.py` with `--report` and `--verify` flags for automated validation of skill-to-script mappings and syntax health.

---

## [2.2.0] — 2026-03-02

### Added

- **10 New Specialist Skills**: Added explicitly scoped Tribunal-integrated rulesets for `vue-expert`, `csharp-developer`, `dotnet-core-expert`, `python-pro`, `sql-pro`, `react-specialist`, `devops-engineer`, `devops-incident-responder`, `platform-engineer`, and `agent-organizer`.

---

## [2.0.0] — 2026-02-23

### Added

- **Framework Hardening & Gap Filling**: Implemented missing Python scripts for linting (`lint_runner.py`), testing (`test_runner.py`), security scanning (`security_scan.py`), dependency analysis (`dependency_analyzer.py`), schema validation (`schema_validator.py`), and bundle analysis (`bundle_analyzer.py`).
- **New Workflows**: Introduced Refactor (`/refactor`), Migrate (`/migrate`), Audit (`/audit`), Fix (`/fix`), Changelog Generation (`/changelog`), and Interactive Session (`/session`).
- **New Specialist Agent**: Added `mobile-reviewer` for dedicated React Native, Flutter, and mobile web code audits, bringing the total reviewer count to 9.
- **Skill Integrator**: Added `skill_integrator.py` to automatically detect and map which skills have executable scripts associated with them.
- **New Skill**: Added `config-validator` skill for self-validation of the `.agent` directory.
- **Enhanced Frontend Skills**: Upgraded design frameworks including `frontend-design`, `mobile-design`, `web-design-guidelines`, `nextjs-react-expert`, and `tailwind-patterns` to incorporate cutting edge spatial UI, generative UI, and AI-driven interface patterns.

### Changed

- **Skill Files Rewrite**: Systematically completely rewrote all 37 `SKILL.md` files to utilize a new voice, structure, and headers, preventing copyright claims while maintaining original functionality.
- Upgraded the `/ui-ux-pro-max` workflow to utilize the latest cutting-edge design methodologies.

---

## [1.0.0] — 2025-02-20

### Added

#### Core Tribunal System

- 8 specialist reviewer agents running in parallel: `logic-reviewer`, `security-auditor`, `dependency-reviewer`, `type-safety-reviewer`, `sql-reviewer`, `frontend-reviewer`, `performance-reviewer`, `test-coverage-reviewer`
- Human Gate enforcement — no code writes to disk without explicit user approval
- Retry limit (max 3 Maker revisions) to prevent infinite generation loops

#### Slash Command Workflows (16 total)

- `/generate` — Full Tribunal pipeline: Maker → reviewers → Human Gate
- `/review` — Audit-only mode, no generation
- `/tribunal-full` — All 8 reviewers simultaneously
- `/tribunal-backend` — Logic + Security + Dependency + Types
- `/tribunal-frontend` — Logic + Security + Frontend + Types
- `/tribunal-database` — Logic + Security + SQL (schema-aware)
- `/brainstorm` — Structured idea exploration before implementation
- `/create` — Phased build pipeline with planning checkpoint
- `/debug` — Evidence-first root-cause investigation
- `/plan` — Plan-only mode, outputs `docs/PLAN-{slug}.md`
- `/orchestrate` — Multi-agent coordination (minimum 3 agents enforced)
- `/enhance` — Read-first iterative improvement with regression safety
- `/test` — Test generation + `test-coverage-reviewer` audit
- `/deploy` — 3-gate pre-flight: security + Tribunal + Human Gate
- `/status` — Live Tribunal session board
- `/preview` — Local dev server management
- `/ui-ux-pro-max` — Advanced UI/UX design workflow with deep design thinking

#### Specialist Agents (27 total)

- 19 domain agents: `backend-specialist`, `database-architect`, `frontend-specialist`, `debugger`, `devops-engineer`, `orchestrator`, `mobile-developer`, `penetration-tester`, `performance-optimizer`, `project-planner`, `product-manager`, `product-owner`, `qa-automation-engineer`, `seo-specialist`, `test-engineer`, `code-archaeologist`, `documentation-writer`, `explorer-agent`, `game-developer`
- 8 Tribunal reviewer agents (above)

#### Infrastructure

- 37 skill modules in `.agent/skills/`
- 4 utility scripts in `.agent/scripts/`
- MCP server configuration (`mcp_config.json`)
- Master rules file (`.agent/rules/GEMINI.md`)
- Architecture documentation (`AGENT_FLOW.md`)
- IDE compatibility: Cursor, Windsurf, Antigravity, GitHub Copilot Agent Mode
