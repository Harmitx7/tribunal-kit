# OpenTelemetry Semantic Conventions, Tracing & Instrumentation

> **Authority**: OpenTelemetry Specification (`https://opentelemetry.io/docs/specs/semconv/`)  
> **Applicable Domains**: Observability, Distributed Tracing, Metrics, Site Reliability Engineering  
> **Status**: Verified Production Specification  

---

## 1. W3C Trace Context Propagation

Distributed tracing connects asynchronous services through standardized HTTP headers:

- **`traceparent`**: `00-{trace_id}-{parent_id}-{trace_flags}` (e.g. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`)
  - `00`: Protocol version.
  - `trace_id`: 16-byte hex unique identifier for the distributed transaction.
  - `parent_id`: 8-byte hex identifier of the caller's span.
  - `trace_flags`: `01` indicates sampled.

---

## 2. Standard Span Semantic Conventions

Never invent ad-hoc attribute names. Adhere to official OpenTelemetry semantic keys:

### HTTP Server Spans

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('api-gateway', '1.0.0');

export async function handleRequest(req: Request): Promise<Response> {
  return tracer.startActiveSpan('HTTP ' + req.method, {
    kind: SpanKind.SERVER,
    attributes: {
      'http.request.method': req.method,
      'url.full': req.url,
      'url.path': new URL(req.url).pathname,
      'user_agent.original': req.headers.get('user-agent') || 'unknown',
      'network.peer.address': req.headers.get('x-forwarded-for') || 'unknown',
    }
  }, async (span) => {
    try {
      const response = await routeRequest(req);
      span.setAttribute('http.response.status_code', response.status);
      if (response.status >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
      }
      return response;
    } catch (err: unknown) {
      if (err instanceof Error) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      }
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Database Spans
- `db.system`: `"postgresql"`, `"mysql"`, `"redis"`, `"mongodb"`
- `db.operation`: `"SELECT"`, `"INSERT"`, `"UPDATE"`
- `db.collection.name`: Target table or collection name
- `db.statement`: Sanitized parameterized query (NEVER include raw user parameters / PII)

---

## 3. RED Metrics Standard (Rate, Errors, Duration)

Implement standard Golden Signals using OTel Metric Instruments:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('order-service', '1.0.0');

// 1. Rate (Total Requests)
const requestCounter = meter.createCounter('http.server.requests', {
  description: 'Total number of HTTP requests processed',
  unit: '{request}'
});

// 2. Duration (Latency Distribution)
const durationHistogram = meter.createHistogram('http.server.duration', {
  description: 'Duration of HTTP requests',
  unit: 'ms'
});

export function recordTelemetry(method: string, route: string, status: number, durationMs: number): void {
  const labels = { 'http.method': method, 'http.route': route, 'http.status_code': status };
  requestCounter.add(1, labels);
  durationHistogram.record(durationMs, labels);
}
```

---

## 4. Sensitive Data Masking & PII Redaction

Attributes stored in traces and metrics are broadcast to downstream observability collectors:
- **Forbidden in Spans**: Passwords, API tokens, JWTs, credit card numbers, authorization headers.
- Sanitize URLs: Strip query strings containing sensitive query parameters (e.g. `?token=...`).

---

## 5. Production Observability Verification Checklist

- [ ] All incoming HTTP and message queue consumers start a `SpanKind.SERVER` or `SpanKind.CONSUMER` span.
- [ ] Outgoing HTTP calls inject the `traceparent` header (`propagation.inject()`).
- [ ] Exceptions are explicitly recorded with `span.recordException(err)`.
- [ ] Database query parameters are parameterized to prevent PII leakage into telemetry.
- [ ] Metric instruments follow standard units (`ms`, `bytes`, `{count}`).
