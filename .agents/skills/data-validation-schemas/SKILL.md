---
name: data-validation-schemas
description: Use when Data validation and schema design mastery. Zod, Yup, Joi, Valibot, and Pydantic schema design, runtime type checking, API boundary validation, form validation patterns, DTO design, schema composition, error message formatting, schema evolution strategies, and coercion rules. Use when validating user input, API payloads, environment config, or any data crossing a trust boundary.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - api-patterns
  - backend-security-expert
  - schema-reviewer
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Data Validation & Schemas — Trust No Input

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `data-validation-schemas` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Data validation and schema design mastery. Zod, Yup, Joi, Valibot, and Pydantic schema design, runtime type checking, API boundary validation, form validation patterns, DTO design, schema composition, error message formatting, schema evolution strategies, and coercion rules. Use when validating user input, API payloads, environment config, or any data crossing a trust boundary.
- **DO NOT activate when:** The task falls outside the `data-validation-schemas` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## Hallucination Traps (Read First)

- ❌ Using `z.any()` or `z.unknown()` as a lazy escape hatch -> ✅ Always define the actual shape; `any` defeats the purpose of validation
- ❌ Validating on the client but not on the server -> ✅ Server validation is NOT optional — client validation is UX, server validation is security
- ❌ Throwing raw Zod errors to the client -> ✅ Format errors into user-friendly messages with `.flatten()` or `.format()`

---

---

## The Golden Rule

```
Every trust boundary gets a schema.
No exceptions. No shortcuts. No "I'll add validation later."

Trust Boundaries:
  ✅ API request bodies         (user → server)
  ✅ URL params / query strings  (user → server)
  ✅ Environment variables       (env → app)
  ✅ External API responses      (3rd party → app)
  ✅ Database query results      (DB → app, if untyped)
  ✅ File uploads                (user → server)
  ✅ WebSocket messages          (client → server)
  ✅ Form inputs                 (user → UI)
```

---

## Zod (Recommended — TypeScript)

### Basic Schemas

```typescript
import { z } from 'zod';

// Primitives with constraints
const Email = z.string().email().toLowerCase().trim();
const Age = z.number().int().min(0).max(150);
const Username = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/);
const URL = z.string().url().startsWith('https://');

// Object schema
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: Email,
  age: Age.optional(),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ✅ Infer TypeScript types from schemas (single source of truth)
type CreateUserInput = z.infer<typeof CreateUserSchema>;
// → { name: string; email: string; age?: number; role: "admin" | "editor" | "viewer"; ... }
```

### Composition & Reuse

```typescript
// ✅ Base schema + extend for variants
const BaseUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const UpdateUserSchema = BaseUserSchema.partial(); // all fields optional

// ✅ Pick / Omit
const LoginSchema = BaseUserSchema.pick({ email: true }).extend({
  password: z.string(),
});

// ✅ Merge two schemas
const FullProfileSchema = BaseUserSchema.merge(AddressSchema);
```

### API Boundary Validation

```typescript
// ✅ Server-side: validate at the boundary, type-safe downstream
import { z } from 'zod';

// Define once, use everywhere
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['created', 'updated', 'name']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
});

// Express middleware
function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // ✅ Validated + coerced data replaces raw body
    next();
  };
}

app.post('/api/users', validate(CreateUserSchema), async (req, res) => {
  // req.body is now fully typed and validated
  const user = await createUser(req.body);
  res.status(201).json(user);
});

// ❌ BAD: Validating inside the handler
// ✅ GOOD: Validation as middleware — keeps handlers clean
```

### Error Formatting

```typescript
// ✅ User-friendly error messages
const result = CreateUserSchema.safeParse(rawInput);

if (!result.success) {
  // .flatten() — flat structure for simple forms
  const flat = result.error.flatten();
  // { fieldErrors: { email: ["Invalid email"], name: ["Too short"] } }

  // .format() — nested structure matching schema shape
  const formatted = result.error.format();
  // { email: { _errors: ["Invalid email"] }, name: { _errors: ["Too short"] } }

  // Custom error map (global)
  z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.too_small) {
      return { message: `Must be at least ${issue.minimum} characters` };
    }
    return { message: ctx.defaultError };
  });
}
```

---

## Environment Validation (Fail Fast)

```typescript
// ✅ Validate ALL env vars at startup — crash immediately if invalid
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥ 32 characters'),
  API_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = EnvSchema.parse(process.env);

// ❌ TRAP: process.env.DATABASE_URL! ← crashes at RUNTIME, not startup
// ✅ Parse at module load → crash at STARTUP with clear error message
```

---

## Pydantic (Python)

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime

class CreateUserRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=r"^[\w\.\+\-]+@[\w]+\.[\w\.]+$")
    age: int | None = Field(default=None, ge=0, le=150)
    role: str = Field(default="viewer")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"admin", "editor", "viewer"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {allowed}")
        return v

# FastAPI uses Pydantic automatically
@app.post("/users")
async def create_user(user: CreateUserRequest):
    # user is already validated and typed
    return await db.create_user(user.model_dump())
```

---

## Form Validation (React + Zod)

```tsx
// ✅ React Hook Form + Zod = type-safe forms
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
});

type SignupData = z.infer<typeof SignupSchema>;

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupData>({
    resolver: zodResolver(SignupSchema),
  });

  return (
    <form onSubmit={handleSubmit(data => signup(data))}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <label>
        <input type="checkbox" {...register('terms')} />I accept the terms
      </label>
      {errors.terms && <span>{errors.terms.message}</span>}

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

---

## Schema Anti-Patterns

```
❌ z.any() / z.unknown() as a lazy escape — defeats the purpose
❌ Validating on client only — server is the security boundary
❌ Different schemas for same entity on client vs server — drift guaranteed
❌ Coercing without documenting — z.coerce.number() silently converts "abc" → NaN
❌ Skipping .safeParse() in user-facing code — .parse() throws, bad UX
❌ Giant monolithic schemas — use .extend(), .pick(), .merge() for composition
❌ Not validating 3rd-party API responses — "they'll always return what docs say"
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                     | What AI Commonly Does Wrong                                                   | What Is Actually Correct                                                      |
| :------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Full Table Scan Blindspot**    | Querying high-cardinality tables without index coverage                       | Verify query plans with EXPLAIN ANALYZE and add composite B-Tree indexes      |
| **Non-Atomic Batch Mutation**    | Executing multiple related DB writes sequentially without transaction wrapper | Wrap multi-table updates in an atomic transaction with automatic rollback     |
| **Destructive Schema Migration** | Dropping or renaming columns in production without multi-phase migration      | Use expand-and-contract: add new column, sync data, migrate callers, drop old |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are indexes defined for all foreign keys, joins, and filtered query clauses?
✅ Are transactions wrapped atomically with rollbacks on failure?
✅ Are migration scripts backwards-compatible (expand-and-contract pattern)?
✅ Did I verify column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
