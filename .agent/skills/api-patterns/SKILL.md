---
name: api-patterns
description: API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# API Design Patterns

> Build APIs that serve their consumers — not APIs that match the tutorial you read last.
> Every decision here has a trade-off. Know the trade-off before you pick a side.

## How to Use This Skill

Only read the files you actually need for this task. The map below tells you where to look.

---

## File Index

| File | What It Covers | Load When |
|---|---|---|
| `api-style.md` | Choosing between REST, GraphQL, and tRPC | Client type is unclear or debated |
| `rest.md` | Endpoint naming, HTTP verbs, status code semantics | Building a REST surface |
| `response.md` | Unified response envelope, error shapes, cursor pagination | Defining response contracts |
| `graphql.md` | Schema-first design, N+1 awareness, when NOT to use GraphQL | GraphQL is on the table |
| `trpc.md` | Type-safe RPC for TypeScript monorepos | Full-stack TypeScript project |
| `versioning.md` | URI, header, and content-type versioning strategies | API needs to evolve without breaking clients |
| `auth.md` | JWT, OAuth 2.0, Passkeys, API keys — picking the right one | Authentication is being designed |
| `rate-limiting.md` | Token bucket vs sliding window, burst handling | Protecting public or high-traffic endpoints |
| `documentation.md` | OpenAPI spec quality, example-driven docs | API is being documented |
| `security-testing.md` | OWASP API Top 10, authorization boundary testing | Security review |

---

## Related Expertise

| If You Also Need | Load This |
|---|---|
| Server implementation | `@[skills/nodejs-best-practices]` |
| Data layer | `@[skills/database-design]` |
| Vulnerability review | `@[skills/vulnerability-scanner]` |

---

## Pre-Design Checklist

Answer these before writing a single route:

- [ ] Who calls this API? (browser, mobile, service-to-service, third party)
- [ ] What data shape does the consumer need — or does it vary per caller?
- [ ] REST, GraphQL, or tRPC — and does the team agree?
- [ ] What does a failed response look like across the whole surface?
- [ ] How will this API change in 6 months without breaking callers?
- [ ] Is there a rate-limit story?
- [ ] Will there be public docs, and who maintains them?

---

## Common Mistakes

**Patterns that cause pain later:**

- Treating REST as default without considering the consumer's actual fetch patterns
- Verbs in endpoint paths (`/getUser`, `/deleteItem`) — REST resources are nouns
- Inconsistent error shapes across routes — consumers have to guess
- Leaking stack traces or internal identifiers in error responses
- No versioning plan until the first breaking change hits production

**What good looks like:**

- API style chosen for the actual use case, not habit
- Consumer requirements asked and confirmed before design starts
- Every response — success and failure — follows the same shape
- HTTP status codes mean what they're supposed to mean

---

## AI-Era API Patterns (2025+)

### SSE vs WebSocket for AI Streaming

```
SSE (Server-Sent Events) — use for AI text streaming:
  ✅ One-directional: server → client (exactly what LLM streaming is)
  ✅ HTTP/2-native, works through all proxies
  ✅ No library needed — native EventSource API in browsers
  ❌ If the client also needs to send data mid-stream → WebSocket instead

WebSocket — use for bidirectional real-time:
  ✅ Full-duplex (both directions)
  ✅ Real-time collaboration, chat, game state
  ❌ More complex lifecycle management
```

```ts
// ✅ SSE endpoint for AI streaming response
app.get('/api/generate', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const stream = await openai.chat.completions.create({ ..., stream: true });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

### Model Context Protocol (MCP)

MCP is the emerging standard (2025) for AI models to interface with external tools and data sources:

```ts
// MCP server — expose your API's capabilities as MCP tools
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({ name: 'my-api', version: '1.0.0' });

// Register a tool that AI agents can call
server.tool(
  'search_products',
  'Search the product catalog by keyword and category',
  {
    query: z.string().describe('Search terms'),
    category: z.string().optional().describe('Filter by category'),
  },
  async ({ query, category }) => {
    const results = await db.searchProducts(query, category);
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  }
);
```

### Idempotency Keys for LLM Request Deduplication

LLM requests can be expensive. If a client retries due to a timeout, you may charge twice:

```ts
// ✅ Idempotency key — same key = return cached response
app.post('/api/generate', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (idempotencyKey) {
    const cached = await cache.get(`llm:${idempotencyKey}`);
    if (cached) return res.json(cached);
  }

  const result = await callLLM(req.body);

  if (idempotencyKey) {
    await cache.set(`llm:${idempotencyKey}`, result, { ex: 3600 }); // 1hr TTL
  }

  res.json(result);
});
```

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/api_validator.py` | Validates endpoint naming and response shape consistency | `python scripts/api_validator.py <project_path>` |

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Api Patterns Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `dependency`**

### ❌ Forbidden AI Tropes in API Design

1. **REST = CRUD assumption** — do not assume every REST endpoint maps 1:1 with a database table. APIs model behaviors, not just data.
2. **Missing Input Validation** — never generate an endpoint that accepts external data without validating it (e.g., Zod, Joi).
3. **Hardcoded 200 OK** — returning 200 for created resources (should be 201) or async accepted (should be 202). Use precise status codes.
4. **No Pagination strategy** — returning unbound lists endpoints (e.g., `GET /users`) without limits or cursors.
5. **Leaky Error Responses** — returning raw database errors or stack traces to the client.

### ✅ Pre-Flight Self-Audit

Review these questions before generating API design or code:
```
✅ Are all inputs validated at the boundary?
✅ Does every endpoint have an explicit authentication AND authorization check?
✅ Did I use the correct HTTP verbs and semantic status codes?
✅ Is the response shape consistent with the rest of the API?
✅ Did I handle pagination for lists and rate limiting for public endpoints?
```


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
