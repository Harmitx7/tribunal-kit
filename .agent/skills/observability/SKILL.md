---
name: observability
description: Production observability principles. OpenTelemetry traces, structured logs, metrics, SLOs/SLIs/error budgets, and AI observability. Use when setting up monitoring, debugging production issues, or designing observable distributed systems.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Observability Principles

> Monitoring tells you when something is broken.
> Observability tells you why.

---

## The Three Pillars

```
TRACES    → The journey of a single request across services
            "Why was THIS request slow?"

LOGS      → Discrete events with context
            "What exactly happened at 14:23:07?"

METRICS   → Aggregated measurements over time
            "What is our error rate over the last hour?"
```

Use all three. They answer different questions. None replaces the others.

---

## OpenTelemetry: The Standard

OpenTelemetry (OTel) is the vendor-neutral standard for instrumentation. Use it and you can swap backends (Jaeger, Grafana Tempo, Honeycomb, Datadog) without changing application code.

```ts
// src/instrumentation.ts — initialize OTel once, before app code
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

---

## Distributed Tracing

Traces connect the dots across microservice boundaries:

```ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service');

async function processPayment(orderId: string, amount: number) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    try {
      // Add business context to the span
      span.setAttributes({
        'order.id': orderId,
        'payment.amount': amount,
        'payment.currency': 'USD',
      });

      const result = await chargeCard(orderId, amount);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      // Record the error with full context
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

---

## Structured Logging

Logs must be machine-parseable:

```ts
// ❌ Unstructured — impossible to query, filter, or alert on
console.log(`User ${userId} failed to login at ${new Date()}`);

// ✅ Structured — every field is queryable
logger.warn({
  event: 'auth.login_failed',
  userId,
  reason: 'invalid_password',
  attemptCount: 3,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
```

### What to Always Log

| Always | Never |
|---|---|
| Request ID / trace ID | Passwords or password hashes |
| User ID (not PII) | Credit card numbers |
| Error type + message | API keys or tokens |
| Duration (ms) | Full request bodies (may contain PII) |
| HTTP status code | |

---

## Metrics: What to Measure

The four golden signals (Google SRE):

```
1. LATENCY       — How long does serving a request take?
                   Track p50, p95, p99 — not just average
                   Average hides the worst-case user experience

2. TRAFFIC       — How much demand is there?
                   requests/sec, messages/sec, bytes/sec

3. ERRORS        — What fraction of requests are failing?
                   HTTP 5xx rate, exception rate, timeout rate

4. SATURATION    — How "full" is your service?
                   CPU %, memory %, queue depth
```

---

## SLOs / SLIs / Error Budgets

The framework that connects technical work to business reliability:

```
SLI (Service Level Indicator) — a specific, measurable signal:
  "HTTP 200 responses as % of all responses to /api/checkout"

SLO (Service Level Objective) — your reliability promise:
  "99.9% of checkout requests succeed over a 30-day window"

Error Budget — how much unreliability you can afford:
  "30 days × 0.1% error tolerance = 43.2 minutes of downtime allowed"

Error Budget Policy:
  Budget healthy  → ship new features freely
  Budget depleted → freeze releases, focus only on reliability
```

---

## AI Observability

Standard metrics don't cover AI systems. Add these:

```ts
// Track every AI call with these dimensions
logger.info({
  event: 'ai.completion',
  model: 'gpt-4o',
  prompt_tokens: response.usage.prompt_tokens,
  completion_tokens: response.usage.completion_tokens,
  total_tokens: response.usage.total_tokens,
  latency_ms: duration,
  cost_usd: calculateCost(model, usage),
  trace_id: currentTraceId(),

  // Eval scores (from async evaluation pipeline)
  eval_faithfulness: 0.92,    // Did output match sources?
  eval_relevance: 0.88,       // Did output answer the question?
});
```

### AI-Specific Alerts

```
🚨 TOKEN COST SPIKE     → cost per request > 2x trailing average → alert
🚨 LATENCY DEGRADATION  → p95 LLM latency > 5s → alert
🚨 EVAL SCORE DECLINE   → faithfulness drops below 0.8 (model drift?) → alert
🚨 ERROR RATE SPIKE     → 429s or context_length errors > 5% → alert
```

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-backend`**
**Active reviewers: `logic` · `security` · `performance`**

### ❌ Forbidden AI Tropes in Observability

1. **Logging sensitive data** — never log request bodies wholesale — they contain passwords, tokens, PII. Log only specific, safe fields.
2. **Tracking averages only** — `avg(latency)` hides the 1% of users who get 10x worse experience. Always use percentiles (p95, p99).
3. **100% SLO targets** — `99.999%` SLOs are wrong for most services. They consume all error budget instantly and paralyze product velocity.
4. **Inventing OTel packages** — only use `@opentelemetry/{sdk-node,api,exporter-*}` from the official `@opentelemetry` npm org.

### ✅ Pre-Flight Self-Audit

```
✅ Are logs structured JSON (not string-interpolated messages)?
✅ Is no PII or credential data being logged?
✅ Are latency measurements tracking percentiles (p95/p99), not just averages?
✅ Does every async operation have a trace span with error recording?
✅ Are AI calls instrumented with token count + cost + latency tracking?
✅ Is there an SLO defined with an explicit error budget policy?
```
