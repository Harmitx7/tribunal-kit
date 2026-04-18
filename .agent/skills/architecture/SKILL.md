---
name: architecture
description: Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-07
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Choosing microservices for a team of 1-3 developers -> ✅ Start monolith, extract services only when team/scale demands it
- ❌ Using event-driven architecture without understanding eventual consistency -> ✅ Events mean data will be stale; design for it
- ❌ Skipping ADRs (Architecture Decision Records) -> ✅ Every non-obvious decision needs a written 'why' for future maintainers

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


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
