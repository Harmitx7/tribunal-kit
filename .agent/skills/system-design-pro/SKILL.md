---
name: system-design-pro
description: Industry-level system design mastery for interviews and production. The 6-step design framework, scale estimation (DAU→QPS→storage→bandwidth), core building blocks (load balancers L4/L7, CDN, caches, queues), database selection matrix, CAP Theorem applied, and reference designs for URL shortener, rate limiter, Twitter feed, distributed cache, and notification system. Use when designing systems for scale, conducting architecture reviews, or preparing system design discussions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-06-21
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
routing:
  domain: architecture
  tier: pro
  trigger-signals:
    strong: [design a system, scale estimation, CAP Theorem, rate limiter]
---

## Hallucination Traps (Read First)

- ❌ "Just use microservices" for <10K RPM → ✅ Microservices add operational complexity that kills small teams. Start monolith.
- ❌ Adding database sharding before exhausting vertical scaling → ✅ Sharding is a last resort. Try: connection pooling → read replicas → caching → vertical scaling first.
- ❌ Applying CQRS to simple CRUD apps → ✅ CQRS is only justified when read and write models genuinely diverge at scale.
- ❌ Choosing NoSQL because "it scales better" → ✅ NoSQL sacrifices ACID transactions and query flexibility. Choose based on data model, not hype.
- ❌ Designing for peak load from day one → ✅ Design for 3-5x current load. Over-engineering kills velocity. Add complexity when measured, not speculated.

---

# System Design Pro — Industry-Level Mastery

## 1. The 6-Step Design Framework

Use this structure for every system design discussion:

```
Step 1: CLARIFY SCOPE (5 min)
  → What features are in scope for THIS design?
  → Read-heavy or write-heavy?
  → What are the consistency requirements? (eventual OK, or strict?)
  → What are the latency requirements?

Step 2: ESTIMATE SCALE (5 min)
  → Daily Active Users (DAU)
  → Queries Per Second (QPS) — read and write separately
  → Data storage growth per year
  → Bandwidth (inbound + outbound)

Step 3: DEFINE THE API (5 min)
  → Sketch the core API endpoints / interfaces
  → Defines the contract before implementation details

Step 4: DATA MODEL (10 min)
  → Which database type? (SQL / NoSQL / Graph / Time-series)
  → Core entities and relationships
  → Key fields, indexes

Step 5: HIGH-LEVEL DESIGN (15 min)
  → Draw the boxes: clients → LB → services → DB → cache
  → Happy path data flow

Step 6: DEEP DIVE (20 min)
  → Bottleneck analysis
  → Scaling strategies for the identified bottleneck
  → Failure modes and mitigations
```

---

## 2. Scale Estimation (The Math)

### Reference Numbers

```
Latency Numbers Every Engineer Should Know:
  L1 cache reference:              0.5 ns
  Main memory access:              100 ns
  SSD random read:                 150 μs
  Read 1 MB from SSD:             1 ms
  Round trip within datacenter:   500 μs
  Round trip CA to Netherlands:   150 ms

Storage:
  1 character = 1 byte
  1 photo (compressed) = 300 KB
  1 video (1 min, 720p) = 50 MB
  1 tweet = ~280 bytes

Throughput:
  1 server handles:   ~10K connections (nginx), ~1K QPS (Node.js CPU-bound)
  PostgreSQL:         ~5K–10K simple queries/sec
  Redis:              ~100K–1M ops/sec
```

### Worked Example: Twitter-Scale Feed

```
Given:
  DAU = 300M users
  Each user reads feed 5x/day → 1.5B read requests/day
  Each user posts 1 tweet/week → 43M writes/day

Calculations:
  Read QPS  = 1,500,000,000 / 86,400 = ~17,400 QPS
  Write QPS = 43,000,000 / 86,400    = ~500 QPS
  Ratio     = 35:1 (heavily read-dominant → aggressive caching justified)

Storage (tweets):
  43M tweets/day × 280 bytes = ~12 GB/day
  12 GB × 365 = ~4.4 TB/year for text
  (media stored separately in object storage)

Bandwidth:
  Outbound: 17,400 QPS × 20 tweets/feed × 280 bytes = ~97 MB/s outbound text
  (plus CDN-served media)
```

---

## 3. Core Building Blocks

### Load Balancer Selection

```
L4 Load Balancer (Transport Layer):
  - Routes based on TCP/UDP — no HTTP awareness
  - Ultra-low overhead, extremely fast
  - Can't do: SSL termination, path-based routing, header inspection
  - Use for: raw TCP services, database connections, non-HTTP
  - AWS equivalent: Network Load Balancer (NLB)

L7 Load Balancer (Application Layer):
  - Routes based on HTTP headers, path, host, cookies
  - Can do: SSL termination, A/B testing, sticky sessions, compression
  - Slightly higher overhead than L4
  - Use for: web applications, REST APIs, microservices
  - AWS equivalent: Application Load Balancer (ALB)

Algorithms:
  Round Robin      → even distribution, no server awareness
  Least Connections → route to server with fewest active connections
  IP Hash          → sticky sessions (same client → same server)
  Weighted         → send 80% to v1, 20% to v2 (canary deploys)
```

### Cache Strategies

```
Cache-Aside (Lazy Loading) — most common:
  1. App checks cache → MISS
  2. App reads from DB
  3. App writes result to cache
  4. Returns data
  Pro: Only caches what's actually read. Cache failure doesn't break app.
  Con: First request always slow. Cache can become stale.

Write-Through:
  1. App writes to cache AND DB simultaneously
  Pro: Cache always up-to-date
  Con: Write latency doubled. Caches data that may never be read.

Write-Behind (Write-Back):
  1. App writes to cache
  2. Cache asynchronously writes to DB (batched)
  Pro: Very fast writes
  Con: Risk of data loss if cache fails before flush

Read-Through:
  Cache sits in front of DB. On miss, cache fetches from DB.
  Pro: Simpler app code (cache handles DB reads)
  Con: Cold start problem. Cache becomes SPOF.

TTL Strategy:
  Short TTL (seconds–minutes): Real-time data, stock prices, feed counts
  Medium TTL (hours): User profiles, product details
  Long TTL (days): Static content, configuration
  No TTL: Immutable data (old posts, completed orders)
```

### Message Queues

```
When to use a queue:
  ✅ Async processing (email sending, image resize, notifications)
  ✅ Rate limiting (smooth out traffic spikes)
  ✅ Decoupling services (producer doesn't know about consumer)
  ✅ Retry logic (failed jobs re-queued automatically)

Queue Selection:
  BullMQ (Redis-backed)     → Simple, single-service, <100K jobs/day
  RabbitMQ                   → Complex routing, dead-letter, multi-consumer
  Apache Kafka               → High throughput (millions/sec), replay, event log
  AWS SQS                    → Serverless, managed, Lambda integration
  AWS SQS + SNS (fan-out)    → Broadcast one event to multiple consumers

Delivery guarantees:
  At-most-once   → messages may be lost (fire-and-forget analytics)
  At-least-once  → messages may be duplicated (requires idempotent consumers)
  Exactly-once   → expensive, complex; only Kafka transactions + consumer groups
```

---

## 4. Database Selection Matrix

| Signal                                 | Recommended                       | Why                                          |
| -------------------------------------- | --------------------------------- | -------------------------------------------- |
| Structured data, ACID, complex queries | **PostgreSQL**                    | Relational model, joins, transactions        |
| Time-series data (metrics, logs)       | **InfluxDB / TimescaleDB**        | Optimized for time-ordered data, compression |
| Document storage, flexible schema      | **MongoDB**                       | Schema-free, embedded documents              |
| Key-value, <1ms latency                | **Redis / DynamoDB**              | In-memory or single-digit ms                 |
| Graph relationships (social, rec)      | **Neo4j / Neptune**               | Traversal queries 100x faster than SQL joins |
| Search & full-text                     | **Elasticsearch / OpenSearch**    | Inverted index, relevance scoring            |
| Immutable audit log                    | **Kafka / Append-only table**     | Never update, only append                    |
| Multi-region globally distributed      | **CockroachDB / DynamoDB Global** | Multi-master, automatic failover             |

### CAP Theorem Applied

```
CAP: You can only guarantee 2 of: Consistency, Availability, Partition Tolerance
(In distributed systems, Partition Tolerance is mandatory → choose C or A)

CP (Consistency + Partition Tolerance):
  → All reads return latest write or error
  → Use for: Banking, financial transactions, inventory (overselling is catastrophic)
  → Examples: PostgreSQL, ZooKeeper, HBase

AP (Availability + Partition Tolerance):
  → System stays up even during partitions, may return stale data
  → Use for: Social feeds, shopping carts, DNS, search indexes
  → Examples: DynamoDB (eventually consistent), Cassandra, CouchDB

Practical rule:
  Does incorrect data cause financial harm or security breach? → CP
  Can users tolerate seeing slightly stale data for seconds? → AP
```

---

## 5. Classic Reference Designs

### URL Shortener (tinyurl.com)

```
API:
  POST /api/shorten  { url: "https://long-url.com" }  → { shortCode: "abc123" }
  GET  /:shortCode   → HTTP 302 redirect to original URL

Scale:
  Reads: 100:1 read-to-write (CDN + cache at edge)
  Writes: ~1M URLs/day = ~12 writes/sec

Key Design Decisions:
  Short code generation: MD5(url)[:6] — fast, deterministic, but collision-prone
  Better: Globally unique counter + base62 encoding (a-zA-Z0-9)
  Best:   Distributed ID with snowflake-style (timestamp + datacenter + sequence)

Data model:
  urls table: { id BIGINT PK, short_code VARCHAR(8) UNIQUE, original_url TEXT,
                user_id BIGINT, created_at TIMESTAMP, click_count INT }

Caching:
  Cache short_code → original_url in Redis (high read QPS, small value size)
  TTL: 24h (popular links stay warm)

Scaling bottleneck: DB write throughput
  Fix: Write to a queue, batch-insert every 100ms
```

### Rate Limiter

```
Algorithms:
  Token Bucket:
    - Bucket refills at rate R tokens/second, max capacity C
    - Each request consumes 1 token
    - Allows bursting (use all C tokens instantly)
    - Ideal for: most APIs

  Sliding Window Counter:
    - Count requests in sliding 1-minute window
    - More precise than fixed window (no edge-of-window bursts)
    - Implementation: Redis sorted set (ZADD + ZCOUNT + ZREMRANGEBYSCORE)

Redis Implementation (Token Bucket):
  EVAL lua_script KEYS[1] ARGV[1] ARGV[2] ARGV[3]
  -- key=user_id, capacity, refill_rate, current_time
  -- atomically check and decrement token count

Response headers:
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 42
  X-RateLimit-Reset: 1719532800  (Unix timestamp)
  Retry-After: 60                (on 429 response)
```

### Notification System

```
Requirements: Send 10M push notifications/day via email, SMS, push

Architecture:
  1. Producer: API receives notification request → publishes to Kafka topic
  2. Kafka topics: one per channel (email-queue, sms-queue, push-queue)
  3. Workers: Dedicated consumers per channel
     - email-worker → SendGrid API
     - sms-worker → Twilio API
     - push-worker → FCM (Android) / APNS (iOS)
  4. Retry queue: Failed notifications → dead-letter queue → retry with backoff
  5. Notification log: All sent notifications stored in Cassandra (time-series)

Failure handling:
  - Idempotency key per notification (dedup on retry)
  - Exponential backoff: 1s → 10s → 100s → dead letter
  - Alert on dead letter queue depth > threshold
```

---

## 🤖 LLM-Specific Traps

1. **Premature sharding**: Suggesting database sharding before the user has even mentioned scale issues. Sharding is complex; exhaust simpler options first.
2. **NoSQL for everything**: DynamoDB and MongoDB are not universally better. They sacrifice joins and ACID. Present the tradeoffs honestly.
3. **Ignoring the 80/20 of read QPS**: Most web apps are 80-95% reads. Design the read path first (caching, CDN, read replicas) before optimizing writes.
4. **Forgetting the Coordinator Problem**: Distributed systems need coordination (who is the leader?). Mention ZooKeeper/etcd or leaderless designs when relevant.
5. **Over-specifying CAP**: Real systems pick AP vs CP at the feature level, not the system level. A shopping cart (AP) and payment processing (CP) can coexist.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `system-architect` · `database-architect`**

### ✅ Pre-Flight Self-Audit

```
✅ Did I quantify the scale before recommending a solution?
✅ Did I present at least 2 database options with tradeoffs?
✅ Did I define the read:write ratio before choosing a caching strategy?
✅ Did I verify the system doesn't need microservices before recommending them?
✅ Did I define a failure mode and mitigation for the primary bottleneck?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden**: Recommending an architecture without first establishing scale numbers.
- ✅ **Required**: Every system design must include: QPS estimates, data model, caching strategy, and at least one identified bottleneck with a scaling plan.
