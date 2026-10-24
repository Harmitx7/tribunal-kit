---
name: system-design-pro
description: "Use when designing, evaluating, estimating, scaling, or reviewing software architectures, distributed systems, and capacity requirements."
version: 6.0.0
last-updated: 2026-10-24
skills:
  - architecture
  - database-design
  - error-resilience
  - cloud-architect
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/architecture_mapper.js
  - .agent/scripts/architecture_verifier.js
  - .agent/scripts/blast_radius_engine.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "system design"
  - "architect"
  - "scalability"
  - "distributed system"
  - "capacity planning"
---

# System Design Pro — Principal Architecture & Distributed Systems

## Mandatory Pre-Flight Context Inspection
Before proposing, generating, or refactoring system architectures, inspect these 5 critical parameters:
1. **Workload Scale & Quantitative Bounds**: Determine Peak RPS, read/write ratios, storage growth, and latency SLOs ($p95, p99$) before selecting components.
2. **System Boundaries & Data Ownership**: Verify bounded contexts, single-source-of-truth datastores, and inter-service communication protocols.
3. **Execution Guardrails & Failure Domains**: Identify partial failure modes, network partition vulnerabilities, and cascading retry risks.
4. **Validation & State Contracts**: Enforce strict schema validation at API boundaries and ACID/idempotency invariants for data mutations.
5. **Observability & Proof of Verification**: Ensure every architectural component emits verifiable telemetry (RED/USE signals, distributed traces).

## Activation Boundaries
- **Activate when:** Designing new architectures, scaling bottlenecks, evaluating distributed tradeoffs (CAP/PACELC), estimating capacity, or planning migrations.
- **DO NOT activate when:** The task is focused purely on client-side UI styling, single-function bug fixes, or basic script automation without architectural scope.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand & Bound** | Elicit functional scope, non-functional requirements (NFRs), and immutable constraints. | Fast / Standard / Deep |
| **Pass 2** | **Quantify & Model** | Calculate back-of-the-envelope RPS, storage, bandwidth, and cache sizes; map existing AST with `tk arch map`. | Standard / Deep |
| **Pass 3** | **Decompose & Design** | Draft high-level C4 diagrams, service boundaries, data models, APIs, and caching layers. | All Modes |
| **Pass 4** | **Stress & Falsify** | Adversarial blast-radius simulation (`tk arch impact`), single point of failure (SPOF) audit, and failure mode analysis. | Standard / Deep |
| **Pass 5** | **Harden & Protect** | Apply rate limiting, circuit breakers, backpressure, idempotency keys, and tenant isolation policies. | Standard / Deep |
| **Pass 6** | **Document & Decide** | Produce formal Architecture Decision Records (ADR) detailing rationale, trade-offs, and alternatives. | All Modes |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with ground-truth verification (`tk arch verify`). | All Modes |

---

## 🛠️ Technical Architecture & Reference Library

Always ground design decisions in the dedicated System Design reference library:

### 1. Requirements & Quantitative Estimation
- [Requirements & Quality Attributes](../../references/domains/system-design/fundamentals.md): Functional decomposition, constraint matrix, and measurable NFR thresholds.
- [Quantitative Estimation & Little's Law](../../references/domains/system-design/quantitative-estimation.md): Powers of two, QPS sizing, storage/RAM rules, and latency budgets:
  $$\text{Peak RPS} = \frac{\text{DAU} \times \text{Actions/Day}}{86,400} \times \text{Peak Multiplier (typically 3)}$$
  $$\text{Concurrency } L = \lambda \text{ (Throughput)} \times W \text{ (Latency)}$$

### 2. Architecture Patterns & Modeling
- [Software Architecture Patterns & C4](../../references/domains/system-design/architecture-patterns.md): Modular monoliths, microservices, hexagonal architecture, CQRS, and C4 context/container diagrams.
- [Migration Architecture & Governance](../../references/domains/system-design/migration-governance.md): Strangler Fig migrations, zero-downtime expand-contract, and ADR standards.

### 3. Distributed Systems & Consensus
- [Distributed Systems & Fault Tolerance](../../references/domains/system-design/distributed-systems.md): CAP & PACELC theorems, quorum math ($R + W > N$), Raft consensus, split-brain, and fencing tokens.
- [Event-Driven Messaging & Stream Processing](../../references/domains/system-design/event-driven-messaging.md): Message queues vs Kafka commit logs, partition keying, idempotent consumers, and dead-letter queues.

### 4. Data, Storage & Caching
- [Database Selection, Sharding & Isolation](../../references/domains/system-design/data-architecture.md): Polyglot persistence matrix, transaction isolation levels, write skew, sharding, and CDC.
- [API Communication & Caching](../../references/domains/system-design/communication-caching.md): REST vs gRPC vs GraphQL, cursor pagination, cache-aside, and thundering herd mitigations.

### 5. Scale, Security & Operations
- [Scalability & Traffic Management](../../references/domains/system-design/scalability-traffic.md): Layer 4 vs Layer 7 load balancing, rate limiting algorithms (token bucket, sliding window), and load shedding.
- [Security Architecture & Threat Modeling](../../references/domains/system-design/security-threat-modeling.md): STRIDE analysis, zero-trust architecture (NIST SP 800-207), and PostgreSQL row-level security (RLS).
- [Reliability & Performance Engineering](../../references/domains/system-design/reliability-performance.md): Availability math ("Nines"), SLI/SLO/SLA error budgets, tail latency percentiles ($p99.9$), and Coordinated Omission.
- [Observability & Distributed Tracing](../../references/domains/system-design/observability-operations.md): RED/USE methods, W3C `traceparent` context propagation, and tail-based sampling.
- [Cloud Infrastructure & Multi-Region](../../references/domains/system-design/cloud-infrastructure.md): Provider-neutral resource mapping, GitOps, and Blue-Green/Canary deployment patterns.
- [Global Systems & FinOps Economics](../../references/domains/system-design/global-multi-region.md): Active-active routing, Anycast DNS, cross-region replication conflicts (CRDTs), and cloud data transfer costs.

### 6. Reference Blueprints & Authoritative Index
- [Production Reference Blueprints](../../references/domains/system-design/real-world-blueprints.md): Complete worked architectures (URL shortener, chat, SaaS, event pipeline, AI inference).
- [Authoritative Source Catalog](../../references/domains/system-design/source-index.md): Provenance verification records for AWS WAF, Google SRE, RFCs, and DDIA.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Failure Mode | Root Cause | Production Architectural Mitigation |
|:---|:---|:---|
| **Thundering Herd / Stampede** | High-traffic cached key expires simultaneously | Probabilistic early expiration (XFetch) or single-flight distributed mutex lock |
| **Cascading Retry Storm** | Downstream failure triggers unbounded synchronized retries | Exponential backoff with Full Jitter and finite retry budgets ($<3$) |
| **Write Skew Anomaly** | Concurrent transactions pass independent validation | Use PostgreSQL `SELECT ... FOR UPDATE` or `SERIALIZABLE` isolation |
| **Ghost Partitions (Kafka)** | More consumer pods deployed than topic partitions | Partition count is the hard upper bound for consumer concurrency; scale partitions first |
| **Tail Latency Amplification** | Fan-out to 100 microservices multiplies $p99$ delays | Bounded timeouts, hedged requests, and client-side circuit breakers |
| **Dual-Write Inconsistency** | Writing to database and message broker separately | Enforce Transactional Outbox pattern with CDC log tailing (Debezium) |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Premature Microservices** | Jumping straight to 20 microservices for early-stage apps | Start with a Modular Monolith; extract services only when team size or scaling bottlenecks prove necessary |
| **Invented Scale Targets** | Hallucinating traffic numbers ("assume 500M DAU") | Ground estimates in verified project telemetry or explicitly mark assumptions with `[ASSUMPTION]` |
| **Silent Eventual Consistency** | Adding Kafka/Redis without accounting for stale reads | Explicitly design for eventual consistency (read-your-writes guarantees, optimistic UI updates) |
| **Ignoring Network Physics** | Assuming cross-region writes can be strongly consistent without latency | Acknowledge speed-of-light delays ($75\text{–}100\text{ ms}$ US-EU) and PACELC trade-offs |
| **Unbounded Caching** | Recommending caching without eviction or sizing calculations | Size cache via 80/20 Pareto rule, define explicit TTLs with jitter, and configure LRU/LFU eviction |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `system-architect` · `orchestrator` · `logic-reviewer` · `security-auditor`  
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
- **`[OBSERVED]`**: Directly verified in codebase AST (`architecture.idx.json`) or benchmark telemetry.
- **`[INFERRED]`**: Logically deduced from stated requirements, traffic math, or schema relations.
- **`[UNVERIFIED]`**: Speculative assumption requiring user clarification or runtime verification before production commitment.

### 🛑 Verification-Before-Completion (VBC) Protocol
1. Run `node .agent/scripts/architecture_mapper.js` to ensure the system model is current.
2. Verify all references and relative links resolve with `node scripts/validate-references.js`.
3. Provide concrete terminal output or calculation proof before finalizing architectural proposals.
