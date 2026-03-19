---
name: nextjs-react-expert
description: Next.js App Router and React v19+ performance optimization from Vercel Engineering. Use when building React components, optimizing performance, implementing React Compiler patterns, eliminating waterfalls, reducing JS payload, or implementing Streaming/PPR optimizations.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# React v19+ & Next.js Pro-Max Performance Patterns

> The fastest code is code that doesn't run.
> The second fastest is code that runs on the edge and streams the result.

---

## Contemporary Paradigm Shifts

| Legacy (React 18 / Next.js Pages) | Modern (React 19 / Next.js App Router) |
|---|---|
| Manual `useMemo()` / `useCallback()` | **React Compiler** handles memoization natively |
| `getServerSideProps` / Client Fetching | **React Server Components (RSC)** default |
| `useActionState` custom hooks | **Server Actions** native mutations |
| Loading spinners on client | **Streaming UI** & `Suspense` boundaries |
| Static *or* Dynamic pages | **Partial Prerendering (PPR)** (Static shell, dynamic guts) |

---

## Core Architecture Decision Framework

### Server vs. Client Component
By default, everything in Next.js App Router is a Server Component. 

```
Default: Server Component (Zero JS sent to client)
Switch to Client ('use client') ONLY when:
  - Uses browser APIs (window, localStorage, navigator)
  - Needs DOM event handlers (onClick, onChange)
  - Needs state/effects (useState, useEffect, useOptimistic)
```

**The Interleaved Pattern:** Never make a layout or major shell `'use client'`. 
Pass Server Components *into* Client components as `children`.

```tsx
// ✅ Correct: The heavy static content stays on the server
<ClientInteractiveDrawer>
  <ServerHeavyGraph data={dbData} />
</ClientInteractiveDrawer>
```

---

## Extreme Waterfall Elimination

The most impactful Next.js optimization is eliminating network waterfalls.

```tsx
// ❌ CRITICAL WATERFALL: 3 sequential async calls, each waits for the previous
async function Dashboard() {
  const user = await getUser();           // 200ms
  const posts = await getPosts();         // 200ms (waits unnecessarily)
  const analytics = await getAnalytics(); // 200ms (waits unnecessarily)
  // Total: 600ms (Blocked UI)
}
```

### Fix 1: Parallel Fetching
```tsx
// ✅ Parallel — all 3 start at the same time
async function Dashboard() {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics(),
  ]);
  // Total: ~200ms (Blocked UI, but faster)
}
```

### Fix 2: Streaming UI (The Pro-Max Way)
Do not await slow data at the page level. Wrap slow components in `<Suspense>`.

```tsx
// 🚀 PRO-MAX: Streaming Components
export default function Dashboard() {
  return (
    <main>
      <FastHeader />
      <Suspense fallback={<AnalyticsSkeleton />}>
        {/* React streams this HTML down when the DB resolves */}
        <SlowAnalyticsComponent />
      </Suspense>
    </main>
  );
}
```

---

## Partial Prerendering (PPR)

PPR allows a single route to have both an ultra-fast static edge-cached shell, and dynamic personalized content streamed in instantly after execution.

- Avoid using global `cookies()` or `headers()` high up in the component tree, as this forces the entire route to be dynamic.
- Isolate dynamic data fetching within a `<Suspense>` boundary so the rest of the page can be statically pre-rendered at build time.

---

## AI & Streaming UI Responses

When building GenAI interfaces, waiting for complete API responses breaks the "Doherty Threshold" (400ms).

- **Use the `ai` SDK (`@ai-sdk/react`)** to stream text using `useChat` or `useCompletion`.
- **Generative UI (RSC streaming):** Stream actual React Server Components back from the LLM, not just strings.

```tsx
// ✅ AI Generative UI response
return (
  <div>
    Here is the weather:
    <Suspense fallback={<WeatherSkeleton />}>
      <WeatherCard promise={llmTools.getWeather(location)} />
    </Suspense>
  </div>
)
```

---

## Bundle Size & JS Dropping

- **Import strictly:** Use barrel files cautiously. Ensure `package.json` `sideEffects: false` is respected so bundlers can tree-shake.
- **Client boundaries low:** Push `'use client'` as far down the component tree as mathematically possible.
- **Lazy loading heavy client deps:**
```tsx
import dynamic from 'next/dynamic'
// Only load D3.js when the user actually opens the modal
const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false })
```

---

## Key Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| Fetching via `useEffect` | Client waterfall, huge CLS, breaks SSR | Fetch in RSC or use `SWR`/`React Query` |
| Manual `useMemo` everywhere | Hurts code readability; React 18 legacy | Trust **React Compiler** to optimize renders automatically |
| Missing `key` on mapped lists | Complete DOM destruction on update | Use stable unique IDs (never `index`) |
| Unhandled Server Actions | Silent errors on DB failures | Wrap in `try/catch` and return `{ error }` objects |
| Client-side secret passing | Exposes API keys | `server-only` package + Server Actions |

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Nextjs React Expert Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Nextjs React Expert
Language:    [detected language / framework]
Scope:       [N files · N functions]
─────────────────────────────────────────────────
✅ Passed:   [checks that passed, or "All clean"]
⚠️  Warnings: [non-blocking issues, or "None"]
❌ Blocked:  [blocking issues requiring fix, or "None"]
─────────────────────────────────────────────────
VBC status:  PENDING → VERIFIED
Evidence:    [test output / lint pass / compile success]
```

**VBC (Verification-Before-Completion) is mandatory.**
Do not mark status as VERIFIED until concrete terminal evidence is provided.


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-frontend`**
**Active reviewers: `logic` · `security` · `frontend` · `type-safety`**

### ❌ Forbidden AI Tropes in Next.js/React

1. **`"use client"` on everything** — do not convert Server Components to Client unless interaction/state is strictly required.
2. **`getServerSideProps` in App Router** — never hallucinate legacy Pages router data fetching in an App Router context.
3. **Unnecessary `useEffect` fetching** — always prefer Server Components or SWR/React Query for data fetching.
4. **Vercel clones** — do not default to generic black/white Vercel aesthetics unless instructed.
5. **Missing `key` in maps** — always provide a unique, stable key. No using iteration index as the key.

### ✅ Pre-Flight Self-Audit

Review these questions before generating React/Next.js code:
```
✅ Did I maximize Server Component usage and isolate `'use client'` boundaries?
✅ Are there any sequential network calls creating a waterfall? If so, did I use `Promise.all` or `Suspense`?
✅ Did I ensure no sensitive environment variables leak to the client?
✅ Did I use `next/image` and `next/link` instead of raw `<img>` and `<a>` when appropriate?
✅ Did I implement proper loading/error boundaries (`loading.tsx`, `error.tsx`)?
```
