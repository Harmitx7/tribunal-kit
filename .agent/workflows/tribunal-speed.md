---
description: Full-stack parallel performance audit. Runs 3 scoped specialists simultaneously — vitals-reviewer (Frontend CWV), db-latency-auditor (SQL/ORM), throughput-optimizer (Node.js server) — then synthesizes a single ranked report. Maximum 5 AI calls regardless of project size. Use when full-stack performance profiling is needed.
---

# /tribunal-speed — Full-Stack Performance Swarm

$ARGUMENTS

---

## When to Use /tribunal-speed

|Use `/tribunal-speed` when...|Use something else when...|
|:---|:---|
|Full-stack performance audit needed|Frontend only → `/tribunal-performance`|
|Changes span UI + DB + Server layers|Single file review → `/review`|
|Pre-deploy performance validation|Security-focused → `/tribunal-full`|
|Investigating end-to-end latency|Architecture planning → `/plan`|
|Need scoped specialist depth (not generic)|Quick generic check → `/tribunal-performance`|

---

## Architecture: 3-Phase Fan-Out (5 AI Calls Max)

```
Phase 1 — File Classification (1 call)
│
│  Classify all submitted files into:
│  ├── Frontend  (.tsx, .jsx, .css, .module.css)
│  ├── Database  (.sql, schema.prisma, files with prisma./db./drizzle(/knex()
│  └── Server    (.ts/.js in /api, /server, /lib, /utils, /routes, /middleware)
│
│  Files that don't match any category → skip (not performance-relevant)
│
▼
Phase 2 — Parallel Specialist Audit (3 concurrent calls)
│
│  ┌──────────────────────┬──────────────────────┬───────────────────────┐
│  │  vitals-reviewer     │  db-latency-auditor  │  throughput-optimizer │
│  │                      │                      │                      │
│  │  Receives ONLY       │  Receives ONLY       │  Receives ONLY       │
│  │  Frontend files      │  Database files      │  Server files        │
│  │                      │                      │                      │
│  │  Checks:             │  Checks:             │  Checks:             │
│  │  - LCP blockers      │  - N+1 queries       │  - Event-loop blocks │
│  │  - INP violations    │  - Missing LIMIT     │  - Serialized awaits │
│  │  - CLS triggers      │  - Unindexed WHERE   │  - Memory leaks      │
│  │  - Suspense waterfalls│  - SELECT * abuse   │  - Missing Workers   │
│  │  - Paint jank        │  - Pool config       │  - Streaming gaps    │
│  │  - Animation leaks   │  - Wide transactions │  - No keep-alive     │
│  └──────────────────────┴──────────────────────┴───────────────────────┘
│
│  Each specialist returns findings in its verdict format.
│  allSettled — one specialist failure does NOT block siblings.
│
▼
Phase 3 — Synthesis (1 call)
│
│  Merges 3 specialist reports into a single ranked issue list.
│  Priority: Critical → High → Medium → Low
│  Each issue tagged with: [AGENT] [FILE:LINE] [IMPACT METRIC] [FIX]
│
▼
Human Gate — Final report shown
Y = acknowledge | N = discard | R = re-audit with different scope
```

**Total cost: 5 AI calls maximum** — predictable, repeatable, project-size-independent.

---

## Token Discipline Rules

```
Rule 1: Each specialist reads ONLY its scoped files — never the full project
Rule 2: If a category has zero files, that specialist is skipped (saves 1 call)
Rule 3: File contents are trimmed to relevant sections via targeted grep
Rule 4: Synthesis call receives only verdict summaries, not full file contents
```

---

## 3 Specialist Agents

### vitals-reviewer (Frontend)
- **Scope:** `.tsx`, `.jsx`, `.css`, `.module.css`
- **Metrics:** INP, LCP, CLS, FCP
- **Key patterns:** React 19 `use()` waterfalls, non-passive listeners, missing `content-visibility`, `useGSAP` leaks, View Transitions jank, Suspense placement

### db-latency-auditor (Database)
- **Scope:** `.sql`, `schema.prisma`, files with `prisma.`, `db.`, `drizzle(`, `knex(`
- **Metrics:** Query count, query latency, connection overhead
- **Key patterns:** N+1 queries, missing LIMIT, unindexed WHERE, SELECT *, no connection pooling, over-scoped transactions, mass assignment

### throughput-optimizer (Server)
- **Scope:** `.ts/.js` in `/api`, `/server`, `/lib`, `/utils`, `/routes`, `/middleware`
- **Metrics:** RPS, p95 latency, memory usage
- **Key patterns:** Sync `fs.*`, serialized `await` loops, global Map without TTL, no Worker Threads for CPU ops, buffer bloat, missing keep-alive

---

## Synthesis Output Format

```
━━━ Tribunal Speed: Full-Stack Performance Audit ━━━━━━━━━━━━━━

Specialists dispatched: 3 | Completed: 3 | Skipped: 0

━━━ Critical Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[CRITICAL] throughput-optimizer | api/orders.ts:47
Pattern: SERIALIZED-AWAIT
Issue:   await inside for-loop serializes 5 DB calls (1500ms vs 300ms parallel)
Fix:     const results = await Promise.all(ids.map(id => fetchOrder(id)));
Impact:  -1200ms p95 API latency

[CRITICAL] db-latency-auditor | lib/users.ts:23
Pattern: N+1
Issue:   findMany in loop generates 101 queries for 100 users
Fix:     Use prisma.user.findMany({ include: { posts: true } })
Impact:  101 queries → 1 query

━━━ High Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HIGH] vitals-reviewer | components/Hero.tsx:12
Pattern: LCP
Issue:   Hero image without priority prop — browser discovers it late
Fix:     Add priority={true} to next/image component
Impact:  LCP improvement ~500ms

━━━ Medium Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[MEDIUM] vitals-reviewer | app/feed/page.tsx:89
Pattern: CLS
Issue:   Feed items missing content-visibility: auto
Fix:     Add content-visibility: auto; contain-intrinsic-size: auto 200px;
Impact:  Reduced off-screen rendering cost

━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total issues:  7 (2 Critical, 2 High, 3 Medium)
AI calls used: 5
Token budget:  Within scope (specialists read only categorized files)

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acknowledged?  Y = close | R = re-audit different scope
```

---

## Specialist Failure Handling

```
If a specialist fails after 3 retries:
  → Log failure with agent name + error
  → Continue with remaining specialists
  → Include "[SPECIALIST FAILED]" in synthesis report
  → Never silently skip — always visible in output
```

---

## Versus Other Commands

|Command|Agents|Depth|When to Use|
|:---|:---|:---|:---|
|`/tribunal-performance`|logic + performance-reviewer|Generic CWV check|Quick single-file perf scan|
|`/tribunal-speed`|vitals + db-latency + throughput|Deep 3-domain parallel|Full-stack perf audit|
|`/tribunal-full`|All 14 agents|Everything|Maximum coverage (security + perf + all)|
|`/performance-benchmarker`|Lighthouse + bundle|Measurement only|Get actual scores, not code review|

---

## Usage Examples

```
/tribunal-speed the entire checkout flow (UI + API + DB queries)
/tribunal-speed all files changed in this PR for performance regression
/tribunal-speed the dashboard page end-to-end (data fetch + render + DB)
/tribunal-speed the search feature: autocomplete UI + search API + query plan
```

---
