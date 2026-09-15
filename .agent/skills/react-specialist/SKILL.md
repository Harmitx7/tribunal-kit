---
name: react-specialist
description: Use when React 19+ specialist. use(), useActionState, useOptimistic, React Compiler, Server/Client Components, Zustand/Jotai, React Query. Use when building components, managing state, optimizing renders.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - nextjs-react-expert
  - react-doctor
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# React 19+ — Dense Reference

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `react-specialist` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when React 19+ specialist. use(), useActionState, useOptimistic, React Compiler, Server/Client Components, Zustand/Jotai, React Query. Use when building components, managing state, optimizing renders.
- **DO NOT activate when:** The task falls outside the `react-specialist` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---

## 2026 React 19 Performance & Architecture Invariants

1. **Direct `ref` as a Prop**: Never use `forwardRef`. In React 19, `ref` is passed directly as a standard component prop.
2. **Server Actions & `useActionState`**: Prefer native form actions and `useActionState` over manual `onSubmit` event handlers with `preventDefault()`.
3. **Optimistic Updates**: Use `useOptimistic` for instant local feedback before network requests settle.
4. **Transition-Aware State Updates**: Wrap non-urgent state updates in `startTransition` to keep main thread interactions responsive.
5. **No Context Provider Wrapper Boilerplate**: In React 19, `<ThemeContext value={theme}>` replaces `<ThemeContext.Provider value={theme}>`.

## Hallucination Traps (Read First)

- ❌ `forwardRef((props, ref) => ...)` → ✅ In React 19, accept `ref` directly as a component prop
- ❌ `<ThemeContext.Provider value={...}>` → ✅ In React 19, use `<ThemeContext value={...}>`
- ❌ `useFormState()` → ✅ `useActionState()` (stable API)
- ❌ `useContext()` inside `if` conditionals → ✅ `use(Context)` CAN be called conditionally
- ❌ Manual `useMemo`/`useCallback` everywhere → ✅ Let React Compiler handle memoization automatically
- ❌ Destructuring whole store `const { user } = useStore()` → ✅ Granular selector `useStore(s => s.user)`
- ❌ `next/router` → ✅ `next/navigation` in App Router

---

## React 19 Core APIs

### `use()` — Replaces many useEffect patterns

```tsx
import { use } from 'react';
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
import { useActionState } from 'react'; // NOT useFormState

async function submitForm(prevState: FormState, formData: FormData) {
  const email = formData.get('email') as string;
  if (!email.includes('@')) return { error: 'Invalid email' };
  await saveToDatabase(email);
  return { error: null, success: true };
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState(submitForm, { error: null });
  return (
    <form action={formAction}>
      <input name="email" disabled={isPending} />
      {state.error && <p>{state.error}</p>}
      <button disabled={isPending}>{isPending ? 'Saving...' : 'Submit'}</button>
    </form>
  );
}
```

### `useOptimistic` — Instant UI feedback

```tsx
import { useOptimistic } from 'react';
function TodoList({ todos }: { todos: Todo[] }) {
  const [optimistic, addOptimistic] = useOptimistic(todos, (current, newTodo: Todo) => [
    ...current,
    newTodo,
  ]);
  async function handleAdd(formData: FormData) {
    addOptimistic({ id: crypto.randomUUID(), title: formData.get('title'), pending: true });
    await saveTodo(formData.get('title') as string);
  }
  return (
    <form action={handleAdd}>
      {optimistic.map(t => (
        <li key={t.id} style={{ opacity: t.pending ? 0.5 : 1 }}>
          {t.title}
        </li>
      ))}
    </form>
  );
}
```

### `useFormStatus` — Button pending state (must be INSIDE `<form>`)

```tsx
import { useFormStatus } from 'react-dom';
// ❌ TRAP: Cannot be called in the same component as <form>
function SubmitButton() {
  const { pending } = useFormStatus(); // reads nearest parent form
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
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
return (
  <div style={{ opacity: isStale ? 0.6 : 1 }}>
    <ExpensiveList query={deferredQuery} />
  </div>
);
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
  return (
    <TabsContext value={{ active, setActive }}>
      <div>{children}</div>
    </TabsContext>
  );
}
function Tab({ id, children }: { id: string; children: ReactNode }) {
  const ctx = use(TabsContext)!;
  return (
    <button onClick={() => ctx.setActive(id)} aria-selected={ctx.active === id}>
      {children}
    </button>
  );
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
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const useStore = create<Store>()(
  persist(
    (set, get) => ({
      count: 0,
      increment: () => set(s => ({ count: s.count + 1 })),
      getDoubled: () => get().count * 2,
    }),
    { name: 'my-store' },
  ),
);
// ❌ TRAP: Do NOT destructure the whole store — causes re-render on every change
// ✅ const count = useStore(s => s.count); // selector
```

### Jotai (preferred for derived/atomic state)

```tsx
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
const countAtom = atom(0);
const doubledAtom = atom(get => get(countAtom) * 2); // derived atom
// ❌ TRAP: atomWithStorage is from jotai/utils — NOT from jotai
import { atomWithStorage } from 'jotai/utils';
```

### React Query / TanStack Query

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
const { data, isPending, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // don't refetch for 5 minutes
});
// Optimistic update:
const qc = useQueryClient();
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async newUser => {
    await qc.cancelQueries({ queryKey: ['user', newUser.id] });
    const prev = qc.getQueryData(['user', newUser.id]);
    qc.setQueryData(['user', newUser.id], newUser);
    return { prev };
  },
  onError: (_, __, ctx) => qc.setQueryData(['user'], ctx?.prev),
  onSettled: () => qc.invalidateQueries({ queryKey: ['user'] }),
});
```

---

## Performance

| Technique                              | When                                       |
| -------------------------------------- | ------------------------------------------ |
| `useDeferredValue`                     | Expensive derived render (charts, filters) |
| `useTransition`                        | Page nav, tab switches, data load          |
| `lazy()` + `Suspense`                  | Code-split heavy components                |
| `<Virtuoso>` / `<WindowVirtualizer>`   | Lists > 200 items                          |
| Avoid `useEffect` for state transforms | Use `useMemo` or derived atoms             |

---

## Refs & DOM

```tsx
// React 19: ref is now a prop (no forwardRef needed)
function Input({ ref, ...props }: ComponentProps<'input'> & { ref?: Ref<HTMLInputElement> }) {
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

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                    | What AI Commonly Does Wrong                                        | What Is Actually Correct                                                      |
| :------------------------------ | :----------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **Uncontrolled Re-render Loop** | Mutating state inside render bodies or omitting hook dependencies  | Wrap effects with explicit deps and isolate reactive derivations in useMemo   |
| **Accessibility Neglect**       | Interactive <div> without role="button", tabIndex, or onKeyDown    | Use semantic <button> or provide ARIA role, keyboard handlers, and focus ring |
| **Layout Shift Flash**          | Images/dynamic content without aspect-ratio or explicit dimensions | Enforce aspect-ratio or skeleton placeholders to guarantee zero CLS           |

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
