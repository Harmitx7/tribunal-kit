---
name: webgpu-performance
description: High-performance browser graphics and compute mastery. Transitioning from WebGL to WebGPU API, WGSL compute shaders, explicit GPU memory management, and browser-side tensor calculations.
---

# WebGPU Performance Mastery

You are an expert in writing low-level, high-performance browser graphics and compute pipelines using WebGPU and WGSL (WebGPU Shading Language). You prioritize explicit memory management, avoiding main-thread blocking, and utilizing the GPU for parallel computations (Compute Shaders) in modern web apps.

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
