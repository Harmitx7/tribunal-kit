---
name: hf-mem
description: "Use when Hugging Face CLI to estimate the required memory to load Safetensors or GGUF model weights for inference from the Hugging Face Hub"
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Hf Mem Engineering

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `hf-mem` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Hugging Face CLI to estimate the required memory to load Safetensors or GGUF model weights for inference from the Hugging Face Hub
- **DO NOT activate when:** The task falls outside the `hf-mem` domain or is managed by a different dedicated specialist agent.


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


`hf_mem` estimates the required memory for inference, including model weights and an optional KV cache, for Safetensors and GGUF for models on the Hugging Face Hub using HTTP Range requests i.e., without downloading or loading any weights locally.

## When to use?

- User asks how much VRAM or memory a model needs to run
- User wants to know if a model fits on their GPU or a given instance
- User references a Hugging Face model ID or URL and asks about inference requirements

## What are the requirements?

- `uv` installed (for `uvx`)
- `HF_TOKEN` env var or `--hf-token` flag (for gated or private models only)

## How to run?

Run with `--model-id` pointing to the Hugging Face Hub repository which will check that it either contains Safetensors (via `model.safetensors`, `model.safetensors.index.json` if sharded, or `model_index.json` for Diffusers) or GGUF model weights within.

```bash
uvx hf-mem --model-id <model-id> --json-output
```

If the repository contains GGUF model weights in multiple precisions / quantizations, the estimations will be on a per-file basis, whereas for inference you won't load all of those but rather only a single precision. This being said, for GGUF you might as well need to provide `--gguf-file` to target the specific file (or path if sharded) you want to run.

```bash
uvx hf-mem --model-id <model-id> --gguf-file <file-or-path> --json-output
```

Additionally, `hf-mem` comes with an `--experimental` flag that will also calculate the KV cache memory requirements too, useful for large-language models, meaning it applies to LLMs (`...ForCausalLM`), VLMs (`...ForConditionalGeneration`), and GGUF models.

As per the context window, it will be read from the default or overridden with `--max-model-len` a la vLLM. And, same goes for the KV cache precision, which will default to the model precision unless manually set via `--kv-cache-dtype` a la vLLM too.

For Safetensors use as:

```bash
uvx hf-mem --model-id <model-id> --experimental [--max-model-len N] [--batch-size N] [--kv-cache-dtype auto|bfloat16|fp8|fp8_ds_mla|fp8_e4m3|fp8_e5m2|fp8_inc] --json-output
```

And, for GGUF use as:

```bash
uvx hf-mem --model-id <model-id> --gguf-file <file-or-path> --experimental [--max-model-len N] [--batch-size N] [--kv-cache-dtype auto|F32|F16|Q4_0|Q4_1|Q5_0|Q5_1|Q8_0|Q8_1|Q2_K|Q3_K|Q4_K|Q5_K|Q6_K|Q8_K|IQ2_XXS|IQ2_XS|IQ3_XXS|IQ1_S|IQ4_NL|IQ3_S|IQ2_S|IQ4_XS|I8|I16|I32|I64|F64|IQ1_M|BF16|TQ1_0|TQ2_0|MXFP4] --json-output
```

## Examples

For Transformers with Safetensors weights:

```bash
uvx hf-mem --model-id MiniMaxAI/MiniMax-M2 --json-output
```

For Diffusers with Safetensors weights:

```bash
uvx hf-mem --model-id Qwen/Qwen-Image --json-output
```

For Sentence Transformers with Safetensors weights:

```bash
uvx hf-mem --model-id google/embeddinggemma-300m --json-output
```

With `--experimental` to include the KV cache estimation for LLMs and VLMs:

```bash
uvx hf-mem --model-id mistralai/Mistral-7B-v0.1 --experimental --json-output
```

And, for LLMs or VLMs with GGUF weights:

```bash
uvx hf-mem --model-id unsloth/Qwen3.5-397B-A17B-GGUF --gguf-file Q4_K_M --experimental --json-output
```

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
