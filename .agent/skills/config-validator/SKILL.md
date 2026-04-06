---
name: config-validator
description: Configuration validation and workspace self-auditing mastery. Verifying .agent directory integrity, checking JSON schemas, resolving broken pointers to missing scripts/skills, validating environment states, and enforcing configuration constraints before execution. Use when loading settings, modifying manifests, or diagnosing system configuration rot.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-02
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Config Validator — System Integrity Mastery

---

## 1. Fail Fast, Fail Loudly

Never allow a system to boot, run, or proceed into a workflow if the underlying configuration is invalid. Parse configurations at the absolute boundary.

```typescript
import { z } from "zod";

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
  environment: z.enum(["development", "production", "test"]),
  apiEndpoint: z.string().url().optional()
});

try {
  const rawData = JSON.parse(fs.readFileSync('./.agent/config.json', 'utf8'));
  const config = ConfigSchema.parse(rawData); // Throws heavily detailed error instantly
} catch (err) {
  logger.fatal("System boot aborted. Invalid config.json:", err.errors);
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
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000), // Transforms string "3000" to number 3000
  NODE_ENV: z.enum(["development", "production"]).default("development"),
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
