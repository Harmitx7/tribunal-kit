---
name: systematic-debugging
description: 4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.
allowed-tools: Read, Write, Edit, Glob, Grep
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
