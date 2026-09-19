---
name: opentelemetry-observability
description: "Use when Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-engineer
  - observability
  - performance-profiling
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# OpenTelemetry Observability — 2026 Telemetry Standards

---

## 🛠️ Technical Architecture & Reference Recipes

## Custom Trace & Meter Instrumentation (TypeScript)

```typescript
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('user-service', '1.0.0');
const meter = metrics.getMeter('user-service', '1.0.0');

const loginCounter = meter.createCounter('user_logins_total', {
  description: 'Counts total user login attempts',
});

export async function handleLogin(userId: string) {
  return tracer.startActiveSpan('handleLogin', async span => {
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
