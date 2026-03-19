---
name: systematic-debugging
description: 4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Systematic Debugging

> Debugging is not guessing. It is the scientific method applied to broken software.
> Every guess without evidence is just noise. Every change without verification extends the outage.

---

## The 4-Phase Method

### Phase 1 — Reproduce

A bug you can't reproduce consistently is a bug you can't safely fix.

**Steps:**
1. Document the exact sequence that triggers the bug (input → action → observed result)
2. Identify the environment: OS, browser, Node version, database version, network conditions
3. Determine if the bug is consistent or intermittent
4. Find the smallest reproduction case

```
# Reproduction template
Trigger:      [Exact steps]
Environment:  [Runtime, OS, version]
Expected:     [What should happen]
Observed:     [What actually happens]
Consistent:   [Yes / No / Only under load / Only for specific users]
```

If you cannot reproduce — collect more data before attempting a fix.

### Phase 2 — Locate

Find where the code breaks, not what you think broke.

**Tools by layer:**

| Layer | Locating Tools |
|---|---|
| Network | Browser DevTools → Network tab, curl, Wireshark |
| API | Response body + status code, request logs |
| Application logic | Debugger, `console.log` with structured context |
| Database | Query logs, `EXPLAIN ANALYZE`, slow query log |
| Memory | Heap snapshot, `--inspect` with Chrome DevTools |

**Technique: Binary search the call stack**

When the bug could be anywhere, divide the execution in half:
- Does the bug exist before line 100? Add a checkpoint.
- Does it exist before line 50? Add another.
- Continue halving until you've isolated the broken unit.

### Phase 3 — Hypothesize and Test

Form one specific hypothesis. Test it. Do not form multiple and fix them all simultaneously.

```
Hypothesis: "The JWT is expiring before the renewal code runs because 
             the token TTL and the renewal check interval are both set to 1 hour,  
             with no buffer."

Test: Reduce token TTL to 5 minutes in dev. Does the error appear in 5 minutes?

Result: Yes → hypothesis confirmed
        No  → discard and form a new hypothesis
```

**One change at a time.** Two changes at once = you don't know which one fixed it.

### Phase 4 — Fix and Verify

Fix the root cause — not the symptom.

**Root cause vs. symptom:**
```
Symptom:    Users are getting logged out
Cause:      Token TTL is shorter than session duration
Root cause: TTL and renewal interval were set by two different teams without coordination

Symptom fix:    Increase TTL
Root cause fix: Establish a single config source for auth timing values + document the relationship
```

**Verification checklist:**
- [ ] Bug no longer reproduces with the specific steps from Phase 1
- [ ] Adjacent behavior still works (no regression)
- [ ] Fix works in the environment where the bug was first reported
- [ ] A test is added that would have caught this bug before it reached production

---

## Common Debugging Patterns

### Intermittent Bug

- Likely cause: race condition, network timeout, missing error handling on async code
- Add structured logging with request IDs and timestamps
- Reproduce under load (`k6`, `ab`)
- Look for shared mutable state

### Works Locally, Fails in Production

- Likely cause: environment difference (env vars, feature flags, database version, data volume)
- Compare env vars between local and production (`printenv | sort`)
- Test with production-scale data
- Check for hardcoded localhost URLs or conditions

### Only Fails for Specific Users

- Likely cause: data-specific edge case, permission issue, locale-specific formatting
- Reproduce using the same user ID/session in a lower environment
- Query the specific user's data against the code path
- Check for branching logic that depends on user properties

---

## Evidence Log Template

Keep a running log during complex debugging:

```
[Time] Hypothesis: ...
[Time] Test: ...
[Time] Result: ...
[Time] Conclusion: ...
[Time] New hypothesis: ...
```

This prevents circular reasoning and gives you a record if you hand off to someone else.

---

## Output Format

When this skill completes a task, structure your output as:

```
━━━ Systematic Debugging Output ━━━━━━━━━━━━━━━━━━━━━━━━
Task:        [what was performed]
Result:      [outcome summary — one line]
─────────────────────────────────────────────────
Checks:      ✅ [N passed] · ⚠️  [N warnings] · ❌ [N blocked]
VBC status:  PENDING → VERIFIED
Evidence:    [link to terminal output, test result, or file diff]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/debug`**
**Active reviewers: `debugger` · `logic-reviewer`**

### ❌ Forbidden AI Tropes in Debugging

1. **"Have you tried turning it off and on again?"** — do not suggest blind restarts without understanding the state.
2. **Hallucinating stack traces** — never guess the line number or the contents of an error log. Use tools to read it.
3. **"Rewrite the whole function"** — never suggest rewriting working code just to fix a single bug, unless the structure is the root cause.
4. **Assuming the fix worked** — always provide a way to verify the fix.
5. **Changing multiple variables at once** — never provide fixes that change 5 different things simultaneously. Identify ONE root cause.

### ✅ Pre-Flight Self-Audit

Review these questions before proposing a bug fix:
```
✅ Do I have the exact error message and stack trace? (If no, ASK the user to provide it or let me look for it).
✅ Did I isolate the exact line or block of code causing the issue?
✅ Is my proposed fix addressing the root cause, or just suppressing a symptom?
✅ Did I only change ONE thing to test the hypothesis?
✅ Can I explain exactly WHY the code broke in the first place?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a bug "fixed" or completing a task because your updated code "looks correct" to you.
- ✅ **Required:** You are explicitly forbidden from completing your debug task until you have produced **concrete, observable evidence** (e.g., terminal output, compiler success, passing test logs, network trace results, or CLI execution results) proving the fix works. If you lack a direct test environment, you must attempt to write a focused script to verify the logic.
