---
name: error-resilience
description: Use when Error resilience and fault tolerance mastery. Retry strategies (exponential backoff with jitter), circuit breakers, bulkheads, graceful degradation, React error boundaries, dead letter queues, timeout patterns, fallback chains, and idempotent error recovery. Use when building fault-tolerant systems, handling flaky external services, or preventing cascading failures.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - devops-incident-responder
  - backend-security-expert
  - observability
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Error Resilience — Fault-Tolerant Systems

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `error-resilience` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Error resilience and fault tolerance mastery. Retry strategies (exponential backoff with jitter), circuit breakers, bulkheads, graceful degradation, React error boundaries, dead letter queues, timeout patterns, fallback chains, and idempotent error recovery. Use when building fault-tolerant systems, handling flaky external services, or preventing cascading failures.
- **DO NOT activate when:** The task falls outside the `error-resilience` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## 2026 Fault Tolerance & Resilience Invariants

1. **`AbortSignal.timeout()` Budgeting**:
   ```ts
   // Native in modern Node.js and browsers
   const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
   ```
2. **AWS Architecture Full Jitter Formula**:
   ```ts
   function getJitteredBackoff(attempt: number, baseMs = 100, maxCapMs = 5000): number {
     const exponential = Math.min(maxCapMs, baseMs * 2 ** attempt);
     return Math.random() * exponential;
   }
   ```
3. **Circuit Breaker Trip Thresholds**: Trip to `OPEN` on ≥ 5 consecutive 5xx errors or > 50% failure rate over a 10s rolling window. Fail fast immediately with a cached or fallback response while open.

## Hallucination Traps (Read First)

- ❌ Retrying non-idempotent operations without idempotency keys → ✅ Blind retries cause double charges and duplicated records
- ❌ Retrying indefinitely without exponential backoff → ✅ Causes the "thundering herd" problem and DDOSes reviving downstream servers
- ❌ Swallowing errors silently `catch (e) {}` → ✅ Logs must capture the root stack trace and error cause
- ❌ Using `setTimeout` without clearing when promise resolves → ✅ Causes timer memory leaks

---

## Error Classification (Always Do This First)

```typescript
// ✅ CRITICAL: Classify errors before handling them
// Operational errors = expected failures you CAN recover from
// Programmer errors = bugs you CANNOT recover from

class OperationalError extends Error {
  constructor(message: string, public readonly isRetryable: boolean = false) {
    super(message);
    this.name = "OperationalError";
  }
}

// ❌ BAD: Treating all errors the same
catch (e) { console.log(e); }

// ✅ GOOD: Classifying and routing
catch (error) {
  if (error instanceof OperationalError && error.isRetryable) {
    return retry(operation);
  }
  if (error instanceof OperationalError) {
    return fallback(error);
  }
  // Programmer error — crash fast, fix the bug
  throw error;
}
```

```
┌─────────────────────────────────────────────────────────────┐
│            Operational (recoverable)                         │
├─────────────────────────────────────────────────────────────┤
│ Network timeout           → Retry with backoff              │
│ Rate limited (429)        → Retry after Retry-After header  │
│ Service unavailable (503) → Circuit breaker + fallback      │
│ Database connection lost  → Reconnect with pool             │
│ Input validation failed   → Return 400 to client            │
│ File not found            → Return 404 or create default    │
├─────────────────────────────────────────────────────────────┤
│            Programmer (crash immediately)                    │
├─────────────────────────────────────────────────────────────┤
│ TypeError / ReferenceError → Bug — fix the code             │
│ Assertion failure          → Invariant violated — fix logic  │
│ Undefined is not a function → Missing import or typo        │
│ Stack overflow             → Infinite recursion — fix logic  │
└─────────────────────────────────────────────────────────────┘
```

---

## Retry with Exponential Backoff + Jitter

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
  retryableErrors: err =>
    err instanceof Error &&
    (err.message.includes('ECONNRESET') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('503') ||
      err.message.includes('429')),
};

async function withRetry<T>(fn: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<T> {
  const opts = { ...DEFAULT_RETRY, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === opts.maxRetries;
      const isRetryable = opts.retryableErrors?.(error) ?? true;

      if (isLast || !isRetryable) throw error;

      // Exponential backoff with full jitter
      const exponential = opts.baseDelayMs * 2 ** attempt;
      const capped = Math.min(exponential, opts.maxDelayMs);
      const jitter = Math.random() * capped;

      console.warn(
        `[RETRY] Attempt ${attempt + 1}/${opts.maxRetries} failed. ` +
          `Retrying in ${Math.round(jitter)}ms...`,
      );

      await sleep(jitter);
    }
  }
  throw new Error('Unreachable');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ❌ NEVER retry non-idempotent operations without idempotency keys
// ❌ withRetry(() => createPayment(order));  // could charge twice!
// ✅ withRetry(() => createPayment(order, { idempotencyKey: order.id }));
```

---

## Circuit Breaker

```typescript
enum CircuitState {
  CLOSED = 'CLOSED', // Normal — requests pass through
  OPEN = 'OPEN', // Tripped — requests fail immediately
  HALF_OPEN = 'HALF_OPEN', // Testing — one request allowed
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 30_000,
    private readonly halfOpenMax: number = 3,
  ) {}

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit OPEN — service unavailable`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this.state = CircuitState.CLOSED; // Recovery confirmed
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }
}

// Usage
const paymentCircuit = new CircuitBreaker(5, 30_000);

const result = await paymentCircuit.execute(
  () => paymentGateway.charge(amount),
  () => ({ status: 'deferred', message: 'Payment queued for retry' }),
);
```

---

## React Error Boundaries

```tsx
// ✅ Error boundary with recovery
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    // Send to error tracking (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert">
            <h2>Something went wrong</h2>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// ❌ TRAP: Error boundaries do NOT catch:
// - Event handlers (use try/catch inside handlers)
// - Async code (use Promise.catch or error state)
// - Server-side rendering errors
// - Errors in the error boundary itself
```

---

## Timeout Patterns

```typescript
// ✅ AbortController-based timeout (modern, cancellable)
async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new OperationalError(`Operation timed out after ${timeoutMs}ms`, true);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Usage
const data = await withTimeout(signal => fetch('https://api.example.com/data', { signal }), 5000);
```

---

## Graceful Degradation (Fallback Chains)

```typescript
// ✅ Layered fallback: primary → cache → stale → default
async function getUserProfile(userId: string): Promise<UserProfile> {
  // Layer 1: Primary source
  try {
    return await api.getUser(userId);
  } catch {
    /* fall through */
  }

  // Layer 2: Cache
  try {
    const cached = await cache.get(`user:${userId}`);
    if (cached) return { ...cached, _stale: true };
  } catch {
    /* fall through */
  }

  // Layer 3: Default
  return {
    id: userId,
    name: 'Unknown User',
    avatar: '/default-avatar.png',
    _stale: true,
    _default: true,
  };
}

// ❌ BAD: Crash the whole page because one API is down
// ✅ GOOD: Show stale/partial data with a warning banner
```

---

## Dead Letter Queue Pattern

```typescript
// When a message/job fails after all retries, don't lose it
interface DeadLetter<T> {
  payload: T;
  error: string;
  failedAt: string;
  attempts: number;
  originalQueue: string;
}

async function processWithDLQ<T>(
  payload: T,
  processor: (item: T) => Promise<void>,
  dlqStore: { push: (item: DeadLetter<T>) => Promise<void> },
): Promise<void> {
  try {
    await withRetry(() => processor(payload), { maxRetries: 3 });
  } catch (error) {
    // Exhausted retries — park in dead letter queue
    await dlqStore.push({
      payload,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
      attempts: 4,
      originalQueue: 'main',
    });
    // Don't throw — the message is preserved for manual review
  }
}
```

---

## Anti-Patterns (Never Do These)

```
❌ Swallowing errors silently: catch (e) { /* empty */ }
❌ Retrying infinitely without a max — causes resource exhaustion
❌ Retrying POST/DELETE without idempotency keys
❌ Using fixed-delay retries — causes thundering herd
❌ Catching Error base class when you mean a specific subclass
❌ Logging error.message but not error.stack
❌ Returning null to indicate failure (use Result type or throw)
❌ Wrapping synchronous code in try/catch when it can't fail
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

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
