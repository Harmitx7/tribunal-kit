---
name: hf-cloud-sagemaker-iam-preflight
description: "Use when Ensure a usable SageMaker execution role exists before deploying or training. Use this skill whenever about to create a SageMaker endpoint, model, training job, or any resource that requires an execution role. Use it especially when the user has not provided a role ARN explicitly, when scripts are about to call `iam:CreateRole`, or when an AccessDenied error mentions an IAM action. Never blindly call `iam:CreateRole` — always check for existing roles first. This skill prevents the most common SageMaker deployment failure: trying to create IAM resources from an SSO principal that has no IAM write permissions."
version: 6.0.0
last-updated: 2026-09-29
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# SageMaker IAM Preflight

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `hf-cloud-sagemaker-iam-preflight` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Ensure a usable SageMaker execution role exists before deploying or training. Use this skill whenever about to create a SageMaker endpoint, model, training job, or any resource that requires an execution role. Use it especially when the user has not provided a role ARN explicitly, when scripts are about to call `iam:CreateRole`, or when an AccessDenied error mentions an IAM action. Never blindly call `iam:CreateRole` — always check for existing roles first. This skill prevents the most common SageMaker deployment failure: trying to create IAM resources from an SSO principal that has no IAM write permissions.
- **DO NOT activate when:** The task falls outside the `hf-cloud-sagemaker-iam-preflight` domain or is managed by a different dedicated specialist agent.


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


Every SageMaker resource needs an **execution role** — the IAM role SageMaker assumes to read model artifacts from S3, pull serving containers from ECR, and write logs. Most deployments fail here because the script tried to create a new role without checking if a usable one already existed, then blew up because the caller is an SSO principal.

This skill encodes the right order: discover, validate, only create if necessary.

## Running the helpers (cross-platform)

The helpers are Python so they run identically on Windows, macOS, and Linux:

```bash
python3 scripts/check_role.py        # macOS / Linux
python  scripts/check_role.py        # Windows (PowerShell / cmd)
```

**Run them from the shell where the AWS CLI already works** — i.e. wherever `aws sts get-caller-identity` succeeds. The script shells out to that same `aws` binary and inherits the shell's profile, region, SSO session, proxy, and credential chain.

> **Windows / WSL / Git Bash caveat.** Do **not** invoke these through a Bash shim (WSL, Git Bash, MSYS) on Windows. Those Bash environments frequently do **not** share the Windows AWS config, credentials, SSO sessions, environment variables, or proxy settings — so `aws sts get-caller-identity` fails inside Bash even when it works natively in PowerShell. (This is exactly why the old `.sh` helpers failed on Windows and were replaced with Python.) If you're in PowerShell, run `python ...\check_role.py` directly in PowerShell. If the helper still can't see your identity, run the same discovery natively (see "Native AWS CLI equivalent" below) in the shell where `aws sts get-caller-identity` returns your ARN.

## Order of operations

### Step 1 — Did the user provide a role?

Validate that one specifically:

```bash
python3 scripts/check_role.py "<role-name-or-arn>"
```

On success it prints the ARN to stdout (exit 0). On failure it logs why on stderr. Don't try to silently fix a broken role — surface the problem.

### Step 2 — Discover existing roles

```bash
python3 scripts/check_role.py
```

Lists roles matching common SageMaker patterns (`AmazonSageMaker-ExecutionRole-*`, `SageMakerExecutionRole*`, etc.), **ranks by last-used date** (most recent first), validates trust policy in that order, returns the first usable ARN. Most accounts that have used SageMaker before already have one.

Why rank by last-used: in accounts with multiple roles (auto-generated 2021 role + manual project role + etc.), the alphabetically-first one is rarely the actively-maintained one. The most-recently-used role is more likely to have current policies — including cross-account ECR pull. The script prints the ranking so you can see which got picked.

IAM frequently reports **no** `RoleLastUsed` at all (tracking only covers recent activity). When every candidate ties at "never used", the script falls back to **newest creation date** — a newer role is more likely to have current policies than a 2021 leftover.

### Step 3 — Create, only if discovery found nothing

**If the user can create** (has IAM permissions):

```bash
python3 scripts/create_role.py "<role-name>" "<model-bucket>"
```

Second arg scopes S3 access to a specific bucket. Omit if unknown; script warns and the user can update the policy later.

**If the user cannot create** (SSO principal — `hf-cloud-aws-context-discovery` will have flagged this):

Stop and surface this clearly. Don't retry alternative IAM operations hoping one works:

> I can't find an existing SageMaker execution role, and you're authenticated via SSO so you can't create one directly. Please either:
>   - Ask your AWS admin for a SageMaker execution role ARN, or
>   - Have them grant your SSO permission set `iam:CreateRole`, `iam:PutRolePolicy`

Specific instructions get unblocked fast; vague "permission denied" messages don't.

## What "validated" means

A role is usable when (1) it exists, (2) its trust policy allows `sagemaker.amazonaws.com` to `sts:AssumeRole`, and (3) its permissions grant only the actions and resources this deployment needs. See `references/trust-policy.json` for the canonical trust policy.

`check_role.py` verifies existence and trust because policy evaluation depends on the deployment's exact S3, ECR, logging, and optional output resources. Before deployment, inspect the selected role's policies and compare them with `references/minimum-permissions.json`; add only missing actions and scope them to the required resources. Do not attach `AmazonSageMakerFullAccess` or defer permission review until an `AccessDenied` failure.

## Minimum permissions

`references/minimum-permissions.json` is the standalone inline policy for endpoint execution:
- `s3:GetObject` + `s3:ListBucket` on the model artifact bucket
- ECR pull permissions
- CloudWatch logs and metrics

`create_role.py` installs this inline policy without attaching a managed FullAccess policy. Replace `REPLACE_WITH_MODEL_BUCKET` in the template with the actual bucket name — `create_role.py` does this automatically when given a bucket as its second argument. Add narrowly scoped permissions separately for optional features such as async output or data capture.

## Native AWS CLI equivalent (fallback)

If the Python helper can't run or can't see your identity (rare — usually a broken PATH or running under a Bash shim that lacks AWS context), do the same preflight by hand in the shell where `aws sts get-caller-identity` works. The logic is just AWS CLI calls; the helper exists only to bundle and rank them.

PowerShell:

```powershell
# 1. List candidate SageMaker roles
aws iam list-roles --query "Roles[?contains(RoleName,'SageMaker') || contains(RoleName,'sagemaker')]" --output json

# 2. For each candidate, confirm the trust policy allows sagemaker.amazonaws.com
aws iam get-role --role-name <role-name> --query "Role.AssumeRolePolicyDocument" --output json

# 3. Prefer the most-recently-used role with SageMaker-execution naming
#    (LastUsedDate is often None for every role — then prefer newest CreateDate)
aws iam get-role --role-name <role-name> --query "Role.[RoleLastUsed.LastUsedDate, CreateDate]" --output text
```

Pick the most-recently-used role whose trust policy contains `sagemaker.amazonaws.com`. Use the resulting ARN exactly as if `check_role.py` had returned it. Bash/macOS/Linux use the same commands.

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
