# Migration Architecture, Evolutionary Governance & ADRs

> **Authority**: Martin Fowler (Strangler Fig) & Neal Ford (Evolutionary Architecture)  
> **Applicable Domains**: Migration Architecture, Monolith Modernization, Architecture Governance  
> **Status**: Verified Production Specification  

---

## 1. Monolith Modernization: The Strangler Fig Pattern

Never attempt a "Big Bang" architectural rewrite. Incrementally intercept and migrate bounded contexts until the legacy system withers away:

```
[Incoming User Traffic]
           │
           ▼
[Strangler Interceptor / API Gateway]
     │                       │
     │ 90% (Legacy Paths)    │ 10% (Migrated Path: /v1/checkout)
     ▼                       ▼
[Legacy Monolith]   [New Checkout Microservice]
     │                       │
     ▼                       ▼
[Monolith Database] <──CDC── [Checkout Database]
```

### Execution Steps:
1. **Identify the Bounded Context**: Choose an edge service with high business value and minimal inbound dependencies (e.g. Notifications, Authentication, or Checkout).
2. **Deploy Interceptor / Gateway**: Route traffic at the ingress reverse proxy (Envoy/Nginx/Kong).
3. **Data Replication**: Replicate data from monolith DB to new service DB via CDC (Change Data Capture) or asynchronous outbox event stream.
4. **Shadow Traffic (Dark Launching)**: Mirror live production requests to both legacy and new service; compare output responses asynchronously. Discard new service response without returning to user to verify stability and correctness under real load.
5. **Cutover Traffic**: Shift live traffic to new service; decommission legacy code path.

---

## 2. Architecture Decision Records (ADR) Standard

Every significant technical decision affecting boundaries, persistence, or protocols must be preserved as an immutable Markdown record in `.agent/ADRs/NNNN-title.md`:

```markdown
# ADR-0004: Adoption of Apache Kafka for Asynchronous Order Processing

## Status
ACCEPTED (Date: 2026-10-24)

## Context
Our monolith database experiences connection exhaustion and lock contention during peak flash sales.
The Order service currently makes synchronous HTTP calls to Inventory, Payment, and Notification services.
A network timeout in Payment cascades into a 504 Gateway Timeout for the customer.

## Decision
We adopt Apache Kafka as the central asynchronous event log for Order State transitions.
- The Order service writes to PostgreSQL and publishes an `OrderCreated` event using the Transactional Outbox pattern.
- Inventory and Notification services consume events independently at their own processing rate.

## Consequences
### Positive
- Order placement latency drops from p99 850ms to p99 45ms.
- Payment service downtime no longer blocks customers from placing orders (decoupled availability).
### Negative / Operational Cost
- Increases infrastructure operational complexity (requires managed Kafka cluster / MSK).
- Requires implementing consumer deduplication (idempotent consumers) to handle at-least-once delivery.

## Alternatives Considered
- RabbitMQ: Rejected because we require 7-day event retention and stream replay capabilities.
- Direct synchronous HTTP with retries: Rejected due to compounding tail latency and cascading failure risk.
```

---

## 3. Architecture Fitness Functions

An **Architectural Fitness Function** is an automated test that enforces architectural invariants in CI/CD pipelines, preventing architectural drift:

```typescript
// Example Fitness Function: Ensure Domain Layer Never Imports Database or HTTP Libraries
describe('Architecture Fitness Function: Domain Layer Isolation', () => {
  test('domain modules must not import database or external network drivers', () => {
    const domainFiles = globSync('src/domain/**/*.ts');
    const forbiddenImports = ['pg', 'mysql2', 'axios', 'express', 'ioredis'];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const forbidden of forbiddenImports) {
        expect(content).not.toContain(`from '${forbidden}'`);
        expect(content).not.toContain(`require('${forbidden}')`);
      }
    }
  });
});
```
