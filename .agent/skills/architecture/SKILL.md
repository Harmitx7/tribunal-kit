---
name: architecture
description: Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Architecture — System Design Mastery

> Architecture is the set of decisions you wish you could get right the first time.
> Every architecture decision is a trade-off. Document the trade-off, not just the choice.

---

## Architecture Selection

```
┌────────────────────────────────────────────────────────────────┐
│              What Architecture Do You Need?                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Team size?                                                     │
│  ├── 1-5 developers → Modular Monolith                         │
│  ├── 5-20 developers → Modular Monolith + Event Bus            │
│  └── 20+ developers → Microservices (with platform team)       │
│                                                                 │
│  Scale requirements?                                            │
│  ├── Single region, <10K RPM → Monolith                        │
│  ├── Multi-region, <100K RPM → Monolith + CDN + Read Replicas  │
│  └── Global, >100K RPM → Microservices + Edge                  │
│                                                                 │
│  Deployment cadence?                                            │
│  ├── Weekly releases → Monolith                                 │
│  ├── Daily releases, different modules → Modular Monolith      │
│  └── Continuous per-service deployment → Microservices          │
│                                                                 │
│  ❌ HALLUCINATION TRAP: Microservices are NOT inherently better │
│  A well-structured monolith beats a poorly designed microservice│
│  architecture. Start monolith. Extract services when you MUST.  │
└────────────────────────────────────────────────────────────────┘
```

---

## Clean Architecture (Layered)

```
┌───────────────────────────────────────────────┐
│              Presentation Layer                │
│    Controllers / Minimal APIs / CLI / UI       │
├───────────────────────────────────────────────┤
│              Application Layer                 │
│    Use Cases / Commands / Queries / DTOs       │
├───────────────────────────────────────────────┤
│              Domain Layer (Core)               │
│    Entities / Value Objects / Domain Events     │
│    Business Rules / Interfaces (Ports)          │
├───────────────────────────────────────────────┤
│              Infrastructure Layer              │
│    Database / External APIs / File System       │
│    Message Queues / Email / Cache (Adapters)    │
└───────────────────────────────────────────────┘

Dependency Rule: Dependencies point INWARD only.
- Infrastructure → Application → Domain
- Domain knows NOTHING about infrastructure
- Application defines interfaces (ports)
- Infrastructure implements them (adapters)
```

```typescript
// Domain layer — pure business logic, zero dependencies
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

class User {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    private _role: UserRole,
  ) {}

  promote(): void {
    if (this._role === UserRole.ADMIN) {
      throw new DomainError("Already admin");
    }
    this._role = UserRole.ADMIN;
  }
}

// Application layer — orchestrates use cases
class PromoteUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private eventBus: EventBus,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    user.promote(); // domain logic
    await this.userRepo.save(user);
    await this.eventBus.publish(new UserPromotedEvent(userId));
  }
}

// Infrastructure — concrete implementations
class PostgresUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    return row ? User.fromRow(row) : null;
  }
}
```

---

## CQRS (Command Query Responsibility Segregation)

```
Commands (Write)                    Queries (Read)
┌─────────────┐                    ┌──────────────┐
│ CreateUser   │──→ Write DB ──→   │ UserListView │
│ UpdateOrder  │    (normalized)   │ OrderSummary │
│ DeletePost   │                   │ Dashboard    │
└─────────────┘                    └──────────────┘
                                         ↑
                                   Read DB / Cache
                                   (denormalized, optimized)

When to use CQRS:
✅ Read and write patterns are very different
✅ Read-heavy system (10:1+ read:write ratio)
✅ Need different optimization for reads vs writes
✅ Event sourcing

When NOT to use:
❌ Simple CRUD app
❌ Small team (< 3 developers)
❌ Read and write models are nearly identical
```

```typescript
// Command
class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly shippingAddress: Address,
  ) {}
}

// Command Handler
class CreateOrderHandler {
  constructor(private orderRepo: OrderRepository, private eventBus: EventBus) {}

  async handle(cmd: CreateOrderCommand): Promise<string> {
    const order = Order.create(cmd.userId, cmd.items, cmd.shippingAddress);
    await this.orderRepo.save(order);
    await this.eventBus.publish(new OrderCreatedEvent(order.id));
    return order.id;
  }
}

// Query (reads from denormalized view)
class GetOrderSummaryQuery {
  constructor(public readonly orderId: string) {}
}

class GetOrderSummaryHandler {
  constructor(private readDb: ReadOnlyDatabase) {}

  async handle(query: GetOrderSummaryQuery): Promise<OrderSummaryView> {
    return this.readDb.findOne("order_summaries", { id: query.orderId });
  }
}
```

---

## Event-Driven Architecture

```
Producer → Event Bus → Consumer(s)

Event types:
1. Domain Events    → "OrderPlaced", "UserRegistered" (within bounded context)
2. Integration Events → cross-service communication (via message queue)
3. Notification Events → fire-and-forget (logging, analytics)

Message brokers:
- Redis Streams / BullMQ    → simple, good for single-service queues
- RabbitMQ                  → complex routing, exchanges, dead-letter queues
- Apache Kafka              → high throughput, event log, replay capability
- AWS SQS/SNS               → managed, serverless-friendly
```

```typescript
// Domain event
interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  data: Record<string, unknown>;
}

// Event handler
class SendWelcomeEmailHandler {
  constructor(private emailService: EmailService) {}

  async handle(event: DomainEvent & { eventType: "user.registered" }) {
    await this.emailService.send({
      to: event.data.email as string,
      template: "welcome",
    });
  }
}

// Outbox pattern (reliable event publishing)
// 1. Save entity + event in SAME db transaction
// 2. Background worker polls outbox table → publishes to event bus
// 3. Mark as published
// This guarantees at-least-once delivery without distributed transactions
```

---

## Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status: Accepted

## Context
We need a relational database for our SaaS application with complex querying
requirements, multi-tenancy, and full-text search capabilities.

## Decision
We will use PostgreSQL 16 with pgvector extension for AI features.

## Consequences
### Positive
- Strong ecosystem, proven at scale (Instagram, Discord)
- JSONB support for flexible schema fields
- pgvector eliminates need for separate vector DB

### Negative
- More operational complexity than managed options (Supabase mitigates this)
- Connection pooling required for serverless (PgBouncer)

### Risks
- Team has limited PostgreSQL DBA experience → mitigated by managed hosting

## Alternatives Considered
| Database    | Rejected Because                        |
|-------------|----------------------------------------|
| MySQL       | Weaker JSON support, no pgvector       |
| MongoDB     | No strong consistency, no JOINs        |
| PlanetScale | MySQL-based, no extensions             |
```

---

## Scalability Patterns

```
Vertical Scaling → Bigger machine (simple, limited)
Horizontal Scaling → More machines (complex, unlimited)

Read scaling:
  Cache layer (Redis) → Read replicas → CDN for static assets

Write scaling:
  Queue writes → Partition/shard data → Event sourcing

Stateless services:
  Sessions in Redis → JWT tokens → No server affinity

Database scaling:
  Connection pooling → Read replicas → Partitioning → Sharding (last resort)

Caching strategy:
  L1: In-memory (process)
  L2: Redis/Memcached (shared)
  L3: CDN (edge)
  Cache invalidation > Cache expiration (when possible)
```

---

## 🤖 LLM-Specific Traps

1. **Premature Microservices:** Don't split into microservices until you have team/scale pressure. Start with a modular monolith.
2. **CQRS for Simple CRUD:** CQRS adds complexity. Only use when read/write patterns are fundamentally different.
3. **"Clean Architecture" Without Domain Logic:** If your "domain layer" is just DTOs, you don't need Clean Architecture.
4. **Event Sourcing as Default:** Event sourcing is complex. Only use for audit-heavy domains (finance, compliance).
5. **Shared Database Between Services:** Microservices with a shared database are a distributed monolith.
6. **Missing ADRs:** Every significant technical decision needs a documented ADR. "We just decided" is not acceptable.
7. **Synchronous Microservice Chains:** Service A → B → C → D is a distributed monolith with worse latency.
8. **Ignoring Conway's Law:** Architecture mirrors org structure. Don't fight it.
9. **"Hexagonal Architecture" Without Ports:** Just having layers isn't hexagonal. You need explicit port interfaces.
10. **Over-Abstracting Day One:** YAGNI. Build the simplest thing that works, refactor when patterns emerge.

---

## 🏛️ Tribunal Integration

**Slash command: `/tribunal-backend`**

### ✅ Pre-Flight Self-Audit

```
✅ Did I document the architecture decision as an ADR?
✅ Is the architecture appropriate for team size and scale?
✅ Do dependencies point inward (domain has no infrastructure deps)?
✅ Did I start simple and avoid premature optimization?
✅ Is the system stateless (sessions in Redis/JWT)?
✅ Did I consider failure modes (what happens when service X is down)?
✅ Is there a caching strategy (L1/L2/L3)?
✅ Are cross-service calls async (events, not synchronous chains)?
✅ Did I document trade-offs, not just the chosen solution?
✅ Does the architecture match the team's actual skill set?
```
