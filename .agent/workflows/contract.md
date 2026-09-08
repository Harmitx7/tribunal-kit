---
description: AI Agent Behavioral Contract Testing & Trace Replay. Define, validate, and enforce team behavioral rules as YAML contracts. Provides init, verify, list, trace, and auto-generate from Case Law.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - clean-code
  - code-review-checklist
  - data-validation-schemas
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/lint_runner.js
---

# /contract — AI Agent Behavioral Contract Testing & Trace Replay

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before running behavioral contract validation, inspect:

1. Active Contracts Directory (`.tribunal/contracts/`) → Verify active `.yaml` rules and severities
2. Target File Scope → Determine modified or targeted files for contract validation
3. Failure Context Snapshots (`.tribunal/traces/`) → Check past captured trace snapshots for context

4. Required Skills → Before executing, load and follow procedural rules from:
   - `clean-code` (.agent/skills/clean-code/SKILL.md): Self-documenting naming, no over-engineering, error handling patterns
   - `code-review-checklist` (.agent/skills/code-review-checklist/SKILL.md): Code quality, security, and best practice review gates
   - `data-validation-schemas` (.agent/skills/data-validation-schemas/SKILL.md): Zod, Pydantic, and input validation schema patterns

---

## When to Use /contract

| Use `/contract` when...                | Move to...                             |
| :------------------------------------- | :------------------------------------- |
| Defining team behavioral rules         | After contract violation → `/fix`      |
| Verifying AI code before merge         | On failure → `tk contract replay <id>` |
| Converting Case Law to permanent rules | After verification → `/deploy`         |

---

## Subcommands Overview

```bash
# Scaffold .tribunal/contracts/ with starter rules
npx tribunal-kit contract init

# Verify all project code against loaded contracts
npx tribunal-kit contract verify

# Verify a single file against contracts
npx tribunal-kit contract verify --file src/api/user.ts

# List active loaded contracts and rules
npx tribunal-kit contract list

# List failure context snapshots
npx tribunal-kit contract trace list

# Replay a failure context trace snapshot in CLI
npx tribunal-kit contract replay <trace_id>

# Auto-generate a contract template from a Case Law entry
npx tribunal-kit contract generate --from-case 14
```

---

## Behavioral Contract Guard

```
❌ Never ignore 'block' severity contract violations before push
❌ Never bypass contract checks without explicit team approval
❌ Always convert repeated Case Law rejections into behavioral contracts
```
