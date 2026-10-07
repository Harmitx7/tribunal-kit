---
name: hf-cloud-aws-context-discovery
description: "Use when Discover the user's local AWS context (active profile, region, account ID, caller identity) at the start of any AWS task. Use this skill before any other AWS work — deploying to SageMaker, creating resources, calling AWS APIs, or anything that touches an AWS account. Use it especially when the user has not specified a region or profile explicitly, when they say things like \"use my AWS account\", \"deploy to AWS\", \"use my profile\", or when about to make any AWS CLI or SDK call. Never guess the region or account ID — always use this skill to read it from the local configuration first."
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
  - "aws"
  - "context"
  - "discovery"
---

# AWS Context Discovery

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `hf-cloud-aws-context-discovery` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when Discover the user's local AWS context (active profile, region, account ID, caller identity) at the start of any AWS task. Use this skill before any other AWS work — deploying to SageMaker, creating resources, calling AWS APIs, or anything that touches an AWS account. Use it especially when the user has not specified a region or profile explicitly, when they say things like "use my AWS account", "deploy to AWS", "use my profile", or when about to make any AWS CLI or SDK call. Never guess the region or account ID — always use this skill to read it from the local configuration first.
- **DO NOT activate when:** The task falls outside the `hf-cloud-aws-context-discovery` domain or is managed by a different dedicated specialist agent.


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


Before doing any AWS work, read the user's local AWS config. Don't guess the region, and don't ask the user for things their config already answers.

## What to discover

Run these at the start of the AWS work and remember the results for the rest of the session.

### 1. Active profile

`AWS_PROFILE` env var, else `default`. If the user mentioned a profile in their prompt, that overrides. If the named profile doesn't exist in `~/.aws/config`, surface that clearly.

### 2. Region

Resolution order — stop at the first one that produces a value:
1. Region the user explicitly named in this conversation
2. `AWS_REGION` env var
3. `AWS_DEFAULT_REGION` env var
4. `region` field on the active profile in `~/.aws/config`
5. Ask the user — but only after the first four have failed

Do not fall back to `us-east-1` or any other hardcoded default.

### 3. Credentials, account ID, caller ARN

```bash
aws sts get-caller-identity --profile <profile> --region <region>
```

Three purposes in one call: confirms credentials are valid (stop if not), returns the `Account` ID (needed for ARN construction), returns the `Arn` of the caller.

### 4. Identify SSO / assumed-role principals

The `Arn` field tells you what kind of principal this is. The pattern matters because it determines what IAM operations the caller can do.

| ARN pattern | Type | IAM write capability |
|---|---|---|
| `arn:aws:iam::<acct>:user/<name>` | IAM user | Depends on attached policies |
| `arn:aws:sts::<acct>:assumed-role/AWSReservedSSO_<...>/<email>` | **SSO assumed-role** | Typically **none** — can't create/modify IAM roles |
| `arn:aws:sts::<acct>:assumed-role/<role>/<session>` | Regular assumed-role | Depends on the role |

**If the caller is SSO**, surface this immediately before later skills hit `iam:CreateRole` and fail:

> Heads up: you're authenticated via SSO (`AWSReservedSSO_<PermissionSet>_...`). SSO principals usually can't create IAM roles directly. If we need a SageMaker execution role, I'll look for an existing one first — if none exists, you'll need to ask whoever manages your AWS access to create one.

This is the highest-leverage thing this skill does. Surfacing it now turns a confusing mid-deployment error into a five-second conversation.

## Commands to run

```bash
# Effective profile and region (faster than parsing config files)
aws configure list

# Validate credentials and get identity
aws sts get-caller-identity
aws sts get-caller-identity --profile <profile-name>  # if a profile was named
```

`aws configure list` handles env-var overrides and shows the resolved effective values. Prefer it over parsing `~/.aws/config` yourself. If you need to read raw config (e.g. to list profiles), `~/.aws/config` and `~/.aws/credentials` are plain INI files — read-only.

## What to report back

One or two lines, not a wall of text:

> Working with profile `my-profile` in `eu-west-1`, account `123456789012`. You're authenticated via SSO, so we'll need to use an existing IAM role rather than create one.

Don't ask the user to confirm the region you just read from their config — they configured it; that is the confirmation.

If something is wrong (credentials expired, profile doesn't exist, no region anywhere), stop and surface the specific error before continuing.

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
