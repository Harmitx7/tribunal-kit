---
name: data-validation-schemas
description: Data validation and schema design mastery. Zod, Yup, Joi, Valibot, and Pydantic schema design, runtime type checking, API boundary validation, form validation patterns, DTO design, schema composition, error message formatting, schema evolution strategies, and coercion rules. Use when validating user input, API payloads, environment config, or any data crossing a trust boundary.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-04-17
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using `z.any()` or `z.unknown()` as a lazy escape hatch -> ✅ Always define the actual shape; `any` defeats the purpose of validation
- ❌ Validating on the client but not on the server -> ✅ Server validation is NOT optional — client validation is UX, server validation is security
- ❌ Throwing raw Zod errors to the client -> ✅ Format errors into user-friendly messages with `.flatten()` or `.format()`

---

# Data Validation & Schemas — Trust No Input

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
import { z } from "zod";

// Primitives with constraints
const Email = z.string().email().toLowerCase().trim();
const Age = z.number().int().min(0).max(150);
const Username = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
const URL = z.string().url().startsWith("https://");

// Object schema
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: Email,
  age: Age.optional(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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
import { z } from "zod";

// Define once, use everywhere
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["created", "updated", "name"]).default("created"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(200).optional(),
});

// Express middleware
function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // ✅ Validated + coerced data replaces raw body
    next();
  };
}

app.post("/api/users", validate(CreateUserSchema), async (req, res) => {
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
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be ≥ 32 characters"),
  API_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" }),
  }),
});

type SignupData = z.infer<typeof SignupSchema>;

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>({
    resolver: zodResolver(SignupSchema),
  });

  return (
    <form onSubmit={handleSubmit((data) => signup(data))}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <label>
        <input type="checkbox" {...register("terms")} />
        I accept the terms
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


---



AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---



**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.



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


## Pre-Flight Checklist
- [ ] Have I reviewed the user's specific constraints and requests?
- [ ] Have I checked the environment for relevant existing implementations?

## VBC Protocol (Verification-Before-Completion)
You MUST verify existing code signatures and variables before attempting to modify or call them. No hallucination is permitted.
