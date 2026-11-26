# Tribunal Kit: Comprehensive API & Interface Reference

**Document:** `docs/API_REFERENCE.md`  
**Package Version:** `9.5.0` [VERIFIED: `package.json`]  
**Interface Surfaces:** Programmatic Node.js (CJS/ESM), CLI (`tk`), MCP (34 tools), HTTP/WS Proxy

---

## 1. Programmatic Node.js API (CJS & ESM)

Tribunal Kit exports full TypeScript declarations in `src/index.d.ts` and supports dual CJS/ESM package imports.

### Import Syntax

```javascript
// CommonJS
const {
  cmdInit,
  cmdStatus,
  cmdMemory,
  cmdAlign,
  cmdUnderstand,
  alignText,
} = require('tribunal-kit');

// ECMAScript Modules (ESM)
import { cmdInit, cmdStatus, cmdMemory, cmdAlign, cmdUnderstand, alignText } from 'tribunal-kit';
```

---

## 2. Core Programmatic Functions

### `cmdInit(flags, quiet)`

Installs the `.agent/` anti-hallucination barrier and IDE bridges into the target workspace.

- **Parameters:**
  - `flags` (`CliFlags`): Target path, force overwrite, dry-run, and profile.
  - `quiet` (`boolean`): Suppresses terminal output.
- **Returns:** `Promise<void>`

### `cmdStatus(flags, quiet)`

Displays the high-density architecture cockpit (active specialists, workflows, skills, scripts, and 4/4 IDE bridges).

- **Parameters:** `flags` (`CliFlags`), `quiet` (`boolean`)
- **Returns:** `void`

### `cmdUnderstand(flags, rawArgv, quiet)`

Executes codebase intelligence: feature flow tracing, module dependency topology, concentric blast radius, and dead code analysis.

- **Parameters:**
  - `flags` (`CliFlags`): Options (`--depth`, `--focus`, `--json`).
  - `rawArgv` (`string[] | string`): Subcommand (`['overview']`, `['trace', 'checkout']`, `['impact', 'src/auth.ts']`).
  - `quiet` (`boolean`): Suppresses human logs.
- **Returns:** `Promise<Object>` (Structured analytical envelope)

### `cmdMemory(flags, argv, quiet)`

Interacts with the 4-Type Taxonomy Persistent Memory Engine (Semantic, Procedural, Episodic, Working).

- **Parameters:**
  - `flags` (`CliFlags`): Memory and token budget flags.
  - `argv` (`string[]`): Subcommand (`['store']`, `['recall', 'auth']`, `['gc']`, `['stats']`).
  - `quiet` (`boolean`)
- **Returns:** `Promise<void>`

### `cmdAlign(flags, argv, quiet)` & `alignText(text)`

Cleans AI-generated text by stripping introductory/outro conversational slop, collapsing single-item bullet lists, and detecting known code traps (Next.js 15, React 19, non-existent models).

- **Returns:** `Promise<void>` or `string`

### `cmdArch(flags, argv, quiet)`

Executes Zero-Trust Architecture Intelligence (mapping modules, verifying trust boundaries, or calculating blast radius).

- **Returns:** `Promise<void>`

### `cmdContract(flags, argv, quiet)`

Executes AI agent behavioral contract verification and trace replay.

- **Returns:** `Promise<void>`

### `cmdSdd(flags, argv, quiet)`

Subagent-Driven Development (SDD) workspace management, task brief slicing, and isolated context diff packaging.

- **Returns:** `Promise<void>`

### `cmdValidate(flags, argv, quiet)`

Validates workspace integrity, rule structure, and Serde/Zod schemas across the `.agent/` payload using the 28-reviewer grid.

- **Returns:** `boolean | Promise<void>`

---

## 3. CLI Command Reference (`tribunal-kit` / `tk`)

```bash
tk <command> [subcommand] [flags]
```

### Complete List of 37 CLI Commands

| Command            | Category     | Description                                           | Primary Flags                                 |
| :----------------- | :----------- | :---------------------------------------------------- | :-------------------------------------------- |
| `init`             | Lifecycle    | Install `.agent/` into current workspace              | `--force`, `--path`, `--minimal`, `--profile` |
| `status`           | Lifecycle    | Display high-density architecture cockpit             | `--quiet`, `--json`                           |
| `update`           | Lifecycle    | Upgrade `.agent/` to latest engine version            | `--force`                                     |
| `sync`             | Lifecycle    | Synchronize IDE bridge files (`.cursorrules`, etc.)   | None                                          |
| `uninstall`        | Lifecycle    | Remove `.agent/` folder from project                  | `--force`, `--quiet`                          |
| `guardrail`        | Lifecycle    | Validate `.agent/` integrity and detect drift         | `--quiet`                                     |
| `understand`       | Intelligence | Codebase intelligence (overview, trace, impact)       | `--depth`, `--focus`, `--json`                |
| `arch`             | Architecture | Architecture intelligence (map, verify, impact)       | `--json`                                      |
| `graph`            | Architecture | Build and visualize dependency graph                  | `--json`                                      |
| `validate`         | Governance   | Verify JSON payloads or code with 28 reviewers        | `--file`, `--profile`                         |
| `contract`         | Governance   | Behavioral contract testing and replay                | `--trace-id`                                  |
| `impact-tier`      | Governance   | Classify task impact tier (0-3)                       | `--files`, `--lines`                          |
| `minimal`          | Governance   | Minimal change analysis for current project           | `--quiet`                                     |
| `align`            | Governance   | Clean AI outputs (strip slop, collapse lists)         | `--write`                                     |
| `compile`          | Governance   | Compile rules into static instructions for CLI agents | `--target`                                    |
| `case`             | Memory       | Case Law Precedent Engine (search, add, overrule)     | `--type`, `--severity`                        |
| `memory`           | Memory       | 4-Type Taxonomy Memory Engine (store, recall, gc)     | `--type`, `--budget`                          |
| `learn`            | Evolution    | Evolve project idioms from git diffs                  | `--head`                                      |
| `rsi`              | Evolution    | Recursive Self-Improvement Engine                     | `--watch`                                     |
| `evolve`           | Evolution    | Continuous dual-loop auto-tuning                      | `--strategy`                                  |
| `mutate`           | Verification | Mutation Engine to test test-suite reliability        | `--target`                                    |
| `evalopt`          | Verification | Adversarial red-teaming and evaluation mutator        | `--depth`                                     |
| `sdd`              | Multi-Agent  | Subagent-Driven Development slicing & briefs          | `--brief`, `--workspace`                      |
| `marathon`         | Multi-Agent  | Long-running autonomous agent harness                 | `--init`, `--next`                            |
| `skill-intel`      | Multi-Agent  | Autonomous Skill Intelligence Engine                  | `--gate`                                      |
| `activity`         | Telemetry    | Activity telemetry stream formatter                   | `--stream`, `--env`                           |
| `context`          | Context      | Retrieve token-compressed context snapshot            | `--max-lines`                                 |
| `browse`           | Browser      | Token-efficient web reader (<4KB)                     | `--url`                                       |
| `audit-web`        | Browser      | Live browser accessibility and console auditor        | `--url`                                       |
| `compare-web`      | Browser      | Visual regression differ for CI release gating        | `--url`                                       |
| `deconstruct`      | Browser      | Reverse-engineer live DOM elements to React TSX       | `--url`, `--selector`                         |
| `heal`             | Browser      | Runtime Sentinel error hunter & live fix verifier     | `--url`                                       |
| `system1`          | System-1     | Fast-inference heuristic classification               | `--json`                                      |
| `hook`             | Platform     | Install pre-push git hook for auto-learning           | None                                          |
| `min-context`      | Native       | Remove empty lines from context file                  | None                                          |
| `dag-schedule`     | Native       | Compute parallel execution waves from DAG             | None                                          |
| `context-compress` | Native       | Compress context while preserving `// VERIFY`         | None                                          |

---

## 4. Model Context Protocol (MCP) Tools Reference

Registered in `bin/mcp-server.js` (34 tools):

1. `tribunal_request_write`: Request permission before writing a file to disk.
2. `tribunal_preview_write`: Inspect a planned write and its blast radius.
3. `tribunal_commit_write`: Commit an approved write to disk.
4. `tribunal_approve_write`: Human Gate approval token processor.
5. `run_tribunal_audit`: Trigger the 28-reviewer audit across the repository.
6. `sync_ide_bridges`: Re-synchronize `.cursorrules`, `.windsurfrules`, and `AGENTS.md`.
7. `tribunal_analyze_finding`: Analyze a specific defect finding from an audit.
8. `tribunal_plan_correction`: Generate a step-by-step remediation plan.
9. `tribunal_execute_correction`: Execute the planned remediation.
10. `tribunal_verify_correction`: Re-test and verify the fix.
11. `tribunal_run_validation`: Run Serde and Zod schema validations.
12. `tribunal_get_resolution_certificate`: Retrieve cryptographic resolution proof.
13. `search_case_law`: Query Case Law precedents by keyword or category.
14. `list_tribunal_agents`: List all 64 registered specialist agents.
15. `get_tribunal_agent`: Fetch system prompt and skills for a specific agent.
16. `list_tribunal_skills`: List all 398 modular skills.
17. `get_tribunal_skill`: Retrieve the complete `SKILL.md` for a skill.
18. `recall_memory`: Query the 4-type persistent memory engine.
19. `store_memory`: Store a new architectural precedent into memory.
20. `get_sparse_context`: Extract a token-bounded context slice for a file.
21. `align_output`: Strip conversational slop and check code traps.
22. `verify_contracts`: Verify agent behavioral contracts.
23. `query_semantic_graph`: Run graph queries across repository architecture.
24. `exit_plan_mode`: Signal completion of architectural planning phase.
25. `tk_browser_navigate`: Headless browser navigation with SSRF protection.
26. `tk_browser_audit`: Live accessibility and console error inspection.
27. `tk_browser_compare`: Visual regression screenshot comparison.
28. `tk_browser_screenshot`: Capture full-page screenshot.
29. `tk_deconstruct_component`: Convert live DOM element to clean React TSX.
30. `tk_heal_runtime_errors`: Hunt browser runtime exceptions and propose fixes.
31. `tk_codify_browser_audit`: Codify audit findings into regression tests.
32. `tribunal_get_context`: Retrieve optimized context dossier for target file.
33. `tk_format_activity`: Format structured activity event for current host.
34. `tribunal_understand`: Codebase intelligence tool (10 subcommands).

---

## 5. Public TypeScript Types (`src/index.d.ts`)

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

export interface ActivityEvent {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  title: string;
  agent?: string;
  skill?: string;
  tool?: string;
  evidence?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```
