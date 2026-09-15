---
name: edge-ai-mobile
description: Use when On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - mobile-developer
  - browser-native-ai
  - performance-profiling
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/bundle_analyzer.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Edge AI & On-Device Mobile Machine Learning

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `edge-ai-mobile` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference.
- **DO NOT activate when:** The task falls outside the `edge-ai-mobile` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass       | Phase            | Core Action                                                                                  |
| :--------- | :--------------- | :------------------------------------------------------------------------------------------- |
| **Pass 1** | **Understand**   | Deconstruct the user's explicit objective, implicit requirements, and platform constraints.  |
| **Pass 2** | **Plan**         | Decompose the task into smallest logical steps; map dependencies and required tool calls.    |
| **Pass 3** | **Execute**      | Implement the solution with production-grade craft, zero placeholders, and strict typing.    |
| **Pass 4** | **Verify**       | Run linters, unit tests, or compiler checks to validate structural correctness.              |
| **Pass 5** | **Attack**       | Perform an adversarial review searching for edge-case failures, race conditions, and traps.  |
| **Pass 6** | **Improve**      | Eliminate discovered friction, optimize performance, and harden error boundaries.            |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

## Mobile ONNX Edge Inference Pattern

```typescript
import * as ort from 'onnxruntime-react-native';

export async function runLocalEmbeddings(textTokens: number[]): Promise<Float32Array> {
  const session = await ort.InferenceSession.create('model_quantized.onnx', {
    executionProviders: ['cpu'], // Accelerates via ANE/NNAPI internally
  });

  const tensor = new ort.Tensor('int64', new BigInt64Array(textTokens.map(BigInt)), [
    1,
    textTokens.length,
  ]);
  const feeds = { input_ids: tensor };

  const results = await session.run(feeds);
  return results.embedding.data as Float32Array;
}
```

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario                               | Risk                                                 | Mitigation Strategy                                                             |
| :------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Empty or Null Inputs**               | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers   |
| **Network Timeout / Latency**          | Hanging operations or duplicate side-effects         | Implement bounded abort controllers, exponential backoff, and idempotency keys  |
| **Concurrency / Race Conditions**      | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls          |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection      | Validate boundary payloads with Zod/Pydantic schemas prior to execution         |
| **Resource / Memory Saturation**       | OOM errors, frame drops, or memory leaks             | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern                | What AI Commonly Does Wrong                                          | What Is Actually Correct                                                    |
| :-------------------------- | :------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **JS Thread Animation Lag** | Driving gestures and scrolling physics on the React Native JS thread | Use React Native Reanimated worklets running directly on the UI thread      |
| **Missing Keyboard Offset** | Forms hidden behind native software keyboard on iOS/Android          | Wrap form views in KeyboardAvoidingView with platform-calibrated behavior   |
| **Uncached Image Flooding** | Rendering raw image URLs in list items without memory caching        | Use FastImage or Expo Image with disk cache policies and thumbnail previews |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `mobile-reviewer` · `frontend-reviewer` · `type-safety`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Do touch targets satisfy the 44x44px minimum touch boundary standard?
✅ Are gesture handlers and native thread animations offloaded via Reanimated?
✅ Are keyboard avoiding views, safe areas, and notch offsets handled?
✅ Is offline storage and state hydration handled with optimistic sync?
✅ Did I verify compatibility across iOS, Android, and varying densities?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
