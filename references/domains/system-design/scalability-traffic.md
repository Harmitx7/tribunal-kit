# Scalability, Traffic Management & Admission Control

> **Authority**: Envoy Proxy Architecture & Google Site Reliability Engineering  
> **Applicable Domains**: Scalability, Traffic Management, Load Balancing, Rate Limiting  
> **Status**: Verified Production Specification  

---

## 1. Load Balancing: Layer 4 vs Layer 7

| Dimension | Layer 4 (Transport / TCP) | Layer 7 (Application / HTTP) |
|:---|:---|:---|
| **Inspection Depth** | IP headers & TCP/UDP ports only | Full HTTP request (URL paths, headers, cookies, JSON payload) |
| **Performance** | Extreme throughput ($>1\text{M RPS}$), minimal CPU | Slower; requires SSL termination & HTTP payload parsing |
| **TLS Handling** | Pass-through or TCP termination | Full TLS termination and mTLS re-encryption |
| **Routing Capability** | IP hash, Round Robin, Least Connections | Path-based (`/api/v1/orders`), header-based (A/B testing, Canary) |
| **Examples** | AWS NLB, Linux IPVS, HAProxy (TCP mode) | AWS ALB, Envoy, Nginx, Traefik |

---

## 2. Rate Limiting Algorithms Comparison

| Algorithm | How it Works | Pros | Cons | Ideal For |
|:---|:---|:---|:---|:---|
| **Token Bucket** | Tokens refill at constant rate $R$; request takes 1 token; max capacity $B$ | Allows controlled bursts up to bucket size; memory efficient | Two integers to store per client (tokens, lastRefill) | General API rate limiting (GitHub, Stripe) |
| **Leaky Bucket** | Requests enter queue and leak out at fixed FIFO rate | Smooths output traffic; prevents downstream bursts | Drops requests if queue fills; delays bursty traffic | Egress traffic shaping to third-party APIs |
| **Fixed Window** | Counts requests in fixed time interval (e.g. $0\text{–}60\text{s}$) | Minimal memory; simple counter reset | Border burst: $2\times$ quota allowed across boundary ($0:59$ and $1:01$) | Coarse rate limiting |
| **Sliding Window Counter** | Blends weighted count from previous window with current window | Eliminates boundary bursts; memory efficient ($O(1)$) | Slight mathematical approximation ($\approx 0.05\%$ variance) | High-scale production APIs (Cloudflare) |

### Redis Sliding Window Counter Implementation
```typescript
async function isRateLimited(
  redis: RedisClient,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const now = Date.now();
  const currentWindow = Math.floor(now / (windowSeconds * 1000));
  const prevWindow = currentWindow - 1;
  const currentKey = `rl:${key}:${currentWindow}`;
  const prevKey = `rl:${key}:${prevWindow}`;

  const currentCount = parseInt((await redis.get(currentKey)) || '0', 10);
  const prevCount = parseInt((await redis.get(prevKey)) || '0', 10);

  const windowFraction = (now % (windowSeconds * 1000)) / (windowSeconds * 1000);
  const estimatedCount = prevCount * (1 - windowFraction) + currentCount;

  if (estimatedCount >= limit) {
    return true; // Rate limit exceeded (HTTP 429)
  }

  const multi = redis.multi();
  multi.incr(currentKey);
  multi.expire(currentKey, windowSeconds * 2);
  await multi.exec();
  return false;
}
```

---

## 3. Load Shedding & Admission Control

When a service is overloaded, continuing to queue requests drives latency past client timeouts. The system continues working on requests that clients have already abandoned, causing total throughput collapse.

### Principles of Load Shedding:
1. **Drop Low-Priority Traffic**: Prioritize core business paths (Checkout) over non-critical paths (Recommendations, Analytics).
2. **Fail Fast with HTTP 503**: Reject requests immediately at the gateway rather than queuing internally.
3. **CoDel (Controlled Delay) Algorithm**: Measure queue dwell time. If requests wait in queue $> 100\text{ ms}$, immediately shed requests until dwell time recovers.

---

## 4. Stateless Architecture & Session Externalization

- **Rule**: Application servers must maintain **zero state** across requests. Any request must be capable of being routed to any instance.
- **Session Handling**:
  - ❌ *Sticky Sessions (Session Affinity)*: Destroys autoscaling; node restarts log out thousands of users; uneven load distribution.
  - ✅ *Stateless Tokens (JWT)*: Cryptographically signed self-contained tokens verified via public keys.
  - ✅ *Centralized Session Cache*: Session ID references state in a distributed Redis cluster ($< 1\text{ ms}$ lookup).
