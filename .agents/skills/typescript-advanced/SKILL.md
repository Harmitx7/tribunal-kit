---
name: typescript-advanced
description: Use when Advanced TypeScript mastery. Generics with constraints, conditional types, mapped types, template literal types, the satisfies operator, discriminated unions, branded/nominal types, type-level programming, utility type internals, variance annotations, module augmentation, and declaration merging. Use when writing complex type definitions, building type-safe libraries, or solving "how do I type this?" problems.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - clean-code
  - data-validation-schemas
  - lint-and-validate
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Advanced TypeScript — Type-Level Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `typescript-advanced` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Advanced TypeScript mastery. Generics with constraints, conditional types, mapped types, template literal types, the satisfies operator, discriminated unions, branded/nominal types, type-level programming, utility type internals, variance annotations, module augmentation, and declaration merging. Use when writing complex type definitions, building type-safe libraries, or solving "how do I type this?" problems.
- **DO NOT activate when:** The task falls outside the `typescript-advanced` domain or is managed by a different dedicated specialist.

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

## 2026 TypeScript Performance & Compiler Invariants

1. **Explicit Return Types on Exports (`isolatedDeclarations`)**: Always add explicit return types to exported functions/methods for fast, parallel build compilation.
2. **Interface Extension Over Deep Intersections**: Use `interface B extends A` instead of `type B = A & { ... }`. Interfaces are cached by TS compiler's internal type-checker, preventing quadratic build slowdowns.
3. **Safe Indexed Access**: Handle `undefined` when reading objects/arrays under `noUncheckedIndexedAccess`.
4. **Const Type Parameters**: Use `function parse<const T>(val: T)` to preserve literal types without requiring the caller to write `as const`.

## Hallucination Traps (Read First)

- ❌ Using `as any` to silence type errors -> ✅ Fix the type or use `unknown` + type guard; `as any` masks runtime errors
- ❌ Using deep recursive conditional types that trigger `Type instantiation is excessively deep` -> ✅ Use iteration or flat lookup tables
- ❌ Overusing `type X = A & B & C & D` -> ✅ Use `interface` extension to preserve compiler performance
- ❌ Manual `x is T` when TS 5.5+ infers the predicate -> ✅ Write natural predicate functions without unnecessary type assertion casts

---

## Generics with Constraints

```typescript
// ✅ Constrained generics — T must have an id
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// ✅ Multiple constraints
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

// ✅ keyof constraint — K must be a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
const name = getProperty(user, 'name'); // type: string
const age = getProperty(user, 'age'); // type: number
// getProperty(user, "email");           // ❌ Compile error — "email" not in keyof

// ✅ Default generic parameters
function createState<T = string>(initial: T): { value: T; set: (v: T) => void } {
  let value = initial;
  return {
    value,
    set: v => {
      value = v;
    },
  };
}
```

---

## Discriminated Unions (The Most Useful Pattern)

```typescript
// ✅ Tagged unions — TypeScript narrows automatically
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return { success: false, error: "Division by zero" };
  return { success: true, data: a / b };
}

const result = divide(10, 3);
if (result.success) {
  console.log(result.data);   // TypeScript KNOWS data exists
} else {
  console.log(result.error);  // TypeScript KNOWS error exists
}

// ✅ State machines with discriminated unions
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function renderUser(state: RequestState<User>) {
  switch (state.status) {
    case "idle":    return <p>Click to load</p>;
    case "loading": return <Spinner />;
    case "success": return <UserCard user={state.data} />;
    case "error":   return <ErrorBanner error={state.error} />;
  }
}
// ✅ TypeScript ensures ALL cases are handled (exhaustive checking)
```

---

## Conditional Types

```typescript
// ✅ Type-level if/else
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false

// ✅ Extract return type of async functions
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type UserData = UnwrapPromise<Promise<{ name: string }>>;
// → { name: string }

// ✅ Practical: API response type extraction
type ApiResponse<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

declare function getUsers(): Promise<User[]>;
type Users = ApiResponse<typeof getUsers>; // User[]

// ✅ Distributive conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

type Clean = NonNullable<string | null | undefined>; // string
```

---

## Mapped Types

```typescript
// ✅ Transform every property of a type
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };

// ✅ Practical: Create a "form touched" state
type TouchedFields<T> = { [K in keyof T]: boolean };

interface LoginForm {
  email: string;
  password: string;
}

type LoginTouched = TouchedFields<LoginForm>;
// → { email: boolean; password: boolean }

// ✅ Key remapping with `as`
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<{ name: string; age: number }>;
// → { getName: () => string; getAge: () => number }

// ✅ Filter keys by value type
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type OnlyStrings = StringKeys<{ name: string; age: number; email: string }>;
// → { name: string; email: string }
```

---

## Template Literal Types

```typescript
// ✅ Type-safe string patterns
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIRoute = `/api/${string}`;
type EventName = `on${Capitalize<string>}`;

// ✅ Practical: CSS unit types
type CSSUnit = 'px' | 'rem' | 'em' | 'vh' | 'vw' | '%';
type CSSValue = `${number}${CSSUnit}`;

const width: CSSValue = '100px'; // ✅
// const bad: CSSValue = "100";     // ❌ Compile error

// ✅ Route parameter extraction
type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

type UserRouteParams = ExtractParams<'/users/:userId/posts/:postId'>;
// → "userId" | "postId"
```

---

## The `satisfies` Operator (TS 5.0+)

```typescript
// ✅ satisfies checks the type WITHOUT widening it
type ColorMap = Record<string, [number, number, number] | string>;

// With `as` — loses specificity
const colorsAs = {
  red: [255, 0, 0],
  green: '#00ff00',
} as ColorMap;
colorsAs.red.map(x => x); // ❌ Error: string | number[] has no .map

// With `satisfies` — keeps literal types
const colors = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies ColorMap;
colors.red.map(x => x); // ✅ TypeScript knows it's a tuple
colors.green.toUpperCase(); // ✅ TypeScript knows it's a string
```

---

## Branded / Nominal Types

```typescript
// ✅ Prevent accidental mixing of same-shaped types
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

function createUserId(id: string): UserId { return id as UserId; }
function createOrderId(id: string): OrderId { return id as OrderId; }

function getUser(id: UserId): Promise<User> { ... }

const userId = createUserId("user_123");
const orderId = createOrderId("order_456");

getUser(userId);   // ✅ Correct
// getUser(orderId);  // ❌ Compile error — OrderId is not UserId

// ✅ Branded number types
type Cents = number & { readonly __brand: "Cents" };
type Dollars = number & { readonly __brand: "Dollars" };

function centsToDollars(cents: Cents): Dollars {
  return (cents / 100) as Dollars;
}
```

---

## Utility Types (Know the Built-ins)

```typescript
// Don't reimplement what TypeScript provides

Pick<T, K>; // Select specific keys
Omit<T, K>; // Remove specific keys
Partial<T>; // All properties optional
Required<T>; // All properties required
Readonly<T>; // All properties readonly
Record<K, V>; // Object with keys K and values V
Extract<T, U>; // Members of T assignable to U
Exclude<T, U>; // Members of T NOT assignable to U
NonNullable<T>; // Remove null and undefined
ReturnType<T>; // Return type of a function
Parameters<T>; // Parameter types of a function as tuple
Awaited<T>; // Unwrap Promise<T> recursively
```

---

## Anti-Patterns

```
❌ `as any` — hides runtime crashes. Fix the type or use `as unknown as T` with a comment.
❌ `// @ts-ignore` — use `// @ts-expect-error` with a reason comment instead.
❌ `interface` for unions — interfaces can't express `A | B`. Use `type`.
❌ Overusing generics — if <T> is only used once, you probably don't need it.
❌ `enum` for new code — use `as const` objects or union types instead.
❌ Type assertions in tests — use proper type guards or schema validation.
❌ `!` (non-null assertion) — it's a lie. Use optional chaining or narrowing.
```

```typescript
// ❌ BAD: Non-null assertion
const element = document.getElementById('app')!;

// ✅ GOOD: Narrowing
const element = document.getElementById('app');
if (!element) throw new Error('Missing #app element');
// element is now guaranteed non-null
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

| Anti-Pattern                       | What AI Commonly Does Wrong                                               | What Is Actually Correct                                                 |
| :--------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification   | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim**     | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof   |
| **Context Bloat Dumping**          | Pasting entire multi-thousand-line files into prompt context              | Extract targeted excerpts, symbols, and signatures to preserve tokens    |

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
