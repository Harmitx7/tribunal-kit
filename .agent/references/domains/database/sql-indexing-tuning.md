# SQL Query Optimization & Indexing Architecture

> **Authority**: PostgreSQL & Relational Database Engineering Standards  
> **Applicable Domains**: SQL Optimization, Database Architecture, Performance Engineering  
> **Status**: Verified Production Specification  

---

## 1. Index Type Selection Decision Matrix

| Index Type | Underlying Data Structure | Ideal Workload | Example Query Patterns |
|:---|:---|:---|:---|
| **B-Tree** (Default) | Balanced Tree | High-cardinality equality, range scans, sorting (`ORDER BY`) | `WHERE id = $1`, `WHERE created_at >= $1` |
| **GIN** (Generalized Inverted) | Inverted Index | Arrays, JSONB documents, Full-Text Search | `WHERE tags @> ARRAY['urgent']`, `WHERE data @> '{\"status\": \"active\"}'` |
| **GiST** (Generalized Search Tree) | Balanced Tree for Hierarchical/Spatial Data | Geometric shapes, range types, IP addresses | `WHERE coordinates && $1`, `WHERE date_range && $1` |
| **BRIN** (Block Range Index) | Min/Max values per physical page range | Append-only naturally ordered time-series (very small RAM footprint) | Multi-gigabyte audit logs ordered by sequential timestamp |

---

## 2. EXPLAIN Plan Analysis Essentials

Always run `EXPLAIN (ANALYZE, BUFFERS)` to diagnose slow queries:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE user_id = 42 ORDER BY created_at DESC LIMIT 10;
```

### Critical Warning Indicators in Query Plans:
1. **`Seq Scan` on High-Volume Table**: Indicates missing index or index cannot be used due to function wrapping (e.g. `WHERE lower(email) = ...` needs a functional index `CREATE INDEX ON users(lower(email))`).
2. **`Buffers: read=...` vs `shared hit=...`**: High disk read counts relative to cache hits indicate I/O bottlenecks.
3. **`Sort Method: external merge Disk`**: Memory allocation for sorting (`work_mem`) is insufficient; sort spilled to disk.

---

## 3. High-Performance Indexing Invariants

1. **Leftmost Prefix Rule for Composite Indexes**:
   An index on `(org_id, status, created_at)` can accelerate queries on:
   - `WHERE org_id = ?`
   - `WHERE org_id = ? AND status = ?`
   - `WHERE org_id = ? AND status = ? ORDER BY created_at`  
   *It CANNOT accelerate a query that only filters on `status` or `created_at` alone.*

2. **Covering Indexes (`INCLUDE` Clause)**:
   Avoid table heap lookups entirely with index-only scans by including selected payload columns:
   ```sql
   CREATE INDEX idx_users_lookup 
   ON users(email) 
   INCLUDE (first_name, last_name, role);
   ```

3. **Preventing N+1 Queries in ORM Systems**:
   Never fetch child relationships inside application iteration loops. Always use eager loading (`include` in Prisma, `selectinload` in SQLAlchemy, `joins` in SQL).
