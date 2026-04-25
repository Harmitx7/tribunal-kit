---
name: mcp-builder
description: Model Context Protocol (MCP) server integration mastery. Building custom MCP servers, standardizing tool exposes, managing standardized communication between large language models and localized datasets, securing boundary contexts, and architecting resource schemas. Use when modifying, extending, or building custom toolsets for AI platforms relying on the MCP standard.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Exposing tools without input validation schemas -> ✅ Every MCP tool MUST have JSON Schema for parameters; the protocol requires it
- ❌ Returning unstructured strings from tool calls -> ✅ Return structured JSON that the LLM can reliably parse and act on
- ❌ Not handling tool call timeouts -> ✅ Always set execution timeouts; hanging tools block the entire LLM conversation loop

---


# MCP Builder — Context Protocol Mastery

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


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
