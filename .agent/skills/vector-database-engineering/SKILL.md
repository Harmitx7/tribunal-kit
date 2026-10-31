---
name: vector-database-engineering
description: "Use when tuning vector search indexes (HNSW, IVFFlat), optimizing distance metrics, configuring hybrid BM25 + dense search, and budgeting vector memory."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - vector-search-pgvector
  - llm-engineering
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "vector database engineering"
  - "hnsw index tuning"
  - "ivfflat vs hnsw"
  - "hybrid vector search bm25"
  - "vector search performance"
  - "pgvector optimization"
---

# Vector Database (pgvector/HNSW) Indexing & Retrieval Engineering

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `vector-database-engineering` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Confirm embedding vector dimensionality (e.g. 768 for small models, 1536 for text-embedding-3-small, 3072 for large)
2. **Runtime Context & Platform Invariants**: Select appropriate distance metric: Cosine distance (`<=>`), L2 Euclidean distance (`<->`), or Inner Product (`<#>` for normalized vectors)
3. **Execution Guardrails**: Determine index type: HNSW (fast, high recall, larger RAM) vs IVFFlat (faster build, lower RAM)
4. **Validation & Type Contracts**: Size `work_mem` and `maintenance_work_mem` in PostgreSQL prior to building vector indexes
5. **Observability & Proof of Execution**: Configure hybrid search combining dense embeddings with sparse full-text search (`tsvector`) via Reciprocal Rank Fusion

## Activation Boundaries
- **Activate when:** Use when tuning vector search indexes (HNSW, IVFFlat), optimizing distance metrics, configuring hybrid BM25 + dense search, and budgeting vector memory.
- **DO NOT activate when:** The task falls outside the `vector-database-engineering` domain or is managed by a different dedicated specialist agent.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Invariants
1. **Always normalize vectors to unit length when using Dot Product**: Inner Product on normalized vectors is mathematically identical to Cosine Similarity but significantly faster to compute.
2. **Allocate sufficient `maintenance_work_mem` before building HNSW indexes**: building HNSW on 1M vectors requires minimum 1-2GB RAM.
3. **Tune `hnsw.ef_search` per query**: balance latency vs recall ($ef_search = 40$ for fast standard search, $ef_search = 100$ for high recall).
4. **Combine dense vector search with lexical full-text search (BM25)**: pure vector search fails on exact keyword, acronym, and SKU lookups.

## Hallucination Traps (Read First)
❌ Using IVFFlat without re-indexing after adding 10x more vectors → ✅ HNSW dynamically accommodates growth without re-clustering
❌ Storing high-dimensional vectors (3072 dims) when a 768-dim model delivers 98% equal recall at 25% memory cost → ✅ Right-size embedding models
❌ Building HNSW without setting `m` and `ef_construction` parameters → ✅ Default parameters may produce sub-optimal recall
❌ Filtering vector queries without composite indexes on metadata → ✅ Use partial HNSW indexes or metadata filtering shims

---

### 1. High-Performance HNSW Vector Indexing in PostgreSQL
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Target table with 1536-dimensional embeddings (e.g. OpenAI text-embedding-3-small)
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tune memory for building index fast
SET maintenance_work_mem = '2GB';

-- Build HNSW index with calibrated m (connections per node) and ef_construction (build search depth)
CREATE INDEX CONCURRENTLY idx_document_embeddings_hnsw
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2. Hybrid Search (Dense Vector + Full-Text Search via Reciprocal Rank Fusion)
```sql
WITH semantic_search AS (
  SELECT id, rank() OVER (ORDER BY embedding <=> $1) as r_rank
  FROM document_embeddings
  ORDER BY embedding <=> $1
  LIMIT 20
),
keyword_search AS (
  SELECT id, rank() OVER (ORDER BY ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', $2)) DESC) as k_rank
  FROM document_embeddings
  WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
  LIMIT 20
)
SELECT COALESCE(s.id, k.id) as id,
       -- RRF Formula: 1 / (60 + rank)
       COALESCE(1.0 / (60 + s.r_rank), 0.0) + COALESCE(1.0 / (60 + k.k_rank), 0.0) as rrf_score
FROM semantic_search s
FULL OUTER JOIN keyword_search k ON s.id = k.id
ORDER BY rrf_score DESC
LIMIT 10;
```

---

## Diagnostic Procedures & Verification Commands
### Recall & Latency Verification
1. Inspect HNSW index statistics and memory footprint:
   ```sql
   SELECT pg_size_pretty(pg_relation_size('idx_document_embeddings_hnsw'));
   ```
2. Benchmark query latency with EXPLAIN ANALYZE:
   ```sql
   SET hnsw.ef_search = 60;
   EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM document_embeddings ORDER BY embedding <=> $1 LIMIT 10;
   ```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?
✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?
✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?
✅ Did I verify table and column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


