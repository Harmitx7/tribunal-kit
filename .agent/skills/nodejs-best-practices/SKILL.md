---
name: nodejs-best-practices
description: Node.js 22+ production mastery. ES Modules, async patterns, Express/Fastify/Hono, middleware architecture, error handling, streaming, worker threads, environment config, security hardening, process management, and deployment patterns. Use when building Node.js servers, APIs, CLI tools, or any server-side JavaScript.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Node.js Best Practices — Node 22+ Production Mastery

---

## ES Modules (Mandatory)

```json
// package.json — ALWAYS set type to module
{
  "type": "module",
  "engines": { "node": ">=22" }
}
```

```typescript
// ✅ ESM imports (modern Node.js)
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";

// ❌ HALLUCINATION TRAP: Use node: protocol prefix for built-in modules
// ❌ import fs from "fs";       ← ambiguous (could be npm package)
// ✅ import fs from "node:fs";  ← explicitly a Node.js built-in

// ❌ HALLUCINATION TRAP: Do NOT use require() in ESM projects
// ❌ const fs = require("fs");  ← CommonJS (legacy)
// ✅ import fs from "node:fs/promises";  ← ESM

// Dynamic imports (for conditional loading)
const module = await import("./heavy-module.js");
```

---

## Framework Selection

```
┌────────────────────────────────────────────────────────────┐
│                  When to Use What                           │
├────────────────────────────────────────────────────────────┤
│ Express     │ Legacy projects, extensive middleware ecosystem│
│ Fastify     │ Performance-critical APIs, schema validation  │
│ Hono        │ Edge/serverless, multi-runtime (Node/Deno/Bun)│
│ tRPC        │ Full-stack TypeScript (Next.js + React Query) │
│ Raw http    │ Learning, minimal proxies, health checks      │
└────────────────────────────────────────────────────────────┘
```

### Fastify (Recommended)

```typescript
import Fastify from "fastify";
import { z } from "zod";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
  },
});

// Schema validation with Zod → Fastify schema
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user"]).default("user"),
});

type CreateUserBody = z.infer<typeof CreateUserSchema>;

app.post<{ Body: CreateUserBody }>("/users", {
  schema: {
    body: {
      type: "object",
      required: ["name", "email"],
      properties: {
        name: { type: "string", minLength: 2 },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["admin", "user"] },
      },
    },
  },
}, async (request, reply) => {
  const validated = CreateUserSchema.parse(request.body);
  const user = await createUser(validated);
  return reply.status(201).send(user);
});

// Graceful shutdown
const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

### Hono (Edge-First)

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: "https://myapp.com" }));

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

app.post("/users", zValidator("json", createUserSchema), async (c) => {
  const body = c.req.valid("json");
  const user = await createUser(body);
  return c.json(user, 201);
});

app.get("/health", (c) => c.json({ status: "ok" }));

export default app; // works in Node, Deno, Bun, Cloudflare Workers
```

---

## Error Handling

### Global Error Handlers

```typescript
// ✅ MANDATORY: Handle unhandled rejections and exceptions
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Log to error tracking service (Sentry, etc.)
  // Gracefully shutdown
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Log to error tracking service
  process.exit(1);  // MUST exit — state is corrupted
});

// ❌ HALLUCINATION TRAP: After uncaughtException, the process MUST exit
// The process is in an undefined state — continuing is dangerous
// ❌ process.on("uncaughtException", (err) => { console.log(err); }); // continues running
// ✅ process.on("uncaughtException", (err) => { log(err); process.exit(1); });
```

### Application Error Classes

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors: Record<string, string[]> = {}) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// Express error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  } else {
    // Programmer error — log and return generic message
    console.error("Unexpected error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  }
});
```

---

## Async Patterns

### Parallel vs Sequential

```typescript
// ❌ SEQUENTIAL: Each await blocks the next
const users = await getUsers();      // 200ms
const posts = await getPosts();      // 200ms
const stats = await getStats();      // 200ms
// Total: 600ms

// ✅ PARALLEL: All start simultaneously
const [users, posts, stats] = await Promise.all([
  getUsers(),   // 200ms
  getPosts(),   // 200ms (concurrent)
  getStats(),   // 200ms (concurrent)
]);
// Total: ~200ms

// Promise.allSettled — when some can fail
const results = await Promise.allSettled([
  fetchCriticalData(),
  fetchOptionalData(),
  fetchAnalytics(),
]);

for (const result of results) {
  if (result.status === "fulfilled") {
    process(result.value);
  } else {
    console.error("Failed:", result.reason);
  }
}
```

### Retry Pattern

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${jitter}ms`);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
  throw new Error("Unreachable");
}

// Usage:
const data = await withRetry(() => fetch("https://api.flaky.com/data"), {
  maxRetries: 3,
  baseDelay: 500,
});
```

### AbortController (Timeouts & Cancellation)

```typescript
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## Streaming

```typescript
import { Readable, Transform, pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

// Stream large file processing (no memory issues)
async function processLargeCSV(inputPath: string, outputPath: string) {
  const transform = new Transform({
    transform(chunk, encoding, callback) {
      const processed = chunk.toString().toUpperCase();
      callback(null, processed);
    },
  });

  await pipeline(
    createReadStream(inputPath),
    transform,
    createGzip(),
    createWriteStream(outputPath),
  );
}

// Streaming HTTP response
app.get("/export", async (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export.csv");

  const cursor = db.collection("users").find().stream();
  cursor.on("data", (user) => {
    res.write(`${user.id},${user.name},${user.email}\n`);
  });
  cursor.on("end", () => res.end());
  cursor.on("error", (err) => {
    console.error(err);
    res.status(500).end();
  });
});

// ❌ HALLUCINATION TRAP: Use stream/promises (not callbacks)
// ❌ const { pipeline } = require("stream");  ← callback-based
// ✅ import { pipeline } from "node:stream/promises";  ← async/await
```

---

## Environment & Config

```typescript
// config.ts — centralized, validated configuration
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const config = envSchema.parse(process.env);

// ❌ HALLUCINATION TRAP: Validate env vars at startup — fail FAST
// ❌ process.env.DATABASE_URL!  ← crashes at runtime, not startup
// ✅ Validate with Zod on app init — crash immediately with clear error

// ❌ HALLUCINATION TRAP: Never hardcode secrets
// ❌ const JWT_SECRET = "my-secret-key";  ← in source code
// ✅ const JWT_SECRET = process.env.JWT_SECRET;  ← from environment
```

---

## Security Hardening

```typescript
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Security headers
app.use(helmet());

// Rate limiting
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again later" },
}));

// Auth rate limiting (stricter)
app.use("/api/auth/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // only 5 login attempts per 15 min
}));

// Input validation (ALWAYS validate)
app.post("/api/users", async (req, res, next) => {
  try {
    const data = CreateUserSchema.parse(req.body); // Zod validates
    const user = await createUser(data);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// SQL injection prevention (covered by parameterized queries)
// ❌ db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
// ✅ db.query("SELECT * FROM users WHERE id = $1", [req.params.id]);

// Path traversal prevention
import { resolve, normalize } from "node:path";

function safePath(userInput: string, baseDir: string): string {
  const resolved = resolve(baseDir, normalize(userInput));
  if (!resolved.startsWith(baseDir)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}
```

---

## Process Management

### Graceful Shutdown

```typescript
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully`);

  // Stop accepting new connections
  server.close();

  // Close database connections
  await db.end();

  // Close Redis
  await redis.quit();

  // Allow in-flight requests 10s to complete
  setTimeout(() => {
    console.error("Forceful shutdown after timeout");
    process.exit(1);
  }, 10000);

  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### Worker Threads (CPU-Bound)

```typescript
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

if (isMainThread) {
  // Main thread — offload CPU work
  function runWorker(data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: data });
      worker.on("message", resolve);
      worker.on("error", reject);
    });
  }

  const result = await runWorker({ input: largeDataSet });
} else {
  // Worker thread — CPU-intensive work
  const result = heavyComputation(workerData.input);
  parentPort?.postMessage(result);
}

// ❌ HALLUCINATION TRAP: Worker threads are for CPU-bound tasks
// For I/O-bound tasks (network, file), use async/await — NOT workers
// Workers have overhead (serialization, memory) — don't overuse
```

---
