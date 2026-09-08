---
name: vector-search-pgvector
description: Production vector database search using pgvector 0.8.0+, halfvec, sparsevec, Pinecone, Weaviate, hybrid sparse-dense retrieval, and iterative HNSW scanning.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
script: .agent/scripts/schema_validator.js
scripts-binding:
  - .agent/scripts/schema_validator.js
skills:
  - database-architect
  - sql-pro
  - advanced-rag-pipelines
---

# Vector Search & pgvector 0.8.0+ — 2026 Database Standards

## Mandatory Pre-Flight Context Inspection

Before creating vector tables or indexes:

1. Index Type & Precision → Use `halfvec` (half-precision) for 50% RAM savings on HNSW indexes; use `sparsevec` for high-dimensional sparse vectors
2. Iterative Index Scans (pgvector 0.8.0+) → Enable iterative scanning to prevent HNSW overfiltering when combining `WHERE` clauses with vector similarity
3. Hybrid Search Strategy → Combine BM25 full-text search with dense vector similarity via Reciprocal Rank Fusion (RRF)


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Production vector database search using pgvector 0.8.0+, halfvec, sparsevec, Pinecone, Weaviate, hybrid sparse-dense retrieval, and iterative HNSW scanning..
- **DO NOT activate when:** The task falls strictly outside vector-search-pgvector domain or belongs to a different dedicated specialist.

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

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
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
