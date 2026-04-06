---
name: systematic-debugging
description: Systematic debugging framework. Root-cause isolation, 4-phase methodology, hypothesis testing, log tracing, avoiding shotgun-surgery, memory allocation analysis, and empirical evidence gathering. Use when debugging complex, highly-coupled, or elusive bugs across mixed execution environments.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Systematic Debugging — Root Cause Mastery

---

## 1. The 4-Phase Debugging Methodology

Never jump straight into modifying code when a bug is reported. 

### Phase 1: Replication & Isolation
**Goal:** Prove the bug exists continuously and isolate the execution path.
1. Write a failing deterministic unit/integration test that replicates the exact condition.
2. Strip away all unnecessary layers (If the UI button fails to delete a user, curl the endpoint directly. Does the API fail? If yes, UI is fine, bug is in the backend/database).

### Phase 2: Hypothesis Generation
**Goal:** Formulate logical explanations for the anomaly based on data, not guesses.
- "Because the log shows `auth: false` even after successful token parse, the RBAC middleware must be overwriting the session."

### Phase 3: Evidence-Based Testing (The Probe)
**Goal:** Prove or disprove the hypothesis without mutating the actual program functionality.
- Insert strict logging probes: `logger.debug("Executing line 45. User.permissions:", user.permissions)`.
- If the logs match your hypothesis, proceed. If they do not, discard the hypothesis.

### Phase 4: Resolution & Verification
**Goal:** Apply the minimal surgical change required, then verify via tests.
- Re-run the deterministic failing test created in Phase 1. It must now pass.

---

## 2. Advanced Diagnostic Vectors

When pure logic errors are ruled out, look for environmental factors.

**1. Race Conditions / Timing Bugs**
- *Symptom:* The bug only happens 30% of the time, or depends on network speed.
- *Cause:* Missing `await` statements, relying on asynchronous callbacks returning in a specific order, or concurrent database transacting.

**2. State Leakage**
- *Symptom:* The first operation works perfectly. The second consecutive operation fails mysteriously.
- *Cause:* Global variables, cached HTTP clients, or React state lacking proper cleanup functions between unmounts.

**3. Silent Failures (Swallowed Errors)**
- *Symptom:* The application stops processing midway through an operation, but nothing is in the error logs.
- *Cause:* Empty `catch (e) {}` blocks, unhandled promise rejections, or frontend elements conditionally rendering `null` on missing datasets.

---

## 3. The Bisection Method (Git Bisect)

When a catastrophic bug appears in production but worked fine last week, use algorithmic isolation across the git history.

```bash
git bisect start
git bisect bad HEAD           # The current state is broken
git bisect good v1.4.0        # It worked fine in the last release

# Git will now jump you exactly halfway between those commits.
# Run your tests...
git bisect bad   # (If it failed)
# Or...
git bisect good  # (If it passed)

# Git will isolate the exact commit that introduced the bug in O(log N) steps.
```

---

## 4. Reading the Stack Trace Properly

Do not skim. Stack traces tell the exact sequence of destruction.

1. **Top line:** The final fatal blow (e.g., `TypeError: Cannot read properties of undefined (reading 'map')`).
2. **First Application Function:** Scroll down past `node_modules` and framework internals. Find the absolute top-most function call that YOU wrote (e.g., `at UserList (src/components/UserList.tsx:45)`).
3. **The Parameter Conclusion:** Therefore, line 45 invoked `.map` on a variable that was `undefined`. Why did the parent layer pass `undefined` instead of `[]`?

---
