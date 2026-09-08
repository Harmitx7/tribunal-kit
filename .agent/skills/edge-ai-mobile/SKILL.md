---
name: edge-ai-mobile
description: On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference.
tools: Read, Grep, Glob, Edit, Write
version: 4.0.0
last-updated: 2026-09-07
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


## Activation Boundaries

- **Activate when:** Operating in tasks requiring On-device mobile AI, CoreML, Android NNAPI, ONNX Runtime Web/Mobile, local LLM execution (SLMs), and sub-10ms privacy-first edge inference..
- **DO NOT activate when:** The task falls strictly outside edge-ai-mobile domain or belongs to a different dedicated specialist.

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

## 🏛️ Tribunal Verification & Guardrails

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes
1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol
**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
