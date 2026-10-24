# React 19 & Server Component Architecture Reference

> **Authority**: React Official Documentation (`https://react.dev/`) & Next.js 15 App Router  
> **Applicable Domains**: Frontend Architecture, React 19, Next.js  
> **Status**: Verified Production Specification  

---

## 1. Server Components vs. Client Components

In React 19 and modern frameworks, components are **Server Components by default**.

| Dimension | Server Components (Default) | Client Components (`'use client'`) |
|:---|:---|:---|
| **Execution** | Server only (zero client bundle JS) | Server (prerender) + Client (hydration) |
| **Data Access** | Direct access to database, secrets, internal APIs | Browser fetch calls via API routes or Server Actions |
| **Interactivity** | No event handlers (`onClick`), no hooks (`useState`) | Full DOM events, state, hooks, browser APIs (`window`) |
| **Directives** | None needed (implicit) | Must start with `'use client'` at the very top of file |

### Composition Rule:
Pass Server Components as `children` into Client Components. Never import a Server Component directly into a Client Component module!

```tsx
// ✅ Correct composition pattern
'use client';
export function ModalShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return isOpen ? <div className="modal">{children}</div> : null;
}
```

---

## 2. React 19 Server Actions & `useActionState`

Server Actions are asynchronous functions marked with `'use server'` that execute on the server and can be invoked from client forms or event handlers.

### Action Contract with `useActionState`:
```tsx
'use client';

import { useActionState } from 'react';
import { updateProfile } from '@/actions/profile';

type ActionState = { error?: string; success?: boolean };

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateProfile,
    { success: false }
  );

  return (
    <form action={formAction}>
      <input name="username" required disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Update Profile'}
      </button>
      {state.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

---

## 3. Hydration Invariants

Hydration errors occur when the initial HTML rendered by the server diverges from the first render pass on the client.
- ❌ **Forbidden**: Using browser-only values in initial component state (`window.innerWidth`, `localStorage.getItem()`, non-deterministic `new Date()` without formatting).
- ✅ **Required**: Defer client-only checks to `useEffect` or wrap them in `<Suspense>` with explicit fallback skeletons.
