---
name: performance-profiling
description: Performance profiling principles. Measurement, analysis, and optimization techniques.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Performance Profiling Principles

> Never optimize code you haven't measured.
> The bottleneck is almost never where you expect it to be.

---

## The Measurement-First Rule

Every performance investigation follows the same sequence:

```
Measure → Identify hotspot → Form hypothesis → Change one thing → Measure again
```

Breaking this sequence — jumping straight to "fix" — wastes time and creates new problems.

---

## What to Measure

### Backend

| Metric | Tool | Target |
|---|---|---|
| Request throughput | ab, k6, wrk | Baseline + stress test |
| P50/P95/P99 latency | DataDog, Grafana, k6 | P99 < SLA threshold |
| Memory usage | `process.memoryUsage()`, heap snapshot | Stable under load (no growth) |
| CPU usage | clinic.js flame chart | Identify blocking operations |
| Database query time | Query logs, pg_stat_statements | No query > 100ms without index |

### Frontend

| Metric | Tool | Target (2025 Core Web Vitals) |
|---|---|---|
| LCP (Largest Contentful Paint) | Lighthouse, CrUX | < 2.5s |
| INP (Interaction to Next Paint) | Lighthouse, Web Vitals | < 200ms |
| CLS (Cumulative Layout Shift) | Lighthouse | < 0.1 |
| Bundle size (JS) | `npm run build` + analyzer | < 200kB initial JS |

---

## Common Backend Bottlenecks

### N+1 Queries (most common)

```ts
// ❌ 1 + N queries
const posts = await db.post.findMany();
for (const post of posts) {
  post.author = await db.user.findUnique({ where: { id: post.authorId } });
}

// ✅ 2 queries total
const posts = await db.post.findMany({ include: { author: true } });
```

**Detection:** Enable query logging. Repeated identical queries differing only by ID = N+1.

### Missing Database Indexes

```sql
-- EXPLAIN ANALYZE tells you if a query is doing a sequential scan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = $1;

-- Sequential scan on large table → add index
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Blocking the Event Loop (Node.js)

```ts
// ❌ Synchronous CPU work blocks all requests
const result = JSON.parse(fs.readFileSync('huge.json', 'utf8'));

// ✅ Non-blocking
const content = await fs.promises.readFile('huge.json', 'utf8');
const result = JSON.parse(content);  // still sync but no disk I/O blocking
```

---

## Common Frontend Bottlenecks

### Bundle Size

- Identify large packages with `npx vite-bundle-visualizer` or `@next/bundle-analyzer`
- Replace heavy packages with lighter alternatives (e.g., `date-fns` instead of `moment`)
- Code-split routes — don't ship all JavaScript on first load

### Render Performance

```ts
// ❌ Recalculates on every render
function ExpensiveList({ items }) {
  const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
  return sorted.map(item => <Item key={item.id} item={item} />);
}

// ✅ Recalculates only when items change
function ExpensiveList({ items }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  return sorted.map(item => <Item key={item.id} item={item} />);
}
```

---

## Profiling Tools

| Tool | Platform | Best For |
|---|---|---|
| `clinic.js` (`clinic doctor`) | Node.js | CPU flame charts, memory leaks |
| Chrome DevTools → Performance | Browser | JS execution, paint, layout |
| `EXPLAIN ANALYZE` | PostgreSQL | Query plan analysis |
| Lighthouse | Web | Full Core Web Vitals audit |
| `k6` | Backend load testing | Throughput and latency under load |

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/lighthouse_audit.py` | Lighthouse performance audit | `python scripts/lighthouse_audit.py <url>` |
