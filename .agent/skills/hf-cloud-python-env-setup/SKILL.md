---
name: hf-cloud-python-env-setup
description: "Use when Set up an isolated Python environment for SageMaker / AWS work, with the right Python version and current boto3. Use this skill whenever Python code will be executed for a SageMaker deployment, training job, or any AWS automation — including when about to run `pip install`, when about to invoke `boto3`, when creating or activating a virtualenv, or when the user asks to \"set up the environment\". Never use system Python and never `pip install` into it. Always isolate. This skill prevents the most common failure modes: wrong Python version, dependency conflicts, and stale SDKs."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "python"
  - "env"
  - "setup"
---

# Python Environment Setup for SageMaker

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `hf-cloud-python-env-setup` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Set up an isolated Python environment for SageMaker / AWS work, with the right Python version and current boto3. Use this skill whenever Python code will be executed for a SageMaker deployment, training job, or any AWS automation — including when about to run `pip install`, when about to invoke `boto3`, when creating or activating a virtualenv, or when the user asks to "set up the environment". Never use system Python and never `pip install` into it. Always isolate. This skill prevents the most common failure modes: wrong Python version, dependency conflicts, and stale SDKs.
- **DO NOT activate when:** The task falls outside the `hf-cloud-python-env-setup` domain or is managed by a different dedicated specialist agent.


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


Most SageMaker deployment failures that look like AWS problems are actually Python environment problems: wrong Python version, broken dependency resolution, stale SDK that doesn't know about a current API. This skill makes env setup boring and correct.

## Core rules

1. **Never use the system Python.** Always work inside an isolated environment.
2. **Pin the Python version, not the package versions.** Use 3.10, 3.11, or 3.12. Avoid 3.13+ — ML libraries lag on wheel availability and dependency resolution breaks in confusing ways.
3. **Install the latest of each package.** Don't defensively pin `boto3` or `awscli`. Newer ones have current API surfaces and security fixes. Only pin if the user explicitly requires a specific version.
4. **Check installed versions correctly.** Use `importlib.metadata.version("package-name")`, never `module.__version__`. The latter is inconsistent across packages.
5. **The bundled scripts use `boto3` directly.** The SageMaker Python SDK is a valid alternative — see "boto3 vs the SageMaker SDK" below.

## boto3 vs the SageMaker SDK

The bundled deploy scripts (`deploy.py`, `deploy_async.py`, `teardown.py`) use `boto3` directly and read image URIs from [AWS's published Deep Learning Containers catalog](https://aws.github.io/deep-learning-containers/reference/available_images/). That fits this workflow's explicit-stages design — each skill produces a concrete value (region, role ARN, image URI) that the next one consumes — and `boto3` is the stable underlying API client.

The SageMaker Python SDK (v3) is fine to use when the user prefers it or their project already does. Since [PR #5960](https://github.com/aws/sagemaker-python-sdk/pull/5960) (June 2026), `ModelBuilder` auto-routes HuggingFace models to the current containers (text-generation → HuggingFace vLLM, multimodal → vLLM-Omni, embeddings → TEI). Don't avoid the SDK over stale-image or wrong-container concerns — that routing is fixed.

Two specific SDK cases that still need care:

- **Generative rerankers**: the SDK routes the `text-ranking` task to TEI unconditionally, which is wrong for causal-LM rerankers like Qwen3-Reranker — those need vLLM (see `hf-cloud-serving-image-selection`). Pass the container explicitly for these models.
- **SSO assumed-role credentials**: v3 has had credential-resolution regressions in `ModelTrainer` / `FrameworkProcessor` under SSO profiles. If SDK calls fail with credential errors while `aws sts get-caller-identity` succeeds in the same shell, suspect this rather than your AWS config.

If you use the SDK, install it into the isolated env like everything else (`.venv/bin/python -m pip install sagemaker`). The bundled scripts don't require it.

## How to set up

The fastest path is the bundled script — it's Python, so it runs the same on Windows, macOS, and Linux:

```bash
python3 scripts/setup_env.py        # macOS / Linux
python  scripts/setup_env.py        # Windows (PowerShell / cmd)
```

This script detects `uv` and uses it if available (faster), falls back to the stdlib `venv` module, creates `.venv/` with Python 3.12 (override: `python3 setup_env.py .venv 3.11`), refuses unsupported Python versions, installs from the bundled `requirements.txt`, and is idempotent. It also prints the correct interpreter path for the host OS (see below).

Manual equivalent:

```bash
# Preferred: uv
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python --upgrade boto3 awscli   # Windows: .venv\Scripts\python.exe

# Fallback: stdlib venv
python3.12 -m venv .venv
.venv/bin/python -m pip install --upgrade pip boto3 awscli
```

After setup, **invoke the env's Python explicitly** rather than activating the venv. The interpreter path differs by platform:

```bash
.venv/bin/python deploy.py            # macOS / Linux
.venv\Scripts\python.exe deploy.py    # Windows
```

This works the same in scripts, interactive shells, and agent tool calls. The rest of this skill writes `.venv/bin/python` for brevity — on Windows substitute `.venv\Scripts\python.exe`.

## Verifying

```bash
.venv/bin/python scripts/check_versions.py
```

Prints versions of `boto3`, `botocore`, `awscli`. Uses `importlib.metadata.version()` so it works on every package, including ones without `__version__`. Pass arbitrary names: `... check_versions.py transformers huggingface_hub`.

## Deployment-specific extras

Default `requirements.txt` covers SageMaker orchestration. Some deployments need extras (`huggingface_hub` for model inspection, `transformers` for tokenizer validation). Add these to a deployment-specific requirements file in the project, install with the env's Python, don't pin unless there's a reason.

## Common pitfalls

**Mysterious `pip install` resolution errors**
Almost always Python 3.13+ trying to install packages without wheels yet, or installing into a polluted system Python. Recreate at 3.12: delete `.venv` and re-run `python3 setup_env.py .venv 3.12` (the script recreates the env when the version doesn't match, so you can also just re-run it).

**`pip install` succeeded but the script says "module not found"**
You installed into a different interpreter than the one running the script. Always invoke Python explicitly: `.venv/bin/python -m pip install ...` and `.venv/bin/python deploy.py`.

**Inline `python -c "..."` one-liners fail in PowerShell**
PowerShell's quoting rules mangle nested/escaped quotes in inline Python. Don't debug the quoting — write the snippet to a small `.py` file and run that. (All bundled helpers are files for exactly this reason.)

**boto3 call fails with "unknown parameter"**
Your boto3 is older than the API surface. Upgrade with `.venv/bin/python -m pip install --upgrade boto3`. Don't downgrade the script to match an old version.

**`sagemaker` (the SDK) installed but the bundled scripts fail**
The bundled scripts don't use the SDK — they only need `boto3`/`awscli` from `requirements.txt`. Installing `sagemaker` alongside is harmless, but it doesn't replace the requirements install.

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
