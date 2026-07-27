---
name: react-doctor
description: Scan React and Next.js applications for security, performance, re-render inefficiencies, memory leaks, and correctness issues.
version: 1.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: React Optimization & Code Health
  tier: pro
  co-requires: [react-specialist, nextjs-react-expert, performance-profiling]
  trigger-signals:
    strong: [react-doctor, React performance scan, fix React re-renders, React memory leak, Million.js audit]
    weak: [React audit, fix React bugs]
---

# React Doctor — React Performance & Health Audit

Diagnose and resolve unnecessary re-renders, state synchronization bugs, memory leaks, and hook dependency issues in React applications.

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

---

## 🤖 LLM-Specific Traps

1. **Over-using `useCallback` everywhere**: Wrapping trivial primitives or 1-line functions that aren't passed to memoized children.
2. **Missing `useEffect` Dependencies**: Omitting referenced variables from effect dependency arrays without proper `useCallback` or ref wrapping.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Active reviewers: `react-specialist` · `type-safety`**

### ✅ Pre-Flight Self-Audit

```
✅ Are event listeners and timers properly cleaned up in `useEffect` returns?
✅ Are expensive calculations wrapped in `useMemo`?
✅ Is state colocated to minimize re-render scope?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
