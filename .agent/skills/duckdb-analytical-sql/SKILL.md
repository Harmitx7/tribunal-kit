---
name: duckdb-analytical-sql
description: "Use when Embedded OLAP analytics, high-speed Parquet/JSON processing, in-memory analytical SQL, and DuckDB integrations in Node.js, Python, and WASM."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - sql-pro
  - database-design
  - performance-profiling
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/schema_validator.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# DuckDB Analytical SQL — Embedded Analytics

---

## 🛠️ Technical Architecture & Reference Recipes

## Node.js DuckDB Parquet Query Pattern

```typescript
import { Database } from 'duckdb-async';

export async function runAnalyticalReport(parquetGlobPath: string) {
  const db = await Database.create(':memory:');

  // Set memory limits for embedded execution
  await db.exec("SET max_memory = '2GB'; SET threads = 4;");

  const rows = await db.all(
    `
    SELECT 
        date_trunc('day', timestamp) as event_day,
        event_type,
        COUNT(*) as total_count,
        QUANTILE_CONT(duration_ms, 0.95) as p95_latency
    FROM read_parquet(?)
    GROUP BY 1, 2
    ORDER BY 1 DESC
    LIMIT 100
  `,
    [parquetGlobPath],
  );

  return rows;
}
```
