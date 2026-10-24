# API Communication Architecture & High-Performance Caching

> **Authority**: IETF RFC 9110 (HTTP Semantics), OpenAPI v3.1 & Redis Specification  
> **Applicable Domains**: API Architecture, Protocols, In-Memory Caching, CDN  
> **Status**: Verified Production Specification  

---

## 1. Network Protocol Selection Matrix

| Protocol | Transport | Serialization | Duplex | Ideal Application | Disadvantage |
|:---|:---|:---|:---|:---|:---|
| **REST** | HTTP/1.1 or H2 | JSON, XML | Request/Response | Public web APIs, developer portals | Heavy payload serialization, over-fetching |
| **gRPC** | HTTP/2 | Protocol Buffers | Request/Response + Streaming | Internal service-to-service communication | Browser incompatibility without gRPC-Web proxy |
| **GraphQL** | HTTP/1.1 or H2 | JSON | Request/Response (+ WS Sub) | Client-driven aggregation, mobile frontends | Complex query optimization, hard to cache via CDN |
| **WebSockets** | TCP | Raw Frame / Text / Binary | Full-Duplex Bi-directional | Real-time chat, multiplayer gaming, financial tickers | Stateful persistent connections consume file descriptors |
| **SSE** | HTTP/1.1 or H2 | Text (`text/event-stream`)| Server-to-Client Unidirectional | Live scoreboards, AI LLM token streaming | One-way only; requires client reconnect handling |

---

## 2. API Design & Pagination Standards

### Cursor-Based Pagination vs Offset-Based Pagination
- **Offset-Based (`LIMIT 20 OFFSET 100000`)**: $O(N)$ database scan. Drops or duplicates records when rows are inserted concurrently during pagination.
- **Cursor-Based (`WHERE id > 'cursor_123' LIMIT 20`)**: $O(\log N)$ B-tree index lookup. Resilient to real-time insertions; stable memory footprint.

### Idempotency Keys (RFC Draft / Stripe Pattern)
To safely retry non-idempotent mutations (`POST /v1/payments`):
1. Client generates UUID v7: `Idempotency-Key: 018d45e2-7634-789a-bcde-123456789abc`.
2. Server executes atomic `SETNX lock:idempotency_key locked EX 120`.
3. If key exists and status is `COMPLETED`, return cached response payload immediately.
4. If key is currently locked, return `409 Conflict` or back off and poll.

---

## 3. Caching Architecture & Tiering

```
[Browser Cache] ──> [CDN / Edge (Cloudflare/CloudFront)] ──> [Reverse Proxy (Nginx)]
                                                                      │
[Distributed Cache (Redis Cluster)] <── [In-Process Cache (Guava/Lru)] <── [API Server]
```

### Invalidation Strategies:
- **Cache-Aside (Lazy Loading)**: Application reads cache; on miss reads DB, populates cache. Minimal memory waste, but read penalty on miss.
- **Write-Through**: Application writes to cache; cache synchronously writes to DB. Always consistent, higher write latency.
- **Write-Behind (Write-Back)**: Application writes to cache; cache asynchronously batches updates to DB. Extreme write throughput, risk of data loss on power failure.

---

## 4. Cache Failure Modes & Mitigations

### A. Cache Stampede (Thundering Herd)
*Symptom*: Popular key expires under $10,000\text{ RPS}$; thousands of concurrent threads rush to query the database simultaneously.
- *Mitigation*: **Probabilistic Early Expiration (XFetch)**:
  $$\Delta \times \beta \times \ln(\text{random}()) > \text{expiry} - \text{currentTime}$$
  Recomputes cache in the background *before* hard TTL expiration. Alternatively, use a single distributed mutex lock for the DB fetch.

### B. Cache Penetration
*Symptom*: Adversary queries non-existent IDs (`/users/-9999`), bypassing cache and hitting DB on every request.
- *Mitigation*:
  1. **Negative Caching**: Cache null results with short TTL ($30\text{ seconds}$).
  2. **Bloom Filter**: Memory-efficient probabilistic data structure at cache layer; if Bloom filter returns `false`, entity definitely does not exist—reject immediately.

### C. Cache Avalanche
*Symptom*: Hundreds of keys configured with identical $1\text{ hour}$ TTL expire at the exact same second.
- *Mitigation*: **TTL Jitter**: Add random variance ($\pm 10\text{–}20\%$) to all expiration intervals:
  $$\text{TTL} = \text{baseTTL} + \text{random}(0, \text{jitterSeconds})$$

### D. Hot Keys (Celebrity Problem)
*Symptom*: A single key (e.g. viral post) saturates a single Redis shard's CPU and bandwidth.
- *Mitigation*: Shard the key across cluster nodes: `key:part_1`, `key:part_2`, `...`, `key:part_N`, and select replica via random hashing on client read.
