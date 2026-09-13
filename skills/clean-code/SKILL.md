---
name: clean-code
description: Use when Clean code mastery. Naming conventions, function design, DRY vs WET, SOLID principles with code examples, refactoring patterns, code smells detection, error handling philosophy, comments that add value, and the art of simplicity. Use when reviewing code quality, refactoring, or establishing coding standards.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - codebase-design
  - code-review-checklist
  - tdd-workflow
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Clean Code — The Art of Readable Software

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `clean-code` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Clean code mastery. Naming conventions, function design, DRY vs WET, SOLID principles with code examples, refactoring patterns, code smells detection, error handling philosophy, comments that add value, and the art of simplicity. Use when reviewing code quality, refactoring, or establishing coding standards.
- **DO NOT activate when:** The task falls outside the `clean-code` domain or is managed by a different dedicated specialist.

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


## 2026 Code Performance & Logic Invariants

1. **Fail-Fast Early Returns**: Flatten nested conditionals (`if ... else if ... else`). Return or throw immediately on validation failure.
2. **O(1) Data Structures**: Replace repeated `array.find()` or `array.includes()` in loops with `Set.has()` or `Map.get()`.
3. **Cyclomatic Complexity Cap**: No single function may exceed cyclomatic complexity > 10. Split multi-branch operations into dedicated strategy handlers.
4. **Pure Core, Imperative Shell**: Keep business calculations pure and deterministic; push network I/O, file access, and mutation to the boundaries.
5. **Typed Error Hierarchy**: Never throw raw strings or generic `Error`. Throw domain-specific error classes containing structured metadata (`code`, `retryable`, `context`).

## Hallucination Traps (Read First)

- ❌ Over-abstracting code that is used in only one place -> ✅ Don't DRY single-use code; premature abstraction is worse than duplication
- ❌ Adding comments that restate what the code does -> ✅ Comments explain WHY, not WHAT; the code explains what
- ❌ Creating utility functions for trivial one-liners -> ✅ Inline is clearer when the operation is self-documenting
- ❌ Using `array.find()` inside an `array.filter()` loop (O(N²)) -> ✅ Index into a `Map` first (O(N))

---

## Naming

### Variables & Functions

```typescript
// ❌ BAD: Cryptic, abbreviated, meaningless
const d = new Date();
const u = getU();
const flag = true;
function proc(x: number): number {
  return x * 1.08;
}

// ✅ GOOD: Self-documenting, reveals intent
const registrationDate = new Date();
const currentUser = getCurrentUser();
const isEligibleForDiscount = true;
function addSalesTax(price: number): number {
  return price * 1.08;
}
```

### Booleans

```typescript
// ❌ BAD                    ✅ GOOD
const active = true;
const isActive = true;
const admin = false;
const hasAdminRole = false;
const loading = true;
const isLoading = true;
const open = false;
const isModalOpen = false;
const valid = true;
const canSubmit = true;

// Boolean function names start with is/has/can/should
function isExpired(token: Token): boolean {}
function hasPermission(user: User, action: string): boolean {}
function canRetry(attempt: number): boolean {}
function shouldNotify(event: Event): boolean {}
```

### Constants & Enums

```typescript
// ❌ BAD: Magic numbers and strings
if (user.role === 3) { ... }
if (retries > 5) { ... }
const delay = 86400000;

// ✅ GOOD: Named constants with meaning
const MAX_RETRY_ATTEMPTS = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

enum UserRole {
  VIEWER = "viewer",
  EDITOR = "editor",
  ADMIN = "admin",
}

if (user.role === UserRole.ADMIN) { ... }
if (retries > MAX_RETRY_ATTEMPTS) { ... }
```

---

## Function Design

### Small, Single-Purpose Functions

```typescript
// ❌ BAD: Does 5 things in one function
async function processOrder(order: Order) {
  // validate
  if (!order.items.length) throw new Error('Empty');
  if (order.total < 0) throw new Error('Negative');
  // calculate
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  // save
  await db.orders.insert({ ...order, total });
  // notify
  await emailService.send(order.userId, 'Order placed');
  // log
  logger.info('Order processed', { orderId: order.id });
}

// ✅ GOOD: Each function does one thing
async function processOrder(order: Order): Promise<ProcessedOrder> {
  validateOrder(order);
  const totals = calculateTotals(order.items);
  const savedOrder = await saveOrder(order, totals);
  await notifyCustomer(savedOrder);
  return savedOrder;
}

function validateOrder(order: Order): void {
  if (!order.items.length) throw new ValidationError('Order cannot be empty');
  if (order.total < 0) throw new ValidationError('Total cannot be negative');
}

function calculateTotals(items: OrderItem[]): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  return { subtotal, tax, total: subtotal + tax };
}
```

### Parameter Rules

```typescript
// ❌ BAD: Too many parameters
function createUser(
  name: string, email: string, role: string,
  isActive: boolean, avatar: string, bio: string
) { ... }

// ✅ GOOD: Use an object for 3+ parameters
interface CreateUserInput {
  name: string;
  email: string;
  role?: UserRole;
  isActive?: boolean;
  avatar?: string;
  bio?: string;
}

function createUser(input: CreateUserInput): User { ... }

// ❌ BAD: Boolean parameter (caller can't read intent)
setVisible(true);

// ✅ GOOD: Named method instead
show();
hide();
```

---

## SOLID Principles (With Code)

### S — Single Responsibility

```typescript
// ❌ BAD: UserService does everything
class UserService {
  createUser() { ... }
  sendEmail() { ... }
  generateReport() { ... }
  uploadAvatar() { ... }
}

// ✅ GOOD: Separate concerns
class UserService { createUser() { ... } }
class EmailService { sendWelcomeEmail() { ... } }
class ReportService { generateUserReport() { ... } }
class AvatarService { upload() { ... } }
```

### O — Open/Closed

```typescript
// ❌ BAD: Adding a new type requires modifying existing code
function calculateDiscount(type: string, amount: number): number {
  if (type === 'student') return amount * 0.2;
  if (type === 'veteran') return amount * 0.15;
  if (type === 'senior') return amount * 0.1; // must modify for every new type
  return 0;
}

// ✅ GOOD: Open for extension, closed for modification
interface DiscountStrategy {
  calculate(amount: number): number;
}

class StudentDiscount implements DiscountStrategy {
  calculate(amount: number) {
    return amount * 0.2;
  }
}

class VeteranDiscount implements DiscountStrategy {
  calculate(amount: number) {
    return amount * 0.15;
  }
}

// New types = new class, no existing code changes
class EmployeeDiscount implements DiscountStrategy {
  calculate(amount: number) {
    return amount * 0.25;
  }
}
```

### D — Dependency Inversion

```typescript
// ❌ BAD: High-level module depends on low-level concrete
class OrderService {
  private db = new MySQLDatabase(); // coupled to MySQL
  private mailer = new SendGridMailer(); // coupled to SendGrid
}

// ✅ GOOD: Depend on abstractions (interfaces)
interface Database {
  save(data: unknown): Promise<void>;
}
interface Mailer {
  send(to: string, body: string): Promise<void>;
}

class OrderService {
  constructor(
    private db: Database, // can be MySQL, Postgres, in-memory
    private mailer: Mailer, // can be SendGrid, SES, mock
  ) {}
}
```

---

## Error Handling

```typescript
// ❌ BAD: Swallowing errors
try {
  await saveUser(user);
} catch (e) {
  // silence
}

// ❌ BAD: Generic catch-all
try {
  await processPayment(order);
} catch (e) {
  console.log('Something went wrong');
}

// ✅ GOOD: Handle specific errors, propagate unexpected
try {
  await processPayment(order);
} catch (error) {
  if (error instanceof InsufficientFundsError) {
    return { success: false, message: 'Insufficient funds' };
  }
  if (error instanceof PaymentGatewayError) {
    logger.warn('Payment gateway unavailable, queuing for retry', { orderId: order.id });
    await retryQueue.add(order);
    return { success: false, message: 'Payment processing delayed' };
  }
  throw error; // unexpected error — let it propagate
}
```

---

## Comments

```typescript
// ❌ BAD: Comments that restate the code
// Increment i by 1
i++;

// Set the user's name
user.name = newName;

// Check if user is active
if (user.isActive) { ... }

// ✅ GOOD: Comments that explain WHY, not WHAT
// Tax exemption expires after 365 days per IRS Publication 334
const isExempt = daysSinceRegistration < 365;

// Using binary search here because the list is pre-sorted and
// can contain 100K+ items. Linear search caused P95 > 2s.
const index = binarySearch(sortedItems, target);

// Retry 3 times because the payment gateway has transient 503s
// during their daily maintenance window (02:00-02:15 UTC)
const result = await withRetry(() => chargeCard(amount), { maxRetries: 3 });
```

---

## Code Smells → Refactoring

```
Smell                    → Refactoring
───────────────────────────────────────
Long function (>30 lines) → Extract method
Deep nesting (>3 levels)  → Early return / guard clauses
Duplicate code            → Extract shared function
Magic numbers             → Named constants
Boolean parameters        → Separate methods or options object
God class (>300 lines)    → Split into focused classes
Feature envy              → Move method to appropriate class
Primitive obsession       → Value objects (Email, Money, UserId)
Long parameter list       → Parameter object
```

```typescript
// Deep nesting → Early return
// ❌ BAD
function processUser(user: User) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission('edit')) {
        // actual logic buried 3 levels deep
        doStuff();
      }
    }
  }
}

// ✅ GOOD: Guard clauses — fail fast, keep happy path unindented
function processUser(user: User) {
  if (!user) return;
  if (!user.isActive) return;
  if (!user.hasPermission('edit')) return;

  doStuff(); // happy path at top level
}
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
| **Hardcoded Secret Pattern** | Committing API keys, tokens, or private salts into source code | Load credentials strictly via runtime environment variables and secret stores |
| **Prompt Injection Surface** | Directly concatenating untrusted user input into LLM system prompts | Wrap user content in isolated delimiters and strip injection control sequences |
| **Missing Authorization Check** | Relying only on authentication token presence without checking tenant/object RBAC | Verify user permissions against the specific target record ID before mutation |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `security-auditor` · `penetration-tester` · `backend-security-expert`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are user inputs sanitized and treated as untrusted at system boundaries?
✅ Are secrets loaded strictly via environment variables with zero hardcoding?
✅ Is least-privilege enforcement active on APIs, tokens, and storage buckets?
✅ Are prompt-injection delimiters and sanitizers wrapped around LLM inputs?
✅ Did I verify encryption in transit and at rest for sensitive customer data?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
