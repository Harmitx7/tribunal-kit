---
description: Debugging command. Activates DEBUG mode for systematic problem investigation.
---

# /debug — Root Cause Investigation

$ARGUMENTS

---

This command switches the AI into **investigation mode**. No fixes are suggested until the root cause is identified. No random changes. No guessing.

---

## The Investigation Contract

> "A fix without a root cause is a patch on a symptom. It will fail again."

The `debugger` agent follows this sequence without skipping steps:

---

## Investigation Sequence

**Collect evidence first:**
- Exact error text (full stack trace, not a summary)
- Minimum reproduction steps
- Last known-good state (commit, date, config)
- Recent changes (code, dependency updates, env vars, infrastructure)

**Map possible causes — label them honestly:**

```
Cause A: [what it is] — Likelihood: High / Medium / Low
Cause B: [what it is] — Likelihood: High / Medium / Low
Cause C: [what it is] — Likelihood: High / Medium / Low
```

Every entry labeled as a **hypothesis**, not a diagnosis.

**Test causes one at a time:**
Check one. Mark resolved or eliminated. Move to next. Never test two simultaneously.

**Find the root cause:**
The thing that, if changed, prevents the entire failure chain. Fixing a symptom doesn't count.

**Apply a targeted fix + prevent recurrence:**
One change. Then verify. Then add a regression test.

---

## Report Format

```
━━━ Debug Report ━━━━━━━━━━━━━━━━━━━━━━━

Symptom:      [what the user sees]
Error:        [exact message or trace]
Reproduced:   [Yes | No | Sometimes]
Last working: [commit / date / known-good state]

━━━ Hypotheses ━━━━━━━━━━━━━━━━━━━━━━━

H1 [High]   — [cause and why it's likely]
H2 [Medium] — [cause and why it's possible]
H3 [Low]    — [cause and why it's a stretch]

━━━ Investigation ━━━━━━━━━━━━━━━━━━━

H1: checked [what was examined] → ✅ Confirmed root cause
H2: ruled out — [evidence against it]

━━━ Root Cause ━━━━━━━━━━━━━━━━━━━━━

[Single sentence explaining WHY this happened]

━━━ Fix ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before:  [original code]
After:   [corrected code]

Regression test: [what test was added to prevent this]
Similar patterns: [anywhere else in the codebase this might exist]
```

---

## Hallucination Guard

- Every hypothesis is explicitly labeled as a hypothesis — never as confirmed fact
- Proposed fixes only use real, documented APIs — `// VERIFY: check method exists` on uncertainty
- One change per fix — multi-file rewrites presented as "a debug session" are a red flag
- Debug logging added during investigation must be removed before the fix is presented

---

## Usage

```
/debug TypeError: Cannot read properties of undefined
/debug API returns 500 only in production
/debug useEffect runs on every render instead of once
/debug login works locally but fails in CI
```
