---
name: clean-code
description: Pragmatic coding standards - concise, direct, no over-engineering, no unnecessary comments
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Clean Code Standards

> Code is read far more than it is written. Write for the next person.
> That person is often you, six months from now, confused.

---

## Core Philosophy

Clean code is not aesthetic. It is functional. Messy code is slow to change, easy to break, and hard to debug. These standards exist to make code **safe to modify** — not to make it look clever.

---

## Naming

Names are the primary documentation. Choose them seriously.

**Rules:**
- Variables and functions describe what they hold or do — not how they do it
- Boolean names start with `is`, `has`, `can`, `should`
- No single-letter names except loop counters (`i`, `j`) and throwaway lambdas
- No abbreviations unless they are industry-wide (`url`, `id`, `dto`, `api`)
- Name at the right level of abstraction — `user` not `userObjectFromDatabase`

```ts
// ❌ Unclear
const d = new Date();
const fn = (x) => x * 1.2;

// ✅ Self-documenting
const createdAt = new Date();
const applyTax = (price: number) => price * 1.2;
```

---

## Functions

A function does one thing. If you need "and" to describe it, split it.

- Max ~20 lines per function before questioning its scope
- Arguments: 0–2 preferred, 3 acceptable, 4+ is a signal to use an options object
- No boolean flags as arguments — they mean the function does two things
- Return early to avoid nesting — guard clauses before main logic

```ts
// ❌ Flag argument
function createUser(data: UserData, sendEmail: boolean) { ... }

// ✅ Two clear functions
function createUser(data: UserData) { ... }
function createUserAndNotify(data: UserData) { ... }
```

---

## Comments

Comments explain **why** — not **what**.

- Code explains what it does. A comment explaining what code does means the code is unclear — rewrite the code.
- Comments explain intent, business rules, non-obvious constraints, and external references
- Never leave commented-out code in a commit. Use version control.

```ts
// ❌ Pointless comment
// Get the user by id
const user = await getUser(id);

// ✅ Useful comment
// Retry up to 3 times — payment gateway times out under load
const result = await retry(() => chargeCard(amount), 3);
```

---

## Error Handling

Errors are part of the contract. Don't hide them.

- Every async function must handle its rejection — `try/catch` or `.catch()`
- Log full context: what operation failed, with what input, what the error was
- Never swallow errors silently (`catch (e) {}`)
- User-facing error messages are different from developer error messages — don't conflate them

---

## Testing Standards

Tests make refactoring safe. Without them, every change is a gamble.

**AAA Pattern — every test:**
```
Arrange  → set up what you need
Act      → call the thing being tested
Assert   → verify the outcome
```

**Test pyramid:**
- Unit tests: fast, isolated, abundant — test one function
- Integration tests: slower, test how components interact
- E2E tests: fewest, test the full user path

**Rules:**
- One assertion per concept (multiple `expect` calls OK if they verify the same outcome)
- Tests must pass consistently — a flaky test is a broken test
- Descriptive test names: `should return 401 when token is expired` not `test auth`

---

## Performance

Measure first. Optimize what is actually slow.

- Profile before assuming — perceived slowness is not always where you think
- O(n²) in a list that never exceeds 10 items is not a problem worth solving
- Premature optimization adds complexity and creates bugs
- Core Web Vitals are the standard for frontend performance targets (2025)

---

## Security Baseline (Always)

These are not optional:

- Secrets in environment variables — never in code
- All SQL queries parameterized — never string-interpolated
- User input validated at every boundary — never trusted
- Authentication checked before business logic executes
