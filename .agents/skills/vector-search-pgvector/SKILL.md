---
name: vector-search-pgvector
description: "Use when Production vector database search using pgvector 0.8.0+, halfvec, sparsevec, Pinecone, Weaviate, hybrid sparse-dense retrieval, and iterative HNSW scanning."
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
