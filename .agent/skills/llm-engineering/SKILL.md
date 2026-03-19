---
name: llm-engineering
description: LLM engineering principles for production AI systems. RAG pipeline design, vector store selection, prompt engineering, evals, and LLMOps. Use when building AI features, chat interfaces, semantic search, or any system calling an LLM API.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# LLM Engineering Principles

> An LLM is a probabilistic function, not a deterministic API.
> Design your system to be correct despite that — not because you got lucky.

---

## When This Skill Activates

- Adding AI chat, completion, or summarization to an app
- Building a RAG (Retrieval-Augmented Generation) pipeline
- Integrating with OpenAI, Anthropic, Google Gemini, or local models
- Designing semantic search
- Setting up AI evals or monitoring

---

## Core Architecture Decision: What Pattern?

| Pattern | Use When | Avoid When |
|---|---|---|
| **Simple prompt** | Single-turn, no user docs | Needs accuracy on user data |
| **RAG** | Answers must cite user/company docs | Data changes every second |
| **Fine-tuning** | Consistent tone/style at scale | You have < 1000 examples |
| **Agent loop** | Multi-step tasks, tool use | Single-answer questions |
| **Hybrid** | RAG + agent (most production apps) | Over-engineering simple use case |

---

## RAG Pipeline Design

The core pattern for grounding LLMs in real data:

```
INGEST                    RETRIEVE                  GENERATE
─────────                 ─────────                 ─────────
Documents                 User query                Retrieved chunks
    │                         │                         │
    ▼                         ▼                         ▼
Chunk (512 tokens)    Embed query vector     Rerank by relevance
    │                         │                         │
    ▼                         ▼                         ▼
Embed chunks          ANN search in          Build prompt:
    │                 vector store           [system] + [chunks] + [query]
    ▼                         │                         │
Store in vector DB    Top-K results          Call LLM → stream response
```

### Chunking Strategy

```ts
// ❌ Fixed-size chunks break semantic units
chunk(document, { size: 512 });  // Splits mid-sentence

// ✅ Semantic chunking — split at natural boundaries
chunk(document, {
  strategy: 'markdown-headers',   // Or 'sentence', 'paragraph'
  maxTokens: 512,
  overlap: 64,                    // Overlap to preserve context at boundaries
});
```

### Embedding Model Selection

| Scale | Model | Dimensions | Notes |
|---|---|---|---|
| General English | `text-embedding-3-small` | 1536 | Best quality/cost ratio |
| Multilingual | `multilingual-e5-large` | 1024 | Open source, self-hostable |
| Code | `text-embedding-3-large` | 3072 | Higher cost, better code retrieval |
| Local/private | `nomic-embed-text` | 768 | Runs on CPU via Ollama |

---

## Vector Store Selection

| Need | Choose | Why |
|---|---|---|
| Already on PostgreSQL | `pgvector` | Zero infra, SQL joins with metadata |
| Managed, billion-scale | Pinecone | Hosted ANN, hybrid search built-in |
| Open source, self-hosted | Qdrant | Rust-native, fast, rich filtering |
| Already on Weaviate | Weaviate | GraphQL API, multimodal support |
| Embedded/local | ChromaDB | Zero infra, great for prototyping |

```ts
// pgvector — stays inside your existing PostgreSQL
import { pgvector } from '@pgvector/pg';

// Store
await db.query(
  'INSERT INTO documents (content, embedding) VALUES ($1, $2)',
  [text, JSON.stringify(embedding)]  // embedding is float[]
);

// Query — cosine similarity
await db.query(
  'SELECT content FROM documents ORDER BY embedding <=> $1 LIMIT 5',
  [JSON.stringify(queryEmbedding)]
);
```

---

## Prompt Engineering Principles

### Message Structure

```ts
const messages = [
  {
    role: 'system',
    content: `You are a helpful assistant for [Company].
You ONLY answer questions based on the provided context.
If the answer is not in the context, say "I don't have that information."
Do NOT make up information.`,
  },
  {
    // Retrieved chunks injected here — NOT into system prompt
    role: 'user',
    content: `Context:\n${retrievedChunks.join('\n\n')}\n\nQuestion: ${userQuery}`,
  },
];
```

### Few-Shot Examples

```ts
// ❌ Zero-shot on complex tasks — model guesses the format
"Extract entities from: John called Mary at 5pm"

// ✅ Few-shot — show the expected output format
`Extract entities. Output as JSON array.

Example:
Input: "Alice met Bob in London"
Output: [{"name":"Alice","type":"person"},{"name":"Bob","type":"person"},{"name":"London","type":"location"}]

Input: "${userText}"
Output:`
```

---

## Evals: How to Know If It's Working

```
Deterministic evals:   Output matches expected exactly → code comparison
LLM-as-judge evals:    Another LLM grades the output (1-5 scale)
Human evals:           Gold standard, expensive, for calibration
A/B testing:           Compare model/prompt versions on live traffic
```

### Eval Categories

| Category | What It Measures | Tooling |
|---|---|---|
| **Faithfulness** | Does answer match sources? | Ragas, ARES |
| **Relevance** | Does answer address the question? | LLM-as-judge |
| **Completeness** | Missing important info? | Human + LLM |
| **Groundedness** | Hallucination rate | Ragas |
| **Latency** | p50/p95 response time | OpenTelemetry |

---

## LLMOps: Production Concerns

### Cost Control

```ts
// Track tokens per request
const response = await openai.chat.completions.create({ ... });
const { prompt_tokens, completion_tokens } = response.usage;
logger.info({ prompt_tokens, completion_tokens, model: 'gpt-4o', cost_usd: calcCost() });

// Cache identical prompts — LLMs are deterministic at temp=0
const cacheKey = hash(systemPrompt + userQuery);
const cached = await cache.get(cacheKey);
if (cached) return cached;
```

### Retry with Exponential Backoff

```ts
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err.status === 429 || err.status === 503) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await sleep(delay);
        continue;
      }
      throw err;  // Non-retryable errors bubble up immediately
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Llm Engineering Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Llm Engineering
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

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review-ai`**
**Active reviewers: `logic` · `security` · `ai-code-reviewer`**

### ❌ Forbidden AI Tropes in LLM Engineering

1. **Hallucinated model names** — `gpt-5`, `claude-4`, `gemini-ultra-3` — verify against current provider docs.
2. **Prompt injection via concatenation** — never `systemPrompt + userInput`. Use separate message roles.
3. **No eval strategy** — shipping LLM features with zero eval coverage is shipping blind.
4. **Ignoring token limits** — context exceeding `max_tokens` silently fails or truncates unpredictably.
5. **No cost tracking** — LLM costs compound at scale — always instrument from day one.
6. **Synchronous LLM calls** — all LLM API calls are async. Never block the event loop waiting for them.

### ✅ Pre-Flight Self-Audit

```
✅ Are all model names verified against current provider documentation?
✅ Is user input isolated in role:"user" messages, never concatenated into system prompt?
✅ Is there retry logic with backoff for 429 / 503 errors?
✅ Is token usage logged per request for cost tracking?
✅ Is there an eval strategy (even minimal) to detect regressions?
✅ Are context windows respected — chunked or summarized if approaching limits?
```
