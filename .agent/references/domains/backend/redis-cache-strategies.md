# Redis Caching Strategies, Invalidation & Concurrency Patterns

> **Authority**: Redis Core Documentation (`https://redis.io/docs/latest/develop/use/`)  
> **Applicable Domains**: Backend Architecture, Distributed Systems, In-Memory Caching  
> **Status**: Verified Production Specification  

---

## 1. Caching Architectural Patterns

Choose the pattern matching data consistency and latency requirements:

| Strategy | Flow | Read Latency | Consistency | Best For |
|:---|:---|:---|:---|:---|
| **Cache-Aside** | App reads cache; on miss, loads DB and writes cache | Low on hit; high on miss | Eventual (risk of stale data) | General read-heavy workloads |
| **Write-Through** | App writes to cache; cache immediately writes to DB | Higher write latency | Strong cache-DB sync | Sensitive profile/auth records |
| **Write-Behind** | App writes to cache; cache batches async DB writes | Lowest write latency | Eventual (risk of loss on crash)| High-velocity telemetry, counters |

---

## 2. Cache Stampede (Thundering Herd) Prevention

When high-traffic cached items expire simultaneously, hundreds of concurrent requests hit the database at once.

### Mitigation A: Distributed Lock (Single Loader)

```typescript
async function getWithMutex<T>(
  redis: RedisClient,
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, 'locked', 'NX', 'PX', 5000);

  if (acquired) {
    try {
      const data = await fetchFn();
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
      return data;
    } finally {
      await redis.del(lockKey);
    }
  }

  // Backoff and retry read
  await new Promise(r => setTimeout(r, 100));
  return getWithMutex(redis, key, ttlSeconds, fetchFn);
}
```

### Mitigation B: Probabilistic Early Expiration (XFetch)
Recompute the cache entry before hard expiration based on compute delta:
$$\Delta \times \beta \times \ln(\text{random}()) > \text{expiry} - \text{currentTime}$$

---

## 3. Eviction Policies & Sizing (`maxmemory-policy`)

Always set an explicit eviction policy in `redis.conf`:

```conf
maxmemory 4gb
maxmemory-policy volatile-lru
```

- `volatile-lru`: Evicts least recently used keys **with an expire set** (Safest for mixed cache + persistent data).
- `allkeys-lru`: Evicts any key based on LRU (Standard dedicated cache).
- `noeviction`: Returns errors on memory exhaustion (Mandatory if Redis is used as a task queue or primary store).

> ⚠️ **Zero-TTL Anti-Pattern**: Writing cache entries without a TTL (`EX` / `PX`) creates permanent memory leaks that trigger aggressive random evictions under load.

---

## 4. Sliding Window Rate Limiting (Sorted Sets)

Atomic, race-condition-free rate limiting using Redis `ZSET`:

```typescript
async function isRateLimited(
  redis: RedisClient,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const multi = redis.multi();
  multi.zremrangebyscore(key, '-inf', windowStart); // Drop expired ticks
  multi.zadd(key, now, `${now}-${Math.random()}`);   // Add current tick
  multi.zcard(key);                                  // Count ticks in window
  multi.pexpire(key, windowMs);

  const results = await multi.exec();
  const count = results[2][1] as number;
  return count > limit;
}
```

---

## 5. Production Redis Deployment Checklist

- [ ] Every cached key has an explicit, bounded TTL (`EX` seconds or `PX` milliseconds).
- [ ] Large objects (>100KB) are compressed before storage or stored in object storage (S3).
- [ ] Avoid dangerous unbounded scan commands (`KEYS *`); always use `SCAN` with `COUNT` iteration.
- [ ] Multi-operation mutations use Redis Transactions (`MULTI/EXEC`) or atomic Lua scripts.
- [ ] Connection pools configured with health check pings and exponential backoff reconnection.
