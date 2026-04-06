---
name: sql-pro
description: Senior SQL developer across major databases (PostgreSQL, MySQL, SQL Server, Oracle). Complex query design with CTEs, window functions, PIVOT, recursive queries, JSON operations, full-text search, performance optimization with EXPLAIN ANALYZE, indexing strategies, partitioning, and schema architecture. Use when writing queries, designing schemas, optimizing performance, or debugging slow queries.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# SQL Pro — Advanced Query & Schema Mastery

---

## Common Table Expressions (CTEs)

### Basic CTE

```sql
-- CTE for readability and reuse
WITH active_users AS (
    SELECT id, name, email, created_at
    FROM users
    WHERE is_active = true
    AND last_login > CURRENT_DATE - INTERVAL '30 days'
),
user_orders AS (
    SELECT user_id, COUNT(*) AS order_count, SUM(total) AS total_spent
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
)
SELECT
    u.name,
    u.email,
    COALESCE(o.order_count, 0) AS orders,
    COALESCE(o.total_spent, 0) AS revenue
FROM active_users u
LEFT JOIN user_orders o ON u.id = o.user_id
ORDER BY revenue DESC;
```

### Recursive CTE (Hierarchical Data)

```sql
-- Org chart: find all reports under a manager
WITH RECURSIVE org_tree AS (
    -- Base case: the starting manager
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE id = 42  -- starting point

    UNION ALL

    -- Recursive case: find direct reports
    SELECT e.id, e.name, e.manager_id, t.depth + 1
    FROM employees e
    INNER JOIN org_tree t ON e.manager_id = t.id
    WHERE t.depth < 10  -- safety limit to prevent infinite loops
)
SELECT * FROM org_tree ORDER BY depth, name;

-- ❌ HALLUCINATION TRAP: Always include a depth/cycle guard
-- Without it, circular references cause infinite recursion
-- PostgreSQL: use CYCLE detection clause (PG 14+)
-- SQL Server: use MAXRECURSION option
```

### CTE for Running Totals & Pagination

```sql
-- Keyset pagination (faster than OFFSET for large tables)
WITH page AS (
    SELECT id, name, created_at
    FROM products
    WHERE (created_at, id) < (:last_created_at, :last_id)  -- cursor
    ORDER BY created_at DESC, id DESC
    LIMIT 20
)
SELECT * FROM page;

-- ❌ HALLUCINATION TRAP: OFFSET-based pagination gets slower with higher pages
-- OFFSET 100000, LIMIT 20 scans and discards 100,000 rows
-- Keyset pagination is O(1) regardless of page number
```

---

## Window Functions

### Ranking Functions

```sql
-- ROW_NUMBER: unique sequential number per partition
SELECT
    department,
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_in_dept
FROM employees;

-- RANK vs DENSE_RANK
-- RANK: 1, 2, 2, 4 (gaps after ties)
-- DENSE_RANK: 1, 2, 2, 3 (no gaps)
SELECT
    name,
    score,
    RANK() OVER (ORDER BY score DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM leaderboard;

-- NTILE: divide into N equal groups
SELECT
    name,
    revenue,
    NTILE(4) OVER (ORDER BY revenue DESC) AS quartile
FROM companies;
```

### Aggregate Windows

```sql
-- Running total
SELECT
    date,
    amount,
    SUM(amount) OVER (ORDER BY date) AS running_total,
    AVG(amount) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg_7d
FROM daily_revenue;

-- Percentage of total
SELECT
    category,
    revenue,
    ROUND(100.0 * revenue / SUM(revenue) OVER (), 2) AS pct_of_total
FROM category_sales;

-- Difference from previous row
SELECT
    month,
    revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change,
    ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS mom_pct_change
FROM monthly_revenue;
```

### Frame Clauses

```sql
-- Frame clause controls which rows the window function sees
SUM(amount) OVER (
    ORDER BY date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW    -- last 3 rows (physical)
)

SUM(amount) OVER (
    ORDER BY date
    RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW  -- last 7 days (logical)
)

-- ROWS vs RANGE:
-- ROWS = physical row count (exact)
-- RANGE = logical value range (handles ties differently)

-- ❌ HALLUCINATION TRAP: Default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- This means SUM() OVER (ORDER BY x) includes ALL preceding rows, not just "the one before"
-- To get a true running count of N rows, use ROWS BETWEEN explicitly
```

### Lead / Lag Analysis

```sql
-- Next and previous values
SELECT
    event_date,
    user_id,
    LAG(event_date) OVER (PARTITION BY user_id ORDER BY event_date) AS prev_visit,
    LEAD(event_date) OVER (PARTITION BY user_id ORDER BY event_date) AS next_visit,
    event_date - LAG(event_date) OVER (PARTITION BY user_id ORDER BY event_date) AS days_between
FROM user_events;

-- FIRST_VALUE / LAST_VALUE
SELECT
    department,
    name,
    salary,
    FIRST_VALUE(name) OVER (PARTITION BY department ORDER BY salary DESC) AS highest_paid,
    LAST_VALUE(name) OVER (
        PARTITION BY department ORDER BY salary DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING  -- ⚠️ required!
    ) AS lowest_paid
FROM employees;

-- ❌ HALLUCINATION TRAP: LAST_VALUE without explicit frame clause returns CURRENT ROW
-- You MUST specify ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
```

---

## PIVOT / UNPIVOT / Conditional Aggregation

### PostgreSQL / Standard SQL (Conditional Aggregation)

```sql
-- PostgreSQL doesn't have PIVOT — use conditional aggregation
SELECT
    product_name,
    SUM(CASE WHEN quarter = 'Q1' THEN revenue ELSE 0 END) AS q1,
    SUM(CASE WHEN quarter = 'Q2' THEN revenue ELSE 0 END) AS q2,
    SUM(CASE WHEN quarter = 'Q3' THEN revenue ELSE 0 END) AS q3,
    SUM(CASE WHEN quarter = 'Q4' THEN revenue ELSE 0 END) AS q4,
    SUM(revenue) AS total
FROM quarterly_sales
GROUP BY product_name
ORDER BY total DESC;

-- PostgreSQL crosstab (requires tablefunc extension)
SELECT * FROM crosstab(
    'SELECT product, quarter, revenue FROM sales ORDER BY 1, 2',
    'SELECT DISTINCT quarter FROM sales ORDER BY 1'
) AS ct(product TEXT, q1 NUMERIC, q2 NUMERIC, q3 NUMERIC, q4 NUMERIC);
```

### SQL Server PIVOT

```sql
-- SQL Server native PIVOT
SELECT *
FROM (
    SELECT product_name, quarter, revenue
    FROM quarterly_sales
) AS source
PIVOT (
    SUM(revenue)
    FOR quarter IN ([Q1], [Q2], [Q3], [Q4])
) AS pivoted;
```

---

## JSON Operations

### PostgreSQL JSONB

```sql
-- Query JSON fields
SELECT
    id,
    profile->>'name' AS name,                -- text extraction
    profile->'address'->>'city' AS city,      -- nested extraction
    (profile->>'age')::int AS age             -- cast to int
FROM users
WHERE profile->>'country' = 'US'
AND (profile->>'age')::int >= 18;

-- JSONB containment
SELECT * FROM products
WHERE metadata @> '{"category": "electronics"}';  -- contains

-- JSONB existence
SELECT * FROM products
WHERE metadata ? 'warranty';  -- key exists

-- JSONB array queries
SELECT * FROM users
WHERE profile->'tags' ? 'premium';  -- array contains value

-- Update JSONB
UPDATE users
SET profile = jsonb_set(profile, '{address,city}', '"New York"')
WHERE id = 1;

-- JSONB aggregation
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) AS users_json
FROM users
WHERE is_active = true;

-- ❌ HALLUCINATION TRAP: -> returns JSON, ->> returns TEXT
-- Filtering on -> requires JSON comparison
-- Filtering on ->> allows string comparison
-- Always cast ->> results when comparing numbers: (col->>'age')::int
```

---

## Indexing Strategy

### Index Types

```sql
-- B-tree (default — good for equality and range)
CREATE INDEX idx_users_email ON users (email);

-- Composite index (column order matters!)
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);
-- ✅ Supports: WHERE user_id = 1 AND created_at > '2024-01-01'
-- ✅ Supports: WHERE user_id = 1 (uses leftmost prefix)
-- ❌ Does NOT support: WHERE created_at > '2024-01-01' (skips first column)

-- Partial / Filtered index (index only matching rows)
CREATE INDEX idx_active_users ON users (email) WHERE is_active = true;
-- Smaller index, faster queries when filtering by is_active

-- Covering index (INCLUDE — avoids table lookup)
CREATE INDEX idx_orders_covering ON orders (user_id)
    INCLUDE (total, status, created_at);
-- All needed columns in the index = index-only scan

-- GIN index (for JSONB, arrays, full-text search)
CREATE INDEX idx_products_metadata ON products USING gin (metadata);

-- GiST index (for geometric, range, full-text)
CREATE INDEX idx_locations_geo ON locations USING gist (coordinates);

-- BRIN index (for naturally ordered data like timestamps)
CREATE INDEX idx_logs_timestamp ON logs USING brin (created_at);
-- Tiny index, perfect for append-only tables with timestamp ordering
```

### SARGability

```sql
-- SARGable = Search ARGument ABLE — can the query use an index?

-- ✅ SARGable (index seekable)
WHERE created_at >= '2024-01-01'
WHERE email = 'alice@test.com'
WHERE name LIKE 'Ali%'         -- prefix match

-- ❌ NOT SARGable (forces full table scan)
WHERE YEAR(created_at) = 2024  -- function on column
WHERE LOWER(email) = 'alice@test.com'  -- function on column
WHERE name LIKE '%alice%'      -- leading wildcard
WHERE amount + tax > 100       -- expression on column
WHERE COALESCE(name, '') = ''  -- function on column

-- ✅ Fix: functional index (PostgreSQL)
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
-- Now WHERE LOWER(email) = 'alice@test.com' IS SARGable

-- ✅ Fix: computed column (SQL Server)
ALTER TABLE users ADD email_lower AS LOWER(email) PERSISTED;
CREATE INDEX idx_email_lower ON users (email_lower);

-- ❌ HALLUCINATION TRAP: Implicit type conversions destroy SARGability
-- WHERE varchar_column = 123  ← implicit cast on EVERY row
-- WHERE varchar_column = '123'  ← direct comparison, uses index
```

---

## EXPLAIN ANALYZE (Query Optimization)

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM orders WHERE user_id = 42 AND status = 'completed';

-- Reading the output:
-- Seq Scan        → full table scan (usually bad for large tables)
-- Index Scan      → using an index to find rows (good)
-- Index Only Scan → all data from index, no table access (best)
-- Bitmap Scan     → index + bitmap for multiple conditions (good for moderate selectivity)
-- Hash Join       → building hash table for join (good for large joins)
-- Nested Loop     → for each row in A, scan B (good for small datasets, bad for large)
-- Sort            → explicit sorting (check if index can avoid this)

-- Key metrics:
-- actual time=X..Y  → X = time to first row, Y = time to all rows (ms)
-- rows=N            → actual rows returned
-- loops=N           → number of times this node executed
-- Buffers: shared hit=N → pages read from cache (good)
-- Buffers: shared read=N → pages read from disk (measure of I/O cost)

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT * FROM orders WHERE user_id = 42;
-- Check: logical reads (from cache), physical reads (from disk)

-- ❌ HALLUCINATION TRAP: EXPLAIN without ANALYZE shows estimates, NOT actuals
-- Always use EXPLAIN ANALYZE for real performance data
-- But CAREFUL: ANALYZE actually EXECUTES the query
-- For destructive queries (DELETE, UPDATE), wrap in a transaction:
BEGIN;
EXPLAIN ANALYZE DELETE FROM users WHERE id = 1;
ROLLBACK;  -- prevents actual deletion
```

---

## Table Partitioning

```sql
-- PostgreSQL range partitioning (ideal for time-series data)
CREATE TABLE events (
    id BIGSERIAL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Queries automatically prune partitions:
-- SELECT * FROM events WHERE created_at >= '2024-02-01'
-- Only scans events_2024_02 and later — skips events_2024_01 entirely

-- List partitioning (for categorical data)
CREATE TABLE orders (
    id SERIAL,
    region TEXT NOT NULL,
    total NUMERIC
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('US');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('EU', 'UK');
CREATE TABLE orders_apac PARTITION OF orders FOR VALUES IN ('JP', 'KR', 'AU');
```

---

## Transactions & Concurrency

```sql
-- Proper transaction pattern
BEGIN;

-- Lock the row for update (prevents concurrent modification)
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Verify consistency
DO $$
BEGIN
    IF (SELECT SUM(balance) FROM accounts) <> 10000 THEN
        RAISE EXCEPTION 'Balance integrity violation';
    END IF;
END $$;

COMMIT;

-- Isolation levels (ordered by strictness)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;    -- default (PostgreSQL)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;   -- snapshot isolation
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;      -- strictest (may abort)

-- Advisory locks (application-level locking)
SELECT pg_advisory_lock(12345);    -- acquire
-- ... do work ...
SELECT pg_advisory_unlock(12345);  -- release
```

---

## MERGE / UPSERT

```sql
-- PostgreSQL UPSERT (ON CONFLICT)
INSERT INTO products (sku, name, price, updated_at)
VALUES ('ABC-123', 'Widget', 29.99, NOW())
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at;

-- SQL Server MERGE
MERGE INTO products AS target
USING staging_products AS source
ON target.sku = source.sku
WHEN MATCHED THEN
    UPDATE SET
        name = source.name,
        price = source.price,
        updated_at = GETDATE()
WHEN NOT MATCHED THEN
    INSERT (sku, name, price, created_at)
    VALUES (source.sku, source.name, source.price, GETDATE());

-- ❌ HALLUCINATION TRAP: PostgreSQL uses ON CONFLICT, not MERGE
-- MERGE was added in PostgreSQL 15+ but ON CONFLICT is idiomatic
-- SQL Server uses MERGE — do not confuse the two syntaxes
```

---

## Full-Text Search (PostgreSQL)

```sql
-- Create tsvector column and GIN index
ALTER TABLE articles ADD COLUMN search_vector tsvector;

UPDATE articles SET search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(body, '')), 'B');

CREATE INDEX idx_articles_search ON articles USING gin (search_vector);

-- Search with ranking
SELECT
    title,
    ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'database & optimization') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Trigger to auto-update search vector
CREATE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_search
    BEFORE INSERT OR UPDATE OF title, body ON articles
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

---

## Security

```sql
-- ✅ ALWAYS use parameterized queries
-- PostgreSQL (via psycopg)
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

-- Python SQLAlchemy
stmt = select(User).where(User.email == email)

-- ❌ NEVER: String interpolation for SQL
-- ❌ f"SELECT * FROM users WHERE email = '{email}'"
-- ❌ "SELECT * FROM users WHERE email = '" + email + "'"
-- These allow SQL injection: email = "'; DROP TABLE users; --"

-- Row-Level Security (PostgreSQL)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_owner_policy ON documents
    USING (owner_id = current_setting('app.current_user_id')::int);

-- Grant minimum permissions
GRANT SELECT, INSERT ON users TO app_role;
-- ❌ NEVER: GRANT ALL ON DATABASE TO app_role
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ SQL Pro Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       SQL Pro
Database:    [PostgreSQL/MySQL/SQL Server/Oracle]
Scope:       [N queries · N tables]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [EXPLAIN ANALYZE output / migration success / test pass]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.

---
