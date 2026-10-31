---
name: clickhouse-olap-engineering
description: "Use when designing columnar analytical schemas with ClickHouse, MergeTree engines, sorting keys, partitioning strategies, and real-time ingestion pipelines."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - throughput-optimizer
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
  - "clickhouse olap engineering"
  - "clickhouse mergetree engine"
  - "columnar database architecture"
  - "clickhouse sorting key"
  - "clickhouse partitioning"
  - "realtime analytical ingestion"
---

# ClickHouse Columnar Database Architecture & OLAP Engineering

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `clickhouse-olap-engineering` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify workload profile: Analytical read-heavy aggregate queries over billions of rows vs OLTP point updates
2. **Runtime Context & Platform Invariants**: Select primary sorting key (`ORDER BY (tenant_id, event_date, event_type)`) to match filter patterns
3. **Execution Guardrails**: Choose partitioning strategy (`PARTITION BY toYYYYMM(event_date)`) avoiding excessive parts (> 1,000 parts per table)
4. **Validation & Type Contracts**: Confirm batch ingestion architecture: ClickHouse requires inserts in batches of 10,000+ rows (never single-row inserts)
5. **Observability & Proof of Execution**: Inspect materialized views for real-time pre-aggregated metrics

## Activation Boundaries
- **Activate when:** Use when designing columnar analytical schemas with ClickHouse, MergeTree engines, sorting keys, partitioning strategies, and real-time ingestion pipelines.
- **DO NOT activate when:** The task falls outside the `clickhouse-olap-engineering` domain or is managed by a different dedicated specialist agent.

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
1. **Never execute single-row `INSERT` statements into ClickHouse**: buffer writes in Kafka, vector, or an in-memory batcher and write in blocks of 10,000 - 100,000 rows.
2. **Partition by month, NOT by day**: daily partitioning creates thousands of small data parts that exhaust memory and trigger `Too many parts in all data parts in table` errors.
3. **The primary sorting key (`ORDER BY`) determines data physical layout**: place low-cardinality equality filters first to maximize data compression and sparse index skipping.
4. **Avoid point updates and deletes**: ClickHouse is append-only. Use `ReplacingMergeTree` or `CollapsingMergeTree` for deduplication.

## Hallucination Traps (Read First)
❌ Inserting 1 row per HTTP request → ✅ Buffer events into micro-batches of 1-5 seconds or 10,000 rows
❌ Partitioning by user ID or day resulting in 50,000 parts → ✅ Partition by month: `PARTITION BY toYYYYMM(event_time)`
❌ Using `JOIN` between two billion-row tables without filtering → ✅ In ClickHouse, always filter the larger table before joining or use dictionaries for lookup tables
❌ Using nullable columns unnecessarily → ✅ Nullable columns in ClickHouse add a separate mask file, degrading compression and vectorized SIMD speeds

---

### 1. High-Performance ClickHouse MergeTree Table
```sql
CREATE TABLE event_analytics (
  tenant_id LowCardinality(String),
  event_time DateTime64(3, 'UTC'),
  event_name LowCardinality(String),
  user_id UUID,
  duration_ms UInt32,
  attributes Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_name, event_time, user_id)
SETTINGS index_granularity = 8192;
```

### 2. Real-Time Aggregation with Materialized Views
```sql
-- Destination table for hourly rollups
CREATE TABLE event_hourly_aggregates (
  tenant_id LowCardinality(String),
  event_hour DateTime,
  event_name LowCardinality(String),
  total_events UInt64,
  avg_duration Float64
)
ENGINE = SummingMergeTree()
PRIMARY KEY (tenant_id, event_hour, event_name);

-- Materialized View updates target table atomically upon ingestion
CREATE MATERIALIZED VIEW mv_event_hourly_aggregates
TO event_hourly_aggregates AS
SELECT
  tenant_id,
  toStartOfHour(event_time) AS event_hour,
  event_name,
  count() AS total_events,
  avg(duration_ms) AS avg_duration
FROM event_analytics
GROUP BY tenant_id, event_hour, event_name;
```

---

## Diagnostic Procedures & Verification Commands
### Verification & Part Monitoring
1. Monitor active parts per partition:
   ```sql
   SELECT partition, count() AS parts_count, formatReadableSize(sum(bytes_on_disk)) AS total_size
   FROM system.parts
   WHERE table = 'event_analytics' AND active = 1
   GROUP BY partition
   ORDER BY partition DESC;
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


