---
name: db-multi-tenant-rls
description: "Use when implementing, testing, and hardening PostgreSQL Row-Level Security (RLS) policies, session variable isolation, and preventing multi-tenant data leakage."
version: 1.0.0
last-updated: 2026-10-27
skills:
  - database-design
  - sql-pro
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "db multi tenant rls"
  - "row level security postgres"
  - "tenant isolation database"
  - "multi tenant rls policy"
  - "rls security bypass prevention"
  - "tenant data leak audit"
---

# Multi-Tenant Database Isolation & PostgreSQL Row-Level Security (RLS)

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `db-multi-tenant-rls` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Identify multi-tenant tenancy model (Shared Database, Shared Schema with Tenant ID column)
2. **Runtime Context & Platform Invariants**: Verify that all tenant-owned tables include a non-nullable `tenant_id` foreign key
3. **Execution Guardrails**: Ensure `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` are applied
4. **Validation & Type Contracts**: Inspect application connection roles to ensure web app does NOT connect as superuser or table owner
5. **Observability & Proof of Execution**: Check session context injection (`SET LOCAL app.current_tenant_id = ?`)

## Activation Boundaries
- **Activate when:** Use when implementing, testing, and hardening PostgreSQL Row-Level Security (RLS) policies, session variable isolation, and preventing multi-tenant data leakage.
- **DO NOT activate when:** The task falls outside the `db-multi-tenant-rls` domain or is managed by a different dedicated specialist agent.

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
1. **Always enforce `FORCE ROW LEVEL SECURITY`**: standard RLS does not apply to table owners unless `FORCE` is explicitly enabled.
2. **Never connect as superuser**: superuser roles automatically bypass all RLS policies.
3. **Use `SET LOCAL` for tenant context**: `SET LOCAL` automatically scopes the session variable to the current transaction and rolls back upon completion.
4. **Always write automated tests verifying that Tenant A cannot read, update, or delete Tenant B records.**: Always write automated tests verifying that Tenant A cannot read, update, or delete Tenant B records.

## Hallucination Traps (Read First)
❌ Using `SET app.current_tenant_id = "..."` without `LOCAL` → ✅ Non-local `SET` persists across connection pool checkouts and leaks tenants!
❌ Forgetting RLS on newly created join tables → ✅ Every table containing tenant-scoped data must have RLS enabled
❌ Table owner bypass: connecting application as the PostgreSQL user that ran `CREATE TABLE` → ✅ Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is on
❌ Neglecting performance on RLS: filtering without indexes on `tenant_id` → ✅ Always create an index on `(tenant_id)` or composite `(tenant_id, id)`

---

### 1. Robust PostgreSQL RLS Definition
```sql
-- 1. Enable RLS and FORCE on table owner
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- 2. Create index on tenant_id
CREATE INDEX CONCURRENTLY idx_projects_tenant_id ON projects (tenant_id);

-- 3. Policy for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY tenant_isolation_policy ON projects
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
```

### 2. Application Context Wrapper (TypeScript)
```typescript
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL scopes context ONLY to this transaction!
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Diagnostic Procedures & Verification Commands
### Security Verification Suite
1. Run automated multi-tenant leak regression test:
   ```typescript
   it('prevents Tenant A from viewing Tenant B records', async () => {
     await withTenantContext(tenantA, async (client) => {
       const rows = await client.query('SELECT * FROM projects WHERE id = $1', [tenantBProjectId]);
       expect(rows.rows).toHaveLength(0); // Sealed!
     });
   });
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


