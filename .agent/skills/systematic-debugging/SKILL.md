---
name: systematic-debugging
description: Systematic debugging framework. Root-cause isolation, 4-phase methodology, hypothesis testing, log tracing, avoiding shotgun-surgery, memory allocation analysis, and empirical evidence gathering. Use when debugging complex, highly-coupled, or elusive bugs across mixed execution environments.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Systematic Debugging — Root Cause Mastery

> A bug is not a mystery; it is a manifestation of misplaced assumptions.
> Shotgun debugging (changing random things until it works) guarantees that you will introduce two new bugs for every one you "fix."

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

## 🤖 LLM-Specific Traps (Systematic Debugging)

1. **Shotgun Surgery:** Hallucinating massive 5-file refactors to "fix" a bug instead of altering the exact single mathematical operator that caused the mathematical flaw.
2. **Ignoring the Logs:** Assuming the cause based on the user's plain-text description instead of heavily demanding the user provide exact stack traces, HTTP status codes, or container logs.
3. **Band-Aid Logging:** Replacing the buggy code logic with simple `console.log` arrays instead of using integrated structured loggers, then failing to revert the probe code upon completion.
4. **Variable Masking:** Attempting to fix "undefined" errors by blindly inserting `?.` (Optional Chaining) everywhere. This hides the error deeper; it does not solve *why* the data was missing.
5. **Caching Blindness:** Debugging API mismatches for 20 minutes without ever considering that the browser, CDN, Next.js intermediate layer, or Service Worker is serving stale cached iterations of the file.
6. **Async Assumption:** Believing that writing `console.log(1)` then `await fetch()` then `console.log(2)` guarantees sequential execution if there are unhandled Promise rejections hanging the event loop.
7. **Environment Sync Decay:** Attempting to debug complex routing flaws without first verifying the `.env` configuration file contains the required `PUBLIC_URL` or `API_ENDPOINT` keys.
8. **Syntax Tyranny:** Believing an obscure framework configuration bug is actually a typo, wasting tokens tweaking parentheses and brackets instead of reading the framework documentation.
9. **No Regression Verification:** The AI generates the fix but completely neglects to write the corresponding unit test ensuring the bug is permanently eliminated from future releases.
10. **The "Everything is Fine" Trap:** Stating "The code looks perfectly correct" because the individual function appears logically sound, entirely ignoring that the *data being passed into it* by the upstream parent component is catastrophically malformed.

---

## 🏛️ Tribunal Integration

### ✅ Pre-Flight Self-Audit
```
✅ Was the bug physically isolated using rigorous replication scenarios before modifying code?
✅ Has a hypothesis been formulated based on specific log outputs or empirical data traces?
✅ Were structural boundaries stripped away to test absolute core logic independently?
✅ Did I rely on analyzing the complete stack trace rather than making "common sense" guesses?
✅ Was optional chaining (`?.`) avoided as a band-aid if fundamental strict data contracts were broken?
✅ Have external factors (database latency, browser cache, CORS rules) been evaluated?
✅ Is the proposed surgical fix absolutely minimized (preventing shotgun surgery)?
✅ Did I write a deterministic test that permanently flags this specific regression going forward?
✅ Are environmental configurations (.env variables) synchronized and verified?
✅ Upon confirming the root cause, were any temporary diagnostic probes cleanly rolled back?
```
