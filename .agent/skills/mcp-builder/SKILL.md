---
name: mcp-builder
description: MCP (Model Context Protocol) server building principles. Tool design, resource patterns, best practices.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# MCP Server Development

> An MCP server exposes capabilities to AI assistants.
> Design tools the way you design a good API: clear contracts, predictable behavior, honest errors.

---

## What MCP Servers Do

An MCP (Model Context Protocol) server gives an AI assistant structured access to:

- **Tools** — actions the AI can invoke (run a query, send a message, fetch data)
- **Resources** — data the AI can read (files, database records, API responses)
- **Prompts** — reusable prompt templates with parameters

---

## Tool Design Principles

### 1. One tool, one responsibility

A tool that does two things is a tool that confuses the model. Split tools when they serve different goals.

```ts
// ❌ Ambiguous — does it list AND filter?
{ name: "get_users", description: "Get users, optionally filtered by role" }

// ✅ Separate concerns
{ name: "list_users", description: "List all users with pagination" }
{ name: "find_users_by_role", description: "Find users matching a specific role" }
```

### 2. Descriptions are the interface

The AI reads descriptions to decide which tool to call. Write them for the AI, not for humans.

- State exactly what the tool does in plain terms
- State what the tool returns
- State when NOT to use it if there's common confusion

```ts
{
  name: "search_products",
  description: "Search products by keyword. Returns an array of matching product records " +
    "with id, name, price, and stock. Use this for keyword search, not for fetching a " +
    "specific product by ID — use get_product_by_id for that."
}
```

### 3. Input schemas are contracts

Every tool input must have a JSON Schema definition with:
- Required vs. optional fields clearly marked
- Descriptions on each field
- Sensible defaults on optional fields

```ts
inputSchema: {
  type: "object",
  required: ["query"],
  properties: {
    query: {
      type: "string",
      description: "Search keyword. Minimum 2 characters."
    },
    limit: {
      type: "number",
      description: "Maximum results to return. Default: 10. Max: 100.",
      default: 10
    }
  }
}
```

### 4. Errors must be informative

When a tool fails, the AI needs to understand what went wrong and whether to retry.

```ts
// ❌ Useless error
throw new Error("Failed");

// ✅ Actionable error
return {
  isError: true,
  content: [{
    type: "text",
    text: "Product search failed: the search index is temporarily unavailable. " +
          "Try again in a few seconds or use list_products for unfiltered results."
  }]
};
```

---

## Resource Design

Resources give the AI read-only access to data. Use them for content the AI needs to understand context, not for actions.

```ts
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri.startsWith("product://")) {
    const id = uri.replace("product://", "");
    const product = await db.products.findById(id);

    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(product, null, 2)
      }]
    };
  }
});
```

---

## Security Rules

MCP servers execute with user-level permissions and may have access to sensitive systems:

- **Never trust tool arguments without validation** — the AI can be prompted to send malicious input
- **Parameterize all database queries** — treat tool input as untrusted user input
- **Scope API keys narrowly** — the MCP server should have the minimum permissions needed
- **Log tool invocations** — especially for tools that write data or delete records
- **Rate limit tool calls** — prevent runaway AI loops from hammering backends

---

## Configuration Template

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["-y", "your-mcp-package"],
      "env": {
        "API_KEY": "${YOUR_API_KEY}"
      }
    }
  }
}
```

Place in `~/.cursor/mcp.json` (Cursor) or `~/.gemini/antigravity/mcp_config.json` (Antigravity).

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Mcp Builder Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Mcp Builder
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

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
