# Tribunal-Kit Premium AI Chat Presentation & Visual Design System (Phase 3)

## Overview

Phase 3 elevates Tribunal-Kit's operational communication into a refined, visually disciplined engineering experience inside supported AI chat interfaces (Antigravity, Claude Code, Cursor, Windsurf, Copilot, Codex, and terminal TUIs).

Taking cues from the restraint, scannability, and typographic clarity of **Linear**, **Cursor**, and **Vercel**, the presentation system eliminates verbose developer narrations, decorative ASCII borders, and unstyled JSON dumps in favor of purposeful visual hierarchy, crisp status badges, and context-sensitive density.

---

## Design Principles

1. **Restraint Over Decoration**: Zero emojis (no 🚀, 🔍, 🛠️), zero box-drawing borders (`+---+`, `| |`), and zero synthetic percentages. Status is communicated using purposeful engineering glyphs (`›`, `✔`, `✖`, `⚠`, `⏸`, `⛔`, `⟳`, `⊘`).
2. **Scannability First**: The developer must understand what is happening, why it matters, and what to do next in under two seconds.
3. **Adaptive Density**: Micro-events (tool ticks, progress heartbeats) render in single-line compact mode; complex validation outcomes present structured evidence with progressive disclosure.
4. **Narrow-Panel Resilience**: Designed to render without awkward horizontal wrapping or layout disintegration in constrained IDE sidebars (250px to 400px).
5. **Decoupled Renderer Independence**: Markdown, Terminal ANSI, PlainText ASCII, and Structured JSON maintain semantic equivalence without leaking control codes across boundaries.

---

## Canonical Visual Language & Status Treatments

Every operational state maps to a deterministic glyph, action verb, and visual tone:

| Operational State | Glyph | Verb Badge | Tone | Semantic Meaning |
|---|---|---|---|---|
| `operation_started` | `›` | **Started** | Neutral | Top-level operational task initiated |
| `agent_activated` | `›` | **Activated** | Accent | Specialist agent activated for task domain |
| `skill_activated` | `›` | **Skill Applied** | Accent | Targeted skill applied to current context |
| `analysis_in_progress` | `›` | **Analyzing** | Neutral | Static analysis or graph inspection running |
| `tool_executing` | `›` | **Executing** | Neutral | Subprocess or external tool executing |
| `tests_running` | `›` | **Testing** | Neutral | Test suites running with metered counters |
| `evidence_collecting` | `›` | **Collecting Evidence** | Neutral | Assembling authoritative verification facts |
| `validation_passed` | `✔` | **Verified** | Success | Contract invariant verified with evidence |
| `validation_failed` | `✖` | **Failed** | Error | Verification failed with code and remedy |
| `warning_detected` | `⚠` | **Warning** | Warning | Non-blocking condition with impact assessment |
| `approval_required` | `⏸` | **Approval Required** | Gate | Human gate sign-off required prior to mutating disk |
| `operation_blocked` | `⛔` | **Blocked** | Error | Operation halted on prerequisite; remedy provided |
| `retry_in_progress` | `⟳` | **Retrying** | Warning | Automated retry in flight with attempt counter |
| `operation_completed` | `✔` | **Completed** | Success | Operation terminated successfully with artifacts |
| `operation_cancelled` | `⊘` | **Cancelled** | Muted | Operation aborted by user or timeout |

---

## State-Specific Presentation Patterns

### 1. Agent & Skill Activation
```markdown
› **Activated** `@backend-specialist` · Backend Architecture & State Engine
  Auditing Phase 1 & 2 baseline and upgrading MarkdownRenderer.
```
```markdown
› **Skill Applied** `skill:error-resilience` · System Reliability & Fault Tolerance
  Applying bulkhead isolation and exponential retry backoff.
```

### 2. Running Operations & Authoritative Progress
```markdown
› **Testing** · Codebase Intelligence Test Suites
  Progress: [■■■■■□□□] 5/8 suites (62%) · 3 pending
  Stages: ✔ ast_parse · › unit_tests · · e2e_smoke
```

When progress is unmetered (total unknown), Tribunal-Kit never invents speculative percentages:
```markdown
› **Executing** · git clone
  Status: In progress (unmetered)
```

### 3. Verified Outcomes (Validation Passed)
```markdown
✔ **Verified** · Schema Conformance & Database Invariants
  Evidence: violations=0 · checkedTables=14 · constraints=100% valid
  Next: Proceed to migration execution
  Artifacts: `reports/schema_valid.json`
```

### 4. Failed Operations (Validation Failed)
```markdown
✖ **Failed** · AST Syntax Validation
  Error [ERR_SYNTAX]: Unexpected token "export" in CJS context
  Remedy: Set "type": "module" in package.json or use module.exports
<details>
<summary>Diagnostic Stack Trace</summary>

```text
SyntaxError: Unexpected token "export"
    at compileSourceTextModule (node:internal/modules/esm/utils:346:16)
    at ModuleLoader.createModuleWrap (node:internal/modules/esm/loader:266:12)
```
</details>
```

### 5. Blocked Operations & Approval Gates
```markdown
⛔ **Blocked** · Database Connection Blocked
  Error: Connection to [REDACTED_DB_URL] refused
  Remedy: Start local PostgreSQL server via: docker-compose up -d postgres
  Next: Unblock via: Start local PostgreSQL server
```
```markdown
⏸ **Approval Required** · Production Migration Gate
  Migration drops unused table "legacy_sessions". Confirm execution.
  Next: Awaiting human sign-off (Y/N/R)
```

### 6. Retries
```markdown
⟳ **Retrying** · GitHub API Rate Limit Recovery (Attempt 2 of 3)
  Backing off for 1500ms following 429 response
```

### 7. Completed Operations
```markdown
✔ **Completed** · Full Security Audit Pipeline
  Analyzed 128 routes across 14 modules with zero critical vulnerabilities.
  Artifacts: `reports/owasp_audit.json`, `reports/sbom.json`
```

---

## Progressive Disclosure Specification

When large diagnostic payloads (e.g. 10+ evidence items, multiline error traces, or AST dumps) are present, `MarkdownRenderer` applies progressive disclosure:

1. **Inline Essentials**: The primary status, summary, top 2-3 evidence items, error code, and actionable remedy remain permanently visible.
2. **Expandable Disclosure**: Secondary findings and deep stack traces are wrapped in semantic HTML `<details><summary>` blocks.
3. **Graceful Fallback**: In environments that strip or do not support HTML disclosure, setting `{ allowHtml: false }` or `{ progressiveDisclosure: false }` produces clean, indented Markdown bullet lists without `<details>` tags.

---

## Narrow Sidebar Adaptation

In Cursor, Windsurf, or VS Code sidebars, chat widths often range between 250px and 400px:

1. **Path Compaction**: `formatCompactPath(fullPath, maxLen)` shortens deep absolute paths (e.g., `c:/Users/.../subsystem/deep/module.js` becomes `c:/Users/.../module.js`), preserving the vital basename.
2. **Word-Wrap Safe Tokens**: Technical identifiers are enclosed in backticks (`` `identifier` ``), allowing modern browser engines to wrap naturally at word boundaries without clipping.
3. **No Brittle Space-Padded Tables**: Replaces wide markdown tables with high-density bullet lines (`Progress: ... · 3 pending`).

---

## Performance & Token Overhead

Measured via `scripts/benchmark_activity_presentation.js`:

| Renderer Mode | Throughput | Est. Token Footprint | Use Case |
|---|---|---|---|
| **Markdown (Rich)** | **53,430 ops/sec** | 29–50 tokens / event | Rich chat responses & validation milestones |
| **Markdown (Compact)** | **65,614 ops/sec** | 15–20 tokens / event | Rapid micro-events & tool progress ticks (31% token savings) |
| **Terminal (TTY)** | **56,921 ops/sec** | — | Local CLI commands with ANSI TrueColor & NO_COLOR support |
| **PlainText (ASCII)** | **62,283 ops/sec** | — | Raw CI/CD logs & plain telemetry |
| **Structured JSON** | **28,100 ops/sec** | — | MCP tool streaming & machine-readable pipelines |

