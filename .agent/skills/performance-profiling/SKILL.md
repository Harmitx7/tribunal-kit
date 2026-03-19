---
name: performance-profiling
description: Performance profiling principles. Measurement, analysis, and optimization techniques.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Performance Profiling Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```



---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
