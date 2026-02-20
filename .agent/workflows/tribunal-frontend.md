---
description: Frontend + React specific Tribunal. Runs Logic + Security + Frontend + Types. Use for React components, hooks, and UI code.
---

# /tribunal-frontend — UI & React Audit

$ARGUMENTS

---

Focused audit for React, Next.js, and frontend code. Four reviewers analyze it simultaneously for framework-specific issues that generic reviews miss.

---

## Active Reviewers

```
logic-reviewer          → Non-existent React APIs, impossible render conditions
security-auditor        → XSS via dangerouslySetInnerHTML, exposed tokens in state
frontend-reviewer       → Hooks violations, missing dep arrays, direct state mutation
type-safety-reviewer    → Untyped props, any in hooks, unsafe DOM ref usage
```

---

## What Gets Flagged

| Reviewer | Common Frontend Catches |
|---|---|
| logic | `useState.useAsync()` — not a real React API |
| security | `dangerouslySetInnerHTML={{ __html: userInput }}` — XSS |
| frontend | `useEffect(() => {...}, [])` with a prop used inside — stale closure |
| type-safety | `function Card(props: any)` — no defined prop interface |

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
  ❌ High — Line 18
     Missing dep: userId used in useEffect but not in dep array
     Fix: }, [userId])

type-safety-reviewer:
  ⚠️ Medium — Line 3
     props: any — define a typed interface for this component

━━━ Verdict: NEEDS FIXES ━━━━━━━━━━━━━━━━
```

---

## Usage

```
/tribunal-frontend [paste component code]
/tribunal-frontend [paste custom hook]
/tribunal-frontend src/components/UserCard.tsx
```
