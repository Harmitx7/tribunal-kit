---
name: nodejs-best-practices
description: Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Node.js Development Principles

> Node.js is not a problem — unpredictable async behavior is.
> Understand the event loop and half of Node.js "gotchas" disappear.

---

## Framework Selection

| Context | Recommended | Why |
|---|---|---|
| REST API, standard patterns | Express + TypeScript | Mature, flexible, most hiring knowledge |
| REST API, speed + TypeScript-first | Fastify | 2x Express throughput, built-in validation |
| Full-stack React | Next.js API routes | Colocated API and UI, serverless-friendly |
| REST + tRPC | Next.js + tRPC | Type-safe end-to-end with no code generation |
| RPC across services | gRPC | Binary protocol, contract-first |

**Questions to ask before choosing:**

- Is this public-facing or internal?
- Do we control the deployment environment (server vs. serverless)?
- Is the team already familiar with a framework?
- Does this need to compose with an existing TypeScript frontend?

---

## Async Patterns

### Always: Handle rejection

Every Promise needs a rejection handler. Unhandled rejections crash Node.js processes in modern versions.

```ts
// ❌ Unhandled rejection
fetchData().then(process);

// ✅ Handled
fetchData().then(process).catch(handleError);

// ✅ Or with async/await
try {
  const data = await fetchData();
  process(data);
} catch (err) {
  handleError(err);
}
```

### Avoid: Blocking the event loop

The event loop is single-threaded. Anything synchronous that takes more than a few ms blocks all other requests.

```ts
// ❌ Blocks event loop for large files
const data = fs.readFileSync('huge.csv');

// ✅ Non-blocking
const data = await fs.promises.readFile('huge.csv');

// ❌ CPU-intensive work on main thread
const result = computeHuge(dataset);

// ✅ Offload to worker thread
const { Worker } = require('worker_threads');
```

### Concurrency vs. Parallelism

```ts
// Sequential — each awaits the previous (use when order matters or requests are dependent)
for (const id of ids) {
  await processItem(id);
}

// Concurrent — all start immediately, await all completions (use for independent operations)
await Promise.all(ids.map(id => processItem(id)));

// Concurrent with limit — avoid overwhelming downstream services
import pLimit from 'p-limit';
const limit = pLimit(5); // max 5 concurrent
await Promise.all(ids.map(id => limit(() => processItem(id))));
```

---

## Error Handling Architecture

Structure errors so they carry meaning, not just messages:

```ts
// Base application error
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Domain-specific errors
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`, 'NOT_FOUND', 404);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_FAILED', 400);
  }
}
```

**Global error handler:**
```ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }
  // Non-operational errors — log fully, don't expose details
  logger.error('Unexpected error', { err, url: req.url });
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Security Baseline

```ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet());

// Rate limiting — protect all routes
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,               // requests per window
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body size limit — prevent payload bombs
app.use(express.json({ limit: '10kb' }));

// Trust proxy correctly for rate limiting behind load balancer
app.set('trust proxy', 1);
```

**Never:**
- Use `eval()` or `new Function()` with user input
- Pass unvalidated user input to `exec()`, `spawn()`, or `child_process`
- Log full request bodies (may contain credentials or PII)

---

## Project Structure

```
src/
  routes/      HTTP route definitions (thin — only parse and delegate)
  controllers/ Request handling, validation, response formatting
  services/    Business logic (no HTTP awareness)
  repositories/ Database access (no business logic)
  middleware/  Auth, rate limit, logging
  lib/         Shared utilities (date, crypto, validation)
  types/       TypeScript interfaces and type exports
  config/      Environment config with validation
```

**Dependency direction:** routes → controllers → services → repositories
**Never:** repositories calling services, or services knowing about HTTP
