---
name: react-doctor
description: "Use when Scan React and Next.js applications for security, performance, re-render inefficiencies, memory leaks, and correctness issues."
version: 5.0.0
last-updated: 2026-09-13
skills:
  - react-specialist
  - nextjs-react-expert
  - baseline-ui
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# React Doctor — React Performance & Health Audit

---

## 🛠️ Technical Architecture & Reference Recipes

---

---

## 4 React Health Checks

### 1. Unnecessary Re-render Prevention

- **Inline Object/Array Props**: Passing inline objects `<Child config={{ color: 'blue' }} />` creates new references every render. Wrap with `useMemo` or declare outside component scope.
- **Inline Callback Props**: Passing inline functions `<Child onClick={() => doSomething()} />` breaks `React.memo`. Wrap callbacks with `useCallback`.

### 2. State Colocation

- Don't lift state higher than necessary. Keep state local to the component consuming it to isolate re-render subtrees.

### 3. Cleanup in `useEffect`

- Every event listener, interval, or subscription created in `useEffect` MUST return a cleanup function to prevent memory leaks:

```tsx
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 4. Derived State Anti-Pattern

- Never duplicate props into state (`const [name, setName] = useState(props.name)`). Calculate derived values during rendering directly.
