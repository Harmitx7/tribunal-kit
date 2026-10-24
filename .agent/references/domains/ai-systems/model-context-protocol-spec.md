# Model Context Protocol (MCP) Specification & Architecture

> **Authority**: Model Context Protocol Open Standard (`https://spec.modelcontextprotocol.io/`)  
> **Applicable Domains**: AI Systems, Agentic Workflows, MCP Servers, LLM Tool Integration  
> **Status**: Verified Production Specification  

---

## 1. Protocol Architecture & Transports

MCP establishes structured, bidirectional communication between AI host applications (clients) and local or remote data/tool providers (servers) via **JSON-RPC 2.0**:

| Transport | Mechanism | Typical Use Case |
|:---|:---|:---|
| **stdio** | Standard input/output pipes | Local CLI tools, subprocesses, desktop agent integrations |
| **SSE (HTTP)** | Server-Sent Events with HTTP POST | Remote services, multi-tenant cloud agent infrastructure |

---

## 2. Core Primitives & Capabilities

Servers declare capabilities during client-server initialization handshake:

- **Tools**: Executable functions callable by LLMs with strict JSON Schema arguments.
- **Resources**: Read-only passive data context (files, logs, database records) identified via custom URIs (e.g. `postgres://schema/users`).
- **Prompts**: Pre-engineered reusable prompt templates exposed by the server.

---

## 3. Tool Declaration & Schema Implementation

Tools must expose explicit JSON Schema definitions with validation rules:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server({
  name: "system-query-server",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

// 1. Tool Listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "fetch_system_metrics",
      description: "Retrieve memory, CPU, and disk metrics for a host server.",
      inputSchema: {
        type: "object",
        properties: {
          hostId: { type: "string", description: "Target host machine UUID" },
          windowMinutes: { type: "integer", minimum: 1, maximum: 60, default: 5 }
        },
        required: ["hostId"]
      }
    }
  ]
}));

// 2. Tool Invocation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "fetch_system_metrics") {
    const { hostId, windowMinutes } = request.params.arguments as { hostId: string; windowMinutes?: number };
    const metrics = await gatherMetrics(hostId, windowMinutes || 5);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(metrics, null, 2)
        }
      ]
    };
  }
  throw new Error(`Tool not found: ${request.params.name}`);
});
```

---

## 4. JSON-RPC 2.0 Error Handling Standard

Standardized error codes must be returned when exceptions occur:

| Code | Message | Cause |
|:---|:---|:---|
| `-32700` | Parse error | Invalid JSON received by the server |
| `-32600` | Invalid Request | JSON sent is not a valid Request object |
| `-32601` | Method not found | Method does not exist or is not available |
| `-32602` | Invalid params | Tool arguments fail schema validation |
| `-32603` | Internal error | Unhandled server execution exception |

---

## 5. Security & Sandbox Constraints

1. **Path Traversal Defense**: Always resolve paths with `path.resolve()` and verify that the target starts with the allowed root directory (`targetPath.startsWith(allowedRoot)`).
2. **Subprocess Isolation**: Never execute shell strings using `exec()`; use `execFile()` or `spawn()` with arguments strictly separated as arrays.
3. **Sensitive Data Redaction**: Strip tokens, secrets, and environment variables from tool returns before passing content payloads to the client.

---

## 6. MCP Production Server Checklist

- [ ] Implements official JSON-RPC 2.0 error responses without throwing unhandled exceptions.
- [ ] Strict JSON schema defined for all tool parameters with descriptive parameter labels.
- [ ] Stdio servers write only pure JSON-RPC messages to `stdout`; all logging redirected to `stderr`.
- [ ] Clean shutdown handlers on `SIGINT` / `SIGTERM` closing all open socket/database connections.
