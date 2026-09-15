---
description: Generates an elite Flight Data HUD context dossier for any file, multi-file pair, or project folder. Maintains a living codebase context vault with drift detection.
tools: Read, Grep, Glob, Bash, Write
version: 3.0.0
last-updated: 2026-09-13
required-skills:
  - plan-writing
  - clean-code
  - documentation-templates
scripts-binding:
  - scripts/context_compiler.js
---

# /context — Living Codebase & File Context Engine

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before generating context dossiers or inspecting workspace files, you MUST:

1. **Input Normalization** → Strip any surrounding single or double quotes, resolve IDE drag-and-drop file paths, and handle Windows/POSIX path separators.
2. **Execute Context Compiler Engine** → Call `node scripts/context_compiler.js` to compute deterministic SHA-256 hashes, extract AST skeletons, and identify inbound callers.
3. **Living Vault Registration** → Ensure generated dossiers are saved to `docs/context/` and cataloged in `docs/context/INDEX.md`.

---

## When to Use /context

| Scenario                          | Command Pattern               | Output Generated                                             |
| :-------------------------------- | :---------------------------- | :----------------------------------------------------------- |
| Single File Dragged into Chat     | `/context <file_path>`        | `docs/context/[name].context.md` (Flight Data HUD)           |
| Multi-File Pair Dragged into Chat | `/context <fileA> <fileB>`    | `docs/context/[nameA]__[nameB].bridge.md` (Interface Bridge) |
| Whole Project / Subsystem Folder  | `/context <dir_path>`         | `docs/context/[folder].context.md` (Subsystem Macro Map)     |
| Audit Vault Freshness             | `/context --check`            | Terminal report flagging Fresh vs Stale context              |
| Batch Vault Crawling              | `/context <dir_path> --crawl` | Crawls entire directory and populates context vault          |

---

## Execution Protocol

### Step 1: Parse Arguments & Detect Mode

Examine `$ARGUMENTS`:

- If `$ARGUMENTS` contains `--check`:
  ```bash
  node scripts/context_compiler.js --check
  ```
  Report the freshness status to the user.
- If `$ARGUMENTS` contains two file paths (e.g. `path/to/A.ts path/to/B.ts`):
  Execute multi-file bridge mode:
  ```bash
  node scripts/context_compiler.js --multi "<pathA>" "<pathB>" --write
  ```
- If `$ARGUMENTS` is a directory:
  Execute directory subsystem mode:
  ```bash
  node scripts/context_compiler.js --dir "<dir_path>" --write
  ```
- If `$ARGUMENTS` is a single file:
  Execute single-file mode:
  ```bash
  node scripts/context_compiler.js --file "<file_path>" --write
  ```

---

### Step 2: Synthesis & Flight Data HUD Formatting

When presenting the result in the AI IDE chat, format the response using the **Flight Data HUD Dossier** structure:

1. **Header HUD:** Target file, layer badge, language, and SHA-256 snapshot hash.
2. **30-Second Mental Model:** Single-sentence mission statement and ASCII/Mermaid sequence.
3. **Public API & Contract Table:** Exported functions, types, parameters, and error/panic conditions.
4. **Blast Radius & Topology:** Inbound callers, line numbers, and callers vector.
5. **⚠️ Chesterton's Fences & Landmines:** Critical gotchas, defensive guards, and `// VERIFY` invariants.
6. **Isolated Verification Recipe:** Exact 1-line shell command to run tests for that file.
7. **AI Quick-Inject Card:** Fenced snippet for immediate copy-pasting into future prompts.

---

### Step 3: Vault Sync

Confirm that:

1. Dossier was written to `docs/context/[target].context.md`.
2. Master registry `docs/context/INDEX.md` was updated.
3. If `--link` flag was passed, verify or add top-line comment `// @context docs/context/...` to the target file.

---

## Anti-Hallucination Guardrails

```
❌ Never invent callers that were not verified by ripgrep/compiler.
❌ Never delete or omit // VERIFY comments from code or dossiers.
❌ Never paraphrase obvious code without highlighting invariants and gotchas.
❌ Always report exact file paths and line numbers.
```
