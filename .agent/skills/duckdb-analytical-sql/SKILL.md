---
name: duckdb-analytical-sql
description: Embedded OLAP analytics, high-speed Parquet/JSON processing, in-memory analytical SQL, and DuckDB integrations in Node.js, Python, and WASM.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/schema_validator.js
scripts-binding:
  - .agent/scripts/schema_validator.js
skills:
  - sql-pro
  - database-design
  - performance-profiling
---

# DuckDB Analytical SQL — Embedded Analytics

## Mandatory Pre-Flight Context Inspection

Before writing analytical queries:
1. Direct File Querying → Query Parquet/CSV/JSON directly without importing into a traditional DB
2. Memory Allocation → Set explicit memory limit (`SET max_memory = '4GB'`) to prevent OOM
3. Vectorized Engine Usage → Use column-oriented aggregation over line-by-line loops

## Node.js DuckDB Parquet Query Pattern

```typescript
import { Database } from 'duckdb-async';

export async function runAnalyticalReport(parquetGlobPath: string) {
  const db = await Database.create(':memory:');
  
  // Set memory limits for embedded execution
  await db.exec("SET max_memory = '2GB'; SET threads = 4;");

  const rows = await db.all(`
    SELECT 
        date_trunc('day', timestamp) as event_day,
        event_type,
        COUNT(*) as total_count,
        QUANTILE_CONT(duration_ms, 0.95) as p95_latency
    FROM read_parquet(?)
    GROUP BY 1, 2
    ORDER BY 1 DESC
    LIMIT 100
  `, [parquetGlobPath]);

  return rows;
}
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Verify query execution on sample Parquet dataset without loading entire file into RAM.
- Benchmark query throughput against memory constraints.
