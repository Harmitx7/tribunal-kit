---
description: Transform existing skills into autonomous, production-grade execution engines using the 18-section architectural framework. Reverse-engineers skills, eliminates generic placeholders, binds active domain reviewers, and enforces Verification-Before-Completion (VBC).
tools: Read, Grep, Glob, Bash, Edit, Write
version: 5.0.0
last-updated: 2026-09-13
required-skills:
  - skill-creator
  - llm-engineering
  - clean-code
---

# /skill-enhancement-engine — State-of-the-Art Skill Architecture

Transforms static skill markdown definitions into **autonomous, production-grade execution systems** that consistently produce expert-level results.

---

## The 18-Part Execution Architecture

Every enhanced skill incorporates the 18-part architectural framework:

1. **Deconstructed Objective Layer**: Core mission, explicit boundaries, non-goals, and success metrics.
2. **Input Intelligence Layer**: Distinguishes explicit from implicit constraints; resolves ambiguous inputs safely without unnecessary interrogation.
3. **Task Decomposition Layer**: Maps step-by-step dependency DAGs, identifying parallelizable streams and critical paths.
4. **Expert Execution Mode**: Operates from domain-specific best practices, avoiding generic boilerplate.
5. **Research & Evidence Mode**: Grounded in official documentation, lockfiles, and active source files.
6. **Tool Intelligence**: Employs strategic, verified tool execution; treats tool failures as actionable signals.
7. **7-Pass Cognitive Execution Protocol**:
   - **Pass 1 — Understand**: Deconstruct objective and constraints.
   - **Pass 2 — Plan**: Build execution DAG and required tool calls.
   - **Pass 3 — Execute**: Implement with high craft and strict typing.
   - **Pass 4 — Verify**: Check outputs against tests, linters, or schemas.
   - **Pass 5 — Attack**: Hostile adversarial audit for edge cases and vulnerabilities.
   - **Pass 6 — Improve**: Refine performance, harden boundaries, fix flaws.
   - **Pass 7 — Quality Gate**: Enforce evidence-based completion standards.
8. **Edge-Case Engine Matrix**: Pre-calibrated mitigations for empty inputs, timeouts, race conditions, schema drift, and resource saturation.
9. **Quality Optimization**: Precision, completeness, correctness, and zero fake completion.
10. **No Fake Completion Guarantee**: Strictly forbids claiming tasks are done without verifiable terminal proof.
11. **Adaptive Depth**: Scales reasoning and tool usage to task complexity.
12. **Output Engine**: Prioritizes actionable code, structured decisions, and checklists over conversational filler.
13. **Decision Quality**: Evaluates dominant tradeoffs when multiple approaches exist.
14. **Continuous Improvement**: Feeds execution telemetry into skill refinements.
15. **Domain Adaptation**: Calibrates active reviewers and checklists to the specific domain.
16. **Conflict Resolution**: Enforces highest-priority safety and system invariants.
17. **Final Quality Gate**: Pre-flight self-audit checklist before delivering answers.
18. **Core Operating Principle**: Behaves as an expert system responsible for the user's intended outcome.

---

## CLI Usage

```bash
# Preview changes across all skills
node runners/skill_enhancement_engine.js --all --dry-run

# Enhance a single skill
node runners/skill_enhancement_engine.js --skill <skill-name> --fix

# Enhance all skills within a domain cluster (motion, frontend, backend, security, devops, database, testing, mobile)
node runners/skill_enhancement_engine.js --domain motion --fix

# Enhance all 185 skills and mirror changes to workspace root
node runners/skill_enhancement_engine.js --all --fix --sync-to-root

# Validate payload and SDO triggers
node runners/validate-payload.js
node runners/audit_skill_sdo.js
```

---

## Integration with Tribunal Reviewers

| Domain     | Mapped Active Reviewers                                                         |
| :--------- | :------------------------------------------------------------------------------ |
| `frontend` | `frontend-reviewer` · `type-safety` · `ui-ux-auditor` · `complexity-reviewer`   |
| `motion`   | `frontend-reviewer` · `motion-reviewer` · `ui-ux-auditor`                       |
| `backend`  | `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer` |
| `database` | `database-architect` · `sql-pro` · `security-auditor` · `schema-validator`      |
| `security` | `security-auditor` · `penetration-tester` · `backend-security-expert`           |
| `devops`   | `pipeline-reviewer` · `devops-engineer` · `resilience-reviewer`                 |
| `testing`  | `test-engineer` · `qa-automation-engineer` · `logic-reviewer`                   |
| `mobile`   | `mobile-reviewer` · `frontend-reviewer` · `type-safety`                         |
| `meta`     | `orchestrator` · `agent-organizer` · `logic-reviewer`                           |
