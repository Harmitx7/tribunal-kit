---
name: performance-profiling
description: Performance profiling mastery. Core Web Vitals (LCP, CLS, INP), Lighthouse auditing, JavaScript profiling, React rendering optimization, bundle analysis, memory leak detection, database query profiling (EXPLAIN ANALYZE), load testing, and performance budgets. Use when optimizing performance, debugging slow pages, or establishing performance standards.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Performance Profiling — Measurement-Driven Optimization

---

## Core Web Vitals

```
LCP (Largest Contentful Paint) → Loading speed
  ✅ Good: ≤ 2.5s  │  ⚠️ Needs work: 2.5-4s  │  ❌ Poor: > 4s
  What: Time until the largest visible element renders
  Fix: Optimize images, preload fonts, reduce server time

INP (Interaction to Next Paint) → Responsiveness
  ✅ Good: ≤ 200ms  │  ⚠️ Needs work: 200-500ms  │  ❌ Poor: > 500ms
  What: Delay between user interaction and visual response
  Fix: Break long tasks, use web workers, defer non-critical JS

CLS (Cumulative Layout Shift) → Visual stability
  ✅ Good: ≤ 0.1  │  ⚠️ Needs work: 0.1-0.25  │  ❌ Poor: > 0.25
  What: How much the page layout shifts unexpectedly
  Fix: Set explicit dimensions on images/ads, font-display: swap

TTFB (Time to First Byte) → Server responsiveness
  ✅ Good: ≤ 800ms
  Fix: CDN, caching, optimize database queries, use edge

// ❌ HALLUCINATION TRAP: FID is deprecated. Use INP (Interaction to Next Paint).
// FID only measured the FIRST interaction. INP measures ALL interactions.
```

---

## JavaScript Profiling

### Bundle Analysis

```bash
# Analyze what's in your JavaScript bundle
npx vite-bundle-visualizer   # Vite
npx @next/bundle-analyzer    # Next.js

# Key targets:
# Total JS < 200KB (gzipped) for initial load
# No single dependency > 50KB (gzipped)
# Tree-shaking working (no dead code)
```

```typescript
// Common bundle bloat sources:
// ❌ import _ from "lodash";           // 72KB — imports everything
// ✅ import debounce from "lodash/debounce";  // 1KB — specific import

// ❌ import { format } from "date-fns";  // may import entire library
// ✅ import { format } from "date-fns/format";  // specific import

// ❌ import moment from "moment";        // 67KB + locales
// ✅ Use native Intl.DateTimeFormat or date-fns (tree-shakeable)
```

### React Rendering Profiling

```typescript
// React DevTools Profiler — find unnecessary re-renders

// 1. Why Did You Render (development tool)
// npm i @welldone-software/why-did-you-render -D

// 2. Manual render tracking
const RenderCounter = ({ label }: { label: string }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`[${label}] rendered ${renderCount.current} times`);
  return null;
};

// 3. React.memo — prevent re-renders when props haven't changed
const ExpensiveList = React.memo(function ExpensiveList({ items }: Props) {
  return items.map((item) => <ListItem key={item.id} {...item} />);
});

// 4. useMemo / useCallback — memoize expensive computations
const sortedItems = useMemo(
  () => items.toSorted((a, b) => a.name.localeCompare(b.name)),
  [items],
);
```

### Memory Leak Detection

```typescript
// Common memory leaks in JavaScript:
// 1. Event listeners not cleaned up
useEffect(() => {
  const handler = () => console.log("resize");
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler); // ✅ cleanup
}, []);

// 2. Timers not cleared
useEffect(() => {
  const interval = setInterval(pollData, 5000);
  return () => clearInterval(interval); // ✅ cleanup
}, []);

// 3. AbortController not used for fetch
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/data", { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((e) => { if (e.name !== "AbortError") throw e; });
  return () => controller.abort(); // ✅ cancel on unmount
}, []);

// Detection: Chrome DevTools → Memory → Heap Snapshot
// Take snapshot, perform action, take another, compare growth
```

---

## Image Optimization

```html
<!-- Modern image loading -->
<img
  src="hero.webp"
  srcset="hero-480.webp 480w, hero-768.webp 768w, hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  width="1200"
  height="800"
  loading="lazy"
  decoding="async"
  alt="Product hero"
  fetchpriority="high"
/>

<!-- Rules:
  - ALWAYS set width and height (prevents CLS)
  - Use WebP/AVIF (30-50% smaller than JPEG)
  - loading="lazy" for below-the-fold images
  - fetchpriority="high" for LCP image
  - Use srcset for responsive images
  - Serve from CDN with auto-format negotiation
-->
```

---

## Database Query Profiling

```sql
-- Always EXPLAIN before optimizing
EXPLAIN ANALYZE SELECT u.*, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.is_active = true
GROUP BY u.id
ORDER BY post_count DESC
LIMIT 20;

-- Look for:
-- Seq Scan → needs an index (on large tables)
-- Nested Loop → consider index or different join strategy
-- Sort → can an index provide sorted data?
-- execution time > 100ms → optimize

-- Common fixes:
-- Add index: CREATE INDEX idx_posts_author ON posts (author_id);
-- Use partial index: CREATE INDEX idx_active_users ON users (id) WHERE is_active;
-- Avoid SELECT *: SELECT only needed columns
-- Paginate with cursor: WHERE id > $cursor ORDER BY id LIMIT 20
```

---

## Performance Budgets

```javascript
// Lighthouse CI budget
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["error", { maxNumericValue: 1500 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-byte-weight": ["error", { maxNumericValue: 500000 }],
      },
    },
  },
};
```

```
Performance budget targets:
  Total JS (gzipped):     < 200KB
  Total CSS (gzipped):    < 50KB
  Total page weight:      < 500KB
  LCP:                    < 2.5s
  INP:                    < 200ms
  CLS:                    < 0.1
  TTFB:                   < 800ms
  Time to Interactive:    < 3.8s
```

---
