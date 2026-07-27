---
name: diagnosing-bugs
description: Systematic bug diagnosis methodology for hard bugs: Phase 1 (Build feedback loop), Phase 2 (Reproduce + minimise), Phase 3 (Hypothesise), Phase 4 (Instrument), Phase 5 (Fix + regression test), Phase 6 (Cleanup + post-mortem).
version: 2.0.0
last-updated: 2026-07-22
applies-to-model: gemini-3-6-flash, claude-3-7-sonnet
routing:
  domain: Systematic Debugging & Root Cause Isolation
  tier: pro
  co-requires: [systematic-debugging, test-result-analyzer]
  trigger-signals:
    strong: [diagnosing-bugs, systematic bug diagnosis, reproduce bug, root cause isolation, intermittent bug, debug protocol, hard bugs]
    weak: [fix bug, investigate error]
---

# Diagnosing Bugs — A Discipline for Hard Bugs

A systematic discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, read `CONTEXT.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

---

## Protocol Overview

```
Phase 1: Build a Feedback Loop ──► Phase 2: Reproduce + Minimise ──► Phase 3: Hypothesise
                                                                               │
Phase 6: Cleanup + Post-Mortem ◄── Phase 5: Fix + Regression Test ◄── Phase 4: Instrument
```

---

## Phase 1 — Build a Feedback Loop

This is the core skill. Everything else is mechanical. If you have a tight pass/fail signal for the bug — one that goes red on this bug — you will find the cause; bisection, hypothesis-testing, and instrumentation all just consume it. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. Be aggressive. Be creative. Refuse to give up.

### 10 Strategies to Construct a Feedback Loop (in priority order)

1. **Failing Test at Whatever Seam Reaches the Bug**: Unit, integration, or E2E test.
2. **Curl / HTTP Script**: Send requests against a running dev server.
3. **CLI Invocation with Fixture Input**: Diffing stdout/stderr against a known-good snapshot.
4. **Headless Browser Script (Playwright / Puppeteer)**: Drives the UI, asserts on DOM/console/network.
5. **Replay a Captured Trace**: Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway Harness**: Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / Fuzz Loop**: If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection Harness**: If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can run `git bisect`.
9. **Differential Loop**: Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL Bash Script**: Last resort. If a human must click, drive them with `scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the Loop

Treat the loop as a product. Once you have a loop, tighten it:
- **Can I make it faster?** (Cache setup, skip unrelated init, narrow the test scope.)
- **Can I make the signal sharper?** (Assert on the specific symptom, not "didn't crash".)
- **Can I make it more deterministic?** (Pin time, seed RNG, isolate filesystem, freeze network.)

> ⚡ **Debugging Superpower**: A 30-second flaky loop is barely better than no loop; a 2-second deterministic one is a debugging superpower.

### Non-Deterministic Bugs

The goal is not a clean repro but a higher reproduction rate. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When You Genuinely Cannot Build a Loop

Stop and say so explicitly. List what you tried. Ask the user for:
1. Access to whatever environment reproduces it.
2. A captured artifact (HAR file, log dump, core dump, screen recording with timestamps).
3. Permission to add temporary production instrumentation.

*Do not proceed to hypothesise without a loop.*

### Phase 1 Completion Criterion — A Tight Loop That Goes Red

Phase 1 is done when the loop is tight and red-capable: you can name **one command** — a script path, a test invocation, a curl — that you have already run at least once (paste the invocation and its output), and that is:
- ✅ **Red-capable**: Drives the actual bug code path and asserts the user's exact symptom, going red on this bug and green once fixed. Not "runs without erroring" — it must catch this specific bug.
- ✅ **Deterministic**: Same verdict every run (or high, pinned reproduction rate).
- ✅ **Fast**: Seconds, not minutes.
- ✅ **Agent-runnable**: Runnable unattended (HITL only via `scripts/hitl-loop.template.sh`).

*If you catch yourself reading code to build a theory before this command exists, stop. No red-capable command, no Phase 2.*

---

## Phase 2 — Reproduce + Minimise

Run the loop. Watch it go red — the bug appears.

### Confirm
1. The loop produces the failure mode the user described — not a different failure nearby. (Wrong bug = wrong fix.)
2. The failure is reproducible across multiple runs (or at a high enough reproduction rate).
3. You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix addresses it.

### Minimise
Once it's red, shrink the repro to the smallest scenario that still goes red. Cut inputs, callers, config, data, and steps one at a time, re-running the loop after each cut — keep only what's load-bearing for the failure.

> 🎯 **Why bother**: A minimal repro shrinks the hypothesis space in Phase 3 (fewer moving parts left to suspect) and becomes the clean regression test in Phase 5.

**Done when every remaining element is load-bearing — removing any single one makes the loop go green.**

---

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

**Format**: `"If [X] is the cause, then [Y] will make the bug disappear / will make it worse."`

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

Show the ranked list to the user before testing. (Proceed with your ranking if the user is AFK.)

---

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. Change one variable at a time.

### Tool Preference
1. **Debugger / REPL Inspection**: If the environment supports it. One breakpoint beats ten logs.
2. **Targeted Logs**: Place logs at boundaries that distinguish hypotheses. Never "log everything and grep".
3. **Tag Every Debug Log**: Prefix every debug log with a unique tag, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep.
4. **Performance Profiling Branch**: For performance regressions, establish a baseline measurement (`timing harness`, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

---

## Phase 5 — Fix + Regression Test

Write the regression test before the fix — but only if there is a correct seam for it.

A correct seam is one where the test exercises the real bug pattern as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

If no correct seam exists, note it. The codebase architecture is preventing the bug from being locked down. Flag this for Phase 6.

### If a Correct Seam Exists:
1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

---

## Phase 6 — Cleanup + Post-Mortem

### Required Before Declaring Done
- [ ] Original repro no longer reproduces (re-run Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (grep the prefix)
- [ ] Throwaway prototypes deleted (or moved to debug location)
- [ ] Correct hypothesis stated in commit / PR message

### Post-Mortem Handoff
Ask: **What would have prevented this bug?** If the answer involves architectural debt (no good test seam, tangled callers, hidden coupling), hand off to `/improve-codebase-architecture` with specific findings.

---

## 🤖 LLM-Specific Traps

1. **Shotgun Debugging**: Making random edits across multiple files hoping the error disappears.
2. **Reading Code to Build Theories Before Having a Red Loop**: Jumping straight to hypotheses without a red-capable command.
3. **Symptom Swallowing**: Wrapping a throwing call in silent `try/catch` or returning empty fallbacks instead of addressing root cause.
4. **Testing Multiple Hypotheses at Once**: Changing multiple variables simultaneously, creating ambiguous results.

---

## 🏛️ Tribunal Integration & Pre-Flight Self-Audit

**Active Reviewers: `debugger` · `logic-reviewer` · `resilience-reviewer`**

```
✅ Has a red-capable feedback loop command been executed and verified red?
✅ Has the repro scenario been minimised to only load-bearing elements?
✅ Were 3–5 falsifiable hypotheses formulated before testing?
✅ Are all debug logs tagged with [DEBUG-...] and cleaned up before merge?
✅ Has a regression test been added at a valid seam?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
