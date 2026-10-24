# Real-World System Design Blueprints & Production Scenarios

> **Authority**: System Design Engineering Literature & Real-World Production Postmortems  
> **Applicable Domains**: Production Blueprints, Reference Architectures, Scenario Analysis  
> **Status**: Verified Production Specification  

---

## 1. Scenario 1: Scalable URL Shortener
- **Functional Requirements**: Shorten long URL $\rightarrow$ 7-character string; redirect short URL with HTTP 301/302; track click count.
- **Capacity**: $100\text{M new URLs/month } (\approx 40\text{ write RPS})$, $4,000\text{ read RPS } (100:1)$, $5\text{ yrs } \approx 13.5\text{ TB total storage}$.
- **Key Generation Strategy**: Base62 encoding (`[a-zA-Z0-9]`). $62^7 \approx 3.5\text{ Trillion}$ unique keys.
  - *Option A*: Pre-generated key service (KGS) issuing unused tokens in memory $\rightarrow$ Zero collision check needed.
  - *Option B*: MurmurHash3 of URL + UserID $\rightarrow$ Take first 7 Base62 chars; handle collisions with incremental salt.
- **Storage**: Key-value or NoSQL store (DynamoDB/Cassandra) partitioned by short key.
- **Caching**: 48GB Redis cluster caching 20% most active URLs ($>95\%$ cache hit rate).

---

## 2. Scenario 2: Real-Time Chat Platform
- **Functional Requirements**: 1:1 messaging, group chats (up to 500 users), online presence, message history.
- **Connection Tier**: Stateless WebSocket gateway pods; maintain open TCP connections; connection registry mapped in Redis:
  $$\text{User ID } \longrightarrow \text{Gateway Pod IP / Socket ID}$$
- **Message Storage**: Wide-column store (ScyllaDB/Cassandra) keyed by `chat_id` and clustering key `timestamp DESC`.
- **Fan-Out Model**:
  - *1:1 Chat*: Direct delivery to recipient's connected gateway pod via Redis Pub/Sub.
  - *Small Groups*: Fan-out on write to all member queues.
  - *Offline Users*: Route event to Push Notification worker (FCM/APNs).

---

## 3. Scenario 3: Multi-Tenant Enterprise SaaS
- **Core Requirements**: Tenant data isolation, custom quotas, tenant-level rate limiting, compliance audit trail.
- **Data Model**: PostgreSQL Pool model with native Row-Level Security (RLS) on all tables (`tenant_id = current_setting('app.tenant_id')`).
- **Rate Limiting**: Hierarchical Token Bucket:
  $$\text{Global Rate Limit (Per IP)} \longrightarrow \text{Tenant Plan Quota (e.g. 5,000 req/min)} \longrightarrow \text{User Quota}$$
- **Resource Protection**: Dedicated worker pools for high-volume enterprise tenants to prevent noisy-neighbor starvation.

---

## 4. Scenario 4: High-Throughput Event Processing Platform
- **Throughput**: $100,000\text{ events/sec}$ telemetry stream with spikes to $300,000\text{ events/sec}$.
- **Ingestion**: Apache Kafka topic with $64\text{ partitions}$ keyed by `device_id` (guarantees device event ordering).
- **Consumer Layer**: 64 consumer pods scaling via Kubernetes KEDA based on consumer lag.
- **Resilience**: Idempotent consumer writes to ClickHouse/TimescaleDB using upsert keys; failed batches routed to DLQ after 3 retries.

---

## 5. Scenario 5: Database-Heavy Read/Write Bottleneck
- **Problem**: Monolith database at 95% CPU, lock contention, slow queries ($p99 > 3\text{ seconds}$).
- **Remediation Pipeline**:
  1. Route serverless traffic through transaction-mode connection pooler (PgBouncer).
  2. Implement covering indexes on top 5 slow queries (`EXPLAIN ANALYZE`).
  3. Deploy 2 Read Replicas for reporting/search queries.
  4. Enforce Read-Your-Writes consistency via session cookie redirecting recent writers to primary for 5 seconds.
  5. Partition large tables ($>100\text{M rows}$) by date range (`CREATE TABLE ... PARTITION BY RANGE (created_at)`).

---

## 6. Scenario 6: Global Multi-Region Disaster Recovery
- **Requirement**: $RTO < 5\text{ minutes}$, $RPO < 1\text{ minute}$; survive total loss of Primary AWS Region (`us-east-1`).
- **Architecture**: Active-Passive Warm Standby in `us-west-2`.
- **Replication**: Aurora Global Database / Cross-region asynchronous read replica with continuous replication lag monitoring.
- **Failover Automation**: Route 53 health check alarms initiate Route 53 DNS failover and promote secondary database cluster automatically via Lambda.

---

## 7. Scenario 7: Legacy Monolith Decomposition
- **Strategy**: Strangler Fig Pattern on `/api/v1/billing`.
- **Data Migration**: Deploy Debezium CDC connector on Monolith database $\rightarrow$ stream billing row mutations to Kafka topic $\rightarrow$ sync to new Billing Microservice database.
- **Traffic Phasing**: Shadow traffic (100% dark launch for 7 days) $\rightarrow$ Canary traffic ($1\% \rightarrow 10\% \rightarrow 50\% \rightarrow 100\%$) via feature flags $\rightarrow$ Decommission legacy billing controller.

---

## 8. Scenario 8: High-Throughput AI Model Inference Platform
- **Requirement**: Serve LLM inference ($p95 < 800\text{ ms}$ time-to-first-token), handle bursty traffic, optimize GPU cluster costs.
- **Model Serving Tier**: Triton Inference Server or vLLM running on Kubernetes GPU nodes (NVIDIA A100/H100).
- **Dynamic Batching**: Group incoming requests across an internal $20\text{ ms}$ window to saturate GPU tensor cores.
- **Caching**: Semantic cache using pgvector / Redis vector store ($>80\%$ cosine similarity returns cached answer immediately without GPU computation).
- **Fallback**: Queue overflow sheds traffic to external hosted cloud API (fallback provider) to protect local SLOs.

---

## 9. System Design Education: Interview vs Production Reality

| Dimension | System Design Interview Convention | Production Reality |
|:---|:---|:---|
| **Traffic Numbers** | Candidate invents "assume 500M DAU" | "What is the verified telemetry? Start small, scale when bottlenecked." |
| **Complexity Bias** | Candidate rushes to microservices, Kafka, Redis | Monolith + PostgreSQL is the default until concrete metrics demand distribution. |
| **Failures** | Assumes components work once drawn | Hardware fails, networks partition, clocks drift, deployments introduce bugs. |
| **Costs** | Ignored completely | Cost is a first-class architectural constraint (FinOps). |
