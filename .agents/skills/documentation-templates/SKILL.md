---
name: documentation-templates
description: Use when Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - readme-builder
  - geo-fundamentals
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Documentation Standards

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `documentation-templates` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.
- **DO NOT activate when:** The task falls outside the `documentation-templates` domain or is managed by a different dedicated specialist.

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


## Hallucination Traps (Read First)

- ❌ Writing documentation that only AI-generated code can understand -> ✅ Docs are for HUMANS; use clear language and real examples
- ❌ Documenting implementation details instead of behavior -> ✅ Document WHAT it does and WHY, not HOW (code shows how)
- ❌ Skipping the 'Quick Start' section -> ✅ The first 30 seconds of a README determine if someone uses your project

---

---

## Documentation Types and Their Audiences

| Type                        | Audience                                | Goal                                                     |
| --------------------------- | --------------------------------------- | -------------------------------------------------------- |
| README                      | New developer joining the project       | "Get me running in 10 minutes"                           |
| API docs                    | External integrator or frontend dev     | "Tell me exactly what I can call and what I'll get back" |
| Architecture decision (ADR) | Future engineer inheriting the codebase | "Tell me why it works this way, not just how"            |
| Code comment                | Reviewer, maintainer                    | "Explain the non-obvious; skip the obvious"              |
| Runbook                     | On-call engineer at 2am                 | "Tell me what to do, not what to think about"            |

---

## Skill Pattern Inheritance

The Tribunal Agent Kit supports 5 standard Agent Design Kit (ADK) base patterns.
To build a skill using a robust, tested agent behavior model, add `pattern: [pattern-name]` to the YAML frontmatter of your `SKILL.md`.

| Pattern          | Value                   | When to use                                                                       |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------- |
| **Inversion**    | `pattern: inversion`    | Forces the agent to interview the user (Socratic Gate) before acting.             |
| **Reviewer**     | `pattern: reviewer`     | Evaluates artifacts against a checklist and severity levels.                      |
| **Tool Wrapper** | `pattern: tool-wrapper` | Strictly executes external CLI tools via provided documentation without guessing. |
| **Generator**    | `pattern: generator`    | Produces structured output (docs, boilerplate) by filling a rigid template.       |
| **Pipeline**     | `pattern: pipeline`     | Executes sequential tasks with strict halting gates between steps.                |

_Templates defining the specific rules for these patterns live in `.agent/patterns/`._

---

## README Template

```markdown
# Project Name

One sentence: what this is and what problem it solves.

## Quick Start

\`\`\`bash
git clone ...
cd project
npm install
cp .env.example .env
npm run dev
\`\`\`

Open http://localhost:3000

## Requirements

- Node.js 20+
- PostgreSQL 15+
- [Any other hard requirements]

## Project Structure

\`\`\`
src/
api/ API routes
lib/ Shared utilities
services/ Business logic
\`\`\`

## Environment Variables

| Variable     | Required | Description                  |
| ------------ | -------- | ---------------------------- |
| DATABASE_URL | Yes      | PostgreSQL connection string |
| JWT_SECRET   | Yes      | Secret for signing JWTs      |

## Running Tests

\`\`\`bash
npm test # unit tests
npm run test:e2e # end-to-end tests
\`\`\`

## Contributing

[Brief contribution guide or link to CONTRIBUTING.md]
```

---

## API Documentation Standards

For each endpoint, document:

```markdown
### POST /api/users

Creates a new user account.

**Request Body**
\`\`\`json
{
"email": "string (required, valid email)",
"name": "string (required, 2–100 chars)",
"role": "admin | user (optional, default: user)"
}
\`\`\`

**Responses**

| Status | Meaning              | Body                                   |
| ------ | -------------------- | -------------------------------------- |
| 201    | User created         | `{ data: User }`                       |
| 400    | Validation failed    | `{ error: string, details: string[] }` |
| 409    | Email already exists | `{ error: string }`                    |

**Example**
\`\`\`bash
curl -X POST /api/users \
-H "Content-Type: application/json" \
-d '{"email": "user@example.com", "name": "Jane"}'
\`\`\`
```

---

## Code Comment Rules

**Comment the why, not the what:**

```ts
// ❌ States what the code does (obvious from reading it)
// Multiply price by tax rate
const total = price * taxRate;

// ✅ Explains why this specific value exists
// Vietnamese tax law requires 10% VAT on all digital goods (Circular 92/2015)
const VN_DIGITAL_TAX_RATE = 1.1;
const total = price * VN_DIGITAL_TAX_RATE;
```

**When to always comment:**

- Non-obvious business rules
- Workarounds for external library bugs (with issue link if possible)
- Performance decisions that look like premature optimization but aren't
- Magic numbers and why they have that value

---

## AI-Friendly Documentation

When a codebase will be worked on by AI assistants:

- Keep a `CODEBASE.md` at root with: tech stack, folder structure, key conventions
- Add a `ARCHITECTURE.md` with: system boundaries, data flow, key decisions
- Add `// @purpose:` comments on complex functions so AI can understand intent without reading the full implementation
- Document which files are auto-generated and should not be edited directly

---

## Runbook Template

```markdown
# Runbook: [Service or Incident Type]

## Symptoms

- [What the user or monitor reports]

## Likely Causes

1. [Most common cause]
2. [Second most common]

## Investigation Steps

\`\`\`bash

# Check service health

kubectl get pods -n production

# Check recent errors

kubectl logs deployment/api --since=15m | grep ERROR
\`\`\`

## Resolution Steps

### If Cause 1:

[Exact steps to resolve]

### If Cause 2:

[Exact steps to resolve]

## Escalation

If unresolved after 30 minutes → page @on-call-lead

## Post-Incident

[ ] Write incident report
[ ] Add monitoring for this failure mode
[ ] Update this runbook if steps changed
```

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Documentation Templates Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
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
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

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
