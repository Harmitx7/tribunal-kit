---
name: llm-engineering
description: LLM engineering mastery for production AI systems. Prompt engineering, RAG pipeline design, vector store selection, embedding strategies, chunking, reranking, structured output, function calling, streaming, evals, guard-rails, cost optimization, and LLMOps. Use when building AI features, chat interfaces, semantic search, or any system calling an LLM API.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.2.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# LLM Engineering — Production AI Systems Mastery

---

## Model Selection

```
Model                    │ Use Case                              │ Cost Tier
─────────────────────────┼───────────────────────────────────────┼──────────
GPT-4o                   │ Complex reasoning, vision, code       │ $$$
GPT-4o-mini              │ Classification, summaries, chat       │ $
o3-mini                  │ Deep reasoning, math, code review     │ $$
Claude 3.7 Sonnet        │ Long documents, analysis, code        │ $$$
Claude 3.5 Haiku         │ Fast responses, simple tasks          │ $
Gemini 3.1 Pro (High)    │ Large context, multimodal, code       │ $$$
Gemini 3.0 Flash         │ High throughput, cost-efficient       │ $
Llama 3.3 70B (open)     │ Self-hosted, data privacy             │ Free*
Mistral Large 2          │ European data residency, code         │ $$

* = compute costs only

Selection rules:
1. Start with the cheapest model that passes your evals
2. Upgrade only when eval scores require it
3. Use large models for complex reasoning, small for classification/routing
4. Fine-tune ONLY after prompt engineering and RAG are exhausted
5. ❌ HALLUCINATION TRAP: Model names change frequently — always verify current names
   from provider docs before hardcoding (e.g. "gpt-4o" vs "gpt-4o-2024-11-20")
```

---

## Prompt Engineering

### System Prompt Design

```typescript
const SYSTEM_PROMPT = `You are a customer support agent for Acme Corp.

## Rules
1. Answer ONLY questions about Acme products and services.
2. If you don't know the answer, say "I'll connect you with a specialist."
3. Never discuss competitors.
4. Never make up product features or pricing.
5. Keep responses under 200 words.

## Response Format
- Use bullet points for lists
- Include product links when relevant
- End with a follow-up question

## Context
Current date: ${new Date().toISOString().split("T")[0]}
User plan: {{user_plan}}
`;

// ❌ HALLUCINATION TRAP: System prompts are NOT secrets
// Users can extract system prompts with jailbreak techniques
// Never put API keys, internal URLs, or secrets in system prompts
```

### Structured Output (JSON Mode)

```typescript
import { z } from "zod";
import OpenAI from "openai";

const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  topics: z.array(z.string()),
});

// OpenAI — json_schema mode (strict = true enforces schema exactly)
async function analyzeSentiment(text: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sentiment_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
            confidence: { type: "number" },
            reasoning: { type: "string" },
            topics: { type: "array", items: { type: "string" } },
          },
          required: ["sentiment", "confidence", "reasoning", "topics"],
          additionalProperties: false, // required for strict mode
        },
      },
    },
    messages: [{ role: "system", content: "Analyze sentiment." }, { role: "user", content: text }],
  });
  const raw = JSON.parse(response.choices[0].message.content ?? "{}");
  return SentimentSchema.parse(raw); // always validate with Zod even in strict mode
}

// Gemini — response_mime_type + response_schema
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        sentiment: { type: SchemaType.STRING, enum: ["positive", "negative", "neutral"] },
        confidence: { type: SchemaType.NUMBER },
        topics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["sentiment", "confidence", "topics"],
    },
  },
});

// ❌ HALLUCINATION TRAP: Always validate LLM JSON output with Zod/schema
// LLMs produce malformed JSON, wrong types, missing fields even with strict mode
// ❌ const result = JSON.parse(response); // trust blindly
// ✅ const result = Schema.parse(JSON.parse(response)); // validate always
```

### Function Calling / Tool Use

```typescript
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products by name, category, or price range",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          category: { type: "string", enum: ["electronics", "clothing", "home"] },
          max_price: { type: "number", description: "Maximum price in USD" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Get the status of an order by order ID",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "The order ID (e.g., ORD-12345)" },
        },
        required: ["order_id"],
      },
    },
  },
];

// Tool execution loop
async function chatWithTools(userMessage: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools,
  });

  // Process tool calls
  while (response.choices[0].finish_reason === "tool_calls") {
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    messages.push(response.choices[0].message);

    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments);
      const result = await executeFunction(call.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
    });
  }

  return response.choices[0].message.content;
}
```

---

## RAG (Retrieval-Augmented Generation)

### Pipeline

```
User Query
    ↓
[1] Embed query → vector
    ↓
[2] Search vector DB → top K chunks
    ↓
[3] (Optional) Rerank results → top N
    ↓
[4] Build prompt: system + context chunks + query
    ↓
[5] LLM generates answer with citations
    ↓
[6] Validate response (hallucination check)
```

### Chunking Strategy

```typescript
// ❌ BAD: Arbitrary character splitting
const chunks = text.match(/.{1,1000}/g); // breaks mid-sentence, mid-word

// ✅ GOOD: Semantic chunking with overlap
function chunkDocument(text: string, options: ChunkOptions = {}): Chunk[] {
  const {
    maxTokens = 512,      // chunk size
    overlapTokens = 50,    // overlap between chunks
    separator = "\n\n",    // split on paragraph boundaries first
  } = options;

  const paragraphs = text.split(separator);
  const chunks: Chunk[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (tokenCount(current + para) > maxTokens && current) {
      chunks.push({ text: current.trim(), tokens: tokenCount(current) });
      // Keep overlap from previous chunk
      const words = current.split(" ");
      current = words.slice(-overlapTokens).join(" ") + separator + para;
    } else {
      current += separator + para;
    }
  }
  if (current.trim()) chunks.push({ text: current.trim(), tokens: tokenCount(current) });

  return chunks;
}

// Chunk size guidelines:
// 256-512 tokens → precise retrieval (Q&A, support)
// 512-1024 tokens → balanced (general RAG)
// 1024-2048 tokens → broad context (summarization)
```

### Vector Store Selection

```
pgvector (PostgreSQL)  → Already using Postgres, <10M vectors, simple
Pinecone               → Managed, serverless, easy scaling
Weaviate               → Hybrid search (vector + keyword), multi-model
Qdrant                 → High performance, Rust-based, self-hostable
Chroma                 → Local development, prototyping
Milvus                 → Enterprise scale, GPU acceleration

// ❌ HALLUCINATION TRAP: Vector search is NOT keyword search
// "Apple CEO" might not find "Tim Cook runs Apple Inc."
// Use HYBRID search (vector + BM25 keyword) for production
```

---

## Streaming

```typescript
// Server-Sent Events for AI token streaming
app.get("/api/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: req.query.message as string }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// Client-side consumption
const eventSource = new EventSource(`/api/chat?message=${encodeURIComponent(msg)}`);
eventSource.onmessage = (event) => {
  if (event.data === "[DONE]") { eventSource.close(); return; }
  const { content } = JSON.parse(event.data);
  appendToChat(content);
};
```

---

## Cost Optimization

```
1. Prompt caching        → Cache system prompts (OpenAI, Anthropic support this)
2. Output token limiting → Set max_tokens to prevent runaway responses
3. Tiered models         → Use cheap models for classification, expensive for reasoning
4. Batch processing      → Use batch APIs for offline processing (50% discount)
5. Chunked context       → Send only relevant chunks, not entire documents
6. Response streaming    → Stream to reduce TTFT (time to first token)
7. Structured output     → Shorter JSON responses vs verbose prose

// Cost estimation:
// GPT-4o: ~$2.50/1M input, ~$10/1M output
// GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output
// 1M tokens ≈ 750,000 words ≈ 3,000 pages
```

---
