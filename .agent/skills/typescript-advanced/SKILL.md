---
name: typescript-advanced
description: Advanced TypeScript mastery. Generics with constraints, conditional types, mapped types, template literal types, the satisfies operator, discriminated unions, branded/nominal types, type-level programming, utility type internals, variance annotations, module augmentation, and declaration merging. Use when writing complex type definitions, building type-safe libraries, or solving "how do I type this?" problems.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-04-17
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

## Hallucination Traps (Read First)
- ❌ Using `as any` to silence type errors -> ✅ Fix the type; `as any` hides bugs that crash at runtime
- ❌ Using `interface` when `type` is needed (unions, mapped types) -> ✅ `type` for unions/intersections/mapped; `interface` for objects that may be extended
- ❌ Overcomplicating types — if a type takes 30 seconds to read, simplify it -> ✅ Types serve the developer, not the other way around

---

# Advanced TypeScript — Type-Level Mastery

---

## Generics with Constraints

```typescript
// ✅ Constrained generics — T must have an id
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

// ✅ Multiple constraints
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

// ✅ keyof constraint — K must be a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30 };
const name = getProperty(user, "name");  // type: string
const age = getProperty(user, "age");    // type: number
// getProperty(user, "email");           // ❌ Compile error — "email" not in keyof

// ✅ Default generic parameters
function createState<T = string>(initial: T): { value: T; set: (v: T) => void } {
  let value = initial;
  return { value, set: (v) => { value = v; } };
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

type A = IsString<"hello">;  // true
type B = IsString<42>;       // false

// ✅ Extract return type of async functions
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type UserData = UnwrapPromise<Promise<{ name: string }>>;
// → { name: string }

// ✅ Practical: API response type extraction
type ApiResponse<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;

declare function getUsers(): Promise<User[]>;
type Users = ApiResponse<typeof getUsers>;  // User[]

// ✅ Distributive conditional types
type NonNullable<T> = T extends null | undefined ? never : T;

type Clean = NonNullable<string | null | undefined>;  // string
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
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
type APIRoute = `/api/${string}`;
type EventName = `on${Capitalize<string>}`;

// ✅ Practical: CSS unit types
type CSSUnit = "px" | "rem" | "em" | "vh" | "vw" | "%";
type CSSValue = `${number}${CSSUnit}`;

const width: CSSValue = "100px";   // ✅
// const bad: CSSValue = "100";     // ❌ Compile error

// ✅ Route parameter extraction
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type UserRouteParams = ExtractParams<"/users/:userId/posts/:postId">;
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
  green: "#00ff00",
} as ColorMap;
colorsAs.red.map(x => x);  // ❌ Error: string | number[] has no .map

// With `satisfies` — keeps literal types
const colors = {
  red: [255, 0, 0],
  green: "#00ff00",
} satisfies ColorMap;
colors.red.map(x => x);     // ✅ TypeScript knows it's a tuple
colors.green.toUpperCase();  // ✅ TypeScript knows it's a string
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

Pick<T, K>          // Select specific keys
Omit<T, K>          // Remove specific keys
Partial<T>          // All properties optional
Required<T>         // All properties required
Readonly<T>         // All properties readonly
Record<K, V>        // Object with keys K and values V
Extract<T, U>       // Members of T assignable to U
Exclude<T, U>       // Members of T NOT assignable to U
NonNullable<T>      // Remove null and undefined
ReturnType<T>       // Return type of a function
Parameters<T>       // Parameter types of a function as tuple
Awaited<T>          // Unwrap Promise<T> recursively
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
const element = document.getElementById("app")!;

// ✅ GOOD: Narrowing
const element = document.getElementById("app");
if (!element) throw new Error("Missing #app element");
// element is now guaranteed non-null
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
