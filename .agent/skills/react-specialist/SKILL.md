---
name: react-specialist
description: React 19+ specialist. use(), useActionState, useOptimistic, React Compiler, Server/Client Components, Zustand/Jotai, React Query. Use when building components, managing state, optimizing renders.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
---

# React 19+ — Dense Reference

## Hallucination Traps (Read First)
- ❌ `useFormState` → ✅ `useActionState` (stable name)
- ❌ `useContext()` in conditionals → ✅ `use(Context)` CAN be conditional
- ❌ `useMemo/useCallback/React.memo` in React 19+ projects → ✅ React Compiler handles this
- ❌ `exitBeforeEnter` (Framer) → ✅ `mode="wait"` on `<AnimatePresence>`
- ❌ `next/router` → ✅ `next/navigation` in App Router
- ❌ Server Components using `useState/useEffect` → must be `"use client"`

---

## React 19 Core APIs

### `use()` — Replaces many useEffect patterns
```tsx
import { use } from "react";
// Reads promises (suspends until resolved)
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends
  return <h1>{user.name}</h1>;
}
// Reads context — CAN be called conditionally (unlike useContext)
function Admin({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) return <Panel theme={use(ThemeContext)} />;
  return <PublicPanel />;
}
```

### `useActionState` — Form actions with state
```tsx
import { useActionState } from "react"; // NOT useFormState

async function submitForm(prevState: FormState, formData: FormData) {
  const email = formData.get("email") as string;
  if (!email.includes("@")) return { error: "Invalid email" };
  await saveToDatabase(email);
  return { error: null, success: true };
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState(submitForm, { error: null });
  return (
    <form action={formAction}>
      <input name="email" disabled={isPending} />
      {state.error && <p>{state.error}</p>}
      <button disabled={isPending}>{isPending ? "Saving..." : "Submit"}</button>
    </form>
  );
}
```

### `useOptimistic` — Instant UI feedback
```tsx
import { useOptimistic } from "react";
function TodoList({ todos }: { todos: Todo[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    todos,
    (current, newTodo: Todo) => [...current, newTodo]
  );
  async function handleAdd(formData: FormData) {
    addOptimistic({ id: crypto.randomUUID(), title: formData.get("title"), pending: true });
    await saveTodo(formData.get("title") as string);
  }
  return (
    <form action={handleAdd}>
      {optimistic.map(t => <li key={t.id} style={{ opacity: t.pending ? 0.5 : 1 }}>{t.title}</li>)}
    </form>
  );
}
```

### `useFormStatus` — Button pending state (must be INSIDE `<form>`)
```tsx
import { useFormStatus } from "react-dom";
// ❌ TRAP: Cannot be called in the same component as <form>
function SubmitButton() {
  const { pending } = useFormStatus(); // reads nearest parent form
  return <button disabled={pending}>{pending ? "Saving..." : "Save"}</button>;
}
```

### `useTransition` — Non-blocking updates (React 19: supports async)
```tsx
const [isPending, startTransition] = useTransition();
startTransition(async () => {
  const data = await search(query); // async supported in React 19 only
  setResults(data);
});
```

### `useDeferredValue` — Stale-while-rerender
```tsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;
return <div style={{ opacity: isStale ? 0.6 : 1 }}><ExpensiveList query={deferredQuery} /></div>;
// React 19: useDeferredValue(value, initialFallback) — 2-arg form
```

---

## React Compiler (React 19)
- Auto-memoizes components/values/callbacks. **Don't manually memoize in React 19 projects.**
- ❌ `useMemo(() => calc(a), [a])` / `useCallback(fn, [id])` / `React.memo(Comp)` — legacy
- ✅ Write plain functions/values. Compiler optimizes automatically.
- Exception: still use manual memo if compiler is explicitly disabled in config.

---

## Component Patterns

### Compound Components (shared state via context)
```tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);
function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [active, setActive] = useState(defaultTab);
  return <TabsContext value={{ active, setActive }}><div>{children}</div></TabsContext>;
}
function Tab({ id, children }: { id: string; children: ReactNode }) {
  const ctx = use(TabsContext)!;
  return <button onClick={() => ctx.setActive(id)} aria-selected={ctx.active === id}>{children}</button>;
}
```

### Render Props / Higher Order Hooks
Prefer custom hooks over render props for modern React.

### Context Performance Pattern
```tsx
// Split context — prevents all consumers from re-rendering on every change
const CountStateCtx = createContext<number>(0);
const CountDispatchCtx = createContext<Dispatch<Action>>(() => {});
```

---

## State Management

### Zustand (preferred for global state)
```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";
const useStore = create<Store>()(
  persist(
    (set, get) => ({
      count: 0,
      increment: () => set(s => ({ count: s.count + 1 })),
      getDoubled: () => get().count * 2,
    }),
    { name: "my-store" }
  )
);
// ❌ TRAP: Do NOT destructure the whole store — causes re-render on every change
// ✅ const count = useStore(s => s.count); // selector
```

### Jotai (preferred for derived/atomic state)
```tsx
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
const countAtom = atom(0);
const doubledAtom = atom(get => get(countAtom) * 2); // derived atom
// ❌ TRAP: atomWithStorage is from jotai/utils — NOT from jotai
import { atomWithStorage } from "jotai/utils";
```

### React Query / TanStack Query
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const { data, isPending, error } = useQuery({
  queryKey: ["user", userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // don't refetch for 5 minutes
});
// Optimistic update:
const qc = useQueryClient();
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (newUser) => {
    await qc.cancelQueries({ queryKey: ["user", newUser.id] });
    const prev = qc.getQueryData(["user", newUser.id]);
    qc.setQueryData(["user", newUser.id], newUser);
    return { prev };
  },
  onError: (_, __, ctx) => qc.setQueryData(["user"], ctx?.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: ["user"] }),
});
```

---

## Performance

| Technique | When |
|-----------|------|
| `useDeferredValue` | Expensive derived render (charts, filters) |
| `useTransition` | Page nav, tab switches, data load |
| `lazy()` + `Suspense` | Code-split heavy components |
| `<Virtuoso>` / `<WindowVirtualizer>` | Lists > 200 items |
| Avoid `useEffect` for state transforms | Use `useMemo` or derived atoms |

---

## Refs & DOM

```tsx
// React 19: ref is now a prop (no forwardRef needed)
function Input({ ref, ...props }: ComponentProps<"input"> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
// ❌ TRAP: forwardRef is deprecated in React 19 — still works but not needed
```

---

## Testing Checklist
- ✅ Use React Testing Library — test behavior, not implementation
- ✅ `userEvent` over `fireEvent` (async, closer to real interaction)
- ✅ Mock server calls with MSW (Mock Service Worker)
- ❌ Never test internal state, ref values, or component instances
