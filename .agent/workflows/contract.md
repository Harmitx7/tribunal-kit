# /contract — AI Agent Behavioral Contract Testing & Trace Replay

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before running behavioral contract validation, inspect:

1. Active Contracts Directory (`.tribunal/contracts/`) → Verify active `.yaml` rules and severities
2. Target File Scope → Determine modified or targeted files for contract validation
3. Failure Context Snapshots (`.tribunal/traces/`) → Check past captured trace snapshots for context

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
