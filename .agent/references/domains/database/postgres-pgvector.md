# PostgreSQL pgvector Engineering & Indexing Reference

> **Authority**: pgvector (`https://github.com/pgvector/pgvector`) & PostgreSQL Documentation  
> **Applicable Domains**: Database Architecture, Vector Search, AI / RAG Pipelines  
> **Status**: Verified Specification Reference  

---

## 1. Distance Operators & Metrics

Choose the exact operator matching the distance metric used during model training:

| Metric | Operator | Operator Class | Recommended When |
|:---|:---:|:---|:---|
| **Cosine Distance** | `<=>` | `vector_cosine_ops` | Normalized text/image embeddings (OpenAI, Cohere, BGE) |
| **L2 / Euclidean Distance** | `<->` | `vector_l2_ops` | Unnormalized geometric vectors, spatial clusters |
| **Inner Product / Dot Product** | `<#>` | `vector_ip_ops` | Specifically trained inner-product models (returns negative) |

> ⚠️ **Critical**: Mixing distance operators (e.g. querying with `<=>` when the index was built with `vector_l2_ops`) bypasses the index and triggers a full sequential scan!

---

## 2. Index Architecture: HNSW vs IVFFlat

### HNSW (Hierarchical Navigable Small World) — Recommended for 95%+ of workloads
- **Advantages**: Superior query latency and recall; works immediately without requiring pre-populated data.
- **Index Definition**:
  ```sql
  CREATE INDEX CONCURRENTLY idx_documents_embedding_hnsw 
  ON documents 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- **Tuning Parameters**:
  - `m` (Default: `16`): Max connections per layer. Increase (e.g. `24`–`32`) for higher recall at the cost of index build time and RAM.
  - `ef_construction` (Default: `64`): Search depth during index build. Increase (e.g. `128`) for better index graph quality.
  - `hnsw.ef_search` (Query-time parameter, Default: `40`): Set in session (`SET hnsw.ef_search = 100;`) to trade query latency for higher recall.

### IVFFlat (Inverted File with Flat Compression)
- **When to use**: Strict RAM limitations where HNSW index memory cannot be accommodated.
- **Requirement**: Never create IVFFlat on an empty table! Data must be preloaded so cluster centroids can be calculated properly.
- **Formula**: `lists = round(sqrt(total_rows))` for tables up to 1M rows; `lists = round(sqrt(total_rows) * 1.5)` for larger.

---

## 3. Production Query Recipes

### Parameterized Cosine Similarity Search
```sql
SELECT 
  id, 
  title, 
  1 - (embedding <=> $1::vector) AS similarity_score
FROM documents
WHERE tenant_id = $2
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

### Composite Filtering (Metadata + Vector)
When querying vector similarities combined with tenant or status filters, standard vector indexes can suffer from post-filter starvation.
- **Solution**: Create a partial HNSW index or partitioned table:
  ```sql
  CREATE INDEX idx_active_docs_embedding 
  ON documents USING hnsw (embedding vector_cosine_ops)
  WHERE is_deleted = false;
  ```
