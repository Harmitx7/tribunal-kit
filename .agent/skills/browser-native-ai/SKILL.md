---
name: browser-native-ai
description: "Use when designing, implementing, auditing, and hardening browser native ai server logic, APIs, background jobs, and error boundaries."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - generative-ui-expert
  - webgpu-performance
  - 60fps-animation
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
  - "browser"
---

# Browser-Native AI (Local SLMs)

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `browser-native-ai` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when designing, implementing, auditing, and hardening browser native ai server logic, APIs, background jobs, and error boundaries.
- **DO NOT activate when:** The task falls outside the `browser-native-ai` domain or is managed by a different dedicated specialist agent.


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


---

## 🛠️ Technical Architecture & Reference Recipes

## 1. Core Principles

- **Privacy by Default:** Data never leaves the browser. This is critical for HIPAA compliance, banking, and private notes apps.
- **Zero-Latency:** Because the model runs in memory, token generation and text embeddings happen instantly.
- **Hardware Acceleration First:** Always attempt to use WebGPU (`executionProviders: ['webgpu']`) or WebNN before falling back to WebAssembly (Wasm).

## 2. ONNX Runtime Web Integration

Use `@huggingface/transformers` (Transformers.js) or `onnxruntime-web` for execution.

```typescript
import { pipeline, env } from '@huggingface/transformers';

// Use WebGPU backend for acceleration
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

// Instantiate an SLM or Embedding model
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  device: 'webgpu', // Fallback to 'wasm' if needed
});

// Run inference entirely offline
const output = await extractor('Hello world', { pooling: 'mean', normalize: true });
console.log(output.data); // Float32Array embedding
```

## 3. Memory & Asset Management

- **Quantization:** Only load `q4` (4-bit quantized) models into the browser to prevent crashing mobile devices. A 7B parameter model is ~4GB quantized, which is too large. Target 0.5B to 1.5B parameter models (e.g., Llama-3.2-1B, Phi-3-mini).
- **Caching:** Cache model weights using the Origin Private File System (OPFS) or Cache API so the user only downloads the 500MB payload once.
- **Web Workers:** AI inference blocks the main thread in Wasm mode. **Always** run inference inside a Web Worker so the UI stays 60fps.

## 4. LLM Traps & Pre-Flight Checks

- **TRAP:** Running inference on the React main thread.
- **FIX:** Move pipeline instantiation and execution to a `worker.js` and communicate via `postMessage`.
- **TRAP:** Failing to handle model download progress.
- **FIX:** Pass a `progress_callback` to the pipeline to show a loading bar (e.g., "Downloading weights 45%").
- **TRAP:** Loading float16 or float32 models.
- **FIX:** Only request ONNX models that are specifically quantized (`_q4f16`) for web.

## Verification Protocol

Before submitting code, ensure:

1. `postMessage` architecture is used for non-blocking inference.
2. WebGPU is requested as the primary execution provider.
3. Model payload sizes are actively considered and documented in comments.

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
| **Unchecked Payload Cast** | Casting request bodies to TypeScript types without runtime schema validation | Parse request payloads through Zod/Pydantic schemas before business logic |
| **Silent Error Swallowing** | Catching errors with empty catch blocks or logging without rethrowing | Propagate structured errors with status codes and contextual stack traces |
| **Unparameterized Query** | Concatenating user inputs into SQL/Prisma query strings | Always use parameterized bindings or type-safe ORM query builders |


## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `logic-reviewer` · `security-auditor` · `api-architect` · `resilience-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

### ✅ Pre-Flight Self-Audit Checklist
```
✅ Are all inputs and boundary payloads validated against schemas (Zod/Pydantic)?
✅ Are SQL and database queries parameterized with zero string concatenation?
✅ Are error boundaries and timeout/retry policies explicitly declared?
✅ Are authentication and object-level authorization (IDOR/BOLA) checked before business logic?
✅ Did I verify that imported dependencies exist in package manifests?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
