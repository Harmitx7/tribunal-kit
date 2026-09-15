---
name: architecture
description: Use when Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - domain-modeling
  - codebase-design
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Architecture — System Design Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `architecture` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Software architecture mastery. System design patterns, clean architecture, hexagonal/ports-and-adapters, event-driven architecture, microservices vs monolith decision framework, CQRS, domain-driven design, Architecture Decision Records (ADRs), and scalability patterns. Use when making architecture decisions, designing systems, or documenting technical decisions.
- **DO NOT activate when:** The task falls outside the `architecture` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Choosing microservices for a team of 1-3 developers -> ✅ Start monolith, extract services only when team/scale demands it
- ❌ Using event-driven architecture without understanding eventual consistency -> ✅ Events mean data will be stale; design for it
- ❌ Skipping ADRs (Architecture Decision Records) -> ✅ Every non-obvious decision needs a written 'why' for future maintainers

---

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
interface UserRepository {
  findById(id: string): Promise<User | null>;
}
class User {
  promote(): void {
    if (this._role === UserRole.ADMIN) throw new DomainError('Already admin');
    this._role = UserRole.ADMIN;
  }
}

// Application — orchestrates use cases
class PromoteUserUseCase {
  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    user.promote();
    await this.userRepo.save(user);
    await this.eventBus.publish(new UserPromotedEvent(userId));
  }
}

// Infrastructure — concrete implementations of ports
class PostgresUserRepository implements UserRepository {
  async findById(id: string) {
    /* db.query(...) */
  }
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

| Pattern         | When it's an Anti-Pattern                   | Simpler Alternative              |
| --------------- | ------------------------------------------- | -------------------------------- |
| Microservices   | Before team or scale justifies it           | Modular monolith                 |
| Clean/Hexagonal | Over-abstraction for simple CRUD            | Concrete first, interfaces later |
| Event Sourcing  | No business requirement for audit/replay    | Append-only audit log            |
| CQRS            | Simple data model, no read/write divergence | Single model                     |
| Repository      | Simple CRUD, single database                | ORM direct access                |

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

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
