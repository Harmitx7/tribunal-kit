---
description: Audit existing code for hallucinations. Runs Logic + Security reviewers on any code without generating anything new. The pure review mode — read, analyze, and report only.
---

# /review — Hallucination Audit (Read-Only)

$ARGUMENTS

---

## When to Use /review

|Use `/review` when...|Use something else when...|
|:---|:---|
|Auditing code you didn't write|AI-specific code review → `/review-ai`|
|Checking existing code for hallucinations|Need Tribunal with generation → `/generate`|
|Pre-merge code review|Full pre-deploy audit → `/audit`|
|Validating AI-generated output|Security only → `/tribunal-backend`|
|Reviewing code from a junior developer||

---

## The Review Contract

```
/review is READ ONLY.
No files are modified.
No code is generated.
Only findings and recommendations are produced.
```

---

## Active Reviewers

Logic + Security run on ALL code by default.

**Additional reviewers auto-activated by content:**

|Code Contains|Additional Reviewers|
|:---|:---|
|SQL, Prisma, database operations|`sql-reviewer`|
|React, hooks, components|`frontend-reviewer`|
|TypeScript types, generics|`type-safety-reviewer`|
|npm imports, package.json|`dependency-reviewer`|
|Tests, specs, describe/it blocks|`test-coverage-reviewer`|
|LLM API calls (OpenAI, Anthropic)|`ai-code-reviewer`|
|ARIA, disability, a11y|`accessibility-reviewer`|

---

## Review Output Format

```
━━━ Code Review — [filename or description] ━━━━━

Logic Review:   ✅ APPROVED | ⚠️ [N] warnings | ❌ [N] critical
Security:       ✅ APPROVED | ⚠️ [N] warnings | ❌ [N] critical

━━━ Findings (sorted by severity) ━━━━━━━━━━━━━━

[CRITICAL] [File:Line] [description] → [specific fix]
[HIGH]     [File:Line] [description] → [specific fix]
[MEDIUM]   [File:Line] [description] → [note]

━━━ Verdict: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ APPROVED — code is production-ready
⚠️ WARNINGS — [N] items to address before release
❌ CRITICAL — [N] blockers must be resolved
```

---

## What Each Reviewer Looks For

### logic-reviewer
- Methods called on wrong object types
- Impossible states that will throw at runtime
- Functions called before they're defined
- Missing null checks on potentially-undefined values

### security-auditor
- SQL injection (string interpolation in queries)
- XSS (user content in innerHTML or dangerouslySetInnerHTML)
- JWT issues (no algorithm enforcement, weak secrets)
- Auth order (business logic before auth check)
- Hardcoded secrets

---

## Hallucination-Specific Checks

The review specifically catches:

```
□ Methods imported from packages that don't export them
□ React hooks that don't exist (fabricated hook names)
□ Prisma methods removed in current version (findOne, upsertMany)
□ Next.js 15 dynamic APIs used without await (cookies, headers, params)
□ React 19 deprecated API usage (useFormState instead of useActionState)
□ Parameters passed to LLM APIs that don't exist (max_length, format, memory)
□ Model names that don't exist (gpt-5, claude-4, gemini-ultra)
```

---

## Usage Examples

```
/review src/lib/auth.ts
/review the entire src/app/api/checkout/ directory
/review the PaymentForm component
/review this code: [paste code inline]
/review src/lib/ai-chat.ts for AI API hallucinations
/review the last generated code before we write it to disk
```
