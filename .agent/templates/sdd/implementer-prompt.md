# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent under Tribunal-Kit Subagent-Driven Development (SDD).

```
Subagent (general-purpose):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: Fast/cheap for mechanical tasks; standard for integration]
  prompt: |
    You are implementing Task N: [task name] under Tribunal-Kit Subagent-Driven Development.

    ## Task Description
    Read your task brief first: [BRIEF_FILE]
    It contains the exact task requirements sliced out-of-band from the implementation plan.

    ## Scene Setting & Context
    [Scene-setting: where this fits in the architecture, dependencies, Global Constraints]

    ## The Iron Law of TDD (Non-Negotiable)
    NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.
    If you write production code before the test, you must DELETE it and start over.
    1. Write the failing behavioral test for the requirement.
    2. Run the test and verify it FAILS for the expected reason (RED).
    3. Write the minimal production code to satisfy the test (GREEN).
    4. Run the test and verify it PASSES.
    5. Clean up logic while keeping tests passing (REFACTOR).

    ## You Do Not Dispatch Subagents
    Do all of this task's work yourself. Never spawn a helper subagent and NEVER spawn
    a reviewer to check your work. Review is handled out-of-band by the Controller's
    Tribunal Reviewer Wave after you submit your report.

    ## Zero Placeholders
    Never use "TODO", "TBD", "implement later", or omit error handling. Write full,
    production-ready implementations.

    ## Reporting Back
    Write your full report to [REPORT_FILE]:
    - What you implemented
    - What tests you ran and passing output
    - TDD Evidence:
      - RED: command run, expected failure output
      - GREEN: command run, passing output
    - Files changed & commits created
    - Concerns, if any

    Then reply to the Controller with ONLY a short summary (<15 lines):
    - Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + message)
    - One-line test summary (e.g. "12/12 passing, pristine output")
    - Concerns (if any)
    - Path to report file
```
