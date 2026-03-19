---
name: clean-code
description: Pragmatic coding standards - concise, direct, no over-engineering, no unnecessary comments
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## 🤖 LLM-Specific Clean Code Traps

AI coding assistants (like you) fall into specific bad habits when writing code. These are strictly forbidden under the clean-code standard:

1. **JSDoc/Docstring Spam:** Documenting what a function does when the code is self-evident.
    *   *❌ AI Trait:* `/** Adds two numbers. @param a First number @param b Second number @returns The sum */ function add(a, b) { return a + b; }`
    *   *✅ Clean Code:* `function add(a: number, b: number): number { return a + b; }`
2. **Defensive Programming Overkill:** Adding 15 `null` checks where the TypeScript compiler or the previous tier has already guaranteed validity.
3. **Premature Abstraction:** Creating an `AbstractDataManager` factory class with interfaces to parse a simple CSV file. Code what is needed *now*.
4. **Variable Diarrhea:** Extracting every step of a calculation into a separate `const` when a single readable line would suffice.
5. **Apologetic Comments:** `// TODO: Refactor this later` or `// I assumed this was the right way`. If you write it, own it. If it's incomplete, flag the user.

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Clean Code Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Clean Code
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/generate`, `/review-types`**
**Active reviewers: `logic-reviewer` · `type-safety-reviewer`**

### ❌ Forbidden AI Tropes in Code Generation

1. **Over-engineering:** Solving a problem with 3 classes when 1 function works perfectly.
2. **Commented-out code:** Submitting commented-out dead code, "just in case." Delete it.
3. **Implicit `any` types:** Failing to strictly type a critical parameter or return value.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming code generation or review:
```
✅ Does this function do strictly ONE thing?
✅ Have I removed all pointless comments explaining *what* the code does?
✅ Did I use specific, business-logic naming rather than generic abbreviations?
✅ Are all edge cases and rejections properly handled (no swallowed errors)?
✅ Did I avoid over-engineering this solution?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Refactoring code or blindly applying "clean code" rules without verifying the code still compiles and works.
- ✅ **Required:** You are explicitly forbidden from finalizing a refactor without providing **concrete terminal evidence** (e.g., passing unit tests logs, successful linting execution, or type-check success) proving the refactored code maintains the original behavior.
