---
name: react-specialist
description: Senior React specialist (React 19+) focusing on advanced patterns, hooks mastery, React Compiler, Server Components, state management (Zustand/Jotai/React Query), performance optimization, and production architectures (Next.js/Remix). Use when building React components, optimizing renders, managing state, or implementing modern React 19 patterns.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-03-30
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# React Specialist — React 19+ Mastery

> React 19 is a paradigm shift. Server Components are the default. The React Compiler handles memoization. `use()` replaces `useEffect` data fetching. If you're still writing React 18 patterns, you're writing legacy code.

---

## React 19 Core API Changes

### The `use()` Hook

```tsx
// use() can read promises and context — replaces many useEffect patterns
import { use } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved
  return <h1>{user.name}</h1>;
}

// use() with context (replaces useContext — can be used conditionally)
function Theme({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    const theme = use(ThemeContext); // ✅ conditional context read
    return <AdminPanel theme={theme} />;
  }
  return <PublicPanel />;
}

// ❌ HALLUCINATION TRAP: use() is NOT useContext()
// useContext cannot be called inside conditionals or loops
// use() CAN be called inside conditionals (it's a new primitive)
```

### `useActionState` (Forms)

```tsx
import { useActionState } from "react";

async function submitForm(prevState: FormState, formData: FormData) {
  const email = formData.get("email") as string;

  if (!email.includes("@")) {
    return { error: "Invalid email", success: false };
  }

  await saveToDatabase(email);
  return { error: null, success: true };
}

function SignupForm() {
  const [state, formAction, isPending] = useActionState(submitForm, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      <input name="email" type="email" disabled={isPending} />
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Sign Up"}
      </button>
    </form>
  );
}

// ❌ HALLUCINATION TRAP: useActionState was briefly named useFormState
// in React canaries. The STABLE name is useActionState.
// ❌ HALLUCINATION TRAP: The signature is (action, initialState)
// The action receives (prevState, formData), NOT just formData
```

### `useOptimistic`

```tsx
import { useOptimistic } from "react";

function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo: Todo) => [...currentTodos, newTodo]
  );

  async function handleAdd(formData: FormData) {
    const title = formData.get("title") as string;
    const tempTodo = { id: crypto.randomUUID(), title, pending: true };

    addOptimisticTodo(tempTodo); // instantly updates UI

    await saveTodo(title); // actual API call
    // When server responds, `todos` prop updates and optimistic state resets
  }

  return (
    <div>
      <form action={handleAdd}>
        <input name="title" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### `useFormStatus`

```tsx
import { useFormStatus } from "react-dom";

// ❌ HALLUCINATION TRAP: useFormStatus must be called from a component
// INSIDE a <form> — it reads the nearest parent form's status.
// It does NOT work if called in the same component that renders the <form>.

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

// Usage:
function MyForm() {
  return (
    <form action={serverAction}>
      <input name="name" />
      <SubmitButton /> {/* useFormStatus works here — inside the form */}
    </form>
  );
}
```

### `useTransition` (Non-Blocking State Updates)

```tsx
import { useTransition } from "react";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value); // urgent — update input immediately

    startTransition(async () => {
      // non-urgent — React can interrupt this if user types again
      const data = await search(value);
      setResults(data);
    });
  }

  return (
    <div>
      <input value={query} onChange={handleSearch} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </div>
  );
}

// React 19: startTransition now supports async functions
// React 18: startTransition was synchronous only
```

### `useDeferredValue`

```tsx
import { useDeferredValue, memo } from "react";

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);

  // Shows stale results while the new ones compute
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <ExpensiveList query={deferredQuery} />
    </div>
  );
}

// Initial value support (React 19):
const value = useDeferredValue(fetchedData, initialFallback);
```

---

## The React Compiler

```tsx
// React 19 ships the React Compiler (formerly React Forget)
// It automatically memoizes components, values, and callbacks

// ❌ LEGACY — do NOT write this in React 19+
const memoizedValue = useMemo(() => expensiveCalc(a, b), [a, b]);
const memoizedFn = useCallback(() => handleClick(id), [id]);
const MemoizedComp = React.memo(MyComponent);

// ✅ REACT 19 — just write normal code
const value = expensiveCalc(a, b);
function handleClick() { /* ... */ }
function MyComponent() { /* ... */ }
// The compiler figures out what needs memoization automatically

// ❌ HALLUCINATION TRAP: Do NOT manually memoize in React 19+ projects
// The compiler is smarter than manual memoization and handles:
// - Component memoization (replaces React.memo)
// - Value memoization (replaces useMemo)
// - Callback memoization (replaces useCallback)
//
// EXCEPTION: If the React Compiler is explicitly disabled in the project
// config, then manual memoization is still appropriate.
```

### When Manual Memoization Is Still Valid

```tsx
// 1. React Compiler is disabled in project config
// 2. Working with React 18 (no compiler)
// 3. Library code that must support React 17/18/19
// 4. Performance-critical code where compiler output is insufficient
//    (measure first with React DevTools Profiler)

// Always add a comment explaining why:
// MANUAL_MEMO: React Compiler disabled in this project
const cached = useMemo(() => heavyComputation(data), [data]);
```

---

## Component Architecture Patterns

### Compound Components

```tsx
// Compound components share implicit state via context
const TabsContext = createContext<{
  activeTab: string;
  setActiveTab: (id: string) => void;
} | null>(null);

function Tabs({ children, defaultTab }: { children: ReactNode; defaultTab: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext>
  );
}

function TabList({ children }: { children: ReactNode }) {
  return <div role="tablist" className="tab-list">{children}</div>;
}

function Tab({ id, children }: { id: string; children: ReactNode }) {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error("Tab must be used inside <Tabs>");

  return (
    <button
      role="tab"
      aria-selected={ctx.activeTab === id}
      onClick={() => ctx.setActiveTab(id)}
    >
      {children}
    </button>
  );
}

function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error("TabPanel must be used inside <Tabs>");
  if (ctx.activeTab !== id) return null;

  return <div role="tabpanel">{children}</div>;
}

// Usage:
<Tabs defaultTab="settings">
  <TabList>
    <Tab id="profile">Profile</Tab>
    <Tab id="settings">Settings</Tab>
  </TabList>
  <TabPanel id="profile"><ProfileContent /></TabPanel>
  <TabPanel id="settings"><SettingsContent /></TabPanel>
</Tabs>

// ❌ HALLUCINATION TRAP: In React 19, context uses <Ctx value={}>
// NOT <Ctx.Provider value={}>. The .Provider pattern is deprecated.
```

### Custom Hooks (Composable Logic)

```tsx
// useFetch — reusable data fetching with loading/error states
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    return () => controller.abort(); // cleanup on unmount or URL change
  }, [url]);

  return { data, error, isLoading };
}

// ❌ HALLUCINATION TRAP: Always include AbortController cleanup
// Without it, state updates on unmounted components cause warnings
// and potential memory leaks in SPAs
```

### Error Boundaries

```tsx
// React 19 error boundaries — still class-based (no hook equivalent yet)
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Usage:
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Loading />}>
    <Dashboard />
  </Suspense>
</ErrorBoundary>

// ❌ HALLUCINATION TRAP: There is NO useErrorBoundary hook in React core.
// Error boundaries MUST be class components.
// react-error-boundary (npm package) provides a hook-based wrapper.
```

### Render Props & Slots

```tsx
// Render prop for flexible rendering
interface DataTableProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  renderHeader?: () => ReactNode;
  renderEmpty?: () => ReactNode;
}

function DataTable<T>({ data, renderRow, renderHeader, renderEmpty }: DataTableProps<T>) {
  if (data.length === 0) return renderEmpty?.() ?? <p>No data</p>;

  return (
    <table>
      {renderHeader && <thead>{renderHeader()}</thead>}
      <tbody>
        {data.map((item, i) => (
          <tr key={i}>{renderRow(item, i)}</tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## State Management Decision Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Type Decision Tree                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Is it SERVER data (fetched from API/DB)?                       │
│  ├── YES → TanStack React Query / SWR                           │
│  │         (caching, deduplication, revalidation, optimistic)    │
│  │                                                               │
│  └── NO → Is it shared across many components?                  │
│       ├── YES → Is it complex (many actions/reducers)?          │
│       │    ├── YES → Zustand or Redux Toolkit                   │
│       │    └── NO  → Zustand (lightweight) or Jotai (atomic)    │
│       │                                                          │
│       └── NO → Is it just a toggle/input/form?                  │
│            ├── YES → useState / useReducer (local)              │
│            └── Is it URL-dependent?                              │
│                 └── YES → useSearchParams / nuqs                │
└─────────────────────────────────────────────────────────────────┘
```

### Zustand (Recommended Default)

```tsx
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        total: 0,

        addItem: (item) =>
          set((state) => ({
            items: [...state.items, item],
            total: state.total + item.price,
          })),

        removeItem: (id) =>
          set((state) => ({
            items: state.items.filter((i) => i.id !== id),
            total: state.items
              .filter((i) => i.id !== id)
              .reduce((sum, i) => sum + i.price, 0),
          })),

        clearCart: () => set({ items: [], total: 0 }),
      }),
      { name: "cart-storage" } // localStorage key
    )
  )
);

// Usage in component:
function CartIcon() {
  // ✅ Selector — only re-renders when items.length changes
  const count = useCartStore((state) => state.items.length);
  return <span className="badge">{count}</span>;
}

// ❌ HALLUCINATION TRAP: Always use selectors with Zustand
// useCartStore() without a selector subscribes to EVERYTHING
// and causes unnecessary re-renders on any store change
```

### TanStack React Query (Server State)

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,  // 5 min before refetch
    gcTime: 10 * 60 * 1000,     // 10 min cache lifetime
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return data.map((user: User) => <UserCard key={user.id} user={user} />);
}

// Mutation with optimistic update
function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/users/${userId}`, { method: "DELETE" }),

    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previous = queryClient.getQueryData<User[]>(["users"]);

      queryClient.setQueryData<User[]>(["users"], (old) =>
        old?.filter((u) => u.id !== userId)
      );

      return { previous }; // context for rollback
    },

    onError: (_err, _userId, context) => {
      queryClient.setQueryData(["users"], context?.previous); // rollback
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] }); // refetch
    },
  });
}

// ❌ HALLUCINATION TRAP: `cacheTime` was renamed to `gcTime` in React Query v5
// ❌ HALLUCINATION TRAP: Import from "@tanstack/react-query", NOT "react-query"
```

---

## Performance Optimization

### Code Splitting & Lazy Loading

```tsx
import { lazy, Suspense } from "react";

// Lazy load heavy components
const HeavyChart = lazy(() => import("./HeavyChart"));
const AdminPanel = lazy(() => import("./AdminPanel"));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart />
    </Suspense>
  );
}

// Named exports require:
const Chart = lazy(() =>
  import("./Charts").then((mod) => ({ default: mod.BarChart }))
);
```

### Virtual Scrolling (Large Lists)

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // estimated row height in px
    overscan: 5,            // render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: virtualRow.start,
              width: "100%",
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}

// Use when: list has 500+ items
// Do NOT use for: lists under 100 items (adds complexity for no gain)
```

### Ref Patterns

```tsx
// useRef for DOM access and mutable values
function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    videoRef.current?.play();
  }

  return <video ref={videoRef} src="/movie.mp4" />;
}

// Callback refs for dynamic ref assignment
function MeasuredBox() {
  const [height, setHeight] = useState(0);

  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []);

  return <div ref={measuredRef}>Content with height: {height}</div>;
}

// Forwarding refs (for library components)
const TextInput = forwardRef<HTMLInputElement, InputProps>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} />;
  }
);

// React 19: ref is a regular prop — forwardRef is being phased out
function TextInput19({ ref, ...props }: InputProps & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

---

## TypeScript Patterns

### Component Props

```tsx
// Discriminated union props
type ButtonProps =
  | { variant: "link"; href: string; onClick?: never }
  | { variant: "button"; onClick: () => void; href?: never };

function Button(props: ButtonProps) {
  if (props.variant === "link") {
    return <a href={props.href}>Link</a>;
  }
  return <button onClick={props.onClick}>Button</button>;
}

// Polymorphic component (as prop)
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<E>, "as" | "children">;

function Text<E extends React.ElementType = "span">({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || "span";
  return <Component {...props}>{children}</Component>;
}

// Usage:
<Text as="h1" className="title">Heading</Text>
<Text as="p">Paragraph</Text>
<Text as="a" href="/about">Link</Text>
```

### Generic Components

```tsx
// Generic list component
interface SelectProps<T> {
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
}

function Select<T>({ items, selected, onSelect, getLabel, getKey }: SelectProps<T>) {
  return (
    <ul role="listbox">
      {items.map((item) => (
        <li
          key={getKey(item)}
          role="option"
          aria-selected={item === selected}
          onClick={() => onSelect(item)}
        >
          {getLabel(item)}
        </li>
      ))}
    </ul>
  );
}
```

---

## Accessibility (Mandatory)

```tsx
// Every interactive element MUST be accessible

// ✅ Keyboard navigation
<button onClick={handleClick} onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") handleClick();
}}>
  Action
</button>

// ✅ ARIA for custom components
<div
  role="dialog"
  aria-modal={true}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-desc">This action cannot be undone.</p>
</div>

// ✅ Focus management
function Modal({ isOpen, onClose }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus(); // focus trap
  }, [isOpen]);

  return isOpen ? (
    <div role="dialog" aria-modal>
      <button ref={closeRef} onClick={onClose}>Close</button>
    </div>
  ) : null;
}

// ✅ Screen reader text
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>
```

---

## Common Patterns

### Debounced Search Input

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SearchInput() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Intersection Observer Hook

```tsx
function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);

  const ref = useCallback(
    (node: Element | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      }, options);

      observer.observe(node);
      return () => observer.disconnect();
    },
    [options]
  );

  return [ref, isIntersecting];
}

// Usage:
function LazyImage({ src }: { src: string }) {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  return <div ref={ref}>{isVisible && <img src={src} />}</div>;
}
```

### Previous Value Hook

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Usage: detect state changes
function Counter({ count }: { count: number }) {
  const prevCount = usePrevious(count);
  const direction = prevCount !== undefined && count > prevCount ? "↑" : "↓";

  return <span>{direction} {count}</span>;
}
```

---

## Output Format

When this skill produces or reviews code, structure your output as follows:

```
━━━ React Specialist Report ━━━━━━━━━━━━━━━━━━━━━━━━
Skill:       React Specialist
React Ver:   19+
Scope:       [N files · N components]
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

AI coding assistants often fall into specific bad habits when generating React code. These are strictly forbidden:

1. **Class Components:** Never generate `class extends React.Component` or lifecycle methods (`componentDidMount`, `componentDidUpdate`) in React 19+ projects. Use functional components with hooks exclusively.
2. **Manual Memoization in React 19:** Do NOT add `useMemo`, `useCallback`, or `React.memo` if the React Compiler is enabled. The compiler handles this automatically.
3. **`useFormState` (Wrong Name):** The correct hook name is `useActionState`, not `useFormState`. The canary name was changed before stable release.
4. **`<Context.Provider>`:** React 19 uses `<Context value={}>` directly. The `.Provider` pattern is deprecated.
5. **`useEffect` for Data Fetching:** Use Server Components, React Query, SWR, or the `use()` hook. `useEffect` fetch patterns cause waterfalls, have no caching, and lack error/loading states.
6. **Missing Keys in Mapped Lists:** Always use unique, stable IDs as keys. Never use array index as a key unless the list is truly static and never reorders.
7. **Prop Drilling Past 3 Levels:** If passing props through more than 3 intermediate components, use Context, Zustand, or Jotai instead.
8. **`cacheTime` in React Query v5:** The property was renamed to `gcTime`. Importing from `"react-query"` instead of `"@tanstack/react-query"` is also wrong.
9. **Zustand Without Selectors:** `useStore()` without a selector subscribes to all state changes. Always use `useStore((state) => state.specificValue)`.
10. **`forwardRef` in React 19:** Refs are regular props in React 19. `forwardRef` is being phased out. Use `ref` as a normal prop.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/tribunal-frontend`**
**Active reviewers: `logic` · `security` · `frontend` · `type-safety`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or displaying error boundaries.
3. **Context Amnesia:** Forgetting the user's React version or framework constraints.
4. **Sloppy Layout Generation:** Never build UI without explicit dimensional boundaries — use strict 4px grid spacing and explicit flex/grid layouts.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I use strictly functional components with hooks?
✅ Did I avoid manual memoization if React Compiler is active?
✅ Did I use useActionState (not useFormState) for form actions?
✅ Did I use <Context value={}> (not <Context.Provider>)?
✅ Are array maps using unique, stable keys (not index)?
✅ Did I handle loading, error, and empty states?
✅ Did I use Suspense + Error Boundaries for async components?
✅ Is the component accessible (ARIA, keyboard, focus mgmt)?
✅ Did I include AbortController cleanup in useEffect fetches?
✅ Did I use Zustand selectors to prevent unnecessary re-renders?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Assuming a React component "works" just because it compiles or because the bundler gives no immediate warnings.
- ✅ **Required:** You are explicitly forbidden from completing your task without providing **concrete terminal/test evidence** (e.g., passing Jest/Vitest logs, successful build output, or specific CLI execution results) proving the build is error-free.
