---
name: architecture
description: Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Architecture — System Design Mastery

## Architecture Selection

```
Team size?           Scale?                  Cadence?
1–5   → Monolith     <10K RPM  → Monolith     Weekly → Monolith
5–20  → Mod. Mono    <100K RPM → Mono+CDN     Daily  → Modular Mono
20+   → Microsvcs    >100K RPM → Microsvcs    Per-svc → Microsvcs

❌ Microservices are NOT inherently better.
   A well-structured monolith beats a poorly designed microservice system.
   Start monolith. Extract services only when proven necessary.
```

**3 Questions Before Any Pattern:**
1. What SPECIFIC problem does this pattern solve?
2. Is there a simpler solution?
3. Can we add this LATER when proven needed?

---

## Clean Architecture (Dependency Rule)

```
Presentation → Application → Domain ← Infrastructure
              (Controllers)  (Use Cases)  (Entities)  (DB, APIs)

Dependency Rule: arrows point INWARD. Domain knows NOTHING about infra.
Application defines interfaces (ports). Infrastructure implements them (adapters).
```

```typescript
// Domain — pure business logic, zero external dependencies
interface UserRepository { findById(id: string): Promise<User | null>; }
class User {
  promote(): void {
    if (this._role === UserRole.ADMIN) throw new DomainError("Already admin");
    this._role = UserRole.ADMIN;
  }
}

// Application — orchestrates use cases
class PromoteUserUseCase {
  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User", userId);
    user.promote();
    await this.userRepo.save(user);
    await this.eventBus.publish(new UserPromotedEvent(userId));
  }
}

// Infrastructure — concrete implementations of ports
class PostgresUserRepository implements UserRepository {
  async findById(id: string) { /* db.query(...) */ }
}
```

---

## CQRS

```
Commands (Write) → Normalized Write DB
Queries  (Read)  → Denormalized/Cached Read Model

When to use:  ✅ Read/write patterns diverge  ✅ 10:1+ read:write ratio  ✅ Event sourcing
When NOT to:  ❌ Simple CRUD  ❌ Team < 3 devs  ❌ Read/write models are identical
```

---

## Event-Driven Architecture

```
Event Types:
  Domain Events      → "OrderPlaced" within a bounded context
  Integration Events → Cross-service via message queue
  Notification Events → Fire-and-forget (logging, analytics)

Broker Selection:
  BullMQ / Redis Streams → Simple, single-service queues
  RabbitMQ               → Complex routing, dead-letter queues
  Apache Kafka           → High throughput, replay, event log
  AWS SQS/SNS            → Managed, serverless-friendly

Outbox Pattern (reliable publishing):
  1. Save entity + event in ONE DB transaction
  2. Background worker polls outbox → publishes to broker
  3. Mark as published → guarantees at-least-once delivery
```

---

## Anti-Patterns Reference

| Pattern | When it's an Anti-Pattern | Simpler Alternative |
|---------|--------------------------|---------------------|
| Microservices | Before team or scale justifies it | Modular monolith |
| Clean/Hexagonal | Over-abstraction for simple CRUD | Concrete first, interfaces later |
| Event Sourcing | No business requirement for audit/replay | Append-only audit log |
| CQRS | Simple data model, no read/write divergence | Single model |
| Repository | Simple CRUD, single database | ORM direct access |

---

## Architecture Decision Records (ADRs)

```markdown
## ADR-001: [Decision Title]
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

**Context:** [Problem + constraints: team, scale, timeline]

**Decision:** [What was chosen — be specific]

**Rationale:** [Why — tied to requirements]

**Trade-offs:** [What we consciously give up]

**Consequences:**
- Positive: [Benefits]
- Negative: [Costs/Risks]
- Mitigation: [How to address negatives]

**Revisit when:** [Trigger conditions]
```

ADR storage: `docs/architecture/adr-001-title.md`

---

## Scalability Patterns

```
Read scaling:   Redis cache → Read replicas → CDN for static assets
Write scaling:  Queue writes → Partition data → Event sourcing
Stateless:      Sessions in Redis → JWT → No server affinity
DB scaling:     Connection pooling → Read replicas → Partitioning → Sharding (last resort)
Cache layers:   L1: In-memory (process) L2: Redis (shared) L3: CDN (edge)
```

## Scale-to-Architecture Matrix

```
                MVP           SaaS          Enterprise
Scale:          <1K           1K–100K       100K+
Team:           Solo          2–10          10+
Architecture:   Simple Mono   Modular Mono  Distributed
Framework:      Next.js API   NestJS        Microservices
```
