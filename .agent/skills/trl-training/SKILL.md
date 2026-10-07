---
name: trl-training
description: "Use when loading, evaluating, fine-tuning, and deploying trl training machine learning models, datasets, and inference pipelines."
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
  - "trl"
  - "training"
---

# TRL Training Skill

## Mandatory Pre-Flight Context Inspection
Before reading, generating, or refactoring code in the `trl-training` domain, inspect these 5 critical parameters:
1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).


## Activation Boundaries
- **Activate when:** Use when loading, evaluating, fine-tuning, and deploying trl training machine learning models, datasets, and inference pipelines.
- **DO NOT activate when:** The task falls outside the `trl-training` domain or is managed by a different dedicated specialist agent.


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


You are an expert at using the TRL (Transformers Reinforcement Learning) library to train and fine-tune large language models.

## Overview

TRL provides CLI commands for post-training foundation models using state-of-the-art techniques:

- **SFT** (Supervised Fine-Tuning): Fine-tune models on instruction-following or conversational datasets
- **DPO** (Direct Preference Optimization): Align models using preference data
- **GRPO** (Group Relative Policy Optimization): Train models by ranking multiple sampled outputs relative to each other and optimizing based on their comparative rewards.
- **RLOO** (Reinforce Leave One Out): Online RL training with generation-based rewards
- **Reward Model Training**: Train reward models for RLHF

TRL is built on top of Hugging Face Transformers and Accelerate, providing seamless integration with the Hugging Face ecosystem.

## Core Commands

### trl sft - Supervised Fine-Tuning

Fine-tune language models on instruction-following or conversational datasets.

**Full training:**

```bash
trl sft \
  --model_name_or_path Qwen/Qwen2-0.5B \
  --dataset_name trl-lib/Capybara \
  --learning_rate 2.0e-5 \
  --num_train_epochs 1 \
  --packing \
  --per_device_train_batch_size 2 \
  --gradient_accumulation_steps 8 \
  --eos_token '<|im_end|>' \
  --eval_strategy steps \
  --eval_steps 100 \
  --output_dir Qwen2-0.5B-SFT \
  --push_to_hub
```

**Train with LoRA adapters:**

```bash
trl sft \
  --model_name_or_path Qwen/Qwen2-0.5B \
  --dataset_name trl-lib/Capybara \
  --learning_rate 2.0e-4 \
  --num_train_epochs 1 \
  --packing \
  --per_device_train_batch_size 2 \
  --gradient_accumulation_steps 8 \
  --eos_token '<|im_end|>' \
  --eval_strategy steps \
  --eval_steps 100 \
  --use_peft \
  --lora_r 32 \
  --lora_alpha 16 \
  --output_dir Qwen2-0.5B-SFT \
  --push_to_hub
```

### trl dpo - Direct Preference Optimization

Align models using preference data (chosen/rejected pairs).

**Full training:**

```bash
trl dpo \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --learning_rate 5.0e-7 \
  --num_train_epochs 1 \
  --per_device_train_batch_size 2 \
  --max_steps 1000 \
  --gradient_accumulation_steps 8 \
  --eval_strategy steps \
  --eval_steps 50 \
  --output_dir Qwen2-0.5B-DPO \
  --no_remove_unused_columns
```

**Train with LoRA adapters:**

```bash
trl dpo \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --learning_rate 5.0e-6 \
  --num_train_epochs 1 \
  --per_device_train_batch_size 2 \
  --max_steps 1000 \
  --gradient_accumulation_steps 8 \
  --eval_strategy steps \
  --eval_steps 50 \
  --output_dir Qwen2-0.5B-DPO \
  --no_remove_unused_columns \
  --use_peft \
  --lora_r 32 \
  --lora_alpha 16
```

### trl grpo - Group Relative Policy Optimization

Train models using reward functions or LLM-as-a-judge for evaluating generations and providing rewards.

**Basic usage:**

```bash
trl grpo \
  --model_name_or_path Qwen/Qwen2.5-0.5B \
  --dataset_name trl-lib/gsm8k \
  --reward_funcs accuracy_reward \
  --output_dir Qwen2-0.5B-GRPO \
  --push_to_hub
```

### trl rloo - Reinforce Leave One Out

Online RL training where the model generates text and receives rewards based on custom criteria.

**Basic usage:**

```bash
trl rloo \
  --model_name_or_path Qwen/Qwen2.5-0.5B \
  --dataset_name trl-lib/tldr \
  --reward_model_name_or_path sentiment-analysis:nlptown/bert-base-multilingual-uncased-sentiment \
  --output_dir Qwen2-0.5B-RLOO \
  --push_to_hub
```

### trl reward - Reward Model Training

Train a reward model to score text quality for RLHF.

**Full training:**

```bash
trl reward \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --output_dir Qwen2-0.5B-Reward \
  --per_device_train_batch_size 8 \
  --num_train_epochs 1 \
  --learning_rate 1.0e-5 \
  --eval_strategy steps \
  --eval_steps 50 \
  --max_length 2048
```

**Train with LoRA adapters:**

```bash
trl reward \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --output_dir Qwen2-0.5B-Reward-LoRA \
  --per_device_train_batch_size 8 \
  --num_train_epochs 1 \
  --learning_rate 1.0e-4 \
  --eval_strategy steps \
  --eval_steps 50 \
  --max_length 2048 \
  --use_peft \
  --lora_task_type SEQ_CLS \
  --lora_r 32 \
  --lora_alpha 16
```

## Configuration Files

TRL supports YAML configuration files for reproducible training. All CLI arguments can be specified in a config file.

**Example config (sft_config.yaml):**

```yaml
model_name_or_path: Qwen/Qwen2.5-0.5B
dataset_name: trl-lib/Capybara
learning_rate: 2.0e-5
num_train_epochs: 1
per_device_train_batch_size: 8
gradient_accumulation_steps: 2
output_dir: ./sft_output
use_peft: true
lora_r: 16
lora_alpha: 16
report_to: trackio
```

**Launch with config:**

```bash
trl sft --config sft_config.yaml
```

**Override config values:**

```bash
trl sft --config sft_config.yaml --learning_rate 1.0e-5
```

## Distributed Training

TRL integrates with Accelerate for multi-GPU and multi-node training.

**Multi-GPU training:**

```bash
trl sft \
  --config sft_config.yaml \
  --num_processes 4
```

**Use predefined Accelerate configs:**

TRL provides predefined configs: `single_gpu`, `multi_gpu`, `fsdp1`, `fsdp2`, `zero1`, `zero2`, `zero3`

```bash
trl sft \
  --config sft_config.yaml \
  --accelerate_config zero2
```

**Custom Accelerate config:**

```bash
# Generate custom config
accelerate config

# Use custom config
trl sft --config sft_config.yaml --config_file ~/.cache/huggingface/accelerate/default_config.yaml
```

**Fully Sharded Data Parallel (FSDP):**

```bash
trl sft --config sft_config.yaml --accelerate_config fsdp2
```

**DeepSpeed ZeRO:**

```bash
trl sft --config sft_config.yaml --accelerate_config zero3
```

## Troubleshooting

### CUDA Out of Memory

- Reduce `--per_device_train_batch_size` and increase `--gradient_accumulation_steps`
- Enable `--use_peft` for LoRA training
- Use `--gradient_checkpointing` to save memory
- Try smaller model or longer sequence truncation

### Dataset Loading Issues

- Verify dataset exists: check Hugging Face Hub or local path
- Check dataset format matches expected columns
- Use `--dataset_config` for multi-config datasets
- Inspect dataset: `from datasets import load_dataset; ds = load_dataset(name)`

### Model Loading Issues

- Verify model exists on Hugging Face Hub
- Check if gated model requires authentication: `hf auth login`
- For local models, provide absolute path
- Ensure sufficient disk space and memory

### Slow Training

- Enable dataset `--packing` for short sequences
- Use larger `--per_device_train_batch_size` if memory allows
- Enable `--tf32` for faster computation on Ampere GPUs
- Use `--bf16` on supported hardware
- Consider multi-GPU training with `--num_processes`

### Generation Issues (GRPO/RLOO)

- Check prompt format in dataset
- Adjust `--temperature` and `--top_p` for generation
- Verify the reward function (for GRPO/RLOO)

## Additional Resources

- **Documentation**: https://huggingface.co/docs/trl
- **GitHub**: https://github.com/huggingface/trl
- **Examples**: https://github.com/huggingface/trl/tree/main/examples

## Best Practices

1. **Start with SFT**: Always fine-tune base models with SFT before preference alignment
2. **Use LoRA for efficiency**: Enable `--use_peft` for faster training and lower memory
3. **Monitor training**: Use `--report_to trackio` (or `--report_to wandb` or `--report_to tensorboard`) for tracking
4. **Save checkpoints**: TRL automatically saves checkpoints in `--output_dir`
5. **Test on small datasets first**: Verify pipeline works before full training
6. **Use configuration files**: Create YAML configs for reproducibility
7. **Leverage Accelerate**: Use multi-GPU training for faster iteration

When helping users with TRL:
- Always check which training method is appropriate for their use case
- Verify dataset format matches the expected schema
- Recommend starting with smaller models for testing
- Suggest LoRA for resource-constrained environments
- Point to specific documentation sections for advanced features

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
