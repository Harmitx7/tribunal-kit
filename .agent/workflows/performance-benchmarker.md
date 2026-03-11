---
description: Run standardized performance benchmarks including Lighthouse, bundle analysis, and latency checks.
---

# /performance-benchmarker — Automated Performance Audit

$ARGUMENTS

---

This command runs a comprehensive suite of performance benchmarks against your project and generates a structured report with numerical scores, regression detection, and prioritized actionable fixes.

---

## When to Use

- Before any `/deploy` to catch performance regressions.
- After adding new dependencies or large features.
- When user reports "it feels slow" or asks to "check performance".
- When triggered by `benchmark`, `lighthouse`, `bundle size`, or `latency` keywords.

---

## Pipeline Flow

```
Request (scope: full / web-vitals / bundle / api)
    │
    ▼
Environment detection — framework, build tool, package manager
    │
    ▼
Tool availability check — lighthouse? build script? dev server?
    │
    ▼
Benchmark execution — run selected checks
    │
    ▼
Score calculation — weighted composite
    │
    ▼
Regression detection — compare against previous baselines (if available)
    │
    ▼
Report — scores, pass/fail, recommendations, fix priority
```

---

## Benchmark Suite

### 1. Web Vitals (Frontend Performance)

| Metric | Good | Needs Work | Poor | Measurement |
|---|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4.0s | > 4.0s | Lighthouse or `web-vitals` library |
| INP (Interaction to Next Paint) | < 200ms | 200-500ms | > 500ms | Lab approximation via TBT |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 | Layout shift detection |
| TTFB (Time to First Byte) | < 800ms | 800-1800ms | > 1800ms | Server response timing |
| FCP (First Contentful Paint) | < 1.8s | 1.8-3.0s | > 3.0s | Lighthouse |
| Speed Index | < 3.4s | 3.4-5.8s | > 5.8s | Lighthouse |

**How to Run:**
```bash
# If lighthouse is available
npx lighthouse http://localhost:3000 --output json --chrome-flags="--headless"

# If web-vitals is installed, inject into page and measure
# VERIFY: check if lighthouse-cli is available before running
```

**Common Fixes by Metric:**

| Metric | Fix | Impact |
|---|---|---|
| LCP slow | Preload hero image, use `fetchpriority="high"` | High |
| LCP slow | Eliminate render-blocking CSS/JS | High |
| INP slow | Break long tasks > 50ms into smaller chunks | High |
| INP slow | Use `requestIdleCallback` for non-critical work | Medium |
| CLS high | Set explicit `width`/`height` on images/embeds | High |
| CLS high | Use `font-display: swap` + font preload | Medium |
| TTFB slow | Add caching headers, use CDN | High |
| TTFB slow | Optimize database queries, add indexes | High |
| FCP slow | Inline critical CSS, defer non-critical | High |

### 2. Bundle Analysis (JavaScript/CSS)

| Check | Target | Warning | Fail | Tool |
|---|---|---|---|---|
| Total JS (gzipped) | < 100KB | 100-200KB | > 200KB | Build output |
| Largest chunk (gzipped) | < 50KB | 50-100KB | > 100KB | Build output |
| CSS total | < 50KB | 50-100KB | > 100KB | Build output |
| Unused CSS | < 5% | 5-15% | > 15% | PurgeCSS |
| Duplicate packages | 0 | 1-2 | > 2 | Bundle analyzer |
| Tree-shaking | No side-effect barrel exports | — | Side-effect imports found | Manual analysis |

**How to Run:**
```bash
# Build and analyze
npm run build -- --stats
# VERIFY: check if the build script supports --stats flag

# Alternative: analyze existing build output
npx source-map-explorer dist/**/*.js
# VERIFY: check if source-map-explorer is available
```

**Common Fixes:**

| Issue | Fix | Savings |
|---|---|---|
| Large lodash import | `import debounce from 'lodash/debounce'` not `import { debounce } from 'lodash'` | 50-80KB |
| Moment.js | Replace with `dayjs` or `date-fns` | 60-70KB |
| Full icon library | Use tree-shakeable imports or individual icon files | 20-100KB |
| Uncompressed images | Use WebP/AVIF, add `loading="lazy"` | 50-500KB |
| CSS framework unused | PurgeCSS or `content` config in Tailwind | 30-90KB |

### 3. API Latency (Backend Performance)

| Check | Target | Warning | Fail | Method |
|---|---|---|---|---|
| Avg response (simple GET) | < 100ms | 100-300ms | > 300ms | 10 sequential requests |
| Avg response (complex query) | < 300ms | 300-800ms | > 800ms | 10 sequential requests |
| P95 response | < 500ms | 500-1000ms | > 1000ms | Sort, pick 95th percentile |
| P99 response | < 1000ms | 1-3s | > 3s | Sort, pick 99th percentile |
| Cold start | < 1s | 1-3s | > 3s | First request after 30s idle |
| Concurrent handling | Linear scaling up to 10 req | — | Exponential degradation | 10 parallel requests |

**How to Run:**
```bash
# Using curl timing
curl -o /dev/null -s -w "time_total: %{time_total}s\n" http://localhost:3000/api/health

# Loop for average
for i in $(seq 1 10); do
  curl -o /dev/null -s -w "%{time_total}\n" http://localhost:3000/api/endpoint
done
```

**Common Fixes:**

| Symptom | Likely Cause | Fix |
|---|---|---|
| Slow first request | Cold start, no connection pool | Pre-warm, use connection pooling |
| Slow list endpoints | N+1 queries | Add eager loading / `include` |
| Slow under load | No caching | Add Redis/in-memory cache for hot paths |
| Inconsistent P95 | GC pauses | Optimize memory allocation, reduce object churn |

### 4. Build Performance (DX)

| Check | Target | Warning | Fail |
|---|---|---|---|
| Dev server cold start | < 3s | 3-8s | > 8s |
| Hot reload (HMR) | < 200ms | 200-500ms | > 500ms |
| Full production build | < 30s | 30-60s | > 60s |
| TypeScript type-check | < 15s | 15-30s | > 30s |

---

## Composite Score

```
Performance Score = (
  Web_Vitals_Score × 0.35 +
  Bundle_Score     × 0.25 +
  API_Score        × 0.25 +
  Build_Score      × 0.15
) × 100

Grade:
  90-100  →  A  (Ship with confidence)
  75-89   →  B  (Minor optimizations available)
  60-74   →  C  (Notable performance issues)
  40-59   →  D  (Significant problems — fix before deploy)
  < 40    →  F  (Critical — likely impacts user retention)
```

Each sub-score is calculated as: `(checks_passed / total_checks)` weighted by target (1.0), warning (0.6), fail (0.0).

---

## Output Format

```
━━━ Performance Benchmark Report ━━━━━━━━━

Project:  [name]
Date:     [timestamp]
Score:    [0-100] / 100 → Grade [A-F]

━━━ Web Vitals ━━━━━━━━━━━━━━━━━━━━━━━━━

LCP:    1.8s  ✅ Good    (target: < 2.5s)
INP:    95ms  ✅ Good    (target: < 200ms)
CLS:    0.05  ✅ Good    (target: < 0.1)
TTFB:   420ms ✅ Good    (target: < 800ms)
FCP:    1.2s  ✅ Good    (target: < 1.8s)
Score:  92/100

━━━ Bundle ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total JS:      156KB gzipped  🟡 Warning  (target: < 100KB)
Largest chunk:  82KB gzipped  🟡 Warning  (target: < 50KB)
CSS total:      28KB gzipped  ✅ Good
Unused CSS:    4.2%           ✅ Good
Duplicates:    0              ✅ Good
Score: 72/100

━━━ API Latency ━━━━━━━━━━━━━━━━━━━━━━━━

GET /api/users:     avg 89ms  ✅  |  p95 142ms  ✅
POST /api/auth:     avg 210ms 🟡  |  p95 480ms  🟡
GET /api/dashboard: avg 340ms ❌  |  p95 820ms  ❌
Cold start:         680ms     ✅
Score: 58/100

━━━ Build ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dev cold start:   2.1s  ✅
HMR:              89ms  ✅
Production build: 18s   ✅
Type-check:       12s   ✅
Score: 100/100

━━━ Fix Priority (by impact) ━━━━━━━━━━━

1. 🔴 GET /api/dashboard avg 340ms
   → Add database index on dashboard query joins
   → Expected: < 100ms (70% improvement)

2. 🟡 Total JS 156KB
   → Lazy-load chart library (80KB)
   → Expected: < 80KB initial (50% reduction)

3. 🟡 POST /api/auth avg 210ms
   → Cache user lookup in auth flow
   → Expected: < 100ms (50% improvement)

━━━ Trend (if baseline available) ━━━━━━

LCP:    1.8s → 1.8s  → (no change)
Bundle: 140KB → 156KB ↑ (+11%) ⚠️ Regression
API p95: 400ms → 480ms ↑ (+20%) ⚠️ Regression
```

---

## Regression Detection

If a previous benchmark baseline exists (stored in `perf-baseline.json` or similar):

| Metric | Change | Status |
|---|---|---|
| < 5% increase | No change | ✅ Stable |
| 5-15% increase | Minor regression | 🟡 Flag |
| > 15% increase | Significant regression | 🔴 Block deploy |
| Any decrease | Improvement | 🎉 Celebrate |

---

## Baseline Management

After a successful benchmark, save a baseline to detect future regressions:

```bash
# Save current benchmark as baseline
python .agent/scripts/bundle_analyzer.py . --save-baseline
```

The baseline file is `perf-baseline.json` in the project root. Check it into version control so regressions are caught in CI.

---

## Cross-Workflow Navigation

| After /performance-benchmarker shows... | Go to |
|---|---|
| Grade D or F | `/tribunal-performance` on the slowest code paths |
| Bundle regression (+15%) | `/audit` for dependency analysis, then `/fix` |
| API latency P95 > 500ms | `/debug` to identify the slow query or operation |
| Web vitals LCP > 4s | `/enhance` to add image preloading and critical CSS |
| Grade A or B, ready for deploy | `/deploy` following pre-flight checklist |

---

## Hallucination Guard

- **Only run benchmarks with installed tools** — check with `which` or `npx --dry-run` first.
- **Never fabricate benchmark numbers** — report "SKIPPED: [tool] not installed" if unavailable.
- **Flag anomalies**: `// NOTE: unusually fast — may be cached` or `// NOTE: first run, cold start included`.
- **Mark tool availability**: `// VERIFY: lighthouse-cli not detected, using fallback estimation`.
- **Don't guess fixes** — only recommend fixes for issues that have measured evidence.

---

## Usage

```
/performance-benchmarker full audit
/performance-benchmarker web vitals only
/performance-benchmarker bundle analysis
/performance-benchmarker api latency for /api/users /api/posts
/performance-benchmarker build performance
/performance-benchmarker compare with baseline
```
