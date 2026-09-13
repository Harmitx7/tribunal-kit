---
name: vector-search-pgvector
description: Use when Production vector database search using pgvector 0.8.0+, halfvec, sparsevec, Pinecone, Weaviate, hybrid sparse-dense retrieval, and iterative HNSW scanning.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - database-architect
  - sql-pro
  - advanced-rag-pipelines
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/schema_validator.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Vector Search & pgvector 0.8.0+ — 2026 Database Standards

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `vector-search-pgvector` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Production vector database search using pgvector 0.8.0+, halfvec, sparsevec, Pinecone, Weaviate, hybrid sparse-dense retrieval, and iterative HNSW scanning.
- **DO NOT activate when:** The task falls outside the `vector-search-pgvector` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

## High-Performance pgvector 0.8.0+ Schema (`halfvec` + HNSW)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    fts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding halfvec(1536) NOT NULL  -- 50% memory reduction vs float4 vector
);

-- HNSW index using halfvec with iterative scanning support (pgvector 0.8.0+)
CREATE INDEX idx_chunks_embedding_hnsw
ON document_chunks USING hnsw (embedding halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full text search GIN index
CREATE INDEX idx_chunks_fts ON document_chunks USING gin (fts_vector);
```

## Hybrid Search Query (pgvector 0.8.0+ Iterative Scan + RRF)

```sql
-- pgvector 0.8.0+ automatically performs iterative prober scans when filtering
WITH vector_search AS (
    SELECT id, content, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::halfvec) as rank
    FROM document_chunks
    WHERE document_id = $3  -- Iterative scan prevents overfiltering
    LIMIT 20
),
fts_search AS (
    SELECT id, content, ROW_NUMBER() OVER (ORDER BY ts_rank(fts_vector, websearch_to_tsquery($2)) DESC) as rank
    FROM document_chunks
    WHERE fts_vector @@ websearch_to_tsquery($2) AND document_id = $3
    LIMIT 20
)
SELECT
    COALESCE(v.id, f.id) as id,
    COALESCE(v.content, f.content) as content,
    COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + f.rank), 0.0) as rrf_score
FROM vector_search v
FULL OUTER JOIN fts_search f ON v.id = f.id
ORDER BY rrf_score DESC
LIMIT 10;
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Full Table Scan Blindspot** | Querying high-cardinality tables without index coverage | Verify query plans with EXPLAIN ANALYZE and add composite B-Tree indexes |
| **Non-Atomic Batch Mutation** | Executing multiple related DB writes sequentially without transaction wrapper | Wrap multi-table updates in an atomic transaction with automatic rollback |
| **Destructive Schema Migration** | Dropping or renaming columns in production without multi-phase migration | Use expand-and-contract: add new column, sync data, migrate callers, drop old |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are indexes defined for all foreign keys, joins, and filtered query clauses?
✅ Are transactions wrapped atomically with rollbacks on failure?
✅ Are migration scripts backwards-compatible (expand-and-contract pattern)?
✅ Did I verify column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
