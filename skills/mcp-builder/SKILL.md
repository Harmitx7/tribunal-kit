---
name: mcp-builder
description: Use when Model Context Protocol (MCP) server integration mastery. Building custom MCP servers, standardizing tool exposes, managing standardized communication between large language models and localized datasets, securing boundary contexts, and architecting resource schemas. Use when modifying, extending, or building custom toolsets for AI platforms relying on the MCP standard.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - backend-security-expert
  - nodejs-best-practices
  - agentic-patterns
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# MCP Builder — Context Protocol Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `mcp-builder` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Model Context Protocol (MCP) server integration mastery. Building custom MCP servers, standardizing tool exposes, managing standardized communication between large language models and localized datasets, securing boundary contexts, and architecting resource schemas. Use when modifying, extending, or building custom toolsets for AI platforms relying on the MCP standard.
- **DO NOT activate when:** The task falls outside the `mcp-builder` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## Hallucination Traps (Read First)

- ❌ Exposing tools without input validation schemas -> ✅ Every MCP tool MUST have JSON Schema for parameters; the protocol requires it
- ❌ Returning unstructured strings from tool calls -> ✅ Return structured JSON that the LLM can reliably parse and act on
- ❌ Not handling tool call timeouts -> ✅ Always set execution timeouts; hanging tools block the entire LLM conversation loop

---

---

## 1. The Anatomy of an MCP Server

The Model Context Protocol (MCP) standardizes how AI agents fetch local data and execute tools.
A robust MCP server exposes exactly 3 primary concepts:

1. **Resources:** Read-only data payloads (Logs, local files, database dumps).
2. **Prompts:** Reusable injected context scaffolding (e.g., "Summarize this log with strict parameters").
3. **Tools:** Actionable executed capabilities (e.g., "Run Postgres Query", "Restart Server").

```typescript
// Standardize exposing a Tool securely via an MCP Server Wrapper
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'internal-database-auditor',
  version: '1.0.0',
});

// Defining a rigorous tool parameter boundary
server.tool(
  'query_production_database',
  'Executes a read-only sanitized query against the production analytical replica.',
  {
    table: z
      .enum(['users', 'transactions', 'audit_logs'])
      .describe('The specific table to analyze'),
    limit: z.number().max(100).default(10).describe('Maximum row returns to prevent context bloat'),
  },
  async ({ table, limit }) => {
    // Execution logic
    const data = await secureDatabaseClient.query(`SELECT * FROM ${table} LIMIT ${limit}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(data) }],
    };
  },
);
```

---

## 2. Resource Management vs Tool Management

Do not use a `Tool` to read static data. Do not use a `Resource` to invoke remote actions.

- **Resources (URI based):** Act identically to local files. Exposed explicitly so the AI context manager can read them _before_ invoking tools. Use for things like `file:///app/config.json` or `db://schema/users`.
- **Tools:** Use exclusively when parameterized execution is required dynamically. Tools MUST be accompanied by extremely literal, explicit descriptions, because the LLM uses the description text to map Intent to the Tool execution.

---

## 3. Structuring Tool Descriptions (The LLM Gateway)

The LLM decides to fire your tool based entirely on the Description schema.
If your description is vague, the LLM will hallucinate executions unpredictably.

```typescript
// ❌ VAGUE (The LLM will guess when to use this, often incorrectly)
description: 'Changes the system status.';

// ✅ DETERMINISTIC (The LLM knows the exact boundaries and consequences)
description: "Transitions the payment processing gateway between 'ACTIVE' and 'MAINTENANCE' modes. Use this ONLY after verifying traffic logs to halt impending queue flooding. Requires Admin clearance.";
```

---

## 4. MCP Security Boundaries

An MCP Server gives an external AI execution capability over your shell or database.

- **Never Expose Raw Shells Natively:** Unless deliberately building a high-trust local desktop agent. Expose mapped commands (`execute_npm_build`) instead of raw terminals (`bash_command`).
- **Enforce Read-Only Defaults:** If creating a database tool, create `query_select_only` separate from `execute_mutation`. Give the AI read-only access.
- **Context Size Truncation:** If a tool queries a 5GB text log, the AI context window will instantly overflow and crash the session. The MCP logic MUST forcibly truncate outputs before returning.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
