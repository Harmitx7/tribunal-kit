---
description: Debugging command. Activates DEBUG mode for systematic problem investigation using the 4-phase methodology (Collect → Hypothesize → Test → Fix). No fix is suggested until the root cause is confirmed and tested. No random changes. No guessing.
---

# /debug — Root Cause Investigation

$ARGUMENTS

---

## The Investigation Contract

"A fix without a root cause is a patch on a symptom. It will fail again."

The `debugger` agent follows this sequence **without skipping steps**:

1. Collect all evidence first
2. Generate ranked hypotheses 
3. Test exactly one hypothesis at a time
4. Confirm root cause with evidence
5. Apply the minimum targeted fix
6. Add a regression test to prevent recurrence

---

## When to Use /debug

|Use `/debug` when...|Use something else when...|
|:---|:---|
|There's a specific error or unexpected behavior|Code needs to be written → `/generate`|
|You have a stack trace or error message|Code quality needs improving → `/refactor`|
|Production is broken right now|Missing test coverage → `/test`|
|A bug reappears after being "fixed"|Full health check needed → `/audit`|

---

## Step 1 — Evidence Collection (Collect All Before Hypothesizing)

```
□ Exact error text — full stack trace, not a paraphrase
□ Minimum reproduction steps — fewest actions that trigger the bug
□ Last known-good state — commit hash, date, or config snapshot
□ Recent changes — code, deps, env vars, infra, config changes
□ Environment — local/staging/prod, OS, Node version, browser, runtime
□ Frequency — always / intermittent / only under load / production only
```

> ⚠️ If the error is intermittent: collect timing patterns before hypothesizing.

### Priority Investigation Order (Most Likely Root Cause First)

```
1. Recent deployments     — 90% of outages are caused by recent changes
2. Environment variables  — rotated/missing secrets are common silent failures
3. Dependency updates     — a package update can break APIs without errors
4. Infrastructure         — firewall, Security Groups, DB connection limits
5. Application code       — last to check, easiest to blame prematurely
```

---

## Step 2 — Hypothesis Formation

Map all possible causes with explicit likelihood labels:

```
ROOT CAUSE CANDIDATES
━━━━━━━━━━━━━━━━━━━━━
H1 [High]   — [cause] — Evidence: [what points to this]
H2 [Medium] — [cause] — Evidence: [what is consistent with this]
H3 [Low]    — [cause] — Evidence: [theoretically possible]
```

**Never state a hypothesis as confirmed fact until Step 3 proves it.**

---

## Step 3 — Single-Hypothesis Testing

Test **one at a time**. Never test two simultaneously — results become ambiguous.

```
H1 tested: [how it was investigated]
Result:    ✅ Confirmed | ❌ Ruled out — [specific evidence against]

H2 tested: [how it was investigated]
Result:    ✅ Confirmed | ❌ Ruled out — [reason]
```

Stop when the first hypothesis is confirmed. Do not continue investigating eliminated causes.

---

## Step 4 — Root Cause Statement

The root cause is one sentence: **WHY this happened**, not WHAT happened.

```
✅ "JWT verification was skipped when Authorization header used lowercase 'bearer'
    because the header check was case-sensitive"

❌ "The API returned 401" — This is the symptom, not the root cause
```

---

## Step 5 — Fix + Regression Prevention

```
Targeted fix:    The minimum change that eliminates the root cause
Regression test: A specific test that will catch this exact failure if it returns
Similar patterns: Other locations in the codebase to audit for the same issue
Debug cleanup:   All console.log/temporary changes removed from proposed fix
```

---

## Debug Report Format

```
━━━ Debug Report ━━━━━━━━━━━━━━━━━━━━━━━━━━

Symptom:      [what the user observes]
Error:        [exact message / stack trace]
Reproduced:   Yes | No | Sometimes — [conditions]
Environment:  [Node v22, Next.js 15, PostgreSQL 16]
Last working: [commit hash / date]

━━━ Evidence ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [specific observation 1]
- [specific observation 2]

━━━ Hypotheses ━━━━━━━━━━━━━━━━━━━━━━━━━━
H1 [High]   — [cause and reasoning]
H2 [Medium] — [cause and reasoning]

━━━ Investigation ━━━━━━━━━━━━━━━━━━━━━━━
H1: [what was tested] → ✅ Confirmed root cause
H2: [what was tested] → ❌ Ruled out — [reason]

━━━ Root Cause ━━━━━━━━━━━━━━━━━━━━━━━━━
[Single sentence WHY — not WHAT]

━━━ Fix ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before: [original code]
After:  [corrected code]

Regression test: [test preventing recurrence]
Similar patterns: [other locations to check]
```

---

## Hallucination Guard

```
❌ Never propose a fix before root cause is confirmed with evidence
❌ Never test two hypotheses simultaneously
❌ Never propose a "rewrite" as a debug session
❌ Never leave console.log in the proposed fix
❌ Never assume the error message accurately describes the actual cause
❌ Never use real API methods without verifying they exist in this version
```

---
