---
description: Run standardized performance benchmarks including Lighthouse CI, bundle analysis, and API latency checks. Records before/after metrics. No optimization claims without measured evidence.
---

# /performance-benchmarker — Evidence-Based Performance Measurement

$ARGUMENTS

---

## When to Use /performance-benchmarker

|Use `/performance-benchmarker` when...|Use something else when...|
|:---|:---|
|Establishing performance baseline|Code optimization decisions → `/tribunal-performance`|
|After optimization — verify improvement|Memory leaks investigation → `/debug`|
|Pre-release performance gate|Bundle analysis only → run ANALYZE=true npm run build|
|Regular weekly benchmark|API review only → `/tribunal-backend`|

---

## Benchmark Suite (Run in Order)

```bash
# 1. Lighthouse CI — Core Web Vitals
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./reports/lighthouse-$(date +%Y%m%d).json \
  --only-categories=performance,accessibility,best-practices,seo

# 2. Bundle Analysis
ANALYZE=true npm run build

# 3. API latency (using autocannon for load test)
npx autocannon -c 10 -d 20 http://localhost:3000/api/products
# -c: 10 concurrent connections
# -d: 20 second duration

# 4. Database query analysis
# (Prisma): Add to your test route temporarily
const plan = await prisma.$queryRaw`EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = ${userId}`;
console.log(plan);
```

---

## Benchmark Report Format

```
━━━ Performance Benchmark — [date] ━━━━━━━━━

━━━ Core Web Vitals (Lighthouse) ━━━━━━━━━━
LCP:  [time]   [✅ Good | ⚠️ Needs Work | ❌ Poor]
INP:  [time]   [✅ Good | ⚠️ Needs Work | ❌ Poor]
CLS:  [score]  [✅ Good | ⚠️ Needs Work | ❌ Poor]
FCP:  [time]
TTFB: [time]

Performance Score: [N]/100

━━━ Bundle Sizes ━━━━━━━━━━━━━━━━━━━━━━━━━
First Load JS (shared): [size]
Largest page:           [size] ([route])
Largest 3 bundles:
  [bundle]: [size]
  [bundle]: [size]
  [bundle]: [size]

━━━ API Latency (10 concurrent, 20s) ━━━━━━
GET /api/products: avg [ms] | p99 [ms] | [req/s] req/s
POST /api/orders:  avg [ms] | p99 [ms]

━━━ Comparison (vs last run) ━━━━━━━━━━━━━━
LCP:    4.2s → 1.9s  ▼ IMPROVED ✅
INP:    480ms → 140ms ▼ IMPROVED ✅
Bundle: 890kb → 310kb ▼ IMPROVED ✅
p99 latency: 230ms → 89ms ▼ IMPROVED ✅
```

---

## Performance Gates (Fail Criteria)

```
Failing these means optimization is blocking — not optional:

LCP   > 4.0s     → ❌ Must fix — users see blank page
INP   > 500ms    → ❌ Must fix — UI feels unresponsive
CLS   > 0.25     → ❌ Must fix — layout jumps are jarring
Bundle > 1mb     → ❌ Must fix — 3G users abandon
p99 API > 2000ms → ❌ Must fix — timeout risk on slow connections

Warning range (fix before major release):
LCP   2.5–4.0s  → ⚠️
INP   200–500ms → ⚠️
Bundle 500kb–1mb → ⚠️
```

---

## Historical Tracking

Save every benchmark run:

```bash
# Benchmarks should be saved with date stamps
./reports/lighthouse-2026-04-02.json
./reports/bundle-2026-04-02.txt
./reports/latency-2026-04-02.txt
```

This enables trend analysis: is performance improving or degrading over time?

---
