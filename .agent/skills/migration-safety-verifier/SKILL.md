---
name: migration-safety-verifier
description: "Use when statically analyzing database migrations, detecting dangerous locks, table rewrites, unindexed foreign keys, and missing rollback scripts in CI."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - zero-downtime-migrations
  - cicd-pro
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "migration safety verifier"
  - "migration linting ci"
  - "detect dangerous database migration"
  - "squawk migration linter"
  - "check migration locks"
  - "static migration analysis"
---

# Static Database Migration Safety & Lock Verification CI Gate

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `migration-safety-verifier` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Parse raw SQL or ORM migration files generated in pull requests
2. **Runtime Context & Platform Invariants**: Check for high-risk operations: `DROP COLUMN`, `ALTER TABLE ... TYPE`, `ADD CONSTRAINT` without `NOT VALID`
3. **Execution Guardrails**: Verify that every `up` migration has a tested corresponding `down` migration or documented forward-only policy
4. **Validation & Type Contracts**: Inspect index creation statements to enforce `CONCURRENTLY`
5. **Observability & Proof of Execution**: Confirm migration file naming and ordering follows sequential timestamp or versioning conventions

## Activation Boundaries
- **Activate when:** Use when statically analyzing database migrations, detecting dangerous locks, table rewrites, unindexed foreign keys, and missing rollback scripts in CI.
- **DO NOT activate when:** The task falls outside the `migration-safety-verifier` domain or is managed by a different dedicated specialist agent.

## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |

---

## 🛠️ Technical Architecture & Reference Recipes

## 2026 Invariants
1. **Never allow unverified DDL to merge to main**: all migration scripts must pass static safety linting in CI.
2. **Reject table rewrites**: altering column types or dropping columns requires a multi-step release cycle.
3. **Disallow non-concurrent index creation on existing production tables.**: Disallow non-concurrent index creation on existing production tables.
4. **Every foreign key addition must be verified for index coverage on the referencing table.**: Every foreign key addition must be verified for index coverage on the referencing table.

## Hallucination Traps (Read First)
❌ Merging migrations with duplicate sequence numbers or branch collision timestamps → ✅ Validate sequential ordering in CI
❌ Adding `NOT NULL` without defaults on pre-Postgres 11 tables → ✅ Flag as blocking review in migration linter
❌ Renaming tables in place without views or API backward-compatibility shims → ✅ Block PR until expand-and-contract plan is supplied
❌ Running migrations without automated dry-run testing against a sanitized staging clone → ✅ Run migrations on staging clone prior to production

---

### 1. Automated Migration Linter Script (`scripts/lint_migrations.js`)
```javascript
const fs = require('fs');
const path = require('path');

const DANGEROUS_PATTERNS = [
  { pattern: /DROP\s+COLUMN/i, severity: 'BLOCK', reason: 'DROP COLUMN breaks active application instances. Follow expand-and-contract.' },
  { pattern: /CREATE\s+INDEX\s+(?!CONCURRENTLY)/i, severity: 'BLOCK', reason: 'CREATE INDEX must use CONCURRENTLY to avoid ACCESS EXCLUSIVE locks.' },
  { pattern: /ALTER\s+TABLE\s+[^;]+ALTER\s+COLUMN\s+[^;]+TYPE/i, severity: 'BLOCK', reason: 'ALTER COLUMN TYPE causes full table rewrite.' },
  { pattern: /ALTER\s+TABLE\s+[^;]+ADD\s+CONSTRAINT\s+[^;]+FOREIGN\s+KEY\s+(?!.*NOT\s+VALID)/i, severity: 'WARN', reason: 'Add foreign keys with NOT VALID first, then validate separately.' },
];

function lintMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  for (const { pattern, severity, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({ severity, reason, file: filePath });
    }
  }
  return issues;
}
```

---

## Diagnostic Procedures & Verification Commands
### CI Verification Command
```bash
node scripts/lint_migrations.js ./migrations/*.sql
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all queries parameterized against SQL injection vulnerabilities?
✅ Are composite indexes ordered by Equality, Sort, then Range (ESR)?
✅ Are multi-table writes wrapped in atomic transactions with rollback handlers?
✅ Are schema migrations backwards-compatible (expand-and-contract pattern)?
✅ Did I verify table and column names against active schema definitions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


