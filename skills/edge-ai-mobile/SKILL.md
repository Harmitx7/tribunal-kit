---
name: edge-ai-mobile
description: "Use when On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference."
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
