# Zero-Downtime Database Migration Architecture

> **Authority**: PostgreSQL & Alembic Engineering Standards  
> **Applicable Domains**: Database Administration, High-Availability Systems, Python/Alembic, Prisma  
> **Status**: Verified Production Specification  

---

## 1. The Lock Contention Problem

DDL statements (e.g. `ALTER TABLE`, `ADD COLUMN`, `CREATE INDEX`) require an `ACCESS EXCLUSIVE` lock on the target table. While waiting to acquire this lock:
1. The DDL transaction queues behind long-running read/write queries.
2. All subsequent queries on the table queue behind the waiting DDL lock.
3. Connection pools exhaust within seconds, causing full application outages.

### Mandatory Pre-Flight Lock Timeout Guard:
Always set tight lock and statement timeouts before executing any migration:
```sql
SET lock_timeout = '2s';
SET statement_timeout = '5s';
```
If the lock cannot be acquired within 2 seconds, the migration fails safely and rolls back without queuing production traffic.

---

## 2. Non-Blocking Schema Change Patterns

### 1. Adding Columns Safely
- **PostgreSQL 11+**: Adding a column with a default (`ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;`) does NOT rewrite the table or lock rows.
- **Pre-PG 11 or MySQL**: Add column as nullable without default, populate in batched background workers, then set `NOT NULL` with a check constraint.

### 2. Concurrent Index Creation
- ❌ **Forbidden**: `CREATE INDEX idx_name ON table(col);` (Locks entire table for writes).
- ✅ **Required**: `CREATE INDEX CONCURRENTLY idx_name ON table(col);` (Builds index in background without blocking reads or writes).
  - *Note*: `CREATE INDEX CONCURRENTLY` cannot run inside an explicit transaction block (`BEGIN ... COMMIT`).

### 3. Expand-and-Contract Column Renaming
Renaming a column live breaks existing application instances during rolling deployments.
Follow the 3-step expand-and-contract phase:
1. **Phase 1 (Expand)**: Add the new column; configure application code to dual-write to both old and new columns, reading from old.
2. **Phase 2 (Backfill & Switch)**: Backfill historical rows from old column to new column in batched transactions; switch application read traffic to new column.
3. **Phase 3 (Contract)**: Remove dual-write logic; drop old column in a subsequent release.

---

## 3. Alembic Zero-Downtime Migration Recipe

```python
"""zero_downtime_column_addition

Revision ID: 8f3c1a2e9b4d
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # 1. Enforce aggressive lock timeout
    op.execute("SET lock_timeout = '2s'")
    
    # 2. Add nullable column without full table rewrite
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.execute("SET lock_timeout = '2s'")
    op.drop_column('users', 'last_login_at')
```
