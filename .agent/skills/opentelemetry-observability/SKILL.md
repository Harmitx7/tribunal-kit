---
name: opentelemetry-observability
description: Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/test_runner.js
scripts-binding:
  - .agent/scripts/test_runner.js
skills:
  - devops-engineer
  - observability
  - performance-profiling
---

# OpenTelemetry Observability — 2026 Telemetry Standards

## Mandatory Pre-Flight Context Inspection

Before instrumenting applications:
1. Vendor-Neutral Telemetry → Use standard OpenTelemetry SDKs (OTLP over gRPC/HTTP)
2. Trace Propagation → Propagate `traceparent` W3C headers across HTTP and message queues
3. Sampling Policy → Implement head/tail sampling to reduce telemetry storage costs by 80%

## Custom Trace & Meter Instrumentation (TypeScript)

```typescript
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('user-service', '1.0.0');
const meter = metrics.getMeter('user-service', '1.0.0');

const loginCounter = meter.createCounter('user_logins_total', {
  description: 'Counts total user login attempts',
});

export async function handleLogin(userId: string) {
  return tracer.startActiveSpan('handleLogin', async (span) => {
    try {
      span.setAttribute('user.id', userId);
      loginCounter.add(1, { status: 'success' });
      // Business logic...
      span.setStatus({ code: 1 }); // OK
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message }); // Error
      throw err;
    } finally {
      span.end();
    }
  });
}
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Verify traces connect seamlessly from frontend click to DB query.
- Confirm telemetry exporter overhead adds < 1ms latency to HTTP handlers.
