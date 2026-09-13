---
name: config-validator
description: Use when Configuration validation and workspace self-auditing mastery. Verifying .agent directory integrity, checking JSON schemas, resolving broken pointers to missing scripts/skills, validating environment states, and enforcing configuration constraints before execution. Use when loading settings, modifying manifests, or diagnosing system configuration rot.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - lint-and-validate
  - backend-security-expert
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
---

# Config Validator — System Integrity Mastery

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `config-validator` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when Configuration validation and workspace self-auditing mastery. Verifying .agent directory integrity, checking JSON schemas, resolving broken pointers to missing scripts/skills, validating environment states, and enforcing configuration constraints before execution. Use when loading settings, modifying manifests, or diagnosing system configuration rot.
- **DO NOT activate when:** The task falls outside the `config-validator` domain or is managed by a different dedicated specialist.

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


## Hallucination Traps (Read First)

- ❌ Silently using default values for missing config -> ✅ Fail fast with a clear error message naming the missing field
- ❌ Trusting environment variables without validation -> ✅ Validate ALL env vars at startup with Zod or a schema, not at usage time
- ❌ Mixing config source precedence without documenting it -> ✅ Document: CLI args > env vars > config file > defaults

---

---

## 1. Fail Fast, Fail Loudly

Never allow a system to boot, run, or proceed into a workflow if the underlying configuration is invalid. Parse configurations at the absolute boundary.

```typescript
import { z } from 'zod';

// ❌ VULNERABLE: Implicit Trust
// Assumes the JSON file is correct. Will crash randomly deep in the execution stack
// if 'maxRetries' is missing or set to a string.
const config = JSON.parse(fs.readFileSync('./.agent/config.json', 'utf8'));
runAgent(config.maxRetries);

// ✅ SAFE: Boundary Validation via Zod
const ConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  maxRetries: z.number().min(0).max(10).default(3),
  enabledSkills: z.array(z.string()),
  environment: z.enum(['development', 'production', 'test']),
  apiEndpoint: z.string().url().optional(),
});

try {
  const rawData = JSON.parse(fs.readFileSync('./.agent/config.json', 'utf8'));
  const config = ConfigSchema.parse(rawData); // Throws heavily detailed error instantly
} catch (err) {
  logger.fatal('System boot aborted. Invalid config.json:', err.errors);
  process.exit(1);
}
```

---

## 2. Directory & Manifest Self-Auditing

Configuration files often reference physical system assets (scripts, workflows, other config files). The validator must check referential integrity.

If `manifest.json` says `{"workflow": "scripts/deploy.sh"}`, the validator MUST verify that `scripts/deploy.sh` actually exists before the orchestrator tries to run it.

```typescript
// Validating Referential Integrity
function auditAgentDirectory(config: Config) {
  const missingFiles = [];

  for (const skill of config.enabledSkills) {
    const skillPath = path.join('.agent/skills', skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      missingFiles.push(`Skill manifest definition missing: ${skillPath}`);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Referential Integrity Failure:\n${missingFiles.join('\n')}`);
  }
}
```

---

## 3. Environment Variable Validation

Missing or malformed `.env` files are the #1 cause of deployment failure.

Treat environment variables exactly like JSON configs: apply a rigid schema mapping at boot.

```typescript
// Instead of checking process.env.DATABASE_URL throughout the app,
// export a strictly validated object once.

// src/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000), // Transforms string "3000" to number 3000
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  API_KEY: z.string().min(16), // Ensures keys aren't empty or mock data
});

export const ENV = EnvSchema.parse(process.env);
```

---

## 4. Safe Configuration Mutation

When automating updates to a JSON configuration (e.g., adding a new skill to `config.json`), never serialize over the original file blindly.

1. **Read** original JSON.
2. **Apply** modifications in memory.
3. **Validate** the new object against the Zod schema.
4. **Write** atomically (write to `config.json.tmp`, then standard OS file rename to `config.json` to prevent corruption if power dies mid-write).

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
