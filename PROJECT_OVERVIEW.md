# Tribunal Kit: Project Overview

**Project Name:** `tribunal-kit`  
**Current Version:** `9.5.0` [VERIFIED: `package.json`, `Cargo.toml`]  
**Repository Branch / Commit:** `main` @ `68947f01db8945d82dc152918eba9d4076ec5cda` [VERIFIED: `git rev-parse HEAD`]  
**License:** MIT [VERIFIED: `LICENSE`]  
**Author:** Harmitx7 (`harmitkalal7@gmail.com`) [VERIFIED: `package.json`, `plugins/core-plugin.json`]  
**Primary Language Stack:** JavaScript / TypeScript (Node.js >=18.0.0), Rust (2021 edition), Python [VERIFIED: `package.json`, `Cargo.toml`]

---

## 1. Executive Summary & Identity

**Tribunal Kit** is an enterprise-grade, low-dependency governance layer and neurosymbolic verification envelope designed for AI coding agents. It intercepts AI hallucinations, phantom packages (ghost dependencies), architectural regressions, and security anti-patterns locally before code reaches disk or is committed to version control.

Tribunal Kit bridges across major AI developer environments—including Cursor, Claude Code, Windsurf, GitHub Copilot, Codex, Aider, Devin, Gemini CLI, and Cline—enforcing project-specific invariant rules, zero-trust static analysis, and multi-agent peer reviews.

---

## 2. Problem Statement & Core Value

### The Problem AI Agents Introduce

Modern LLM-powered software engineering agents exhibit common failure modes:

1. **Hallucinated Dependencies:** Recommending or importing non-existent npm/pip packages ("phantom packages") that can lead to dependency confusion attacks or immediate build failures.
2. **Stale / Invented APIs:** Invoking framework methods or options that do not exist or were deprecated in current versions (e.g., mixing Next.js 14 and 15 conventions, React 18 and 19 APIs).
3. **Architectural Drift:** Bypassing repository design contracts, introducing redundant utilities, breaking modular layer boundaries, or coupling domain logic directly to presentation frameworks.
4. **Context Window Exhaustion:** Saturating model context windows with verbose, raw file dumps rather than bounded, semantic representations.
5. **Silent Regression:** Generating code that passes superficial syntax checks but breaks subtle runtime invariants, error-handling contracts, or state-machine safety.

### The Solution Tribunal Kit Implements

- **Local Neurosymbolic Interception:** Rather than relying exclusively on LLM self-evaluation, Tribunal Kit executes deterministic static analysis, oxc AST parsing, path containment checks, and Serde/Zod schema validation.
- **Dual-Engine Pipeline:** Combines an ultra-fast compiled Rust core (`tribunal-core`, <10ms execution) with a flexible Node.js CLI runtime and lazy-loaded command architecture.
- **28 Partitioned Reviewers (3 Waves):** Dispatches specialized reviewer agents across three execution waves to prevent context saturation and cognitive dilution.
- **398 Modular Skills & 64 Canonical Specialists:** Provides fine-grained domain instructions and strict Verification Before Completion (VBC) protocols.
- **4-Type Taxonomy Memory Engine:** Persists architectural precedents across Semantic, Procedural, Episodic, and Working memory tiers.
- **Universal IDE & Agent Adapters:** Auto-generates and synchronizes instruction bridges for `.cursorrules`, `.windsurfrules`, `.claude/CLAUDE.md`, and `AGENTS.md`.

---

## 3. Intended Users & Personas

- **Lead Architects & Staff Engineers:** Who require deterministic enforcement of repository standards, architectural boundaries, and coding invariants across team-wide AI agent usage.
- **Security & DevSecOps Teams:** Who need supply-chain verification (SBOM, CVE, malicious package detection) and sandbox containment before AI-suggested code is merged.
- **Developers Using AI Coding Assistants:** Engineers utilizing Cursor, Claude Code, Windsurf, or Copilot who want to prevent hallucinated imports, syntax regressions, and verbose conversational slop.
- **Autonomous Multi-Agent Systems:** Long-running agentic workflows (e.g., SDD, Marathon) requiring formal state machines, idempotent retries, and tamper-evident execution checkpoints.

---

## 4. Technology Stack & Key Dependencies

| Layer                       | Technologies / Packages                                                                                                                 | Source Evidence                                                                                                     |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Node Runtime**            | Node.js `>=18.0.0` (CommonJS & ESM Dual Export)                                                                                         | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/package.json)                   |
| **Production Dependencies** | `zod` (^4.6.7), `ws` (^8.21.3)                                                                                                          | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/package.json#L171-L174)           |
| **Rust Core Workspace**     | Rust 2021, `tokio` (1.37), `oxc_parser` (0.13.1), `oxc_ast`, `clap` (4.5), `serde`, `serde_json`, `sha2`, `chrono`, `walkdir`, `ignore` | [crates/core/Cargo.toml](file:///c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/crates/core/Cargo.toml) |
| **Dev & Verification**      | Jest (30.4.2), ESLint (9.1.1), TypeScript (5.4.5), Prettier (3.2.5)                                                                     | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/package.json#L139-L144)           |
| **Optional ML / Inference** | `onnxruntime-node` (^1.22.0), `@receptron/laya` (^0.1.2)                                                                                | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/package.json#L145-L154)           |
| **Platform Binaries**       | `@tribunal-kit/core-{darwin,linux,win32}-{arm64,x64}`                                                                                   | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/package.json#L148-L153)           |

---

## 5. Architectural Boundaries & Invariants

1. **Read-Only Codebase Intelligence Invariant:** Commands under `tk understand` / `tribunal_understand` operate 100% in-memory with zero disk mutations and verified hash immutability.
2. **Filesystem Containment Invariant:** All file path resolutions are validated by `assertWithinRoot` in `src/utils/path_containment.js` and `src/security/boundary.js`, disallowing parent traversal (`..`), null bytes (`\0`), and Windows path escaping.
3. **SSRF Defense Boundary:** Web browsing and fetch utilities enforce strict destination IP filtering against RFC 1918 private ranges, AWS metadata endpoints (`169.254.169.254`), loopbacks, and Carrier Grade NAT.
4. **Secret Redaction Invariant:** High-density renderers automatically scrub 13 credential classes (AWS keys, Slack tokens, JWTs, Bearer tokens, private keys) from all logs, envelopes, and diagnostic streams.
5. **Single Runtime Dependency Principle:** The JavaScript engine deliberately limits production runtime dependencies to `zod` and `ws`, implementing internal utilities (AST helpers, graph traversal, formatters) without external package bloat.

---

## 6. Project Strengths & Verified Capabilities

- **Ultra-Fast Startup:** Native commands execute in `<10ms` via the Rust binary; JavaScript CLI commands use dynamic lazy-loading (`require()` only invoked commands), reducing startup I/O by ~70%.
- **Authoritative Test Suites:** Comprehensive verification infrastructure featuring 94 passing Rust tests (`0.26s`), 100% passing TypeScript types (`tsc --noEmit`), payload verification across 670 files, and 129 audited skill reference links.
- **Dual Interface Surface:** Full feature parity across CLI (`tribunal-kit`, `tk`), MCP server (`bin/mcp-server.js` with 34 tools), local HTTP/WS proxy (`tk-proxy`), and programmatic Node.js API (`src/cli.js`, `src/esm/index.mjs`).

---

## 7. Known Limitations

- **ESLint Warnings:** `eslint .` reports 0 errors but 519 unused-variable warnings primarily in test suites and legacy script bindings.
- **Optional Native Binary Requirement:** If precompiled native platform binaries (`@tribunal-kit/core-*`) are not installed and local Rust toolchain is absent, the system falls back to Node.js implementations, which have higher initialization latency.
- **System-1 ONNX Models:** Advanced local inference models (`onnxruntime-node`) are optional dependencies; if absent, System-1 falls back to deterministic rule engines.

---

## 8. Current Development State

- **Current Release:** Version `9.5.0` released on 2026-11-21.
- **Recent Milestones:** Completed Phases 1–12 of Canonical Activity Intelligence, Phases 12–20 of Autonomous Codebase Intelligence, Domain E (Agent Runtime Reliability & Recovery), and Domain F (UI Engineering & Design Intelligence).
- **Workspace State:** Git tree clean on branch `main` synchronized with `origin/main`.
