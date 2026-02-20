---
name: react-best-practices
description: React and Next.js performance optimization from Vercel Engineering. Use when building React components, optimizing performance, eliminating waterfalls, reducing bundle size, reviewing code for performance issues, or implementing server/client-side optimizations.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# React & Next.js Performance Patterns

> The fastest code is code that doesn't run.
> The second fastest is code that runs once and caches the result.

---

## File Index

| File | Topic | Load When |
|---|---|---|
| `1-async-eliminating-waterfalls.md` | Parallel data fetching, waterfall elimination | Sequential fetches causing slow page loads |
| `2-bundle-bundle-size-optimization.md` | Code splitting, tree shaking, lazy loading | Bundle is too large, slow initial load |
| `3-server-server-side-performance.md` | RSC, streaming, server actions | Next.js app router performance |
| `4-client-client-side-data-fetching.md` | SWR, React Query, client-side patterns | Client-side data management |
| `5-rerender-re-render-optimization.md` | Memo, useMemo, useCallback, key selection | Expensive re-renders |
| `6-rendering-rendering-performance.md` | Virtual DOM, reconciliation, React profiler | Profiling slow renders |
| `7-js-javascript-performance.md` | Event delegation, web workers, micro-optimizations | JS execution bottlenecks |
| `8-advanced-advanced-patterns.md` | Concurrent features, Suspense, transitions | Complex async UX patterns |

---

## Core Decision Framework

### Server vs. Client Component

```
Default: Server Component
Switch to Client when:
  - Uses browser APIs (window, localStorage, navigator)
  - Needs event handlers (onClick, onChange)
  - Uses React hooks (useState, useEffect, useContext)
  - Needs real-time updates
```

```tsx
// ✅ Server Component — data fetches on server, zero JS sent for this component
async function UserProfile({ id }: { id: string }) {
  const user = await getUser(id);  // direct DB call — no API round-trip
  return <div>{user.name}</div>;
}

// ✅ Client Component — only when interactivity is needed
'use client';
function ToggleButton() {
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen(!open)}>{open ? 'Close' : 'Open'}</button>;
}
```

---

## Waterfall Elimination

The most impactful Next.js optimization. Requests that depend on each other are fine. Requests that don't depend on each other must run in parallel.

```tsx
// ❌ Waterfall — 3 sequential async calls, each waits for the previous
async function Dashboard() {
  const user = await getUser();           // 200ms
  const posts = await getPosts();         // 200ms (waits unnecessarily)
  const analytics = await getAnalytics(); // 200ms (waits unnecessarily)
  // Total: 600ms
}

// ✅ Parallel — all 3 start at the same time
async function Dashboard() {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics(),
  ]);
  // Total: ~200ms (longest of the three)
}
```

---

## Re-render Optimization

Re-renders are not always bad. Unnecessary re-renders are.

```tsx
// ❌ New object reference on every render = child always re-renders
function Parent() {
  const config = { theme: 'dark' };  // new reference each render
  return <Child config={config} />;
}

// ✅ Stable reference
function Parent() {
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return <Child config={config} />;
}

// ✅ Or move outside component if it never changes
const CONFIG = { theme: 'dark' };
function Parent() {
  return <Child config={CONFIG} />;
}
```

**Measure before optimizing:** Use React DevTools Profiler to confirm a component is actually re-rendering unnecessarily before adding `memo` or `useMemo`.

---

## Bundle Size Principles

- Import only what you use: `import { format } from 'date-fns'` not `import dateFns from 'date-fns'`
- Code-split at the route level at minimum — Next.js does this automatically
- Heavy libraries that are only needed on interaction: `const Chart = dynamic(() => import('recharts'), { ssr: false })`
- Check bundle with `@next/bundle-analyzer` before and after adding large dependencies

---

## Key Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| Fetching in `useEffect` | Client waterfall, no SSR benefit | Fetch in Server Component or use React Query |
| `useState` for derived data | Unnecessary state, sync bugs | Compute from existing state during render |
| Missing `key` on list items | React reconciliation fails, wrong elements update | Use stable unique ID as key, never index |
| Context for frequently-changing state | Every consumer re-renders on every change | Use Zustand or split context by update frequency |
| `useCallback` on everything | Adds CPU cost without benefit | Profile first — only memoize expensive callbacks passed to memoized children |
