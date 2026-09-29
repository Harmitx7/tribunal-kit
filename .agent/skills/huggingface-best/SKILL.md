---
name: huggingface-best
description: "Use when loading, evaluating, fine-tuning, and deploying huggingface best machine learning models, datasets, and inference pipelines."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# HuggingFace Best Model Finder

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `huggingface-best` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when loading, evaluating, fine-tuning, and deploying huggingface best machine learning models, datasets, and inference pipelines.
- **DO NOT activate when:** The task falls outside the `huggingface-best` domain or is managed by a different dedicated specialist agent.


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


Finds the best models for a task by querying official HF benchmark leaderboards, enriching
results with model size data, filtering for what fits on the user's device, and returning a
comparison table with benchmark scores.

---

## Step 1: Parse the request

Extract from the user's message:
- **Task**: what they want the model to do (coding, math/reasoning, chat, OCR, RAG/retrieval, speech recognition, image classification, multimodal, agents, etc.)
- **Device**: hardware constraints (MacBook M-series 8/16/32/64GB unified memory, RTX GPU with VRAM amount, CPU-only, cloud/no constraint, etc.)

If device is not mentioned, skip filtering entirely and return the highest-performing models regardless of size. If the task is genuinely ambiguous, ask one clarifying question.

### Device → max parameter budget

When a device is specified, extract its available memory (unified RAM for Apple Silicon, VRAM for discrete GPUs) and apply:

- **fp16 max params (B)** ≈ memory (GB) ÷ 2
- **Q4 max params (B)** ≈ memory (GB) × 2

Examples: 16GB → 8B fp16 / 32B Q4 — 24GB VRAM → 12B fp16 / 48B Q4 — 8GB → 4B fp16 / 16B Q4

---

## Step 2: Find relevant benchmark datasets

Fetch the full list of official HF benchmarks:

```bash
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/datasets?filter=benchmark:official&limit=500" | jq '[.[] | {id, tags, description}]'
```

Read the returned list and select the datasets most relevant to the user's task — match on dataset id, tags, and description. Use your judgment; don't limit yourself to 2-3. Aim for comprehensive coverage: if 5 benchmarks clearly cover the task, use all 5.

---

## Step 3: Fetch top models from leaderboards

For each selected benchmark dataset:

```bash
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/datasets/<namespace>/<repo>/leaderboard" | jq '[.[:15] | .[] | {rank, modelId, value, verified}]'
```

Collect model IDs and scores across all benchmarks. If a leaderboard returns an error (404, 401, etc.), skip it and note it in the output.

---

## Step 4: Enrich with model metadata

For the top 10-15 candidate model IDs, get model infos.

```bash
# REST API
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/models/org/model1" | jq '{safetensors, tags, cardData}'

# CLI (hf-cli)
hf models info org/model1 --json | jq '{safetensors, tags, cardData}'
```

Extract from each response:
- **Parameters**: `safetensors.total` → convert to B (e.g., 7_241_748_480 → "7.2B")
- **License**: from model card tags (look for `license:apache-2.0`, `license:mit`, etc.)
- If `safetensors` is absent, parse size from the model name (look for "7b", "8b", "13b", "70b", "72b", etc.)

---

## Step 5: Filter and rank

**If a device was specified:**
1. Remove models exceeding the fp16 parameter budget for the device
2. Flag models that fit only with Q4 quantization (multiply budget by ~4 for Q4 capacity)
3. If a highly-ranked model is slightly over budget, keep it with a "needs Q4" note — don't silently drop it

**If no device was mentioned:** skip all size filtering — just rank by benchmark score.

Then: rank by benchmark score (descending), keep top 5-8 models.

Include proprietary models (GPT-4, Claude, Gemini) if they appear on leaderboards, but flag them as "API only / not self-hostable". If the user explicitly asked for local/open models only, exclude them.

---

## Step 6: Output

### Comparison table

```markdown
| # | Model | Params | [Benchmark 1] | [Benchmark 2] | License | On device |
|---|-------|--------|--------------|--------------|---------|-----------|
| ⭐1 | [org/name](https://huggingface.co/org/name) | 7B | 85.2% | — | Apache 2.0 | Yes (fp16) |
| 2 | [org/name](https://huggingface.co/org/name) | 13B | 83.1% | 71.5% | MIT | Q4 only |
| 3 | [org/name](https://huggingface.co/org/name) | 70B | 90.0% | 81.0% | Llama | Too large |
```

- Link model names to `https://huggingface.co/<model_id>`
- Use `—` for benchmarks where the model wasn't evaluated
- Star the top recommended pick with ⭐
- "On device" values: `Yes (fp16)`, `Q4 only`, `Too large`, `API only`

### Follow-up

After presenting the table, ask the user: "Would you like to run **[top recommended model]**?"

If they say yes, ask whether they'd prefer to:
- **Run locally** — ask about their device if not already known, then give appropriate setup instructions
- **Run on HF Jobs** — point them to the HF Jobs guide: https://huggingface.co/docs/huggingface_hub/en/guides/jobs

---

## Error handling

- **Leaderboard not found**: skip, note "leaderboard unavailable" in output
- **Model missing from hub_repo_details**: fall back to parsing size from model name
- **No benchmarks found for task**: use the curated fallback table above, or try `hub_repo_search` with `filters=["<task>"]` sorted by `trendingScore`
- **All leaderboards fail**: fall back to `hub_repo_search` for popular models tagged with the task, note that results are by popularity rather than benchmark score

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
