---
name: testcontainers-integration
description: "Use when running true integration tests against real ephemeral Docker containers (PostgreSQL, Redis, Kafka, RabbitMQ) using Testcontainers."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - testing-patterns
  - backend-testing-auditor
  - database-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/test_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "testcontainers integration"
  - "testcontainers testing"
  - "ephemeral test database container"
  - "real redis integration test"
  - "real postgres integration test"
  - "docker containerized tests"
---

# Testcontainers Ephemeral Infrastructure Integration Testing

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `testcontainers-integration` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify Docker daemon is active and responsive on the test execution host
2. **Runtime Context & Platform Invariants**: Confirm container images are pinned to specific versions (e.g. `postgres:16-alpine`, not `latest`)
3. **Execution Guardrails**: Implement reusable container lifecycles to avoid spinning up containers per test file
4. **Validation & Type Contracts**: Ensure dynamic port mapping is retrieved from container instance and injected into app configuration
5. **Observability & Proof of Execution**: Verify container termination cleanup in `globalTeardown` to prevent orphaned containers

## Activation Boundaries
- **Activate when:** Use when running true integration tests against real ephemeral Docker containers (PostgreSQL, Redis, Kafka, RabbitMQ) using Testcontainers.
- **DO NOT activate when:** The task falls outside the `testcontainers-integration` domain or is managed by a different dedicated specialist agent.

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
1. **Never mock what you can run in a lightweight container**: test real database engines (Postgres, Redis) to catch dialect-specific bugs.
2. **Always use dynamic random host ports**: never bind to default ports (5432, 6379) to allow parallel test execution.
3. **Pin exact container tags**: `postgres:16.4-alpine3.20`, avoiding `latest` which causes unexpected CI drift.
4. **Reuse containers across test files when possible, resetting database tables via truncation rather than destroying containers.**: Reuse containers across test files when possible, resetting database tables via truncation rather than destroying containers.

## Hallucination Traps (Read First)
❌ Spinning up a brand new Docker container for every single test case → ✅ Share container across the test suite and truncate tables in `afterEach`
❌ Hardcoding `localhost:5432` in test connection strings → ✅ Always read `container.getConnectionUri()` or `container.getMappedPort()`
❌ Forgetting to configure wait strategies, causing tests to connect before DB is ready → ✅ Use `Wait.forListeningPort()` or `Wait.forLogMessage()`
❌ Leaving zombie Docker containers running after failed test runs → ✅ Testcontainers automatically starts Ryuk container cleaner, do not disable it

---

### 1. Vitest Global Setup with PostgreSQL Testcontainer
```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer;

export async function setup() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  // Run initial schema migrations
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.end();
}

export async function teardown() {
  if (container) {
    await container.stop();
  }
}
```

### 2. Fast Integration Test against Real Container
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from 'pg';

describe('User Repository Integration', () => {
  let client: Client;

  beforeEach(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    // Fast table reset between tests
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
  });

  afterEach(async () => {
    await client.end();
  });

  it('enforces unique email constraint in real PostgreSQL engine', async () => {
    await client.query('INSERT INTO users (email) VALUES ($1)', ['alice@test.com']);

    // Attempt duplicate insert
    await expect(
      client.query('INSERT INTO users (email) VALUES ($1)', ['alice@test.com'])
    ).rejects.toThrow(/duplicate key value violates unique constraint/);
  });
});
```

---

## Diagnostic Procedures & Verification Commands
### Execution Command
```bash
# Run integration tests against Docker Testcontainers
npx vitest run --config vitest.integration.config.ts
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

**Active Reviewers:** `test-engineer` · `qa-automation-engineer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Do tests follow behavioral GIVEN/WHEN/THEN specifications?
✅ Are happy path, failure paths, and boundary conditions (0, null, max, unicode) covered?
✅ Are test mocks isolated and reset between successive test cases?
✅ Do E2E locators rely on stable ARIA attributes instead of brittle CSS selectors?
✅ Did I verify test suite passes deterministically without flaky race conditions?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.


