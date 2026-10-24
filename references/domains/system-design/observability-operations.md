# Observability, Distributed Tracing & Operational Reliability

> **Authority**: OpenTelemetry Semantic Conventions v1.26 & Brendan Gregg (USE Method)  
> **Applicable Domains**: Observability, Telemetry, Distributed Tracing, Incident Operations  
> **Status**: Verified Production Specification  

---

## 1. Metrics Frameworks: RED vs USE Methods

| Framework | Core Metric Signals | Primary Focus | Best Applied To |
|:---|:---|:---|:---|
| **RED Method** (Tom Wilkie) | **Rate**: Requests processed per second<br>**Errors**: Failed requests per second<br>**Duration**: Request latency distributions | User-facing application services & API endpoints | Stateless web servers, microservices, RPC endpoints |
| **USE Method** (Brendan Gregg) | **Utilization**: % time resource was busy<br>**Saturation**: Queue length / work waiting<br>**Errors**: Error count / hardware faults | Underlying physical and virtual infrastructure resources | CPU, RAM, Disk I/O, Network interfaces, Connection pools |

---

## 2. Distributed Tracing & Context Propagation (W3C TraceContext)

In a microservice call chain, distributed tracing correlates log entries and performance spans across asynchronous network hops using standard HTTP headers:

```
[Client] ──> [API Gateway] ──> [Order Service] ──> [Payment Gateway]
                 │                    │                     │
                 ▼                    ▼                     ▼
              Span 1               Span 2                Span 3
   └────────────────────── Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736 ──────────────────────┘
```

### The W3C `traceparent` Header Specification (RFC):
$$\text{version}-\text{trace\_id}-\text{parent\_id}-\text{trace\_flags}$$
$$\text{Example: } \mathbf{00}\text{-}\mathbf{4bf92f3577b34da6a3ce929d0e0e4736}\text{-}\mathbf{00f067aa0ba902b7}\text{-}\mathbf{01}$$
- `version`: `00` (Current standard).
- `trace_id`: 16-byte array formatted as 32 hex characters (Globally unique to the entire end-to-end request).
- `parent_id` (Span ID): 8-byte array formatted as 16 hex characters (Identifies the calling caller).
- `trace_flags`: `01` indicates the trace was sampled for recording.

---

## 3. High Cardinality & Telemetry Cost Control

### The Cardinality Explosion Trap
A metric with tags like `user_id` or `order_id` creates a unique time-series stream for every user, multiplying database memory by millions ($100\text{ metrics} \times 1\text{M users} = 100\text{M time-series}$), crashing Prometheus/Datadog and incurring massive cloud bills.
- **Rule**: High-cardinality values belong in **Structured Logs and Distributed Traces**, NEVER in metric labels/dimensions.

### Trace Sampling Strategies
1. **Head-Based Sampling**: The ingress gateway flips a coin at the start of a request (e.g. sample $1\%$ of traffic). Inexpensive, but misses rare error traces ($0.01\%$ edge-case exceptions).
2. **Tail-Based Sampling**: The tracing collector buffers all spans for a request in memory until completion. If an error occurs ($HTTP \ge 500$) or latency exceeds $p95$, the trace is sampled at $100\%$; healthy low-latency traces are discarded.

---

## 4. SLO-Based Alerting Rules

Never wake an engineer for high CPU or RAM utilization if the user experience is healthy.

```
                  ┌────────────────────────────────────────┐
                  │    Is the User Experience Degraded?    │
                  └───────────────────┬────────────────────┘
                                      │
                     YES ─────────────┴───────────── NO
                      │                              │
             Check SLO Burn Rate            Investigate silently;
                      │                     Zero PagerDuty pages
      ┌───────────────┴───────────────┐
      │                               │
  > 14.4x Burn (100% in 1h)     > 3x Burn (100% in 24h)
      │                               │
  PAGE ON-CALL IMMEDIATELY      Create Ticket / Work Hours Review
```
