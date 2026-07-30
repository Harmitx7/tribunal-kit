---
description: Hybrid 3-Pass Code Generation pipeline. Pass 1 (Planner) → Pass 2 (Builder) → Pass 3 (Zero-LLM Deterministic Validator). Maximizes code generation quality while keeping prompt context hyper-efficient.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - clean-code
  - codebase-design
  - lint-and-validate
scripts-binding:
  - .agent/scripts/pipeline_engine.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/security_scan.js
---

# /pipeline — Hybrid 3-Pass Code Generation

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before running 3-pass pipeline generation, you MUST inspect:
1. Pipeline Engine Script (`.agent/scripts/pipeline_engine.js`) → Verify availability and options (`--task`, `--file`, `--phase`)
2. Context Token Allocation -> Keep Pass 2 builder prompt under 2,500 tokens (loading max 3 essential skill key-rules)
3. Zero-LLM Pass 3 Validator → Run deterministic security, lint, and type checks on generated code prior to Human Gate submission

## When to Use /pipeline

| Use `/pipeline` when...                         | Use something else when...                     |
| :---------------------------------------------- | :--------------------------------------------- |
| Code generation quality is the top priority     | Quick single-line fix → direct edit            |
| Context window saturation is causing weak output | Need full tribunal review → `/generate`        |
| Building UI components, APIs, or complex logic  | Exploring options → `/brainstorm`              |
| You want maximum LLM attention on code synthesis | Planning architecture → `/plan`                |

---

## Architecture

```
User Task → Pass 1 (Planner) → Pass 2 (Builder) → Pass 3 (Validator) → Human Gate
              ~1,500 tokens     ~2,500 tokens       0 tokens (deterministic)
```

**vs. monolithic /generate: ~12,000–18,000 tokens in a single pass**

---

## Phase 1 — Plan (Automatic)

The pipeline engine classifies the task, detects the stack, and selects 2-3 essential skills.

```bash
node .agent/scripts/pipeline_engine.js --task "$TASK" --file "$FILE" --phase plan --output json
```

Output: Structured spec JSON with task_type, stack, essential_skills, and constraints.

**Human Gate**: Review the spec before proceeding to generation.

---

## Phase 2 — Build (Focused Generation)

Assembles a minimal prompt containing ONLY:
- The spec from Phase 1
- 2-3 essential skill key-rules (condensed)
- Target file content (if modifying existing code)

```bash
node .agent/scripts/pipeline_engine.js --task "$TASK" --file "$FILE" --phase build --output prompt
```

**What is NOT in the prompt (saving ~10,000 tokens):**
- ❌ Full GEMINI.md master rules
- ❌ Agent persona definitions
- ❌ Tribunal gate rules
- ❌ Error recovery protocol
- ❌ Fabel Protocol cognitive loops
- ❌ Unrelated domain skills

The LLM receives a clean, focused prompt and can dedicate 75%+ of its attention to generating high-quality code.

---

## Phase 3 — Validate (Zero-LLM Deterministic)

After code is generated, run deterministic validation:

```bash
node .agent/scripts/pipeline_engine.js --phase validate --code ./output.tsx
```

Checks:
- ✅ OWASP security patterns (eval, innerHTML, hardcoded secrets, SQL injection)
- ✅ TypeScript `any` usage
- ✅ Empty catch blocks
- ✅ Console.log pollution
- ✅ Error handling gaps

If validation fails → structured feedback is generated for automated retry (max 3 attempts).

---

## Full Pipeline (All Phases)

```bash
node .agent/scripts/pipeline_engine.js --task "$TASK" --file "$FILE" --output report
```

Or in dry-run mode:
```bash
node .agent/scripts/pipeline_engine.js --task "$TASK" --file "$FILE" --dry-run
```

---

## Pipeline Guard

```
❌ Never load GEMINI.md into Pass 2 — the planner already distilled what's needed
❌ Never skip Pass 3 validation — it's zero-cost (no LLM calls)
❌ Never select more than 3 skills for a single generation pass
❌ Never inject agent persona definitions into the builder prompt
❌ Never bypass the Human Gate — even in pipeline mode
```

---

## Comparison: /generate vs /pipeline

| Dimension                     | `/generate` (current) | `/pipeline` (new)       |
| :---------------------------- | :-------------------- | :---------------------- |
| System prompt tokens          | ~12,000–18,000        | ~2,500 (Pass 2)         |
| % context for actual task     | ~11%                  | ~75%                    |
| Governance overhead           | ~89%                  | ~25%                    |
| Post-gen validation           | LLM-based (expensive) | Deterministic (free)    |
| Skills loaded per generation  | 6–10                  | 2–3                     |
| Self-healing retry            | Full re-generation    | Targeted feedback loop  |
| Backward compatibility        | N/A                   | 100% (additive)         |

---

## After /pipeline — Next Steps

| Outcome                       | Next Command                        |
| :---------------------------- | :---------------------------------- |
| Code generated, needs review  | → `/review` for human audit         |
| Code has issues after retry   | → `/generate` with full tribunal    |
| Code passed, ready to test    | → `/test` for test generation       |
| Code passed, ready to deploy  | → `/deploy` with pre-flight checks  |

---
