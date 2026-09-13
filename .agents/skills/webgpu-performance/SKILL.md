---
name: webgpu-performance
description: Use when High-performance browser graphics and compute mastery. Transitioning from WebGL to WebGPU API, WGSL compute shaders, explicit GPU memory management, and browser-side tensor calculations.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - 60fps-animation
  - fixing-motion-performance
  - motion-engineering
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# WebGPU Performance Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `webgpu-performance` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when High-performance browser graphics and compute mastery. Transitioning from WebGL to WebGPU API, WGSL compute shaders, explicit GPU memory management, and browser-side tensor calculations.
- **DO NOT activate when:** The task falls outside the `webgpu-performance` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

---


## 1. Core Principles

- **Explicit > Implicit:** Unlike WebGL, WebGPU doesn't hide state. You must explicitly configure Pipelines, BindGroups, and CommandEncoders.
- **Compute First:** Leverage Compute Shaders (`@compute @workgroup_size(X, Y)`) for heavy array manipulation, physics, or ML tensor operations, keeping the CPU entirely free.
- **Buffer Alignment:** WGSL requires strict 4-byte or 16-byte alignment (`vec4<f32>`, `mat4x4<f32>`). Always pad structs exactly to prevent silent memory corruption.

## 2. WGSL Compute Shader Pattern

When performing parallel calculations (e.g., particle physics or ML matrix multiplication):

```wgsl
struct SystemData {
    deltaTime: f32,
    particleCount: u32,
}

@group(0) @binding(0) var<uniform> data: SystemData;
@group(0) @binding(1) var<storage, read_write> particles: array<vec4<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= data.particleCount) { return; }

    var pos = particles[index];
    pos.y -= 9.8 * data.deltaTime; // Gravity
    particles[index] = pos;
}
```

## 3. WebGPU Execution Pipeline

To run the above compute shader from TypeScript:

1. **Initialize:** `navigator.gpu.requestAdapter()` -> `requestDevice()`.
2. **Create Buffers:** `device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })`.
3. **Write Data:** `device.queue.writeBuffer(buffer, 0, float32Array)`.
4. **Bind Group:** Group buffers into a `GPUBindGroup`.
5. **Command Encoder:**
   ```typescript
   const encoder = device.createCommandEncoder();
   const pass = encoder.beginComputePass();
   pass.setPipeline(computePipeline);
   pass.setBindGroup(0, bindGroup);
   pass.dispatchWorkgroups(Math.ceil(count / 64));
   pass.end();
   device.queue.submit([encoder.finish()]);
   ```

## 4. LLM Traps & Pre-Flight Checks

- **TRAP:** Assuming WebGPU works everywhere.
- **FIX:** Always feature-detect with `if (!navigator.gpu) { fallbackToWebGL(); }`.
- **TRAP:** Struct alignment issues in WGSL.
- **FIX:** Never use `vec3<f32>` inside arrays without padding. It behaves as 16-bytes anyway. Use `vec4<f32>` to be perfectly aligned.
- **TRAP:** Reading buffers back to the CPU synchronoulsy.
- **FIX:** Use `mapAsync(GPUMapMode.READ)` and await it. Do not block the main thread.

## Verification Protocol

Before submitting code, ensure:

1. Devices and adapters are properly null-checked.
2. WGSL workgroup sizes align with the dispatch sizes dynamically.
3. GPUBuffers used for compute have `GPUBufferUsage.STORAGE` flags.

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

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
