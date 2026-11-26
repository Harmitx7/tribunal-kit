# AI_CONTEXT.md — Master Technical Context Dossier

> **CRITICAL DIRECTIVE FOR AI CODING AGENTS & LLMs:**  
> Read this document **first** before making any technical assertions, modifying source code, or executing multi-agent workflows in this repository. This document is the verified ground truth of the system architecture, component relationships, canonical source files, and engineering invariants.

---

## 1. What This Project Actually Is

**Tribunal Kit** (`tribunal-kit`, version `9.5.0`) is the **operating system and governance layer for AI software engineering**.

It was built because autonomous and semi-autonomous AI coding agents (such as Claude Code, Cursor, Windsurf, Copilot, Devin, and Aider) suffer from structural blind spots:

1. They hallucinate packages that do not exist on npm/PyPI.
2. They invent non-existent method signatures or use deprecated conventions.
3. They violate project-specific architectural trust boundaries and introduce drift.
4. They saturate prompt contexts with raw code dumps instead of token-bounded semantic graphs.
5. They report successful execution without running authoritative tests.

Tribunal Kit acts as a **local, deterministic firewall** between the AI model and the developer's filesystem.

---

## 2. Canonical Sources of Truth

When verifying any claim or inspecting repository state, always inspect these canonical files first:

| Area of Concern                     | Canonical File Path                                                                                                                                   | Why It Is Authoritative                                                  |
| :---------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- |
| **Package Identity & Dependencies** | [package.json](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/package.json)                                                     | Declares version 9.5.0, single runtime dep `zod`, scripts, and binaries. |
| **Rust Native Workspace**           | [crates/core/Cargo.toml](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/crates/core/Cargo.toml)                                 | Declares native core dependencies (`oxc_parser`, `tokio`, `clap`).       |
| **CLI Dispatch Entry Point**        | [bin/wrapper.js](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/bin/wrapper.js)                                                 | Decides whether to route to native Rust core or Node.js runtime.         |
| **JavaScript Command Router**       | [src/cli.js](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/cli.js)                                                         | Defines all 37 lazy-loaded subcommands and programmatic APIs.            |
| **TypeScript Public Contract**      | [src/index.d.ts](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/index.d.ts)                                                 | Definitive interface types and exported function signatures.             |
| **MCP Server Registration**         | [bin/mcp-server.js](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/bin/mcp-server.js)                                           | Exact definitions of all 34 tools exposed via Model Context Protocol.    |
| **Master Behavioral Rules**         | [.agent/rules/GEMINI.md](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.agent/rules/GEMINI.md)                                 | Universal P0 rules, Fabel protocol, and activity format standards.       |
| **Specialist Registry**             | [.agent/config/specialist-registry.json](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.agent/config/specialist-registry.json) | Canonical inventory of 64 specialist agents and 28 reviewers.            |
| **Skill Topic Routing Map**         | [.agent/skill_topic_map.json](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.agent/skill_topic_map.json)                       | 2-tier lazy resolution mapping 398 skills to keywords.                   |
| **28-Reviewer Audit Procedure**     | [.agent/workflows/tribunal-full.md](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/.agent/workflows/tribunal-full.md)           | Partitioned 3-wave reviewer execution protocol.                          |
| **Security Containment**            | [src/security/boundary.js](file:///c:/Users/sunrise/Desktop/pfojects/cli%20project/tribunal-kit/src/security/boundary.js)                             | Filesystem containment, SSRF prevention, and secret scrubbers.           |

---

## 3. High-Level Architecture & Subsystem Map

Tribunal Kit operates on a **Dual-Engine Model**:

```
                       ┌─────────────────────────┐
                       │   CLI / MCP / Proxy     │
                       └────────────┬────────────┘
                                    │
                         [bin/wrapper.js]
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
[Engine 1: Compiled Rust Core]                    [Engine 2: Node.js Engine]
  crates/core/src/main.rs                           src/cli.js (lazy loader)
  ├── oxc_parser AST extraction                     ├── 37 commands (src/commands/)
  ├── 4-Type Taxonomy memory                        ├── Canonical Activity (src/activity/)
  ├── DAG parallel scheduler                        ├── Codebase Intel (understand.js)
  └── Path traversal security                       ├── Runtime Reliability (FSM & Quorum)
                                                    ├── UI Design Intelligence (Loop)
                                                    └── Supply Chain (SBOM & CVEs)
```

### Core Subsystems and Locations:

1. **`src/activity/` — Canonical Activity & Telemetry:** Event-driven telemetry, secret redaction (13 credential types), cycle-safe WeakMap cloning, and multi-environment renderers (Markdown, Terminal, PlainText, Structured JSON).
2. **`src/commands/understand.js` / `.agent/scripts/codebase_intelligence.js` — Codebase Intelligence:** Read-only architectural reconnaissance, feature flow tracing, dependency fan-in analysis, blast radius calculation, and dead-code detection.
3. **`src/runtime_reliability/` — Agent Runtime Reliability:** 10-state formal state machine, hierarchical cancellation context trees with `AbortSignal`, normalized failure classification, and multi-agent quorum consensus.
4. **`src/design_intelligence/` — UI Engineering & Design Intelligence:** Closed-loop 9-step Design Quality Loop, OKLCH color math, anti-slop rules (banning purple clichés and mesh gradients), and interactive state auditing.
5. **`src/supply_chain/` — Supply Chain Security:** Real-time SBOM extraction, package integrity hashing, license compliance, and malicious package detection.
6. **`src/intelligence/` & `src/evolution/` — Memory & Case Law:** 4-type taxonomy memory (Semantic, Procedural, Episodic, Working) and Case Law precedent database (`.agent/data/caselaw.json`).
7. **`bin/mcp-server.js` — Model Context Protocol:** Exposes 34 verified tools to external AI hosts (Claude Desktop, Cursor, Zed) with token-efficient responses and pagination.
8. **`bin/tk-proxy.js` & `bin/proxy-server.js` — HTTP/WS Proxy:** Intercepts LLM API calls (e.g. Anthropic `/v1/messages`) to inject governance rules into system prompts transparently.

---

## 4. How to Verify Claims Before Answering (Epistemic Protocol)

Never state that a feature is implemented, tested, or passing without executing or reading authoritative evidence:

```
Claim: "Feature X is implemented"
  → Verify: Inspect file in src/ or crates/core/. Look for actual logic, not just exports.

Claim: "Tests pass"
  → Verify: Run the specific test command:
    - Rust: npm run test:rust
    - Fast JS: npx jest test/unit/<file>.test.js --no-coverage
    - References: npm run validate-references
    - Types: npm run typecheck

Claim: "Package Y is available"
  → Verify: Inspect package.json. If it is not listed under dependencies or optionalDependencies, DO NOT IMPORT IT.
```

---

## 5. How to Approach Future Engineering Tasks

When assigned a task in this repository:

1. **Step 0: Socratic Gate & Impact Classification:**
   - Run or recall `tk impact-tier` logic:
     - Tier 0: Typo / formatting $\rightarrow$ Bypass questions, direct edit.
     - Tier 1: Single file logic edit $\rightarrow$ Fast pass, single pass.
     - Tier 2: Multi-file feature $\rightarrow$ Targeted audit, ask 1 question only if ambiguous.
     - Tier 3: Schema / breaking architectural change $\rightarrow$ Full review gauntlet required.
2. **Step 1: Read Relevant SKILL.md:**
   - Always read the matching skill documentation in `.agent/skills/<skill>/SKILL.md` before generating code.
3. **Step 2: Respect Dual-Workspace Mirroring:**
   - Note that `tribunal-kit/` is the git repository, while the parent workspace `cli project` mirrors top-level governance files (`.agent`, `.claude`, `AGENTS.md`). Keep them in sync using `npm run sync`.
4. **Step 3: Verification Before Completion:**
   - Run `npm run typecheck` and relevant Jest/Cargo tests.
   - Run `npm run validate-references` if touching skills or docs.
