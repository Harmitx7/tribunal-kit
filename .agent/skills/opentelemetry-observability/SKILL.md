---
name: opentelemetry-observability
description: Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring Full-stack distributed tracing, metrics, OpenTelemetry (OTel), Prometheus, Grafana Tempo, and zero-overhead observability instrumentation..
- **DO NOT activate when:** The task falls strictly outside opentelemetry-observability domain or belongs to a different dedicated specialist.

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

---

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
