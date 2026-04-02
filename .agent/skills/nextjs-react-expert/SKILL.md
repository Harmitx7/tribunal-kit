---
name: nextjs-react-expert
description: Next.js 15+ App Router mastery. Server Components, Server Actions, Streaming SSR, Partial Prerendering (PPR), route handlers, middleware, caching/revalidation, generateMetadata, parallel routes, intercepting routes, and AI streaming UI. Use when building Next.js applications, optimizing performance, eliminating waterfalls, or implementing App Router patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Next.js 15+ App Router — Pro-Max Patterns

> The fastest code is code that doesn't run on the client.
> The second fastest is code that runs on the edge and streams the result.
> If you're using `getServerSideProps`, `getStaticProps`, or the Pages Router — you're writing legacy.

---

## Paradigm Shifts (Next.js 14 → 15+)

| Legacy (Pages Router / Next 14) | Modern (App Router / Next 15+) |
|---|---|
| `getServerSideProps` / `getStaticProps` | **Server Components** fetch directly |
| Manual `useMemo()` / `useCallback()` | **React Compiler** handles memoization |
| Client-side form handling | **Server Actions** native mutations |
| Loading spinners on client | **Streaming UI** + `<Suspense>` boundaries |
| Static *or* Dynamic pages | **Partial Prerendering (PPR)** — both in one route |
| `next/router` (`useRouter`) | `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) |

---

## App Router File Conventions

```
app/
├── layout.tsx          ← Root layout (wraps ALL routes)
├── page.tsx            ← Home page (/)
├── loading.tsx         ← Automatic <Suspense> fallback for the route
├── error.tsx           ← Error boundary for the route
├── not-found.tsx       ← 404 page
├── global-error.tsx    ← Root error boundary (wraps layout)
│
├── dashboard/
│   ├── layout.tsx      ← Dashboard layout (persists across sub-routes)
│   ├── page.tsx        ← /dashboard
│   ├── loading.tsx     ← Dashboard loading state
│   ├── error.tsx       ← Dashboard error boundary
│   │
│   ├── settings/
│   │   └── page.tsx    ← /dashboard/settings
│   │
│   └── [userId]/       ← Dynamic segment
│       └── page.tsx    ← /dashboard/abc123
│
├── api/
│   └── users/
│       └── route.ts    ← API Route Handler (GET, POST, etc.)
│
├── @modal/             ← Parallel route (named slot)
│   └── login/
│       └── page.tsx    ← Rendered in parallel with main content
│
└── (marketing)/        ← Route group (no URL impact — for layout organization)
    ├── layout.tsx      ← Layout ONLY for marketing pages
    ├── about/
    │   └── page.tsx    ← /about (NOT /marketing/about)
    └── pricing/
        └── page.tsx    ← /pricing
```

```tsx
// ❌ HALLUCINATION TRAP: These Pages Router files DO NOT EXIST in App Router
// _app.tsx → use app/layout.tsx
// _document.tsx → use app/layout.tsx with <html> and <body>
// pages/api/ → use app/api/route.ts
// getServerSideProps → fetch directly in Server Components
// getStaticProps → fetch at build time or use generateStaticParams
```

---

## Server vs Client Components

### The Decision

```
Default: Server Component (Zero JS sent to client)
Switch to Client ('use client') ONLY when:
  ✓ Uses browser APIs (window, localStorage, navigator, IntersectionObserver)
  ✓ Needs DOM event handlers (onClick, onChange, onSubmit)
  ✓ Needs state/effects (useState, useEffect, useRef for DOM)
  ✓ Needs Framer Motion, GSAP, or client-side animation libraries

Everything else stays on the server.
```

### The Interleaving Pattern

```tsx
// ✅ CORRECT: Keep the shell on the server, pass server content INTO client
// app/dashboard/page.tsx (Server Component)
import { ClientSidebar } from "./ClientSidebar";
import { ServerStats } from "./ServerStats"; // fetches DB directly

export default async function DashboardPage() {
  const stats = await getStats(); // no API call needed — direct DB

  return (
    <div className="flex">
      <ClientSidebar> {/* client: has onClick, state */}
        <ServerStats data={stats} /> {/* server: zero JS, renders HTML */}
      </ClientSidebar>
    </div>
  );
}

// ❌ WRONG: Making the entire page "use client" because one button needs onClick
// This ships ALL the JS to the client — defeats the purpose of RSC
```

### Serialization Boundary

```tsx
// Only serializable data can cross the server→client boundary
// ✅ Can pass: strings, numbers, booleans, arrays, plain objects, Date, Map, Set
// ❌ Cannot pass: functions, class instances, DOM nodes, Symbols

// ❌ BAD: Passing a function from server to client
<ClientButton onClick={() => deleteItem(id)} /> // functions aren't serializable

// ✅ GOOD: Use a Server Action instead
<ClientButton deleteAction={deleteItemAction} itemId={id} />

// In ClientButton:
"use client";
function ClientButton({ deleteAction, itemId }) {
  return <button onClick={() => deleteAction(itemId)}>Delete</button>;
}
```

---

## Server Actions

```tsx
// Server Actions are async functions that run on the server
// They can be called from client or server components

// ✅ Inline Server Action (defined in a Server Component)
export default function Page() {
  async function createUser(formData: FormData) {
    "use server"; // marks this function as a Server Action

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    await db.user.create({ data: { name, email } });
    revalidatePath("/users"); // bust cache for /users
    redirect("/users");       // redirect after mutation
  }

  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Separate Action File

```tsx
// app/actions/user.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createUser(prevState: any, formData: FormData) {
  const parsed = UserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db.user.create({ data: parsed.data });
  } catch (e) {
    return { errors: { _form: ["Failed to create user"] } };
  }

  revalidatePath("/users");
  redirect("/users");
}

// ❌ HALLUCINATION TRAP: Server Actions MUST be in a file with "use server"
// at the top, OR defined inline with "use server" inside the function body.
// They CANNOT be imported from a regular module.

// ❌ HALLUCINATION TRAP: Always validate input in Server Actions.
// FormData comes from the client — it's user input. Never trust it.
```

---

## Data Fetching & Caching

### Fetching in Server Components

```tsx
// Server Components can fetch data directly — no useEffect, no API route
export default async function UsersPage() {
  const users = await db.user.findMany(); // direct DB call
  // OR
  const res = await fetch("https://api.example.com/users", {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });
  const users = await res.json();

  return <UserList users={users} />;
}
```

### Caching Strategies

```tsx
// 1. Static (cached forever until revalidated)
const data = await fetch(url); // default: cached

// 2. ISR (Incremental Static Regeneration)
const data = await fetch(url, {
  next: { revalidate: 60 }, // revalidate every 60 seconds
});

// 3. Dynamic (never cached)
const data = await fetch(url, { cache: "no-store" });

// 4. On-demand revalidation (Server Actions / Webhooks)
import { revalidatePath, revalidateTag } from "next/cache";

// Revalidate a specific path
revalidatePath("/dashboard");

// Revalidate by tag
const data = await fetch(url, { next: { tags: ["users"] } });
// Later, in a Server Action:
revalidateTag("users"); // busts all fetches tagged "users"

// ❌ HALLUCINATION TRAP: Next.js 15 changed the default caching behavior
// In Next.js 14: fetch was cached by default
// In Next.js 15: fetch is NOT cached by default (dynamic by default)
// You must explicitly opt into caching with next.revalidate or cache: "force-cache"
```

### `unstable_cache` for Non-Fetch Data

```tsx
import { unstable_cache } from "next/cache";

// Cache database queries that don't use fetch()
const getCachedUser = unstable_cache(
  async (userId: string) => {
    return await db.user.findUnique({ where: { id: userId } });
  },
  ["user-by-id"],          // cache key parts
  {
    revalidate: 3600,       // 1 hour
    tags: ["user"],         // for on-demand revalidation
  }
);

// Usage:
const user = await getCachedUser("abc123");
```

---

## Waterfall Elimination

### The Problem

```tsx
// ❌ CRITICAL WATERFALL: Each await blocks the next
async function Dashboard() {
  const user = await getUser();           // 200ms
  const posts = await getPosts();         // 200ms (waits for user)
  const analytics = await getAnalytics(); // 200ms (waits for posts)
  // Total: 600ms sequential
}
```

### Fix 1: Parallel Fetching

```tsx
// ✅ All three start simultaneously
async function Dashboard() {
  const [user, posts, analytics] = await Promise.all([
    getUser(),
    getPosts(),
    getAnalytics(),
  ]);
  // Total: ~200ms (time of slowest call)
}
```

### Fix 2: Streaming with Suspense (Pro-Max)

```tsx
// 🚀 Show fast content immediately, stream slow content later
export default function Dashboard() {
  return (
    <main>
      <FastHeader />  {/* renders instantly — static */}

      <Suspense fallback={<StatsSkeleton />}>
        <SlowStatsPanel />  {/* streams when DB resolves */}
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <VerySlowChart />   {/* streams when API resolves */}
      </Suspense>
    </main>
  );
}

// Each Suspense boundary independently streams its content
// The user sees the page progressively — not a blank screen
```

---

## Partial Prerendering (PPR)

```tsx
// next.config.ts
export default {
  experimental: {
    ppr: true, // Enable Partial Prerendering
  },
};

// PPR = Static shell (edge-cached) + Dynamic holes (streamed)
// The static parts are served from CDN at edge speed
// Dynamic parts stream in from the server

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <main>
      {/* 🟢 STATIC — pre-rendered at build time, served from CDN */}
      <Header />
      <ProductDetails id={params.id} />

      {/* 🔴 DYNAMIC — streamed on request (requires cookies/headers) */}
      <Suspense fallback={<CartSkeleton />}>
        <PersonalizedCart />  {/* reads cookies() — dynamic */}
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <LiveReviews />       {/* real-time data — dynamic */}
      </Suspense>
    </main>
  );
}

// ❌ HALLUCINATION TRAP: Using cookies(), headers(), or searchParams at the
// top level of a component tree forces the ENTIRE route to be dynamic.
// Isolate dynamic data inside Suspense boundaries for PPR to work.
```

---

## Metadata & SEO

### `generateMetadata` (Dynamic)

```tsx
import { Metadata } from "next";

// Static metadata
export const metadata: Metadata = {
  title: "My App",
  description: "The best app ever",
  openGraph: { title: "My App", description: "...", images: ["/og.png"] },
};

// Dynamic metadata (based on params/data)
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
    },
    alternates: {
      canonical: `https://example.com/blog/${params.slug}`,
    },
  };
}

// ❌ HALLUCINATION TRAP: generateMetadata is an async function exported
// from page.tsx or layout.tsx — NOT a React component.
// It runs on the server during rendering.
```

### `generateStaticParams` (Static Generation)

```tsx
// Pre-generate pages at build time (SSG)
export async function generateStaticParams() {
  const posts = await getAllPosts();

  return posts.map((post) => ({
    slug: post.slug, // matches [slug] dynamic segment
  }));
}

// Combined with dynamicParams:
export const dynamicParams = false; // 404 for unknown slugs
// OR
export const dynamicParams = true;  // generate on-demand (default)
```

---

## Route Handlers (API Routes)

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get("page") ?? "1";

  const users = await db.user.findMany({
    skip: (parseInt(page) - 1) * 20,
    take: 20,
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Always validate input
  const parsed = UserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const user = await db.user.create({ data: parsed.data });
  return NextResponse.json(user, { status: 201 });
}

// Dynamic route: app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

// ❌ HALLUCINATION TRAP: Route handlers use named exports (GET, POST, PUT, DELETE)
// NOT default export. NOT export function handler().
// ❌ HALLUCINATION TRAP: Route handlers are in route.ts, NOT in page.tsx
// A directory cannot have both page.tsx and route.ts
```

---

## Middleware

```tsx
// middleware.ts (in project ROOT, not inside app/)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  return response;
}

// Matcher: only run middleware on specific routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    // Skip static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

// ❌ HALLUCINATION TRAP: middleware.ts must be at the project ROOT
// (same level as app/ directory), NOT inside app/
// ❌ HALLUCINATION TRAP: Middleware runs on the Edge Runtime
// You CANNOT use Node.js APIs (fs, crypto.createHash, etc.)
// Use Web APIs (crypto.subtle, fetch, Response, Headers)
```

---

## Parallel & Intercepting Routes

### Parallel Routes (Named Slots)

```
app/
├── layout.tsx
├── page.tsx
├── @analytics/
│   └── page.tsx        ← Rendered in parallel with main page
└── @notifications/
    └── page.tsx        ← Also rendered in parallel
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  notifications: React.ReactNode;
}) {
  return (
    <div>
      <main>{children}</main>
      <aside>{analytics}</aside>
      <div>{notifications}</div>
    </div>
  );
}
```

### Intercepting Routes (Modal Pattern)

```
app/
├── feed/
│   └── page.tsx          ← /feed (shows feed)
├── photo/[id]/
│   └── page.tsx          ← /photo/123 (full photo page)
└── @modal/
    └── (..)photo/[id]/
        └── page.tsx      ← Intercepts /photo/123 when navigating from /feed
                            Shows as modal overlay instead of full page
```

```
Intercepting conventions:
(.)  — same level
(..) — one level up
(..)(..) — two levels up
(...) — from root
```

---

## AI & Streaming UI

```tsx
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// app/api/chat/route.ts
export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
  });

  return result.toDataStreamResponse();
}

// Client component:
"use client";
import { useChat } from "@ai-sdk/react";

function ChatUI() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? "user" : "ai"}>
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

// ❌ HALLUCINATION TRAP: Import from "@ai-sdk/react", NOT "ai/react"
// The package was restructured in Vercel AI SDK 4+
```

---

## Bundle Optimization

```tsx
// 1. Push "use client" as FAR DOWN as possible
// ❌ BAD: "use client" on layout.tsx (ships entire layout as JS)
// ✅ GOOD: "use client" only on the interactive widget component

// 2. Dynamic imports for heavy client deps
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  ssr: false,                     // skip server rendering
  loading: () => <ChartSkeleton />,
});

// 3. next/image for automatic optimization
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={630}
  priority        // preload for LCP images
  placeholder="blur"
  blurDataURL={blurUrl}
/>

// 4. next/font for zero-layout-shift fonts
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// In layout.tsx:
<html className={inter.variable}>
  <body>{children}</body>
</html>

// ❌ HALLUCINATION TRAP: next/font automatically self-hosts fonts
// Do NOT add Google Fonts <link> tags in <head> — they cause CLS
```

---

## Key Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| `getServerSideProps` in App Router | Pages Router API — doesn't exist | Fetch directly in Server Components |
| `"use client"` on layout/page | Ships massive JS bundle | Push `"use client"` to leaf components |
| `useEffect(() => fetch(...))` | Client waterfall, no cache, CLS | Server Component or React Query |
| Sequential `await` calls | Network waterfall | `Promise.all()` or `<Suspense>` |
| `cookies()`/`headers()` at top level | Disables PPR for entire route | Isolate inside `<Suspense>` boundaries |
| `next/router` (Pages Router) | Wrong import | Use `next/navigation` |
| Missing `loading.tsx` | Blank screen during navigation | Add loading.tsx or Suspense |
| Raw `<img>` and `<a>` tags | No optimization | Use `next/image` and `next/link` |

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ Next.js Expert Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       Next.js React Expert
Next.js Ver: 15+
Scope:       [N files · N routes]
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

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when generating Next.js code. These are strictly forbidden:

1. **Pages Router in App Router:** Never generate `getServerSideProps`, `getStaticProps`, `getInitialProps`, `_app.tsx`, `_document.tsx`, or `pages/api/` in an App Router project.
2. **`"use client"` Everywhere:** Marking layouts, pages, or entire feature modules as client components defeats RSC. Push the `"use client"` boundary as deep as possible.
3. **`next/router` Import:** The Pages Router `useRouter` is `next/router`. App Router uses `next/navigation`. Using the wrong one causes runtime errors.
4. **Missing Input Validation in Server Actions:** Server Actions receive raw `FormData` from the client. Always validate with Zod or similar before touching the database.
5. **`useEffect` for Data Fetching:** Server Components can fetch directly. Client components should use React Query or SWR. `useEffect` fetch has no caching, no deduplication, no error boundaries.
6. **Forgetting Next.js 15 Cache Changes:** In Next.js 15, `fetch()` is NOT cached by default (changed from 14). You must explicitly opt into caching.
7. **Google Fonts `<link>` Tags:** Never add external font `<link>` tags. Use `next/font` for zero-CLS, self-hosted fonts.
8. **Route Handler Default Exports:** Route handlers use named exports (`GET`, `POST`, `DELETE`), not `export default function handler`.
9. **Middleware Inside `app/`:** `middleware.ts` must be at the project root, not inside the `app/` directory.
10. **`"ai/react"` Import Path:** The Vercel AI SDK restructured its exports. Use `@ai-sdk/react` for hooks and `ai` for core.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-frontend`**
**Active reviewers: `logic` · `security` · `frontend` · `type-safety`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or displaying error boundaries.
3. **Context Amnesia:** Forgetting whether the project uses Pages Router or App Router.
4. **Generic Design:** Do not default to black/white Vercel aesthetics unless instructed.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I maximize Server Component usage and isolate "use client"?
✅ Are there sequential awaits creating a waterfall? Did I use Promise.all or Suspense?
✅ Did I validate all Server Action inputs with Zod?
✅ Did I use next/image and next/link (not raw <img> and <a>)?
✅ Did I implement loading.tsx and error.tsx for route segments?
✅ Did I use next/font (not external font <link> tags)?
✅ Did I use next/navigation (not next/router)?
✅ Are dynamic data reads (cookies, headers) inside Suspense for PPR?
✅ Did I add generateMetadata for SEO?
✅ Is middleware.ts at the project root (not inside app/)?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Assuming a Next.js route "works" because the dev server shows no errors.
- ✅ **Required:** You are explicitly forbidden from completing your task without providing **concrete evidence** (successful `next build`, passing tests, or equivalent proof) that the code compiles and runs correctly.
