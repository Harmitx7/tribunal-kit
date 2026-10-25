# Tribunal-Kit Programmatic API Reference

`tribunal-kit` provides a typed Node.js API (CommonJS & ESM) for programmatically interacting with tribunal agents, skills, memory engine, governance checks, and alignment tools.

---

## Installation & Import

```bash
npm install tribunal-kit
```

### CommonJS

```javascript
const { cmdInit, cmdStatus, cmdMemory, cmdAlign, alignText } = require('tribunal-kit');
```

### ESM

```javascript
import { cmdInit, cmdStatus, cmdMemory, cmdAlign } from 'tribunal-kit';
```

---

## Core Functions

### `cmdInit(flags, quiet)`

Initializes the `.agent/` Anti-Hallucination Barrier in a target workspace.

- **Parameters:**
  - `flags` (`CliFlags`): Options controlling target path, force overwrite, dry-run, and profile.
  - `quiet` (`boolean`): If true, suppresses stdout/stderr progress indicators.
- **Returns:** `Promise<void>`

```javascript
await cmdInit({ path: './my-project', profile: 'web', force: true });
```

---

### `cmdStatus(flags, quiet)`

Returns status of installed agents, skills, memory entries, and IDE bridges.

- **Parameters:**
  - `flags` (`CliFlags`): Target path and log settings.
  - `quiet` (`boolean`): If true, suppresses output.
- **Returns:** `void`

---

### `cmdMemory(flags, argv, quiet)`

Interacts with the 4-Type Taxonomy Persistent Memory Engine (Semantic, Procedural, Episodic, Working).

- **Parameters:**
  - `flags` (`CliFlags`): Budget and memory options.
  - `argv` (`string[]`): Subcommand and arguments (`['store', '--type', 'semantic', ...]`).
  - `quiet` (`boolean`): If true, suppresses output.
- **Returns:** `Promise<void>`

---

### `cmdAlign(flags, argv, quiet)`

Cleans AI responses by stripping introductory/outro slop, collapsing single-item bullet lists, and validating code traps (Next.js 15, React 19, Drizzle, non-existent LLM models).

---

### `cmdImpactTier(processArgs, quiet)`

Classifies a task into governance Impact Tiers (0: Fast-Pass, 1: Express Pass, 2: Targeted Audit, 3: Full Gauntlet).

- **Parameters:**
  - `processArgs` (`string[]`): Command line argument array (e.g. `['--files', 'src/api.js', '--lines', '45']`).
  - `quiet` (`boolean`): If true, suppresses human-readable progress.
- **Returns:** `Promise<boolean>`

---

### `cmdArch(flags, argv, quiet)`

Runs Zero-Trust Architecture Intelligence (mapping modules, verifying boundaries, calculating blast radius, or running architectural audits).

- **Parameters:**
  - `flags` (`CliFlags`): Path and execution flags.
  - `argv` (`string[]`): Subcommand array (e.g. `['map']`, `['verify']`, `['impact', 'src/auth.ts']`).
  - `quiet` (`boolean`): If true, suppresses stdout.
- **Returns:** `Promise<void>`

---

### `cmdContract(flags, argv, quiet)`

AI Agent Behavioral Contract Testing and failure trace replay.

- **Parameters:**
  - `flags` (`CliFlags`): Options.
  - `argv` (`string[]`): Subcommand (`['verify']`, `['init']`, `['list']`, `['replay', '<trace-id>']`).
  - `quiet` (`boolean`): If true, suppresses logs.
- **Returns:** `Promise<void>`

---

### `cmdSdd(flags, argv, quiet)`

Subagent-Driven Development (SDD) workspace management, task brief extraction, and isolated context diff packaging.

- **Parameters:**
  - `flags` (`CliFlags`): Execution options.
  - `argv` (`string[]`): Subcommand (`['brief', '<plan>']`, `['workspace']`, `['diff']`).
  - `quiet` (`boolean`): If true, suppresses output.
- **Returns:** `Promise<void>`

---

### `cmdValidate(flags, argv, quiet)`

Validates workspace integrity, rule structure, and Serde schemas across the `.agent/` payload.

- **Parameters:**
  - `flags` (`CliFlags`): Target file and schema options.
  - `argv` (`string[]`): Subcommand arguments.
  - `quiet` (`boolean`): If true, suppresses output.
- **Returns:** `boolean | Promise<void>`

---

### `cmdContextCompress(argv, quiet)`

Extracts token-compressed file context by stripping non-semantic comments and empty lines while preserving code structure and `// VERIFY` tags.

- **Parameters:**
  - `argv` (`string[]`): File path and maximum line count options.
  - `quiet` (`boolean`): If true, suppresses logs.
- **Returns:** `boolean`

## Type Definitions

```typescript
export interface CliFlags {
  force?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  minimal?: boolean;
  path?: string;
  skipUpdateCheck?: boolean;
  head?: boolean;
  write?: boolean;
  target?: string;
  branch?: string;
  log?: string;
  strategy?: string;
  profile?: 'full' | 'minimal' | 'web' | 'mobile' | 'backend' | 'ai';
}
```
