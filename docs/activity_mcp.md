# Tribunal-Kit MCP Response Optimization & Structured Output Intelligence (Phase 6)

## Overview

Phase 6 optimizes Tribunal-Kit's Model Context Protocol (MCP) server response pipeline (`bin/mcp-server.js`). It significantly reduces token consumption, eliminates double-encoding and indentation bloat, standardizes error contracts, and sanitizes sensitive data—while preserving 100% functional parity, evidence fidelity, and backward compatibility across all 37 MCP tools.

---

## 1. Operating Principles

1. **Observational & Context Efficiency**: Optimizations target payload packaging and transmission density. They never alter underlying tool execution, AST parsing, security verifiers, or agent orchestration logic.
2. **Zero Evidence Loss**: Compact serialization removes redundant structural whitespace and double-escaped formatting. Round-trip data integrity is strictly 100% (`JSON.parse(compact) === original`).
3. **Explicit Pagination & Truncation Integrity**: Collections that exceed token safety limits are bounded deterministically with explicit pagination metadata (`_pagination: { truncated: true, total, returned, remaining, hasMore: true }`). Never silently drop findings or items.
4. **Standardized Error Contracts**: All tool failure states return compliant MCP error envelopes containing `{ isError: true }`, sanitized user-facing messages, and stripped internal stack traces.
5. **Universal Secret Redaction**: High-entropy tokens, JWTs, bearer tokens, private keys, and API credentials are automatically redacted before wire transmission.
6. **No Speculative or Fabricated Token Metrics**: Token counts and reduction metrics are measured through deterministic byte accounting and documented token estimation heuristics.

---

## 2. Core Architecture

The MCP response optimization architecture is centered in `src/mcp/response_optimizer.js` and integrated across all tool call handlers in `bin/mcp-server.js`:

```
┌───────────────────────────────────────────────────────────┐
│                 MCP Tool Execution Result                 │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│            McpResponseOptimizer (Pipeline)               │
│                                                           │
│  1. Secret Redactor: Scrubs JWTs, API keys, passwords     │
│  2. Array Bounding: Prioritizes critical issues & paginates│
│  3. Serialization: Compact JSON (no pretty-print bloat)   │
│  4. Dual Output: Optional structured data block           │
│  5. Error Envelope: Standardizes isError: true & messages │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│              Standard MCP CallToolResult                  │
│   { content: [{ type: "text", text: "..." }], isError }   │
└───────────────────────────────────────────────────────────┘
```

### Module Location & Exports

- **Core Module**: `tribunal-kit/src/mcp/response_optimizer.js`
- **Re-export**: `tribunal-kit/src/mcp/index.js` (`McpResponseOptimizer`)
- **Server Entrypoint**: `tribunal-kit/bin/mcp-server.js`

---

## 3. Key Capabilities

### A. Compact Serialization (`serializeResponse`)

In standard MCP stdio JSON-RPC transport, returning formatted multi-line JSON (`JSON.stringify(data, null, 2)`) causes double-escaping bloat: the outer JSON-RPC serializer escapes every newline (`\n`) and indent space (`\"  \"`).

`McpResponseOptimizer.serializeResponse` outputs compact, single-line JSON by default (`compact: true`), saving 16% to 26% in wire bytes and LLM context tokens:

```javascript
const { McpResponseOptimizer } = require('tribunal-kit/src/mcp');

// Tool response handler
const result = await runValidation(args);
return McpResponseOptimizer.serializeResponse(result, {
  compact: true,
  redactSecrets: true,
});
```

### B. Standardized Error Handling (`formatErrorResponse`)

Legacy MCP error branches often returned arbitrary plain strings without the standard MCP error envelope. `formatErrorResponse` guarantees compliance:

```javascript
try {
  // execute tool
} catch (error) {
  return McpResponseOptimizer.formatErrorResponse(error, {
    toolName: 'tribunal_run_validation',
    stripStack: true,
  });
}
```

Produces:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Validation execution failed: Schema validation error"
    }
  ],
  "isError": true
}
```

### C. Safe Array Bounding & Pagination (`boundArray`)

Large diagnostic sweeps (e.g. hundreds of linter findings or security warnings) can flood the model's context window. `boundArray` enforces predictable bounds while preserving the most severe issues first:

```javascript
const boundedFindings = McpResponseOptimizer.boundArray(findings, 50, {
  sortBySeverity: true,
  severityField: 'severity', // sorts 'error' -> 'warning' -> 'info'
});
```

When truncated, an explicit `_pagination` descriptor is attached:
```json
{
  "_pagination": {
    "total": 142,
    "returned": 50,
    "remaining": 92,
    "truncated": true,
    "hasMore": true,
    "limit": 50
  }
}
```

### D. Automated Secret Redaction (`redactSecrets`)

Prevents accidental leakage of environment credentials or authorization headers in MCP responses:

| Pattern | Redaction Output |
|---|---|
| `Bearer eyJhbGci...` | `Bearer [REDACTED_TOKEN]` |
| `ghp_1234567890abcdef...` | `ghp_[REDACTED_GITHUB_TOKEN]` |
| `sk-ant-api03-...` | `sk-ant-[REDACTED_API_KEY]` |
| `sk-proj-...` | `sk-proj-[REDACTED_API_KEY]` |
| `eyJhbGciOi...` (JWT) | `[REDACTED_JWT]` |
| `-----BEGIN PRIVATE KEY-----` | `[REDACTED_PRIVATE_KEY]` |
| Password / Secret fields in objects | `[REDACTED_SECRET]` |

### E. Token & Payload Telemetry (`measurePayload`)

Provides transparent auditing of wire size and token savings:

```javascript
const telemetry = McpResponseOptimizer.measurePayload(largeReport);
// => {
//   baselineBytes: 10480,
//   optimizedBytes: 7754,
//   bytesSaved: 2726,
//   percentSaved: 26.01,
//   baselineTokens: 2620,
//   optimizedTokens: 1939,
//   tokensSaved: 681,
//   estimationMethodology: "4 chars/token heuristic"
// }
```

---

## 4. Benchmark & Performance Evidence

Empirical measurements gathered via `tribunal-kit/scripts/benchmark_mcp_responses.js`:

### Context Efficiency Across Payload Tiers

| Payload Tier | Representative Tool | Baseline Size | Optimized Size | Bytes Saved | Token Reduction | Roundtrip Integrity |
|---|---|---|---|---|---|---|
| **Small** | `tribunal_analyze_finding` | 305 bytes (~77 tokens) | 255 bytes (~64 tokens) | 50 B (16.39%) | ~13 tokens | 100% verified |
| **Medium** | `tribunal_commit_write` | 989 bytes (~248 tokens) | 742 bytes (~186 tokens) | 247 B (24.97%) | ~62 tokens | 100% verified |
| **Large** | `tribunal_understand` (Audit) | 10,480 bytes (~2,620 tokens) | 7,754 bytes (~1,939 tokens) | 2,726 B (26.01%) | ~681 tokens | 100% verified |

### Serialization Throughput

- **Rounds Executed**: 50,000 iterations
- **Total Elapsed**: 384.55 ms
- **Throughput**: 130,022 responses/second
- **Latency**: 7.69 µs per serialization

---

## 5. Client Compatibility & Environment Parity

The optimized responses adhere strictly to the **MCP Protocol Specification (2024-11-05)**:

- **Claude Code**: Full support for compact JSON text blocks. Eliminates newline escape penalties.
- **Antigravity**: Native parsing of compact MCP tool results. Zero deserialization errors.
- **Cursor & Windsurf**: Compatible with standard stdio JSON-RPC transport and content blocks.
- **Backward Compatibility**: Any client calling `JSON.parse(content[0].text)` receives the exact object schema expected by legacy workflows.

