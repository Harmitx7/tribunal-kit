---
name: mcp-builder
description: Model Context Protocol (MCP) server integration mastery. Building custom MCP servers, standardizing tool exposes, managing standardized communication between large language models and localized datasets, securing boundary contexts, and architecting resource schemas. Use when modifying, extending, or building custom toolsets for AI platforms relying on the MCP standard.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# MCP Builder — Context Protocol Mastery

> AI reasoning is infinite. But its access to your localized reality is zero without a bridge.
> An MCP Server is the high-bandwidth, strictly-schema'd bridge into your secure internal domain.

---

## 1. The Anatomy of an MCP Server

The Model Context Protocol (MCP) standardizes how AI agents fetch local data and execute tools.
A robust MCP server exposes exactly 3 primary concepts:
1. **Resources:** Read-only data payloads (Logs, local files, database dumps).
2. **Prompts:** Reusable injected context scaffolding (e.g., "Summarize this log with strict parameters").
3. **Tools:** Actionable executed capabilities (e.g., "Run Postgres Query", "Restart Server").

```typescript
// Standardize exposing a Tool securely via an MCP Server Wrapper
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "internal-database-auditor",
  version: "1.0.0",
});

// Defining a rigorous tool parameter boundary
server.tool(
  "query_production_database",
  "Executes a read-only sanitized query against the production analytical replica.",
  {
    table: z.enum(["users", "transactions", "audit_logs"]).describe("The specific table to analyze"),
    limit: z.number().max(100).default(10).describe("Maximum row returns to prevent context bloat"),
  },
  async ({ table, limit }) => {
    // Execution logic
    const data = await secureDatabaseClient.query(`SELECT * FROM ${table} LIMIT ${limit}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }]
    };
  }
);
```

---

## 2. Resource Management vs Tool Management

Do not use a `Tool` to read static data. Do not use a `Resource` to invoke remote actions.

- **Resources (URI based):** Act identically to local files. Exposed explicitly so the AI context manager can read them *before* invoking tools. Use for things like `file:///app/config.json` or `db://schema/users`.
- **Tools:** Use exclusively when parameterized execution is required dynamically. Tools MUST be accompanied by extremely literal, explicit descriptions, because the LLM uses the description text to map Intent to the Tool execution.

---

## 3. Structuring Tool Descriptions (The LLM Gateway)

The LLM decides to fire your tool based entirely on the Description schema.
If your description is vague, the LLM will hallucinate executions unpredictably.

```typescript
// ❌ VAGUE (The LLM will guess when to use this, often incorrectly)
description: "Changes the system status."

// ✅ DETERMINISTIC (The LLM knows the exact boundaries and consequences)
description: "Transitions the payment processing gateway between 'ACTIVE' and 'MAINTENANCE' modes. Use this ONLY after verifying traffic logs to halt impending queue flooding. Requires Admin clearance."
```

---

## 4. MCP Security Boundaries

An MCP Server gives an external AI execution capability over your shell or database.

- **Never Expose Raw Shells Natively:** Unless deliberately building a high-trust local desktop agent. Expose mapped commands (`execute_npm_build`) instead of raw terminals (`bash_command`).
- **Enforce Read-Only Defaults:** If creating a database tool, create `query_select_only` separate from `execute_mutation`. Give the AI read-only access.
- **Context Size Truncation:** If a tool queries a 5GB text log, the AI context window will instantly overflow and crash the session. The MCP logic MUST forcibly truncate outputs before returning.

---

## 🤖 LLM-Specific Traps (MCP Integration)

1. **Raw Terminal Chaos:** Exposing a `run_command` MCP tool that blindly executes strings into `child_process.exec()` without any input sanitization, opening massive RCE (Remote Code Execution) vulnerabilities via prompt injection.
2. **Missing Input Schemas:** The AI defines a tool but accepts an `any` type object as the argument. The LLM will wildly hallucinate keys into the object. You MUST enforce strict Zod boundaries on every incoming payload.
3. **Massive Output Strings:** A tool returns 200,000 characters of a database dump without pagination or truncation limits, immediately blowing out the 128k context window and terminating the user session silently.
4. **Action Overlap:** Creating 5 separate tools (`read_file`, `scan_file`, `parse_file`) with nearly identical generic descriptions. The LLM will randomly select between them, destroying deterministic reliability. Consolidate overlapping tool definitions.
5. **No State Feedback:** A tool mutates user state successfully, but returns an empty string `""` to the LLM. The LLM gets confused and assumes the tool failed, trying to execute it again. Tools must return explicit confirmation states (`"Success: Mutated 5 rows."`).
6. **Resource Pretending as a Tool:** Building a complex function to "Fetch API Keys config" instead of just exposing the configuration natively as an MCP Resource URI.
7. **Ignoring Transport Layers:** Assuming standard HTTP routing for MCP implementations instead of using standard STDIO or SSE (Server-Sent Events) transports required by the specific AI host architectures.
8. **Catch-And-Hide Errors:** Formatting error messages back into the tool response as standard `text`. If an MCP tool errors, it must set `isError: true` so the LLM explicitly recognizes the failure and recalculates.
9. **Infinite Retry Traps:** The LLM fires a tool wrong, gets an error, and fires it wrong again infinitely. The MCP builder MUST return guided error messages (e.g., "Error: Invalid ID. Valid IDs are 1,2,3") to break the hallucination loop.
10. **The Universal Fixer Tool:** Defining a massive monolithic `executeTask(prompt)` tool instead of segregating capabilities cleanly into specific atomic tools (`git_commit`, `write_file`, `read_log`).

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Are MCP tools rigidly bounded by strict `.describe()` schemas (Zod or JSON Schema)?
✅ Has the output payload been aggressively truncated to prevent LLM context-window exhaustion?
✅ Do the tool operational descriptions explicitly define the exact intent boundaries?
✅ Are execution errors returned with explicit `isError: true` flags directly to the LLM agent?
✅ Do error strings contain corrective guidance allowing the LLM to self-correct and retry?
✅ Has raw RCE shell access been minimized or heavily parameterized to specific execution actions?
✅ Were static files mapped distinctly as MCP *Resources* rather than invoked as executable *Tools*?
✅ Does every tool execution return an explicit, verbose success/mutation confirmation string?
✅ Have duplicated intersecting tool concepts been consolidated to prevent LLM routing confusion?
✅ Did I select the correct transport mechanism (STDIO vs SSE) required by the host client configuration?
```
