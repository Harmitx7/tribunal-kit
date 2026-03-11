---
description: Debugging command. Activates DEBUG mode for systematic problem investigation. No fix is suggested until the root cause is confirmed.
---

# /debug — Root Cause Investigation

$ARGUMENTS

---

This command switches the AI into **investigation mode**. No fixes are suggested until the root cause is identified and confirmed. No random changes. No guessing.

---

## The Investigation Contract

> "A fix without a root cause is a patch on a symptom. It will fail again."

The `debugger` agent follows this sequence **without skipping steps**:

1. Collect evidence
2. Generate hypotheses
3. Test hypotheses one at a time
4. Identify root cause
5. Apply targeted fix
6. Verify the fix and prevent recurrence

---

## When to Use /debug vs Other Commands

| Use `/debug` when... | Use something else when... |
|---|---|
| There's a specific error or unexpected behavior | Code needs to be written from scratch → `/generate` |
| You have a stack trace or error message | Code quality needs improvement → `/refactor` |
| Production is broken right now | You want to add tests → `/test` |
| A bug reappears after being "fixed" | You want a full project health check → `/audit` |

---

## Step 1 — Evidence Collection

**Collect these before forming any hypothesis:**

```
□ Exact error text — full stack trace, not a summary
□ Minimum reproduction steps — fewest actions that trigger the bug
□ Last known-good state — commit hash, date, or config snapshot
□ Recent changes — code, dependency updates, env vars, infra
□ Environment — local / staging / production, OS, Node version, etc.
□ Frequency — always / sometimes / only under load / only in prod
```

> ⚠️ If the error is intermittent, collect timing data before hypothesizing.

---

## Step 2 — Hypothesis Generation

Map possible causes — label each honestly:

```
Cause A: [what it is] — Likelihood: High / Medium / Low — Evidence: [what points to it]
Cause B: [what it is] — Likelihood: High / Medium / Low — Evidence: [what points to it]
Cause C: [what it is] — Likelihood: High / Medium / Low — Evidence: [what points to it]
```

Every entry is labeled as a **hypothesis**, never as a confirmed fact.

**Hypothesis ranking rules:**
- High likelihood: directly supported by evidence or error message
- Medium likelihood: consistent with the error but no direct evidence
- Low likelihood: possible but requires unusual conditions

---

## Step 3 — Single-Hypothesis Testing

Test causes **one at a time**. Never test two simultaneously — it makes the result ambiguous.

```
H1 tested: [what was examined + how]
Result:     ✅ Confirmed root cause | ❌ Ruled out — [reason]

H2 tested: [what was examined + how]
Result:     ✅ Confirmed root cause | ❌ Ruled out — [reason]
```

Stop when the first hypothesis is confirmed. Do not continue testing eliminated causes.

---

## Step 4 — Root Cause Statement

The root cause is the **single thing** that, if changed, prevents the entire failure chain.

Format:

```
Root Cause: [One sentence — WHY this happened, not WHAT happened]

Example:
✅ "JWT verification was skipped when the Authorization header used 'bearer' (lowercase), 
    because the header check was case-sensitive."

❌ "The login returned 401." (This is the symptom, not the cause)
```

---

## Step 5 — Fix + Regression Prevention

```
Targeted fix:    One change — the minimum required to resolve the root cause
Regression test: A specific test added to catch this exact failure if it ever returns
Similar patterns: Any other locations in the codebase where this pattern exists
```

> ⚠️ All debug logging added during investigation must be removed before the fix is presented.

---

## Debug Report Format

```
━━━ Debug Report ━━━━━━━━━━━━━━━━━━━━━━━

Symptom:      [what the user sees]
Error:        [exact message or trace]
Reproduced:   Yes | No | Sometimes — [conditions]
Environment:  [runtime, version, OS]
Last working: [commit / date / known-good state]

━━━ Evidence Collected ━━━━━━━━━━━━━━━━

- [specific observation 1]
- [specific observation 2]

━━━ Hypotheses ━━━━━━━━━━━━━━━━━━━━━━━

H1 [High]   — [cause and why it's likely]
H2 [Medium] — [cause and why it's possible]
H3 [Low]    — [cause and why it's a stretch]

━━━ Investigation ━━━━━━━━━━━━━━━━━━━

H1: checked [what was examined] → ✅ Confirmed root cause
H2: ruled out — [evidence against it]

━━━ Root Cause ━━━━━━━━━━━━━━━━━━━━━

[Single sentence — WHY this happened]

━━━ Fix ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before:  [original code]
After:   [corrected code]

Regression test: [what test prevents this from recurring]
Similar patterns: [any other locations to check in the codebase]
```

---

## Hallucination Guard

- Every hypothesis is **explicitly labeled as a hypothesis** — never as confirmed fact until evidence backs it
- Proposed fixes only use **real, documented APIs** — `// VERIFY: check method exists` on any uncertain call
- **One change per fix** — multi-file rewrites presented as "a debug session" are a red flag
- Debug logging added during investigation must be **removed** before the fix is presented
- **Never assume the error message is accurate** — verify it matches actual behavior

---

## Cross-Workflow Navigation

| After /debug reveals... | Go to |
|---|---|
| Root cause confirmed, fix ready | `/generate` to write the fix safely through Tribunal |
| Multiple files need changing | `/enhance` for impact-zone analysis + callers update |
| Missing test allowed the bug in | `/test` to add regression coverage |
| Performance was the root cause | `/tribunal-performance` for full optimization review |
| Security vulnerability found | `/audit` to check if it exists elsewhere |

---

## Usage

```
/debug TypeError: Cannot read properties of undefined reading 'id'
/debug API returns 500 only in production
/debug useEffect runs on every render instead of once
/debug login works locally but fails in CI
/debug memory usage grows unbounded over 24h in the worker process
/debug race condition in the payment confirmation handler
```
