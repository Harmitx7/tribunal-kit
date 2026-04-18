---
name: error-resilience
description: Error resilience and fault tolerance mastery. Retry strategies (exponential backoff with jitter), circuit breakers, bulkheads, graceful degradation, React error boundaries, dead letter queues, timeout patterns, fallback chains, and idempotent error recovery. Use when building fault-tolerant systems, handling flaky external services, or preventing cascading failures.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-04-17
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Retrying non-idempotent operations (POST payments) without idempotency keys -> ✅ Always require idempotency keys for non-safe HTTP methods before retrying
- ❌ Using fixed delay retries instead of exponential backoff -> ✅ Exponential backoff with jitter prevents thundering herd
- ❌ Catching all errors and swallowing them -> ✅ Only catch recoverable (operational) errors; let programmer errors crash

---

# Error Resilience — Fault-Tolerant Systems

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
  retryableErrors: (err) =>
    err instanceof Error && (
      err.message.includes("ECONNRESET") ||
      err.message.includes("ETIMEDOUT") ||
      err.message.includes("503") ||
      err.message.includes("429")
    ),
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
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
        `Retrying in ${Math.round(jitter)}ms...`
      );

      await sleep(jitter);
    }
  }
  throw new Error("Unreachable");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ❌ NEVER retry non-idempotent operations without idempotency keys
// ❌ withRetry(() => createPayment(order));  // could charge twice!
// ✅ withRetry(() => createPayment(order, { idempotencyKey: order.id }));
```

---

## Circuit Breaker

```typescript
enum CircuitState {
  CLOSED = "CLOSED",       // Normal — requests pass through
  OPEN = "OPEN",           // Tripped — requests fail immediately
  HALF_OPEN = "HALF_OPEN", // Testing — one request allowed
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
  () => ({ status: "deferred", message: "Payment queued for retry" }),
);
```

---

## React Error Boundaries

```tsx
// ✅ Error boundary with recovery
import { Component, type ReactNode } from "react";

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
      return this.props.fallback ?? (
        <div role="alert">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
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
const data = await withTimeout(
  (signal) => fetch("https://api.example.com/data", { signal }),
  5000,
);
```

---

## Graceful Degradation (Fallback Chains)

```typescript
// ✅ Layered fallback: primary → cache → stale → default
async function getUserProfile(userId: string): Promise<UserProfile> {
  // Layer 1: Primary source
  try {
    return await api.getUser(userId);
  } catch { /* fall through */ }

  // Layer 2: Cache
  try {
    const cached = await cache.get(`user:${userId}`);
    if (cached) return { ...cached, _stale: true };
  } catch { /* fall through */ }

  // Layer 3: Default
  return {
    id: userId,
    name: "Unknown User",
    avatar: "/default-avatar.png",
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
      originalQueue: "main",
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


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
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
