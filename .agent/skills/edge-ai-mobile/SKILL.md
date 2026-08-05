---
name: edge-ai-mobile
description: On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference.
tools: Read, Grep, Glob, Edit, Write
version: 3.0.0
last-updated: 2026-08-05
script: .agent/scripts/bundle_analyzer.js
scripts-binding:
  - .agent/scripts/bundle_analyzer.js
skills:
  - mobile-developer
  - browser-native-ai
  - performance-profiling
---

# Edge AI & On-Device Mobile Machine Learning

## Mandatory Pre-Flight Context Inspection

Before deploying on-device AI models:
1. Model Quantization → Use 4-bit/8-bit quantized models (GGUF/ONNX) to fit mobile RAM budgets (<500MB)
2. Hardware Acceleration → Bind inference engine to Apple Neural Engine (ANE) or Android NPU
3. Fallback Mechanism → Fall back gracefully to cloud LLM API if local inference exceeds latency budget (>200ms)

## Mobile ONNX Edge Inference Pattern

```typescript
import * as ort from 'onnxruntime-react-native';

export async function runLocalEmbeddings(textTokens: number[]): Promise<Float32Array> {
  const session = await ort.InferenceSession.create('model_quantized.onnx', {
    executionProviders: ['cpu'], // Accelerates via ANE/NNAPI internally
  });

  const tensor = new ort.Tensor('int64', new BigInt64Array(textTokens.map(BigInt)), [1, textTokens.length]);
  const feeds = { input_ids: tensor };

  const results = await session.run(feeds);
  return results.embedding.data as Float32Array;
}
```

## 🛑 Verification-Before-Completion (VBC) Protocol

- Verify local memory usage remains under 300MB during active model inference.
- Measure battery consumption impact.
