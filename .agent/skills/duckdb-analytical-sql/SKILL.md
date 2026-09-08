---
name: duckdb-analytical-sql
description: Embedded OLAP analytics, high-speed Parquet/JSON processing, in-memory analytical SQL, and DuckDB integrations in Node.js, Python, and WASM.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Embedded OLAP analytics, high-speed Parquet/JSON processing, in-memory analytical SQL, and DuckDB integrations in Node.js, Python, and WASM..
- **DO NOT activate when:** The task falls strictly outside duckdb-analytical-sql domain or belongs to a different dedicated specialist.

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
