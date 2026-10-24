# System Design Fundamentals & Requirements Engineering

> **Authority**: Google Cloud Architecture Framework & IEEE 830 / ISO/IEC/IEEE 29148  
> **Applicable Domains**: Architecture Design, Requirements Engineering, Quality Attributes  
> **Status**: Verified Production Specification  

---

## 1. System Design Principles & Quality Attributes

System design transforms ambiguous business objectives into verifiable, fault-tolerant technical architectures. All decisions balance trade-offs across core quality attributes:

| Quality Attribute | Architectural Focus | Primary Metric / Unit | Key Trade-off |
|:---|:---|:---|:---|
| **Latency** | Network hops, serialization, disk I/O | Percentiles ($p50, p95, p99, p99.9$ ms) | Cost vs over-provisioned RAM |
| **Throughput** | Concurrency models, batching, non-blocking I/O | Requests Per Second (RPS) / Megabytes/s | Latency (batching increases latency) |
| **Availability** | Redundancy, failover, zero single points of failure | "Nines" ($99.9\% \approx 43.8\text{m/mo}$, $99.99\% \approx 4.38\text{m/mo}$) | Cost & operational complexity |
| **Reliability** | Fault isolation, retry budgets, circuit breakers | MTBF (Mean Time Between Failures), MTTD, MTTR | System complexity |
| **Durability** | Replication, Write-Ahead Logs (WAL), snapshots | Data loss probability ($99.999999999\%$ 11 9s) | Write latency & multi-region sync |
| **Scalability** | Stateless services, partitioning, sharding | Scaling cost curve ($O(1)$ or $O(N)$ vs load) | Consistency & distributed coordination |
| **Maintainability** | Domain boundaries, loose coupling, modularity | Lead time to change, MTTR | Initial velocity |

---

## 2. Requirements Engineering Protocol

Never design based on intuition. Execute this 4-step elicitation framework:

### Step 1: Functional Scope & User Journeys
- **Core Entities & Verbs**: Define the actors (User, Merchant, System Worker) and explicit actions (Create, Read, Update, Delete, Stream).
- **Out of Scope (Anti-Scope)**: Explicitly state what the system will NOT do in Phase 1 (e.g., "In-app video calls are out of scope; focus on 1:1 text delivery").

### Step 2: Measurable Non-Functional Requirements (NFRs)
Every NFR must have a numerical threshold. Prohibit vague terms ("must be fast", "must be scalable"):
- **Availability Target**: e.g., $99.95\%$ uptime SLA.
- **Latency Budget**: e.g., $p99 < 150\text{ ms}$ for read endpoints; $p99 < 300\text{ ms}$ for mutation endpoints.
- **Data Freshness / Staleness**: e.g., Eventual consistency acceptable within 2 seconds for feed updates; strong consistency required for wallet balance.
- **Data Retention & Compliance**: e.g., Retain audit logs for 7 years (SOC2/GDPR); purge user data within 30 days of deletion request.

### Step 3: Constraint Matrix
Categorize constraints into immutable boundaries:
1. **Technical Constraints**: Existing relational database (PostgreSQL), legacy auth provider (OAuth2/OIDC), on-premise hardware limits.
2. **Business Constraints**: Timeline (launch in 3 months), cloud budget ($\$5,000/\text{month}$).
3. **Regulatory Constraints**: Data residency within EU (GDPR Article 44), HIPAA compliance for PHI.

### Step 4: Assumptions Register
When metrics are unknown, document reasoned assumptions using the `[ASSUMPTION]` marker:
- Formula: `[ASSUMPTION: Given 10M DAU with 5% active concurrency, estimated peak concurrent connections = 500,000]`.
- Always verify assumptions against business reality before finalizing provisioning.
