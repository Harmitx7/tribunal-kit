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

---

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
