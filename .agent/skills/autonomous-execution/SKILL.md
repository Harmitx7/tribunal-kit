---
description: Use when executing subagent tasks autonomously. Defines the scratchpad structure and ReAct loops.
version: 3.0.0
---

# Autonomous Execution (Bounded Jev-style Loop)

$ARGUMENTS

---

## 1. Scratchpad Memory Rule

You MUST initialize and maintain your state in `task-<N>-scratchpad.md`.
Do not try to remember complex API signatures in your context window. Write them down in the scratchpad.

### Scratchpad Structure:

```markdown
# Scratchpad - Task <N>

## 1. Goal

[Briefly state the goal derived from the task brief]

## 2. Execution Plan

- [ ] Step 1
- [ ] Step 2

## 3. Current Context

- `some_file.js`: Exports `functionA(a, b)`
- API: Requires `Bearer` token

## 4. Attempt Log

- Attempt 1: Failed test `x is undefined`. Fix: Update `y`.
```

Whenever you discover something new or fail a test, UPDATE the scratchpad before taking your next action.

## 2. Dynamic Discovery (No Guessing)

Do NOT assume file structures or API endpoints.

- Use `list_dir` or `grep_search` to find the files you need to modify.
- Use `view_file` to read the exact lines of code you are changing.
- Verify every import against `package.json`.

## 3. The ReAct Loop (Thought -> Action -> Observation)

You are in a continuous loop. Do not stop until the task is complete.

1. **Thought:** "I need to find the SDD controller."
2. **Action:** Call `grep_search` for "SDD controller".
3. **Observation:** See results.
4. **Thought:** "I found it in `sdd.js`. I will read it."
5. **Action:** Call `view_file` on `sdd.js`.

## 4. TDD Self-Correction

1. Write tests.
2. Run tests via `run_command` (e.g., `npm run test` or `cargo test`).
3. If they fail, READ the error output.
4. Document the failure in your scratchpad.
5. Fix the code.
6. Loop until tests pass (GREEN).

## 5. Circuit Breaker

If you fail the same test 3 times, or if you reach 10 total iterations, STOP and report the failure in your final output. Do NOT loop infinitely.

## 6. Zero Commits

You are an implementer. You only modify files. The SDD Controller will generate the `.diff` and commit the files after the Tribunal Wave approves your work. DO NOT run `git commit`.
