---
description: Performance-specific Tribunal. Runs Logic + Performance reviewers. Use when code is slow, for optimization tasks, bundle analysis, Core Web Vitals improvement, memory leak investigation, and before deploying performance-critical features.
---

# /tribunal-performance — Performance Audit

$ARGUMENTS

---

## When to Use /tribunal-performance

|Use `/tribunal-performance` when...|Use something else when...|
|:---|:---|
|LCP, INP, or CLS is above threshold|General code review → `/tribunal-full`|
|Bundle size is too large|Backend perf only → `/tribunal-backend`|
|Memory usage grows unbounded|Database perf → `/tribunal-database`|
|Node.js event loop is saturated||
|Optimizing rendering performance||

---

## 2 Active Reviewers (Both Run Simultaneously)

### logic-reviewer
- Expensive computation in render function (runs every render)
- Missing memoization where React.memo/useMemo would help
- Infinite re-render loop (effect updates a value that triggers the effect)

### performance-reviewer
- INP: expensive synchronous work on user interaction (> 50ms blocking)
- LCP: hero image without priority={true} or preload hint
- CLS: missing width/height on images causing layout shift
- Bundle: large library imported without tree-shaking or dynamic import
- Memory: event listeners added without cleanup in useEffect
- N+1: database queries in loop should be batched
- Cache: expensive DB query without Redis/memory cache

---

## 2026 CWV Targets (Verdict Reference)

|Metric|Good|Needs Work|Poor (REJECTED)|
|:---|:---|:---|:---|
|INP|< 200ms|200–500ms|> 500ms|
|LCP|< 2.5s|2.5–4.0s|> 4.0s|
|CLS|< 0.1|0.1–0.25|> 0.25|

---

## Verdict System

```
If code contains patterns causing POOR rating → ❌ REJECTED
If code contains patterns causing NEEDS WORK → ⚠️ WARNING
If all patterns cause GOOD rating → ✅ APPROVED
```

---

---

## Performance-Specific Hallucination Traps

```typescript
// ❌ React.memo doesn't help when parent re-renders with new objects every time
const MemoCard = React.memo(Card);
<MemoCard style={{ margin: 8 }} /> // New object {} every render → memo has no effect

// ✅ Memoize the object itself
const cardStyle = useMemo(() => ({ margin: 8 }), []);
<MemoCard style={cardStyle} />

// ❌ useMemo with no deps array — runs every render (same as no memo)
const sorted = useMemo(() => items.sort(...)); // Missing deps array!

// ✅ Correct deps array
const sorted = useMemo(() => [...items].sort(compareFn), [items]);

// ❌ Non-measurement claim
// "This is fast" — never write this without a Lighthouse score to back it
```

---

## Measurement Protocol

Performance optimization without measurement is guessing:

```
Before optimizing:
□ Run Lighthouse: record LCP, INP, CLS, bundle size
□ Profile with Chrome DevTools: identify actual bottleneck

After optimizing:
□ Run Lighthouse again: confirm improvement
□ Show before/after scores in audit output
```

---

## Usage Examples

```
/tribunal-performance the product listing page with image grid
/tribunal-performance the search component with real-time filtering
/tribunal-performance the checkout flow for CWV compliance
/tribunal-performance the API route with expensive DB query for caching
```
