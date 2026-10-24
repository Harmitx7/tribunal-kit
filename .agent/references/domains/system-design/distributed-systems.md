# Distributed Systems Primitives, Consensus & Fault Tolerance

> **Authority**: Designing Data-Intensive Applications & Raft Consensus Specification  
> **Applicable Domains**: Distributed Systems, Consensus, Consistency, Coordination  
> **Status**: Verified Production Specification  

---

## 1. Network Partitions & The Truth About CAP / PACELC

### The CAP Theorem (Brewer / Gilbert & Lynch)
In a distributed network where network partitions ($P$) are an immutable physical reality of hardware, you must choose between:
- **Consistency ($C$)**: Every read receives the most recent write or an error (Linearizability).
- **Availability ($A$)**: Every non-failing node returns a non-error response, even if stale.

### The PACELC Theorem (Abadi)
CAP only describes behavior *during a partition*. PACELC covers normal operating latency:
- **If Partition ($P$)**: Choose between Availability ($A$) and Consistency ($C$).
- **Else ($E$)**: Choose between Latency ($L$) and Consistency ($C$).
- *Examples*:
  - **DynamoDB / Cassandra**: PA/EL (Partition $\rightarrow$ Available; Normal $\rightarrow$ Low Latency).
  - **PostgreSQL / Spanner**: PC/EC (Partition $\rightarrow$ Consistent; Normal $\rightarrow$ Strong Consistency).
  - **MongoDB**: PC/EC (Default primary writes) or PC/EL (Secondary reads enabled).

---

## 2. Failure Detection, Retries & Jitter

Unbounded retries against an overloaded service cause cascading self-inflicted Denial of Service (retry storms).

### Exponential Backoff with Full Jitter Formula
$$T_{\text{sleep}} = \text{random}(0, \min(T_{\text{max}}, T_{\text{base}} \times 2^{\text{attempt}}))$$

```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseMs = 100,
  maxMs = 2000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoff = Math.min(maxMs, baseMs * Math.pow(2, attempt));
      const jittered = Math.random() * backoff; // Full jitter
      await new Promise(r => setTimeout(r, jittered));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 3. Quorum Math ($R + W > N$)

In leaderless or replicated systems across $N$ nodes:
- $N$ = Number of replicas (typically 3 or 5).
- $W$ = Number of nodes that must ACK a write.
- $R$ = Number of nodes that must respond to a read.

| Quorum Condition | Guarantee | Read Latency | Write Latency | Typical Use Case |
|:---|:---|:---|:---|:---|
| $W + R > N$ | **Strong Consistency** (Overlapping node guarantees latest value) | Moderate ($R=2$ of $3$) | Moderate ($W=2$ of $3$) | Critical balances, inventory |
| $W = 1, R = N$ | High write throughput, heavy read latency | High | Minimal | Write-heavy metric ingestion |
| $W = N, R = 1$ | Instant read, high write failure risk | Minimal | High | Rare configurations |
| $W + R \le N$ | **Eventual Consistency** (Risk of reading stale data) | Low | Low | Social feeds, activity logs |

---

## 4. Consensus & Leader Election: Raft Protocol

Raft decomposes distributed consensus into 3 distinct subproblems:
1. **Leader Election**: Randomized election timers ($150\text{–}300\text{ ms}$) prevent split-vote deadlocks. Candidates collect majority vote ($> N/2$).
2. **Log Replication**: Leader appends entries to its log and replicates to followers via `AppendEntries` RPCs. An entry is committed once stored on a majority of nodes.
3. **Safety**: A follower rejects votes for a candidate whose log is less up-to-date than its own, guaranteeing no committed entries are ever overwritten.

---

## 5. Distributed Locks, Split-Brain & Fencing Tokens

### The Fallacy of Timeouts in Distributed Locks
Process pauses (GC pauses, VM suspension, network delays) break lock leases. Node A acquires a 10s lease, pauses for 15s during garbage collection, wakes up believing it owns the lock, and corrupts shared state.

### Mitigation: Fencing Tokens
Every lock acquisition generates a monotonically increasing numeric token:

```
[Lock Manager] ──> Node A gets Token 31 (pauses for GC)
[Lock Manager] ──> Node B gets Token 32 (active)
      │
      ▼
[Storage Service]
  • Storage maintains highest seen token.
  • Node B writes with Token 32 ──> ACCEPTED (Highest = 32)
  • Node A wakes up and writes with Token 31 ──> REJECTED (31 < 32)
```
