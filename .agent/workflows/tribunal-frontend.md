---
description: Frontend + React specific Tribunal. Runs Logic + Security + Frontend + Types. Use for React components, hooks, and UI code.
---

# /tribunal-frontend — UI & React Audit

$ARGUMENTS

---

Focused audit for React, Next.js, Vue, and frontend code. Four reviewers analyze it simultaneously for framework-specific issues that generic reviews miss.

---

## When to Use This vs Other Tribunals

| Code type | Right tribunal |
|---|---|
| React components, hooks, JSX | `/tribunal-frontend` ← you are here |
| API routes, auth, middleware | `/tribunal-backend` |
| SQL queries, ORM | `/tribunal-database` |
| React Native / mobile UI | `/tribunal-mobile` |
| Unknown domain or cross-domain | `/tribunal-full` |

---

## Active Reviewers

```
logic-reviewer          → Non-existent React APIs, impossible render conditions,
                          stale closure patterns, state set during unmounted component
security-auditor        → XSS via dangerouslySetInnerHTML, exposed tokens or secrets
                          in component state, unsanitized URL params
frontend-reviewer       → Hooks violations (rules of hooks), missing dep arrays,
                          direct state mutation, infinite render loops
type-safety-reviewer    → Untyped props, any in hooks, unsafe DOM ref usage,
                          missing generic type parameters
```

---

## What Gets Flagged — Real Examples

| Reviewer | Example Finding |
|---|---|
| logic | `useState.useAsync()` — not a real React API |
| logic | Setting state during render without a guard → infinite loop |
| security | `dangerouslySetInnerHTML={{ __html: userInput }}` — XSS |
| security | `localStorage.setItem('token', jwt)` — accessible to XSS |
| frontend | `useEffect(() => {...}, [])` with a prop used inside — stale closure |
| frontend | `setCount(count + 1)` inside a stale closure — use functional updater |
| frontend | Hook called inside a conditional `if (loggedIn) { useData() }` |
| type-safety | `function Card(props: any)` — no defined prop interface |
| type-safety | `ref.current.focus()` without null check |

---

## Report Format

```
━━━ Frontend Audit ━━━━━━━━━━━━━━━━━━━━━━

  logic-reviewer:     ✅ APPROVED
  security-auditor:   ✅ APPROVED
  frontend-reviewer:  ❌ REJECTED
  type-safety:        ⚠️  WARNING

━━━ Issues ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

frontend-reviewer:
  ❌ HIGH — Line 18
     Missing dep: userId used inside useEffect but not in dep array
     Code: useEffect(() => fetchUser(userId), [])
     Fix:  useEffect(() => fetchUser(userId), [userId])

  ❌ HIGH — Line 34
     Hook called conditionally: if (isAuth) { useDashboardData() }
     Fix: Move hook to top level, use enabled flag inside hook

type-safety-reviewer:
  ⚠️ MEDIUM — Line 3
     props: any — define a typed interface for this component
     Fix: interface CardProps { title: string; content: React.ReactNode }

━━━ Verdict: REJECTED — fix before merging ━━━━━━
```

---

## Hallucination Guard

- Only real React/Vue/Next.js APIs are accepted — invented hooks get REJECTED
- Hook violation findings cite the **specific hooks rule being broken**
- XSS findings include the **specific input path** that creates the injection

---

## Cross-Workflow Navigation

| Finding type | Next step |
|---|---|
| XSS finding | Contact security team + `/audit` for project-wide XSS scan |
| Hooks violations everywhere | `/refactor` to extract to properly structured custom hooks |
| All approved | Human Gate to write code to disk |

---

## Usage

```
/tribunal-frontend [paste component code]
/tribunal-frontend [paste custom hook]
/tribunal-frontend src/components/UserCard.tsx
/tribunal-frontend the usePagination hook
```
