---
name: nextjs-react-expert
description: Next.js 15+ App Router mastery. Server Components, Server Actions, PPR, caching, metadata, middleware, parallel/intercepting routes. Use when building Next.js apps or optimizing Next.js performance.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-3-1-pro, claude-3-7-sonnet
---

# Next.js 15+ App Router — Dense Reference

## Hallucination Traps (Read First)
- ❌ `pages/api/` or `_app.tsx` → ✅ App Router only: `app/api/route.ts`, `app/layout.tsx`
- ❌ `getServerSideProps` → ✅ `async function Page()` fetches directly
- ❌ `next/router` → ✅ `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`)
- ❌ Server Action without `"use server"` → ✅ Required at top of file or top of function
- ❌ Fetch is cached by default → ✅ **Next.js 15 changed this**: `fetch()` is UNCACHED by default
- ❌ `cookies()` at top of page → ✅ Opts entire route into dynamic rendering, breaking PPR. Wrap inside `<Suspense>`
- ❌ Passing functions as props Server → Client → ✅ Illegal. Use Server Actions instead.
- ❌ Plain `Response` in route handler → ✅ Use `NextResponse.json()`

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
    <ClientSidebar> {/* "use client" */}
      <ServerStats /> {/* Server: zero JS bundle, fetches DB */}
    </ClientSidebar>
  );
}
```

---

## Server Actions (Mutations)

```tsx
"use server"
import { revalidatePath } from "next/cache";
import { z } from "zod";

const Schema = z.object({ name: z.string().min(2) });

export async function createUser(prevState: any, formData: FormData) {
  // ❌ TRAP: ALWAYS validate formData. Never trust client input.
  const parsed = Schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  
  await db.user.create({ data: parsed.data });
  revalidatePath("/users"); // Clears cache so next render shows new user
  return { success: true };
}
```

Client usage (React 19):
```tsx
"use client"
import { useActionState } from "react";
import { createUser } from "./actions";

export function UserForm() {
  const [state, formAction, isPending] = useActionState(createUser, null);
  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>Submit</button>
      {state?.errors?.name && <p>{state.errors.name}</p>}
    </form>
  )
}
```

---

## Data Fetching & Caching (Next.js 15)

```tsx
// Next.js 15 caching defaults
const dynamic = await fetch(url);                                  // 15 default: NO CACHE
const static = await fetch(url, { cache: "force-cache" });         // Static
const isr = await fetch(url, { next: { revalidate: 3600 } });      // Revalidate every hour
const tagged = await fetch(url, { next: { tags: ["user-1"] } });   // On-demand via revalidateTag()

// DB calls without fetch
import { unstable_cache } from "next/cache";
const getCachedUser = unstable_cache(
  async (id) => db.user.findUnique({ where: { id } }),
  ["user-cache-key"],
  { revalidate: 60, tags: ["users"] }
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
import { cookies } from "next/headers";

async function Cart() {
  const c = await cookies(); // Next.js 15 cookies are async!
  const cartId = c.get("cartId");
}

export default function Page() {
  return (
    <div>
      <StaticHeader /> {/* Cached at build time on CDN */}
      <Suspense fallback={<CartSkeleton />}>
        <Cart /> {/* Dynamic, streamed at request time */}
      </Suspense>
    </div>
  )
}
```

---

## Middleware

```typescript
// middleware.ts (Root of project)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth-token");
  if (!token && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"], // Strict matcher is critical for performance
};
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
