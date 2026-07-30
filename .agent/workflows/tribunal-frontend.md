---
description: Frontend and React specific Tribunal. Runs Logic + Security + Frontend + Type Safety + UI/UX + Motion + Visual Audit reviewers. Use for React components, hooks, UI code, Next.js pages, Server Components, and Client Components.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - ui-skill-packs
  - react-specialist
  - nextjs-react-expert
  - frontend-design
  - review-animations
  - emil-design-eng
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/security_scan.js
---

# /tribunal-frontend — Frontend Code & Visual Audit

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before auditing React components or frontend UI logic, you MUST inspect:
1. Design Tokens & Styling Context (`globals.css`, `tailwind.config`) → Verify OKLCH color palettes, typography scale, and dark mode classes
2. Active UI Skill Pack (`.agent/skills/ui-skill-packs/SKILL.md`) → Load mandatory UI skill pack (Pack 1: Foundations, Pack 2: Motion, Pack 3: Systems)
3. 7-Reviewer Frontend Gate → Run logic, security, frontend-reviewer, type-safety, ui-ux-auditor, motion-reviewer, and visual-auditor before approving UI diffs

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

## 7 Active Reviewers (All Run Simultaneously)

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

### ui-visual-auditor (Closed-Loop Visual Gate)

- Runs `node scripts/visual_audit.js --file <target>` to verify OKLCH color compliance, surface depth layering (hairline borders + ambient shadows), and interactive state polish.
- Rejects flat card containers lacking depth or hex hacks without design tokens.

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
