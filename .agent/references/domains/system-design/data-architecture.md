# Database & Data Architecture: Selection, Sharding & Isolation

> **Authority**: PostgreSQL Core Documentation & Martin Kleppmann (DDIA)  
> **Applicable Domains**: Data Architecture, Database Design, Storage Engines, Sharding  
> **Status**: Verified Production Specification  

---

## 1. Polyglot Storage Decision Matrix

| Engine Type | Representative Tech | Optimal Access Pattern | Inappropriate For | Scaling Bottleneck |
|:---|:---|:---|:---|:---|
| **Relational (RDBMS)** | PostgreSQL, MySQL | Complex relations, ACID transactions, strict schemas | Unbounded unstructured text, >50k write QPS on 1 node | Vertical scale limit; sharding complexity |
| **Key-Value Store** | Redis, DynamoDB | O(1) primary key lookups, sessions, fast caching | Complex multi-table joins, ad-hoc aggregation | In-memory RAM cost (Redis); partition keys |
| **Document Store** | MongoDB, Couchbase | Hierarchical self-contained entities, rapid schema drift | Deep relational graphs, high cross-document transactions | Unbalanced document sizes, duplicate data |
| **Wide-Column** | Cassandra, ScyllaDB | Append-heavy time-series, linear horizontal write scaling | ACID multi-entity transactions, arbitrary secondary queries | Tombstones on frequent updates/deletes |
| **Search Engine** | Elasticsearch, OpenSearch | Full-text search, fuzzy matching, faceted filtering | Primary source of truth, frequent updates | Index rebuild overhead, high memory usage |
| **OLAP Data Lake** | ClickHouse, Snowflake, DuckDB | Columnar scan of billions of rows, aggregations | High-frequency point mutations (single-row updates) | Row-by-row write latency |

---

## 2. Transaction Isolation Levels & Anomalies (ANSI SQL vs Reality)

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly | Implementation Mechanism |
|:---|:---:|:---:|:---:|:---:|:---|
| **Read Uncommitted** | Possible | Possible | Possible | Possible | Read without locks (rarely used) |
| **Read Committed** | ❌ Prevented | Possible | Possible | Possible | Snapshot at *statement* level (PostgreSQL default) |
| **Repeatable Read** | ❌ Prevented | ❌ Prevented | ❌ Prevented (in PG) | Possible (Write Skew) | Snapshot at *transaction* start via MVCC |
| **Serializable** | ❌ Prevented | ❌ Prevented | ❌ Prevented | ❌ Prevented | SSI (Serializable Snapshot Isolation) / 2PL |

*Crucial Gotcha: Write Skew*:
Two concurrent transactions read conflicting states (e.g. two doctors on call; both see count=2 and concurrently unregister), resulting in count=0. Repeatable Read does NOT prevent write skew; require `SELECT ... FOR UPDATE` or `Serializable`.

---

## 3. Database Scaling: Replicas vs Sharding

### Phase 1: Vertical Scaling & Read Replicas
1. **Vertical**: Scale instance size (e.g., up to 64 vCPU, 256GB RAM).
2. **Read-Replicas**: Offload reads asynchronously.
   - *Risk: Replication Lag*: User edits profile, immediately redirects to view page, and reads stale replica.
   - *Mitigation (Read-Your-Writes)*: Route read to primary DB for 5 seconds after a user write, or check transaction LSN (Log Sequence Number).

### Phase 2: Horizontal Partitioning (Sharding)
Split rows across multiple database servers:
1. **Range Sharding**: By range (e.g., User ID A-M, N-Z). Simple, but creates hot partitions during sequential onboarding.
2. **Hash Sharding**: By hash of key (`hash(user_id) % num_shards`). Even distribution, but expensive to rebalance.
3. **Consistent Hashing**: Keys and servers mapped to virtual ring (tokens). Adding a node only migrates $K/N$ keys, avoiding global cluster rebalancing.

---

## 4. Zero-Downtime Schema Migrations (Expand-and-Contract)

Never alter, rename, or drop production columns in a single blocking migration:

```
[Phase 1: Expand]
  • Add new column 'phone_number_v2' (nullable, no locking default).
  • Application writes to BOTH old and new columns; reads from old.

[Phase 2: Backfill]
  • Run background worker batching historical copy in chunks of 1,000 rows.

[Phase 3: Switch Reads]
  • Application reads from 'phone_number_v2'. Still dual-writes.

[Phase 4: Contract]
  • Cease writing to old column. Drop old column during low-traffic maintenance.
```

---

## 5. Change Data Capture (CDC)
Instead of dual-writing from application code (which risks cache-DB inconsistency on crash), tail the database Write-Ahead Log (WAL) using tools like **Debezium**:
$$\text{App} \xrightarrow{\text{ACID Write}} \text{Primary DB (WAL)} \xrightarrow{\text{CDC Stream}} \text{Kafka} \xrightarrow{\text{Async Update}} [\text{Elasticsearch, Redis, Read Replicas}]$$
