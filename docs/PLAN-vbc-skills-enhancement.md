# Plan: Verification-Before-Completion (VBC) Protocol Integration

## What Done Looks Like
Multiple execution and debugging skills (`systematic-debugging`, `plan-writing`, `tdd-workflow`, `app-builder`, `clean-code`, `python-pro`, `react-specialist`, `rust-pro`, `sql-pro`, `devops-incident-responder`) are updated to mandate a strict "evidence-based closeout" state machine, explicitly forbidding agents from completing tasks without concrete terminal/compiler evidence that the code works.

## Won't Include in This Version
- Creating any new skills.
- Altering the core persona or primary responsibilities of the existing skills (only adding the verification constraints).
- Enhancing pure theory or brainstorming skills (e.g., `trend-researcher`, `frontend-design`) where code execution is not applicable.

## Unresolved Questions
- Should the verification protocol force the agent to prompt the human if it lacks access to a testing environment, or should it attempt to write a script to mock the environment? [VERIFY: Preferred behavior when environment blocks execution]

## Estimates (Ranges + Confidence)
- Research & Review current skill prompt structures: 10 mins / 20 mins / 30 mins (High Confidence)
- Implementing VBC logic across 10 skills: 20 mins / 40 mins / 60 mins (High Confidence)
- Testing & Adjusting prompt effectiveness: 15 mins / 30 mins / 45 mins (Medium Confidence)

## Task Table

| # | Task | Agent | Depends on | Done when |
|---|------|-------|-----------|-----------|
| 1 | Upgrade `systematic-debugging`, `tdd-workflow`, `plan-writing` | orchestrator | none | `SKILL.md` files explicitly mandate terminal evidence before task completion. |
| 2 | Upgrade core language execution skills (`python-pro`, `react-specialist`, `rust-pro`, `sql-pro`) | orchestrator | none | `SKILL.md` files require tests/queries to run successfully before ending a turn. |
| 3 | Upgrade infrastructure/building skills (`app-builder`, `clean-code`, `devops-incident-responder`) | orchestrator | none | `SKILL.md` files require build/lint/deployment success logs to be read back. |
| 4 | Run `config-validator` | orchestrator | #1, #2, #3 | The validation script passes without errors. |

## Review Gates

| Task | Tribunal |
|---|---|
| #1 Debugging/Testing VBC | /review |
| #2 Core Language VBC | /review |
| #3 Infrastructure VBC | /review |
