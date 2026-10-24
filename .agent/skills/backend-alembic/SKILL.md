---
name: backend-alembic
description: "Use when creating, reviewing, validating, and debugging Alembic database migrations. Covers migration DAGs, zero-downtime expand-and-contract migrations, branch heads, autogenerate limitations, and SQLite batch mode."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - backend-sqlalchemy
  - database-design
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "backend"
  - "alembic"
  - "creating"
---

# Alembic Migration Engineering & Zero-Downtime Governance

## Activation Boundaries
- **Activate when:** Use when creating, reviewing, validating, and debugging Alembic database migrations. Covers migration DAGs, zero-downtime expand-and-contract migrations, branch heads, autogenerate limitations, and SQLite batch mode.
- **DO NOT activate when:** The task falls outside the `backend-alembic` domain or is managed by a different dedicated specialist agent.


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


## Mandatory Pre-Flight Context Inspection
1. **Migration Head Status**: Run `alembic heads` to verify there is only a single active head; detect split branches.
2. **Autogenerate Limitations**: Inspect generated revision for unhandled types (custom enum alterations, check constraints, table renames).
3. **Locking Risk**: Identify migrations that lock high-volume tables (adding NOT NULL without default, altering column types).
4. **Downgrade Symmetry**: Ensure the `downgrade()` function precisely reverses the `upgrade()` function without data loss.
5. **Target Dialect Compatibility**: Ensure SQLite migrations use `batch_alter_table` when modifying existing columns.

## 🛠️ Technical Architecture & Reference Recipes

### 1. Expand-and-Contract Migration Protocol (Zero-Downtime)
```python
"""Rename column 'phone' to 'phone_number' without breaking running application instances"""

# Phase 1 (Migration 1): Expand - Add new nullable column
def upgrade():
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))
    # Code syncs writes to both phone and phone_number

# Phase 2 (Migration 2): Backfill existing records in small batches

# Phase 3 (Migration 3): Contract - Drop old column after all application pods are updated
def upgrade():
    op.drop_column('users', 'phone')
```

### 2. SQLite Batch Alter Mode
```python
from alembic import op
import sqlalchemy as sa

def upgrade():
    # SQLite does not support ALTER COLUMN directly; requires table copy
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('status',
                              existing_type=sa.VARCHAR(10),
                              type_=sa.String(25),
                              existing_nullable=False)
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Multiple Heads Divergence** | Two developers merge migrations with the same parent, causing deploy collision | Run `alembic merge heads -m "merge branches"` before pushing |
| **Exclusive Table Lock on Heavy Table** | `ALTER TABLE ADD COLUMN NOT NULL DEFAULT 'val'` on PG < 11 locks table | Add column as NULL, backfill rows in batches, then set NOT NULL |
| **Enum Type Alteration Failure** | Modifying Postgres native ENUM via autogenerate is not supported | Use explicit raw SQL `op.execute("ALTER TYPE user_status ADD VALUE 'SUSPENDED'")` |

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Empty or `pass` Downgrades** | Leaving `def downgrade(): pass` in production migrations | Always implement functional, symmetric `downgrade()` logic |
| **Direct Schema Inspection Assumption** | Assuming `autogenerate` catches everything | Always manually verify detected changes; autogenerate misses table renames, index partials, and check constraints |

## 🏛️ Tribunal Verification & Guardrails
- **Active Reviewers:** `database-architect`, `sql-pro`, `devops-engineer`
- **Evidence Standard:** Mark findings as `[OBSERVED]`, `[INFERRED]`, or `[UNVERIFIED]`.


## Verification (Auto-Remediated)

- [ ] **Verify Execution**: Ensure the output matches the original task requirements.
- [ ] **Safety Check**: Validate that no destructive actions occurred outside the requested scope.
