---
name: advanced-rag-pipelines
description: "Use when Production-grade Retrieval-Augmented Generation (RAG) mastery. Semantic chunking, Hybrid Search (Dense + Sparse/BM25), Cross-Encoder Reranking, and architecture-agnostic vector database management."
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
