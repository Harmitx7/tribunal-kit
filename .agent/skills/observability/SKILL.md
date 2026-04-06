---
name: observability
description: Production observability mastery. Structured logging (Pino/Winston), OpenTelemetry tracing, metrics (Prometheus/Grafana), SLIs/SLOs/error budgets, distributed tracing, alerting design, health checks, and AI observability. Use when setting up monitoring, debugging production issues, or designing observable distributed systems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Observability — Production Monitoring Mastery

---

## The Three Pillars

```
Logs    → WHAT happened (structured events)
Traces  → WHERE it happened (request flow across services)
Metrics → HOW MUCH is happening (counters, histograms, gauges)

All three are needed. Logs alone are not observability.
```

---

## Structured Logging

```typescript
import pino from "pino";

// ✅ Structured JSON logging
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty" },
  }),
});

// ✅ GOOD: Structured with context
logger.info({ userId: user.id, action: "login", ip: req.ip }, "User logged in");
logger.error({ err, orderId: order.id, paymentGateway: "stripe" }, "Payment failed");
logger.warn({ queueDepth: 1500, threshold: 1000 }, "Queue depth exceeding threshold");

// ❌ BAD: Unstructured string logging
console.log("User " + user.id + " logged in from " + req.ip);
console.log("Error: " + error.message);

// ❌ HALLUCINATION TRAP: console.log is NOT production logging
// - No severity levels (info/warn/error)
// - No structured fields (can't search/filter)
// - No timestamps in ISO format
// - Can't be collected by log aggregators
// ✅ Use Pino (Node.js) or structlog (Python) for production
```

### Log Levels

```
fatal → App is crashing, immediate attention required
error → Operation failed, needs investigation
warn  → Something unexpected, but app continues
info  → Business events (user login, order placed, deploy)
debug → Technical details (query timing, cache hit/miss)
trace → Verbose debugging (only in development)

Rules:
- Production default: info
- Never log PII (names, emails, SSNs) at any level
- Never log secrets (tokens, passwords, API keys)
- Log request IDs for correlation
- Log durations for performance tracking
```

### Request Context / Correlation

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

const requestContext = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

// Middleware: set context per request
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  requestContext.run({ requestId, userId: req.user?.id }, next);
});

// Child logger with context
function getLogger() {
  const ctx = requestContext.getStore();
  return logger.child({
    requestId: ctx?.requestId,
    userId: ctx?.userId,
  });
}

// Every log from this request includes requestId and userId
const log = getLogger();
log.info("Processing order");  // { requestId: "abc-123", userId: "42", msg: "Processing order" }
```

---

## Distributed Tracing (OpenTelemetry)

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-http": { enabled: true },
      "@opentelemetry/instrumentation-express": { enabled: true },
      "@opentelemetry/instrumentation-pg": { enabled: true },
      "@opentelemetry/instrumentation-redis": { enabled: true },
    }),
  ],
});

sdk.start();

// Manual span for custom business logic
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("order-service");

async function processOrder(order: Order) {
  return tracer.startActiveSpan("processOrder", async (span) => {
    try {
      span.setAttribute("order.id", order.id);
      span.setAttribute("order.total", order.total);
      span.setAttribute("order.items.count", order.items.length);

      const result = await executeOrder(order);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Metrics

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("api-server");

// Counter — things that only go up
const requestCounter = meter.createCounter("http.requests.total", {
  description: "Total HTTP requests",
});

// Histogram — request durations
const requestDuration = meter.createHistogram("http.request.duration_ms", {
  description: "HTTP request duration in milliseconds",
  unit: "ms",
});

// Gauge — current values
const activeConnections = meter.createUpDownCounter("db.connections.active", {
  description: "Active database connections",
});

// Middleware to record metrics
app.use((req, res, next) => {
  const start = performance.now();
  res.on("finish", () => {
    const duration = performance.now() - start;
    requestCounter.add(1, {
      method: req.method,
      path: req.route?.path ?? req.path,
      status: res.statusCode.toString(),
    });
    requestDuration.record(duration, {
      method: req.method,
      status: res.statusCode.toString(),
    });
  });
  next();
});
```

### Key Metrics to Track

```
RED method (for services):
  Rate     → requests per second
  Errors   → error rate (4xx, 5xx)
  Duration → latency percentiles (P50, P95, P99)

USE method (for resources):
  Utilization → CPU %, memory %, disk %
  Saturation  → queue depth, thread pool saturation
  Errors      → disk failures, OOM kills

Business metrics:
  - Sign-ups per hour
  - Orders processed per minute
  - Revenue per day
  - API calls per customer
```

---

## SLIs, SLOs & Error Budgets

```
SLI (Service Level Indicator) → What you measure
  "99.2% of requests complete in <500ms"

SLO (Service Level Objective) → Your target
  "99.9% of requests should complete in <500ms"

SLA (Service Level Agreement) → Your contract (with penalties)
  "99.95% uptime or we refund 10%"

Error Budget = 100% - SLO
  SLO: 99.9% → Error budget: 0.1% → 43 min downtime/month
  SLO: 99.5% → Error budget: 0.5% → 3.6 hours downtime/month

Rules:
- Burn error budget too fast → freeze deployments
- Error budget remaining → ship features faster
- Don't set SLOs you can't measure
- SLOs should be slightly below actual performance
```

---

## Health Checks

```typescript
// Liveness: Is the process running?
app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness: Can it accept traffic?
app.get("/health/ready", async (req, res) => {
  try {
    await db.raw("SELECT 1");           // database check
    await redis.ping();                  // cache check
    res.status(200).json({
      status: "ready",
      checks: { database: "ok", cache: "ok" },
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      checks: { database: error.message },
    });
  }
});

// ❌ HALLUCINATION TRAP: Liveness ≠ Readiness
// Liveness fails → container restarts (only for unrecoverable states)
// Readiness fails → stop sending traffic (temporary — DB down, etc.)
// Making liveness check the DB → DB outage restarts all containers → cascade failure
```

---

## Alerting

```
Alert design rules:
1. Alert on SYMPTOMS, not causes (high latency, not "CPU is 80%")
2. Every alert must have a runbook link
3. Every alert must be ACTIONABLE — if you can't do anything, it's a notification
4. Use severity levels:
   - Critical → page on-call (customer-facing outage)
   - Warning  → Slack notification (degraded, not broken)
   - Info     → dashboard only (awareness)
5. Avoid alert fatigue — fewer, meaningful alerts beat many noisy ones
```

---
