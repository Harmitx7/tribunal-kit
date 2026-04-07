---
description: Generate code using the full Tribunal Anti-Hallucination pipeline. Maker generates grounded in real project context at low temperature → domain-selected reviewers audit in parallel → Human Gate for final approval. Nothing is written to disk without explicit approval.
---

# /generate — Hallucination-Free Code Generation

$ARGUMENTS

---

## When to Use /generate

| Use `/generate` when... | Use something else when... |
|:---|:---|
| New code needs to be written from scratch | Existing code needs modification → `/enhance` |
| A single focused piece of code is needed | Multi-domain build → `/create` or `/swarm` |
| A safe, reviewed snippet is required | You want to understand options first → `/plan` |
| You need a quick but Tribunal-reviewed piece | Full project structure needed → `/create` |

---

## Pipeline Flow

```
Your request
    │
    ▼
Context scan (MANDATORY before first line of code)
├── Read package.json → verify all imports exist
├── Read tsconfig.json → understand strictness, paths aliases
├── Read referenced files → understand actual data shapes
└── Read .env.example → know available environment variables
    │
    ▼
Maker generates at temperature 0.1
├── Only methods verified in official docs
├── Only packages in package.json
├── // VERIFY: [reason] on any uncertain call
└── No full application generation — modules only
    │
    ▼
Reviewers run in parallel (auto-selected by keyword)
    │
    ▼
Human Gate — verdicts shown + unified diff
Y = write to disk | N = discard | R = revise with feedback
```

---

## What the Maker Is Not Allowed to Do

```
❌ Import a package not in package.json
❌ Call a method not verified in official documentation
❌ Use TypeScript 'any' without an explanation comment
❌ Generate an entire application in one shot
❌ Guess at database column or table names (read schema first)
❌ Fabricate API response shapes (read existing types first)
❌ Assume environment variables exist (read .env.example first)
❌ Use Next.js 14 patterns in a Next.js 15 project (check version!)
❌ Use React 18 hooks in a React 19 project (useFormState → useActionState)
❌ Use framer-motion v6 API in a v12 project (exitBeforeEnter → mode="wait")
❌ Use raw useEffect for GSAP — always useGSAP from @gsap/react
❌ Hallucinate LLM model names — verify against provider's current model list
```

When unsure: write `// VERIFY: [specific reason]` instead of hallucinating.

---

## Reviewer Auto-Selection

**Always active:**
```
logic-reviewer     → Hallucinated methods, undefined refs, impossible logic
security-auditor   → OWASP vulnerabilities, hardcoded secrets, injection
```

**Auto-activated by keywords:**

| Keyword in request | Additional Reviewers |
|:---|:---|
| `api`, `route`, `endpoint`, `handler`, `server action` | `dependency-reviewer` + `type-safety-reviewer` |
| `sql`, `query`, `database`, `prisma`, `drizzle`, `orm` | `sql-reviewer` |
| `component`, `hook`, `react`, `vue`, `jsx`, `tsx` | `frontend-reviewer` + `type-safety-reviewer` |
| `animation`, `gsap`, `framer`, `motion`, `scroll` | `frontend-reviewer` + `performance-reviewer` |
| `test`, `spec`, `vitest`, `jest`, `playwright` | `test-coverage-reviewer` |
| `slow`, `optimize`, `cache`, `performance`, `bundle` | `performance-reviewer` |
| `mobile`, `react native`, `expo` | `mobile-reviewer` |
| `llm`, `openai`, `anthropic`, `gemini`, `embedding`, `ai` | `ai-code-reviewer` |
| `aria`, `wcag`, `a11y`, `accessibility` | `accessibility-reviewer` |
| `import`, `package`, `npm`, `require` | `dependency-reviewer` |

> For maximum safety on critical code: use `/tribunal-full` for all 11 reviewers simultaneously.

---

## Reviewer Verdicts

| Verdict | Meaning | What Happens |
|:---|:---|:---|
| `✅ APPROVED` | No issues found | Proceeds to Human Gate |
| `⚠️ WARNING` | Non-blocking issue | Human Gate shown with warning highlighted |
| `❌ REJECTED` | Blocking issue | Maker revises before Human Gate |

**Retry limit:** Maker is revised up to 3 times per REJECTED verdict. After 3 failures, the session halts and reports to the user with full failure history. No silent failures.

---

## Output Format

```
━━━ Tribunal: [Domain] ━━━━━━━━━━━━━━━━━━━━━━

Active reviewers: logic · security · [others]

[Generated code with // VERIFY: tags where uncertain]

━━━ Verdicts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

logic-reviewer:      ✅ APPROVED
security-auditor:    ✅ APPROVED  
dependency-reviewer: ⚠️ WARNING — lodash not in package.json

━━━ Warnings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

dependency-reviewer:
  ⚠️ Medium — Line 3: 'lodash' imported but not in package.json
  Fix: npm install lodash  OR  use built-in Array methods

━━━ Human Gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write to disk?  Y = approve | N = discard | R = revise with feedback
```

---

## Cross-Workflow Navigation

| After /generate shows... | Go to |
|:---|:---|
| Multiple files need changing | `/enhance` for impact-zone analysis |
| Security-critical code was generated | `/tribunal-full` for maximum coverage |
| DB queries were generated | `/tribunal-database` |
| New API routes were generated | `/tribunal-backend` |
| Animation/motion code generated | `/tribunal-frontend` |
| Tests need to be written next | `/test` |
| Something was rejected 3 times | Escalate to human with failure report |

---

## Usage Examples

```
/generate a JWT middleware for Express with HS256 algorithm enforcement
/generate a Prisma query for users with their published posts in last 30 days
/generate a debounced search hook in React 19 using useDeferredValue
/generate a parameterized SQL query for paginated order history
/generate a Zod schema for email + password + role login input
/generate a Server Action for creating a product with image upload
/generate a rate-limited fetch wrapper using @upstash/ratelimit
/generate a Framer Motion page transition with shared element (layoutId)
/generate a GSAP ScrollTrigger timeline with useGSAP React hook
/generate an OpenAI structured output call with Zod schema validation
```
