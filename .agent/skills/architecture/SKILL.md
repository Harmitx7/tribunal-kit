---
name: architecture
description: Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Architecture — System Design Mastery

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
|Database|Rejected Because|
|MySQL|Weaker JSON support, no pgvector|
|MongoDB|No strong consistency, no JOINs|
|PlanetScale|MySQL-based, no extensions|
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

---

## Context Discovery

Before suggesting any architecture, gather context.

### Question Hierarchy (Ask User FIRST)

1. **Scale**
   - How many users? (10, 1K, 100K, 1M+)
   - Data volume? (MB, GB, TB)
   - Transaction rate? (per second/minute)

2. **Team**
   - Solo developer or team?
   - Team size and expertise?
   - Distributed or co-located?

3. **Timeline**
   - MVP/Prototype or long-term product?
   - Time to market pressure?

4. **Domain**
   - CRUD-heavy or business logic complex?
   - Real-time requirements?
   - Compliance/regulations?

5. **Constraints**
   - Budget limitations?
   - Legacy systems to integrate?
   - Technology stack preferences?

### Project Classification Matrix

```
                    MVP              SaaS           Enterprise
┌─────────────────────────────────────────────────────────────┐
│ Scale        │ <1K           │ 1K-100K      │ 100K+        │
│ Team         │ Solo          │ 2-10         │ 10+          │
│ Timeline     │ Fast (weeks)  │ Medium (months)│ Long (years)│
│ Architecture │ Simple        │ Modular      │ Distributed  │
│ Patterns     │ Minimal       │ Selective    │ Comprehensive│
│ Example      │ Next.js API   │ NestJS       │ Microservices│
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Examples

---

### Example 1: MVP E-commerce (Solo Developer)

```yaml
Requirements:
  - <1000 users initially
  - Solo developer
  - Fast to market (8 weeks)
  - Budget-conscious

Architecture Decisions:
  App Structure: Monolith (simpler for solo)
  Framework: Next.js (full-stack, fast)
  Data Layer: Prisma direct (no over-abstraction)
  Authentication: JWT (simpler than OAuth)
  Payment: Stripe (hosted solution)
  Database: PostgreSQL (ACID for orders)

Trade-offs Accepted:
  - Monolith → Can't scale independently (team doesn't justify it)
  - No Repository → Less testable (simple CRUD doesn't need it)
  - JWT → No social login initially (can add later)

Future Migration Path:
  - Users > 10K → Extract payment service
  - Team > 3 → Add Repository pattern
  - Social login requested → Add OAuth
```

---

### Example 2: SaaS Product (5-10 Developers)

```yaml
Requirements:
  - 1K-100K users
  - 5-10 developers
  - Long-term (12+ months)
  - Multiple domains (billing, users, core)

Architecture Decisions:
  App Structure: Modular Monolith (team size optimal)
  Framework: NestJS (modular by design)
  Data Layer: Repository pattern (testing, flexibility)
  Domain Model: Partial DDD (rich entities)
  Authentication: OAuth + JWT
  Caching: Redis
  Database: PostgreSQL

Trade-offs Accepted:
  - Modular Monolith → Some module coupling (microservices not justified)
  - Partial DDD → No full aggregates (no domain experts)
  - RabbitMQ later → Initial synchronous (add when proven needed)

Migration Path:
  - Team > 10 → Consider microservices
  - Domains conflict → Extract bounded contexts
  - Read performance issues → Add CQRS
```

---

### Example 3: Enterprise (100K+ Users)

```yaml
Requirements:
  - 100K+ users
  - 10+ developers
  - Multiple business domains
  - Different scaling needs
  - 24/7 availability

Architecture Decisions:
  App Structure: Microservices (independent scale)
  API Gateway: Kong/AWS API GW
  Domain Model: Full DDD
  Consistency: Event-driven (eventual OK)
  Message Bus: Kafka
  Authentication: OAuth + SAML (enterprise SSO)
  Database: Polyglot (right tool per job)
  CQRS: Selected services

Operational Requirements:
  - Service mesh (Istio/Linkerd)
  - Distributed tracing (Jaeger/Tempo)
  - Centralized logging (ELK/Loki)
  - Circuit breakers (Resilience4j)
  - Kubernetes/Helm
```

---

## Pattern Selection Guidelines

Decision trees for choosing architectural patterns.

### Main Decision Tree

```
START: What's your MAIN concern?

┌─ Data Access Complexity?
│  ├─ HIGH (complex queries, testing needed)
│  │  → Repository Pattern + Unit of Work
│  │  VALIDATE: Will data source change frequently?
│  │     ├─ YES → Repository worth the indirection
│  │     └─ NO  → Consider simpler ORM direct access
│  └─ LOW (simple CRUD, single database)
│     → ORM directly (Prisma, Drizzle)
│     Simpler = Better, Faster
│
├─ Business Rules Complexity?
│  ├─ HIGH (domain logic, rules vary by context)
│  │  → Domain-Driven Design
│  │  VALIDATE: Do you have domain experts on team?
│  │     ├─ YES → Full DDD (Aggregates, Value Objects)
│  │     └─ NO  → Partial DDD (rich entities, clear boundaries)
│  └─ LOW (mostly CRUD, simple validation)
│     → Transaction Script pattern
│     Simpler = Better, Faster
│
├─ Independent Scaling Needed?
│  ├─ YES (different components scale differently)
│  │  → Microservices WORTH the complexity
│  │  REQUIREMENTS (ALL must be true):
│  │    - Clear domain boundaries
│  │    - Team > 10 developers
│  │    - Different scaling needs per service
│  │  IF NOT ALL MET → Modular Monolith instead
│  └─ NO (everything scales together)
│     → Modular Monolith
│     Can extract services later when proven needed
│
└─ Real-time Requirements?
   ├─ HIGH (immediate updates, multi-user sync)
   │  → Event-Driven Architecture
   │  → Message Queue (RabbitMQ, Redis, Kafka)
   │  VALIDATE: Can you handle eventual consistency?
   │     ├─ YES → Event-driven valid
   │     └─ NO  → Synchronous with polling
   └─ LOW (eventual consistency acceptable)
      → Synchronous (REST/GraphQL)
      Simpler = Better, Faster
```

### The 3 Questions (Before ANY Pattern)

1. **Problem Solved**: What SPECIFIC problem does this pattern solve?
2. **Simpler Alternative**: Is there a simpler solution?
3. **Deferred Complexity**: Can we add this LATER when needed?

### Red Flags (Anti-patterns)

|Pattern|Anti-pattern|Simpler Alternative|
|---------|-------------|-------------------|
|Microservices|Premature splitting|Start monolith, extract later|
|Clean/Hexagonal|Over-abstraction|Concrete first, interfaces later|
|Event Sourcing|Over-engineering|Append-only audit log|
|CQRS|Unnecessary complexity|Single model|
|Repository|YAGNI for simple CRUD|ORM direct access|

---

## Architecture Patterns Reference

Quick reference for common patterns with usage guidance.

### Data Access Patterns

|Pattern|When to Use|When NOT to Use|Complexity|
|---------|-------------|-----------------|------------|
|**Active Record**|Simple CRUD, rapid prototyping|Complex queries, multiple sources|Low|
|**Repository**|Testing needed, multiple sources|Simple CRUD, single database|Medium|
|**Unit of Work**|Complex transactions|Simple operations|High|
|**Data Mapper**|Complex domain, performance|Simple CRUD, rapid dev|High|

### Domain Logic Patterns

|Pattern|When to Use|When NOT to Use|Complexity|
|---------|-------------|-----------------|------------|
|**Transaction Script**|Simple CRUD, procedural|Complex business rules|Low|
|**Table Module**|Record-based logic|Rich behavior needed|Low|
|**Domain Model**|Complex business logic|Simple CRUD|Medium|
|**DDD (Full)**|Complex domain, domain experts|Simple domain, no experts|High|

### Distributed System Patterns

|Pattern|When to Use|When NOT to Use|Complexity|
|---------|-------------|-----------------|------------|
|**Modular Monolith**|Small teams, unclear boundaries|Clear contexts, different scales|Medium|
|**Microservices**|Different scales, large teams|Small teams, simple domain|Very High|
|**Event-Driven**|Real-time, loose coupling|Simple workflows, strong consistency|High|
|**CQRS**|Read/write performance diverges|Simple CRUD, same model|High|
|**Saga**|Distributed transactions|Single database, simple ACID|High|

### API Patterns

|Pattern|When to Use|When NOT to Use|Complexity|
|---------|-------------|-----------------|------------|
|**REST**|Standard CRUD, resources|Real-time, complex queries|Low|
|**GraphQL**|Flexible queries, multiple clients|Simple CRUD, caching needs|Medium|
|**gRPC**|Internal services, performance|Public APIs, browser clients|Medium|
|**WebSocket**|Real-time updates|Simple request/response|Medium|

---

### Simplicity Principle

**"Start simple, add complexity only when proven necessary."**

- You can always add patterns later
- Removing complexity is MUCH harder than adding it
- When in doubt, choose simpler option

---

## Trade-off Analysis & ADR

Document every architectural decision with trade-offs.

### Decision Framework

For EACH architectural component, document:

```markdown
### Architecture Decision Record

#### Context
- **Problem**: [What problem are we solving?]
- **Constraints**: [Team size, scale, timeline, budget]

#### Options Considered

|Option|Pros|Cons|Complexity|When Valid|
|--------|------|------|------------|-----------|
|Option A|Benefit 1|Cost 1|Low|[Conditions]|
|Option B|Benefit 2|Cost 2|High|[Conditions]|

#### Decision
**Chosen**: [Option B]

#### Rationale
1. [Reason 1 - tied to constraints]
2. [Reason 2 - tied to requirements]

#### Trade-offs Accepted
- [What we're giving up]
- [Why this is acceptable]

#### Consequences
- **Positive**: [Benefits we gain]
- **Negative**: [Costs/risks we accept]
- **Mitigation**: [How we'll address negatives]

#### Revisit Trigger
- [When to reconsider this decision]
```

### ADR Template

```markdown
## ADR-[XXX]: [Decision Title]

### Status
Proposed | Accepted | Deprecated | Superseded by [ADR-YYY]

### Context
[What problem? What constraints?]

### Decision
[What we chose - be specific]

### Rationale
[Why - tie to requirements and constraints]

### Trade-offs
[What we're giving up - be honest]

### Consequences
- **Positive**: [Benefits]
- **Negative**: [Costs]
- **Mitigation**: [How to address]
```

### ADR Storage

```
docs/
└── architecture/
    ├── adr-001-use-nextjs.md
    ├── adr-002-postgresql-over-mongodb.md
    └── adr-003-adopt-repository-pattern.md
```
