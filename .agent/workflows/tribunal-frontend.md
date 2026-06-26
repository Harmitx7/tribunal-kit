---
description: Frontend and React specific Tribunal. Runs Logic + Security + Frontend + Type Safety + UI/UX + Motion reviewers. Use for React components, hooks, UI code, Next.js pages, Server Components, and Client Components.
required-skills: react-specialist, nextjs-react-expert, frontend-design, review-animations, emil-design-eng
---

# /tribunal-frontend — Frontend Code Audit

$ARGUMENTS

---

## $CONTEXT_REQUIRED

```
Read BEFORE frontend review:
□ Target component files       → The UI code being audited
□ tailwind.config / globals.css → Understand design tokens
□ package.json                 → Verify frontend dependencies (framer-motion, radicle, etc.)
```

---

## When to Use /tribunal-frontend

| Use `/tribunal-frontend` when...    | Use something else when...                 |
| :---------------------------------- | :----------------------------------------- |
| React components (Server or Client) | Backend routes → `/tribunal-backend`       |
| Custom hooks                        | Database queries → `/tribunal-database`    |
| Next.js pages and layouts           | Mobile (React Native) → `/tribunal-mobile` |
| UI state management                 | Maximum coverage → `/tribunal-full`        |
| Form handling with Server Actions   |                                            |

---

## 6 Active Reviewers (All Run Simultaneously)

### precedence-reviewer → Checks local repo Case Law for past rejections

### logic-reviewer

- Hallucinated React 19 hooks (non-existent hook names)
- useFormState called instead of useActionState (React 19 rename)
- useEffect missing dependencies (stale closure)
- Multiple setStates that should be batched (React 19 auto-batches in most cases)

### security-auditor

- `dangerouslySetInnerHTML` with user-controlled content (XSS)
- eval/Function() calls in component code
- Exposing sensitive data in client-rendered output

### frontend-reviewer

- useState/useReducer in Server Components (no client runtime!)
- 'use client' directive missing on components using hooks
- Missing 'use server' on Server Actions
- cookies()/headers()/params not awaited in Next.js 15
- useEffect not cleaned up (subscription leaks)
- Keys not unique in list rendering (using index as key)
- Direct DOM mutations (document.querySelector inside React)

### type-safety-reviewer

- Props typed as `any`
- Event handlers typed as `any` (use `React.MouseEvent<HTMLButtonElement>`)
- Server Component async props typed without Promise<> (Next.js 15 params)
- No explicit return type on custom hooks

### ui-ux-auditor

- Generic AI Aesthetics (purple gradients, standard hero layouts)
- Missing hover/focus states on interactive elements
- Color contrast below WCAG AA (4.5:1)
- Typography and spacing not following design system logic

### review-animations (The Socratic Gate)

- Any UI animation exceeding 300ms budget
- Use of `ease-in` on entering UI elements instead of `ease-out`
- Elements appearing from `scale(0)` instead of `0.95`
- Non-interruptible motion or missing hover/active states

---

## Verdict System

```
If ANY reviewer → ❌ REJECTED: fix before Human Gate
If any reviewer → ⚠️ WARNING:  proceed with flagged items
If all reviewers → ✅ APPROVED: Human Gate
```

---

## Frontend-Specific Hallucination Traps (Common LLM Mistakes)

```typescript
// ❌ React 19: useFormState renamed to useActionState
import { useFormState } from 'react';      // useFormState no longer exists in React 19
import { useActionState } from 'react';    // Correct React 19 name

// ❌ Next.js 15: params and searchParams must be awaited
const { id } = params;                    // WRONG — params is a Promise in Next.js 15
const { id } = await params;             // CORRECT

// ❌ Hook not valid in Server Component
export default async function Page() {
  const [count, setCount] = useState(0); // Server Components cannot use hooks
}

// ❌ Server Action missing 'use server'
async function saveData(formData: FormData) {  // Without 'use server' — not a Server Action
  'use server';                                // Must be FIRST line
}
```

---

## Usage Examples

```
/tribunal-frontend the navigation layout component
/tribunal-frontend the ProductCard component with server-fetched data
/tribunal-frontend the useAuth custom hook implementation
/tribunal-frontend the checkout page with Server Action form
/tribunal-frontend the DashboardLayout with Suspense and loading states
```

---

## After /tribunal-frontend — Next Steps

| Outcome                     | Next Command                                       |
| :-------------------------- | :------------------------------------------------- |
| All checks pass             | → `/preview start` to visually verify              |
| Reviewers reject with fixes | → Apply fixes, then run `/tribunal-frontend` again |
| Needs advanced UI/UX        | → `/ui-ux-pro-max` for premium design pass         |
| Performance concerns        | → `/performance-benchmarker` for Lighthouse/CWV    |

---
