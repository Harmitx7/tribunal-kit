---
name: nextjs-react-expert
description: Use when Next.js 15+ App Router mastery. Server Components, Server Actions, PPR, caching, metadata, middleware, parallel/intercepting routes. Use when building Next.js apps or optimizing Next.js performance.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - react-specialist
  - react-doctor
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Next.js 15+ App Router — Dense Reference

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `nextjs-react-expert` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Next.js 15+ App Router mastery. Server Components, Server Actions, PPR, caching, metadata, middleware, parallel/intercepting routes. Use when building Next.js apps or optimizing Next.js performance.
- **DO NOT activate when:** The task falls outside the `nextjs-react-expert` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## 2026 Next.js 15 Architecture & Performance Invariants

1. **Async Route Params**: In Next.js 15, `params` and `searchParams` are Promises:
   ```tsx
   export default async function Page({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
   }
   ```
2. **Async Headers & Cookies**: Always `await cookies()` and `await headers()`:
   ```ts
   import { cookies } from 'next/headers';
   const cookieStore = await cookies();
   ```
3. **Partial Prerendering (PPR)**: Isolate dynamic data fetches within `<Suspense>` boundaries so the static shell renders instantly.
4. **Server Action CSRF & Origin Verification**: Next.js 15 checks host header by default; ensure actions validate permissions before mutations.

## Hallucination Traps (Read First)

- ❌ Synchronous `const { id } = params` → ✅ Next.js 15: `const { id } = await params`
- ❌ Synchronous `const c = cookies()` → ✅ Next.js 15: `const c = await cookies()`
- ❌ Assuming `fetch()` is cached by default → ✅ Next.js 15 defaults to `{ cache: 'no-store' }`
- ❌ `pages/api/` or `_app.tsx` → ✅ App Router only: `app/api/route.ts`, `app/layout.tsx`
- ❌ `getServerSideProps` → ✅ Direct `async` Server Components
- ❌ `next/router` → ✅ `next/navigation` (`useRouter`, `usePathname`)
- ❌ Server Action without `"use server"` → ✅ Required at top of file or function
- ❌ Passing functions as props Server → Client → ✅ Use Server Actions

---

## App Router Conventions

```text
app/
├── layout.tsx         ← Root shell (HTML/BODY)
├── page.tsx           ← Route UI
├── loading.tsx        ← Auto-suspense fallback
├── error.tsx          ← Error boundary (Must be "use client")
├── not-found.tsx      ← 404 UI
├── global-error.tsx   ← Root error boundary
├── api/users/route.ts ← API Handler (GET, POST)
├── @modal/login/page.tsx ← Parallel Route (renders in same layout)
└── (auth)/login/page.tsx ← Route Group (doesn't affect URL)
```

---

## Server vs Client Components

- **Server Components (Default)**: Zero JS. Direct DB access. Secure env vars.
- **Client Components (`"use client"`)**: Lifecycle (`useEffect`), State (`useState`), Browser APIs (`window`), Event listeners (`onClick`).

```tsx
// ✅ INTERLEAVING PATTERN: Pass Server Component as children to Client Component
export default function Page() {
  return (
    <ClientSidebar>
      {' '}
      {/* "use client" */}
      <ServerStats /> {/* Server: zero JS bundle, fetches DB */}
    </ClientSidebar>
  );
}
```

---

## Server Actions (Mutations)

```tsx
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Schema = z.object({ name: z.string().min(2) });

export async function createUser(prevState: any, formData: FormData) {
  // ❌ TRAP: ALWAYS validate formData. Never trust client input.
  const parsed = Schema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  await db.user.create({ data: parsed.data });
  revalidatePath('/users'); // Clears cache so next render shows new user
  return { success: true };
}
```

Client usage (React 19):

```tsx
'use client';
import { useActionState } from 'react';
import { createUser } from './actions';

export function UserForm() {
  const [state, formAction, isPending] = useActionState(createUser, null);
  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>Submit</button>
      {state?.errors?.name && <p>{state.errors.name}</p>}
    </form>
  );
}
```

---

## Data Fetching & Caching (Next.js 15)

```tsx
// Next.js 15 caching defaults
const dynamic = await fetch(url); // 15 default: NO CACHE
const static = await fetch(url, { cache: 'force-cache' }); // Static
const isr = await fetch(url, { next: { revalidate: 3600 } }); // Revalidate every hour
const tagged = await fetch(url, { next: { tags: ['user-1'] } }); // On-demand via revalidateTag()

// DB calls without fetch
import { unstable_cache } from 'next/cache';
const getCachedUser = unstable_cache(
  async id => db.user.findUnique({ where: { id } }),
  ['user-cache-key'],
  { revalidate: 60, tags: ['users'] },
);
```

### Waterfall Elimination

```tsx
// ✅ Parallel Fetching:
const [user, posts] = await Promise.all([getUser(), getPosts()]);

// ✅ Streaming (PPR-compatible):
export default function Page() {
  return (
    <main>
      <FastNav />
      {/* Page shell loads instantly, SlowChart streams in when ready */}
      <Suspense fallback={<Skeleton />}>
        <SlowChart />
      </Suspense>
    </main>
  );
}
```

---

## Partial Prerendering (PPR)

PPR static-generates the route shell and streams dynamic parts.

```tsx
// next.config.ts
export default { experimental: { ppr: true } };

// Any component reading cookies/headers inside a Suspense boundary becomes a dynamic hole
import { cookies } from 'next/headers';

async function Cart() {
  const c = await cookies(); // Next.js 15 cookies are async!
  const cartId = c.get('cartId');
}

export default function Page() {
  return (
    <div>
      <StaticHeader /> {/* Cached at build time on CDN */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart /> {/* Dynamic, streamed at request time */}
      </Suspense>
    </div>
  );
}
```

---

## Middleware

```typescript
// middleware.ts (Root of project)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token');
  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'], // Strict matcher is critical for performance
};
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies | Wrap effects with explicit deps and isolate reactive derivations in useMemo |
| **Accessibility Neglect** | Interactive <div> without role="button", tabIndex, or onKeyDown | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash** | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Are all component props strictly typed with zero implicit "any"?
✅ Are responsive breakpoints, fluid typography, and optical balance verified?
✅ Is accessibility (ARIA labels, keyboard focus, contrast) validated?
✅ Are re-renders minimized and state lifecycles cleanly separated?
✅ Did I verify all imported UI components and icon sets actually exist?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
