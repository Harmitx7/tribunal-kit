---
name: huggingface-community-evals
description: "Use when Run evaluations for Hugging Face Hub models using inspect-ai and lighteval on local hardware. Use for backend selection, local GPU evals, and choosing between vLLM / Transformers / accelerate. Not for HF Jobs orchestration, model-card PRs, .eval_results publication, or community-evals automation."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Overview

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `huggingface-community-evals` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Run evaluations for Hugging Face Hub models using inspect-ai and lighteval on local hardware. Use for backend selection, local GPU evals, and choosing between vLLM / Transformers / accelerate. Not for HF Jobs orchestration, model-card PRs, .eval_results publication, or community-evals automation.
- **DO NOT activate when:** The task falls outside the `huggingface-community-evals` domain or is managed by a different dedicated specialist agent.


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


This skill is for **running evaluations against models on the Hugging Face Hub on local hardware**.

It covers:
- `inspect-ai` with local inference
- `lighteval` with local inference
- choosing between `vllm`, Hugging Face Transformers, and `accelerate`
- smoke tests, task selection, and backend fallback strategy

It does **not** cover:
- Hugging Face Jobs orchestration
- model-card or `model-index` edits
- README table extraction
- Artificial Analysis imports
- `.eval_results` generation or publishing
- PR creation or community-evals automation

If the user wants to **run the same eval remotely on Hugging Face Jobs**, hand off to the `hugging-face-jobs` skill and pass it one of the local scripts in this skill.

If the user wants to **publish results into the community evals workflow**, stop after generating the evaluation run and hand off that publishing step to `~/code/community-evals`.

> All paths below are relative to the directory containing this `SKILL.md`.

# When To Use Which Script

| Use case | Script |
|---|---|
| Local `inspect-ai` eval on a Hub model via inference providers | `scripts/inspect_eval_uv.py` |
| Local GPU eval with `inspect-ai` using `vllm` or Transformers | `scripts/inspect_vllm_uv.py` |
| Local GPU eval with `lighteval` using `vllm` or `accelerate` | `scripts/lighteval_vllm_uv.py` |
| Extra command patterns | `examples/USAGE_EXAMPLES.md` |

# Prerequisites

- Prefer `uv run` for local execution.
- Set `HF_TOKEN` for gated/private models.
- For local GPU runs, verify GPU access before starting:

```bash
uv --version
printenv HF_TOKEN >/dev/null
nvidia-smi
```

If `nvidia-smi` is unavailable, either:
- use `scripts/inspect_eval_uv.py` for lighter provider-backed evaluation, or
- hand off to the `hugging-face-jobs` skill if the user wants remote compute.

# Core Workflow

1. Choose the evaluation framework.
   - Use `inspect-ai` when you want explicit task control and inspect-native flows.
   - Use `lighteval` when the benchmark is naturally expressed as a lighteval task string, especially leaderboard-style tasks.
2. Choose the inference backend.
   - Prefer `vllm` for throughput on supported architectures.
   - Use Hugging Face Transformers (`--backend hf`) or `accelerate` as compatibility fallbacks.
3. Start with a smoke test.
   - `inspect-ai`: add `--limit 10` or similar.
   - `lighteval`: add `--max-samples 10`.
4. Scale up only after the smoke test passes.
5. If the user wants remote execution, hand off to `hugging-face-jobs` with the same script + args.

# Quick Start

## Option A: inspect-ai with local inference providers path

Best when the model is already supported by Hugging Face Inference Providers and you want the lowest local setup overhead.

```bash
uv run scripts/inspect_eval_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task mmlu \
  --limit 20
```

Use this path when:
- you want a quick local smoke test
- you do not need direct GPU control
- the task already exists in `inspect-evals`

## Option B: inspect-ai on Local GPU

Best when you need to load the Hub model directly, use `vllm`, or fall back to Transformers for unsupported architectures.

Local GPU:

```bash
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task gsm8k \
  --limit 20
```

Transformers fallback:

```bash
uv run scripts/inspect_vllm_uv.py \
  --model microsoft/phi-2 \
  --task mmlu \
  --backend hf \
  --trust-remote-code \
  --limit 20
```

## Option C: lighteval on Local GPU

Best when the task is naturally expressed as a `lighteval` task string, especially Open LLM Leaderboard style benchmarks.

Local GPU:

```bash
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-3B-Instruct \
  --tasks "leaderboard|mmlu|5,leaderboard|gsm8k|5" \
  --max-samples 20 \
  --use-chat-template
```

`accelerate` fallback:

```bash
uv run scripts/lighteval_vllm_uv.py \
  --model microsoft/phi-2 \
  --tasks "leaderboard|mmlu|5" \
  --backend accelerate \
  --trust-remote-code \
  --max-samples 20
```

# Remote Execution Boundary

This skill intentionally stops at **local execution and backend selection**.

If the user wants to:
- run these scripts on Hugging Face Jobs
- pick remote hardware
- pass secrets to remote jobs
- schedule recurring runs
- inspect / cancel / monitor jobs

then switch to the **`hugging-face-jobs`** skill and pass it one of these scripts plus the chosen arguments.

# Task Selection

`inspect-ai` examples:
- `mmlu`
- `gsm8k`
- `hellaswag`
- `arc_challenge`
- `truthfulqa`
- `winogrande`
- `humaneval`

`lighteval` task strings use `suite|task|num_fewshot`:
- `leaderboard|mmlu|5`
- `leaderboard|gsm8k|5`
- `leaderboard|arc_challenge|25`
- `lighteval|hellaswag|0`

Multiple `lighteval` tasks can be comma-separated in `--tasks`.

# Backend Selection

- Prefer `inspect_vllm_uv.py --backend vllm` for fast GPU inference on supported architectures.
- Use `inspect_vllm_uv.py --backend hf` when `vllm` does not support the model.
- Prefer `lighteval_vllm_uv.py --backend vllm` for throughput on supported models.
- Use `lighteval_vllm_uv.py --backend accelerate` as the compatibility fallback.
- Use `inspect_eval_uv.py` when Inference Providers already cover the model and you do not need direct GPU control.

# Hardware Guidance

| Model size | Suggested local hardware |
|---|---|
| `< 3B` | consumer GPU / Apple Silicon / small dev GPU |
| `3B - 13B` | stronger local GPU |
| `13B+` | high-memory local GPU or hand off to `hugging-face-jobs` |

For smoke tests, prefer cheaper local runs plus `--limit` or `--max-samples`.

# Troubleshooting

- CUDA or vLLM OOM:
  - reduce `--batch-size`
  - reduce `--gpu-memory-utilization`
  - switch to a smaller model for the smoke test
  - if necessary, hand off to `hugging-face-jobs`
- Model unsupported by `vllm`:
  - switch to `--backend hf` for `inspect-ai`
  - switch to `--backend accelerate` for `lighteval`
- Gated/private repo access fails:
  - verify `HF_TOKEN`
- Custom model code required:
  - add `--trust-remote-code`

# Examples

See:
- `examples/USAGE_EXAMPLES.md` for local command patterns
- `scripts/inspect_eval_uv.py`
- `scripts/inspect_vllm_uv.py`
- `scripts/lighteval_vllm_uv.py`

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
| **Platform-Dependent Shell Commands** | Hardcoding $(cat ~/.cache/huggingface/token) or piping to jq | Use platform-agnostic token checks via env var HF_TOKEN and native JSON parsing |
| **VRAM OOM Crash** | Loading 70B model weights on a consumer 16GB GPU without quantization | Calculate parameter bounds (fp16 = VRAM/2, Q4 = VRAM*2) and load with bitsandbytes/GGUF |
| **Blocking Batch Generation** | Generating large batches synchronously without streaming or yield | Use TextIteratorStreamer or asynchronous generate workers to prevent request timeouts |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `ai-code-reviewer` · `python-pro` · `performance-optimizer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are model architectures and weights verified to fit within target hardware VRAM budgets?
✅ Are pipeline requests guarded with bounded timeouts and retry backoffs?
✅ Are dataset loading scripts operating in streaming mode to prevent out-of-memory errors?
✅ Are API tokens and cache paths handled portably without assuming UNIX shell environments?
✅ Are tokenizers and generation parameters (max_new_tokens, temperature) strictly bounded?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
