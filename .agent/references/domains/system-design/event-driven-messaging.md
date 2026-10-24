# Event-Driven Messaging, Partitioning & Stream Processing

> **Authority**: Apache Kafka Architecture Documentation & Enterprise Integration Patterns  
> **Applicable Domains**: Messaging, Event Streaming, Asynchronous Pipelines, Stream Processing  
> **Status**: Verified Production Specification  

---

## 1. Message Broker vs Distributed Commit Log

| Attribute | Message Queue (RabbitMQ, AWS SQS) | Distributed Event Log (Apache Kafka, Redpanda) |
|:---|:---|:---|
| **Storage Model** | Ephemeral: Messages deleted after consumer ACK | Append-only immutable disk log with configurable retention (days/weeks) |
| **Ordering** | FIFO within single queue; lost if multiple competing consumers | Strict order guaranteed **within a partition**; unordered across partitions |
| **Consumer Tracking** | Broker tracks message state (ACK/NACK) per message | Consumer maintains its own reading offset in the partition |
| **Event Replay** | Cannot replay consumed messages | Replay historical events by resetting consumer offset |
| **Scale Model** | Competing consumers pulling from shared queue | Horizontal partition scaling per consumer group |
| **Ideal For** | Task distribution, discrete job execution | High-throughput telemetry, event sourcing, CDC, log pipelines |

---

## 2. Kafka Partitioning & Consumer Scaling Math

- **Partition Key**: Kafka hashes the message key (`murmur2(key) % num_partitions`) to assign events to partitions.
- **Ordering Invariant**: Events with the **same key** always land in the **same partition**, guaranteeing strict sequential processing order per entity (e.g. `order_id` or `user_id`).
- **Consumer Group Constraint**:
  - Maximum active consumers in a single group = **Total Partitions**.
  - If a topic has $12\text{ partitions}$ and you deploy $16\text{ consumer pods}$, $4\text{ pods remain completely idle}$ as hot standbys.

```
Topic: [Orders] (4 Partitions)
  Partition 0 ─── consumed by ───> Consumer Pod 1
  Partition 1 ─── consumed by ───> Consumer Pod 2
  Partition 2 ─── consumed by ───> Consumer Pod 3
  Partition 3 ─── consumed by ───> Consumer Pod 4
```

---

## 3. Delivery Semantics & Idempotent Consumers

### Delivery Guarantees:
1. **At-Most-Once**: Consumer commits offset *before* processing message. If pod crashes mid-processing, message is lost forever.
2. **At-Least-Once (Default)**: Consumer processes message and commits offset *after* completion. If pod crashes before offset commit, message will be re-delivered on restart.
3. **Effectively Once (Idempotent Consumer)**:
   - Since network retries make duplicates inevitable, every consumer MUST be idempotent.
   - Dedup store pattern: Store processed `message_id` in Redis with TTL or in database unique constraint within local transaction.

```typescript
async function processEvent(event: DomainEvent, db: DatabaseClient): Promise<void> {
  const query = `
    INSERT INTO processed_events (event_id, processed_at)
    VALUES ($1, NOW())
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id;
  `;
  const res = await db.query(query, [event.id]);
  if (res.rows.length === 0) {
    // Duplicate detected; skip processing safely
    return;
  }
  // Execute business logic...
}
```

---

## 4. Poison Messages, Dead-Letter Queues (DLQ) & Backpressure

1. **Poison Message**: A malformed event that permanently crashes consumer logic (e.g., JSON schema violation). Retrying infinitely blocks the partition forever.
2. **DLQ Pattern**:
   - Limit retries to fixed count (e.g., 3 attempts with exponential backoff).
   - If still failing, route event to dedicated Dead-Letter Queue (`topic.dlq`) with metadata (stack trace, error message, retry count) and ACK original message to unblock the partition.
   - Trigger alerting on DLQ depth $> 0$.
3. **Consumer Lag**: Metric calculating $(\text{Latest Log Offset} - \text{Consumer Current Offset})$. A rising lag indicates downstream saturation, triggering autoscaling or alert escalation.

---

## 5. Stream Processing & Windowing

- **Event Time vs Processing Time**:
  - *Event Time*: When the event originally occurred at the source (timestamp in payload).
  - *Processing Time*: When the stream processing node observes the message.
- **Watermarks**: A threshold indicating that no events older than timestamp $T$ are expected to arrive, allowing safe closure of temporal windows.
- **Window Types**:
  - **Tumbling Window**: Fixed, non-overlapping windows (e.g. $00:00\text{–}00:05$, $00:05\text{–}00:10$).
  - **Sliding (Hopping) Window**: Fixed length, overlapping windows (e.g. 5-minute window computed every 1 minute).
  - **Session Window**: Dynamic window defined by inactivity gaps.
