---
name: skill-creator
description: "Use when executing, coordinating, planning, or reviewing skill creator agent workflows, cognitive loops, and architecture standards."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/skill_integrator.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "skill"
  - "creator"
---

# /skill-creator — Skill Creation & Iterative Improvement Engine

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `skill-creator` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when executing, coordinating, planning, or reviewing skill creator agent workflows, cognitive loops, and architecture standards.
- **DO NOT activate when:** The task falls outside the `skill-creator` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


A specialized meta-skill workflow for creating, evaluating, and iteratively refining new AI skills. 
This skill guides the process from capturing intent to writing the skill, testing it with baseline comparisons, and optimizing its triggering description.

---
## 🔁 The Skill Creation Loop

Execute the creation process using this high-level loop:
1. Decide what the skill should do and how.
2. Write a draft of the skill (`SKILL.md`).
3. Create test prompts and run Claude with access to the skill.
4. Help the user evaluate results (qualitatively and quantitatively).
5. While runs happen, draft quantitative evals.
6. Use the eval-viewer (`generate_review.py`) to show results to the user.
7. Rewrite the skill based on feedback.
8. Repeat until satisfied, then run the description optimizer.

---

## Phase 1 — Capture Intent & Interview

Start by understanding the skill requirements. Ask clarifying questions:
- What should this skill enable Claude to do?
- When should this skill trigger? (What user phrases/contexts?)
- What's the expected output format?
- Should we set up test cases? (Yes for objective tasks like file transforms; maybe no for subjective ones like writing style).

**Research**: Check available MCPs for research via subagents or inline. Come prepared to reduce the burden on the user.

---

## Phase 2 — Write the SKILL.md

Based on the interview, draft the skill components.

- **name**: Skill identifier.
- **description**: Make it slightly "pushy". Include what it does AND specific contexts to trigger it. 
  - *Example*: Instead of "Build a dashboard", use "Use this skill whenever the user mentions dashboards, data visualization, internal metrics, or wants to display any kind of company data, even if they don't explicitly ask for a 'dashboard'."

### Anatomy of a Skill
```text
skill-name/
├── SKILL.md (required - YAML frontmatter + Markdown)
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Templates, icons, fonts
```

### Writing Rules:
- Keep `SKILL.md` under 500 lines. Use progressive disclosure (references) for larger files.
- **Principle of Lack of Surprise**: No malware, no exploit code, no unauthorized access.
- Use imperative form. Explain *why* things are important instead of rigid, heavy-handed MUSTs.
- Include clear input/output examples.
- **Look for repeated work**: If test cases show subagents independently writing similar helper scripts (e.g. `create_docx.py`), bundle that script into `scripts/` and instruct the skill to use it!

---

## Phase 3 — Test Cases & Evaluation

After drafting, create 2-3 realistic test prompts and share them with the user.

Save prompts to `evals/evals.json` (draft assertions later):
```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

### Evaluation Execution Protocol (Crucial!)
1. **Spawn All Runs at Once**: Spawn both with-skill AND baseline subagents in the *same turn*. Save outputs to `<workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/` and `without_skill/outputs/` (or `old_skill/outputs/`).
2. **Draft Assertions While Running**: While runs are ongoing, draft quantitative assertions. Good assertions are objectively verifiable and have descriptive names. Update `eval_metadata.json` and `evals/evals.json`.
3. **Capture Timing Data**: Capture `total_tokens` and `duration_ms` from task notifications immediately to `timing.json` inside the run directory.
4. **Grade and Aggregate**: 
   - Grade each run using an automated grading agent. Save to `grading.json`.
   - Aggregate into benchmark: `python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>`
5. **Launch Eval Viewer**:
   ```bash
   nohup python <skill-creator-path>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   *For iteration 2+, add `--previous-workspace <workspace>/iteration-<N-1>`.*

---

## Phase 4 — Review & Improve

1. Read user feedback from `feedback.json` once the user clicks "Submit All Reviews".
2. **Improve**: Generalize from the feedback. Don't overfit to specific examples. Keep the prompt lean. Explain the *why* behind your instructions.
3. Rerun the iteration loop (apply improvements, rerun tests, launch reviewer) until the user is satisfied or feedback is empty.
4. Kill the viewer server when done: `kill $VIEWER_PID 2>/dev/null`

---

## Phase 5 — Description Optimization (Triggering)

Optimize the `description` to ensure Claude triggers the skill correctly.

1. **Generate Eval Queries**: Create 20 queries (10 should-trigger, 10 should-not-trigger) in JSON format.
   - *Should-trigger*: Concrete, specific, messy real-world prompts (e.g. "my boss sent me this xlsx...").
   - *Should-not-trigger*: Near-misses, adjacent domains, genuinely tricky cases.
2. **Review with User**: Use the `assets/eval_review.html` template. Replace placeholders and open in browser. Wait for the user to export `eval_set.json` (check `~/Downloads/`).
3. **Run Optimization Loop** (in background):
   ```bash
   python -m scripts.run_loop \
     --eval-set <path-to-trigger-eval.json> \
     --skill-path <path-to-skill> \
     --model <model-id-powering-this-session> \
     --max-iterations 5 \
     --verbose
   ```
4. Apply the `best_description` from the output to the skill's frontmatter.

---

## Final Step — Package & Present

If the `present_files` tool is available:
```bash
python -m scripts.package_skill <path/to/skill-folder>
```
Present the `.skill` file path to the user for installation.

---

## Claude.ai / Cowork Specific Adaptations

- **Claude.ai (No Subagents)**: Do test cases yourself serially. Skip baseline runs. Skip the browser reviewer—present results directly in chat. Skip description optimization (requires CLI).
- **Cowork**: You have subagents. Use `--static <output_path>` for `generate_review.py` to write standalone HTML, as there is no browser display. Provide the HTML link to the user.
  - **CRITICAL**: GENERATE THE EVAL VIEWER BEFORE evaluating inputs yourself. You want to get them in front of the human ASAP!

---

## 🚨 Guardrails & Hallucination Traps

```
❌ Never stop partway through the evaluation sequence.
❌ Never spawn with-skill runs and baselines in separate turns.
❌ Never write "ALWAYS" or "NEVER" in all caps if you can explain the reasoning instead.
❌ Never use simple/trivial queries for trigger evals (e.g., "format data").
✅ Always generate the eval viewer for the human to look at examples before revising the skill yourself.
```

## VBC Protocol

**Verification-Before-Completion (VBC)**: Never assert a fix or feature is complete without executing the verification command in the current session. Evidence before claims always.
1. Run `python -m scripts.run_loop --eval-set <eval.json>` to verify description triggers.
2. Produce HTML viewer and get human approval before finishing.

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |


## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
