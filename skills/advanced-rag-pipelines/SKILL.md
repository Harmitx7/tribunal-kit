---
name: advanced-rag-pipelines
description: Use when Production-grade Retrieval-Augmented Generation (RAG) mastery. Semantic chunking, Hybrid Search (Dense + Sparse/BM25), Cross-Encoder Reranking, and architecture-agnostic vector database management.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - llm-engineering
  - ai-prompt-injection-defense
  - database-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Advanced RAG Pipelines (Production AI Data)

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `advanced-rag-pipelines` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production-grade Retrieval-Augmented Generation (RAG) mastery. Semantic chunking, Hybrid Search (Dense + Sparse/BM25), Cross-Encoder Reranking, and architecture-agnostic vector database management.
- **DO NOT activate when:** The task falls outside the `advanced-rag-pipelines` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 RAG Performance & Vector Invariants

1. **Reciprocal Rank Fusion (RRF)**:
   ```python
   # Combine dense + sparse rankings without normalizing disparate score distributions
   def rrf(dense_ranks: dict[str, int], sparse_ranks: dict[str, int], k: int = 60) -> dict[str, float]:
       scores = {}
       for doc_id, rank in dense_ranks.items():
           scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
       for doc_id, rank in sparse_ranks.items():
           scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
       return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
   ```
2. **HNSW Indexing with Halfvec (pgvector 0.8+)**:
   ```sql
   -- Halves memory usage with < 1% recall loss
   CREATE INDEX idx_docs_embedding ON documents
   USING hnsw ((embedding::halfvec(1536)) halfvec_cosine_ops);
   ```
3. **Aggressive Context Pruning**: Never dump > 5 chunks into the final LLM prompt. Context dilution ("Lost in the Middle") degrades factual recall and spikes latency.

## Hallucination Traps (Read First)

- ❌ Fixed-character chunking (e.g. split every 500 chars) → ✅ AST/Markdown-aware structural chunking
- ❌ Relying only on cosine similarity on raw queries → ✅ Hybrid search (Dense + BM25) with cross-encoder rerank
- ❌ Injecting raw text into system prompt → ✅ Enclose in `<retrieved_context>` tags to prevent indirect prompt injection
- ❌ Full precision FP32 vectors on massive datasets → ✅ Use FP16 (`halfvec`) or scalar quantization

---

## 2. Advanced Architectural Patterns

### A. Semantic Chunking

Instead of splitting text every 1000 characters, split by structural bounds:

- **Code:** Split by Abstract Syntax Tree (AST) nodes (functions, classes).
- **Markdown:** Split by Header levels (`##`).
- **Prose:** Use LLM-assisted proposition extraction (extracting atomic facts from sentences).

### B. Two-Stage Retrieval (Reranking)

```text
1. User Query -> Embed -> Vector DB (Pinecone/Milvus/Pgvector)
2. Retrieve Top K = 50 (Fast, low precision)
3. Pass (Query + 50 Chunks) to Cross-Encoder (e.g., Cohere Rerank, BGE-Reranker)
4. Reranker outputs Top N = 5 (Slow, high precision)
5. Pass Top 5 to LLM Context
```

### C. Query Transformation

Never embed the user's raw query directly. Users write poor queries.

- **HyDE (Hypothetical Document Embeddings):** Have the LLM write a fake answer to the query, then embed that fake answer to search the Vector DB.
- **Query Routing:** Route "summarize" queries to a Graph database, and "how do I" queries to the Vector DB.

## 3. LLM Traps & Pre-Flight Checks

- **TRAP:** Sending 20 chunks to the LLM. This dilutes the context (Lost in the Middle phenomenon) and increases cost.
- **FIX:** Always rerank and aggressively filter down to 3-5 highly relevant chunks before the generation step.
- **TRAP:** Not attaching metadata to chunks.
- **FIX:** Always attach `{ source_file, line_numbers, date, author }` to the vector payload. This allows the Vector DB to pre-filter before calculating cosine similarity.

## Verification Protocol

Before submitting code, ensure:

1. Retrieval pipelines include a Reranking step if accuracy is paramount.
2. BM25 / Sparse search is considered alongside standard dense embeddings.
3. Chunks are injected into the final LLM prompt with explicit `<context>` XML boundaries to prevent prompt injection.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                | What AI Commonly Does Wrong                                                  | What Is Actually Correct                                                  |
| :-------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Unchecked Payload Cast**  | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing        | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query**   | Concatenating user inputs into SQL/Prisma query strings                      | Always use parameterized bindings or type-safe ORM query builders         |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication checks performed before business logic execution?
✅ Did I verify that imported dependencies exist in package.json/requirements.txt?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
