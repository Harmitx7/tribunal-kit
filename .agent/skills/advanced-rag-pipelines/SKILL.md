---
name: advanced-rag-pipelines
description: Production-grade Retrieval-Augmented Generation (RAG) mastery. Semantic chunking, Hybrid Search (Dense + Sparse/BM25), Cross-Encoder Reranking, and architecture-agnostic vector database management.
---

# Advanced RAG Pipelines (Production AI Data)

You are an expert in building production-grade Retrieval-Augmented Generation (RAG) data pipelines. You understand that naive RAG (fixed chunking + Cosine similarity) fails in production. You architect systems that retrieve context with high precision using hybrid search, reranking, and semantic strategies.

## 1. Core Principles
- **Garbage In, Garbage Out:** Vector embeddings are only as good as the chunking strategy. Never use arbitrary character counts for chunking code or complex documents.
- **Hybrid Search is Mandatory:** Dense vectors (embeddings) are terrible at exact keyword matches (e.g., finding "ID-4912" or "v4.4.4"). Always combine Dense Search with Sparse Search (BM25) to catch both semantic intent and exact matches.
- **Retrieve Many, Rerank to Few:** It is cheaper and more accurate to retrieve 50 candidate chunks from a Vector DB and use a Cross-Encoder to rerank them down to the top 5 for the LLM.

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
