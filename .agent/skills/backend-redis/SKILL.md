---
name: backend-redis
description: "Use when analyzing, designing, and optimizing Redis usage for caching, distributed locking, rate limiting, session storage, and queues. Covers memory limits, eviction policies, atomic Lua scripts, TTL enforcement, and connection pooling."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - backend-security-expert
  - resilience-reviewer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "backend"
  - "redis"
  - "analyzing"
---

# Redis Engineering — High-Speed Caching, Concurrency & State

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


## Mandatory Pre-Flight Context Inspection
1. **Topology & Mode**: Verify standalone, Redis Sentinel, or Redis Cluster setup.
2. **Eviction Policy**: Check `maxmemory-policy` (`volatile-lru`, `allkeys-lru`, `noeviction`).
3. **Key Namespace & TTL**: Ensure every key uses structured namespaces (`{namespace}:{entity}:{id}`) and explicit expiration.
4. **Serialization Overhead**: Inspect payload format; use lightweight binary (Protobuf/MessagePack) or compressed JSON.
5. **Connection Lifecycles**: Ensure Redis clients reuse a singleton pool and handle disconnects without unhandled rejections.

## Activation Boundaries
- **Activate when:** Implementing cache layers, distributed locks, sliding-window rate limiters, session stores, or Pub/Sub.
- **DO NOT activate when:** Persistent relational storage or multi-table ACID joins are needed.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Production-Grade Distributed Locking with Atomic Release
```typescript
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Lua script guarantees lock is ONLY deleted if the secret value matches (prevents releasing expired locks held by others)
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

export async function withDistributedLock<T>(
  lockKey: string,
  ttlMs: number,
  operation: () => Promise<T>
): Promise<T> {
  const lockToken = randomUUID();
  // NX = Only set if not exists, PX = millisecond TTL
  const acquired = await redis.set(`lock:${lockKey}`, lockToken, 'PX', ttlMs, 'NX');
  if (!acquired) {
    throw new Error(`Failed to acquire lock for: ${lockKey}`);
  }

  try {
    return await operation();
  } finally {
    await redis.eval(RELEASE_LOCK_LUA, 1, `lock:${lockKey}`, lockToken);
  }
}
```

### 2. Atomic Sliding-Window Rate Limiter (Lua Script)
```lua
-- KEYS[1]: rate_limit:{identifier}
-- ARGV[1]: current_timestamp_ms
-- ARGV[2]: window_size_ms
-- ARGV[3]: max_requests
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

-- Clean old hits
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentHits = redis.call('ZCARD', key)

if currentHits < limit then
  redis.call('ZADD', key, now, now)
  redis.call('PEXPIRE', key, window)
  return 1 -- Allowed
else
  return 0 -- Denied
end
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Cache Stampede (Thundering Herd)** | Expensive key expires; hundreds of concurrent requests crush the database | Use probabilistic early expiration (XFetch algorithm) or a distributed lock around cache population |
| **Hot Key Saturation** | Single key accessed millions of times saturates a single Redis shard CPU | Replicate hot keys with random salt (`key:shard_{0..3}`) or use in-process L1 cache (LRU) |
| **Silent OOM Write Refusal** | Memory reaches `maxmemory` under `noeviction`, causing `OOM command not allowed` | Configure `allkeys-lru` or `volatile-lru`; monitor memory watermark alerts at 75% |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **`KEYS *` in Production** | Running `KEYS pattern*` which blocks the single-threaded Redis event loop | Always use cursor-based non-blocking `SCAN` iteration with bounded `COUNT` |
| **Missing Expiration on Keys** | Writing session or cache keys without TTL | Every ephemeral key MUST have a defined TTL (`EX` or `PX`) |
| **Sequential Network Roundtrips** | Running 10 `await redis.get()` in a loop | Batch independent requests using Redis Pipelines (`redis.pipeline().get().get().exec()`) |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `backend-specialist`, `resilience-reviewer`, `performance-optimizer`
- **Evidence Standard:** Mark statements as `[OBSERVED]` (concrete Redis calls in code), `[INFERRED]` (caching efficiency), or `[UNVERIFIED]`.
