# AI_RULES.md — Engineering Rules for AI Coding Agents

**Status:** Permanently Active Invariant Contract  
**Authority:** P0 Master Governance Policy  
**Scope:** All autonomous agents, subagents, tools, and human engineers interacting with this codebase.

---

## 1. The Fabel Protocol & Epistemic Discipline

Before classifying any request or executing actions, every agent MUST execute this cognitive loop:

### 1.1 Epistemic Check

- **Do I KNOW this, or am I GUESSING?**
  - If guessing: Halt. Tag `// VERIFY: [reason]` and perform an authoritative search or source-code inspection before answering.
- **Has this information possibly changed since model pre-training?**
  - If yes: Search current repository manifests (`package.json`, `Cargo.toml`, local files). Never serve stale assumptions.
- **Am I importing a package or method that actually exists?**
  - Verify against `package.json` dependencies or official framework documentation.

### 1.2 Epistemic Confidence Levels (L1–L5)

- **L1 — Absolute Certainty:** Directly verified against active codebase source files or passing test executions.
- **L2 — High Confidence:** Verified against standard library or stable, unchanged language APIs.
- **L3 — Moderate Confidence:** Likely but unverified custom utility; requires `// VERIFY` comment before commit.
- **L4 — Low Confidence:** Speculative or newly introduced feature; requires immediate read tool verification.
- **L5 — Pure Speculation:** Guessed or imagined; **strictly forbidden** from code generation.

---

## 2. Hallucination Prevention Contract

### Rule 2.1: Never Fabricate

Never invent:

- Files or directories that do not exist.
- Non-existent npm packages or Rust crates.
- Undocumented framework options or function signatures.
- Hypothetical specialist agents or reviewers outside `specialist-registry.json`.
- Fictitious test results, benchmarks, or exit codes.

### Rule 2.2: Mandatory Source-Code Inspection

Before making any technical assertion about how a subsystem operates, read the actual implementation file. Never infer functionality solely from a filename or an outdated comment.

### Rule 2.3: Reuse Before Creation

Before implementing a new utility function, parser, or security check:

1. Search `src/utils/` (`fs.js`, `helpers.js`, `path_containment.js`, `hasher.js`).
2. Search `src/activity/` (`schema.js`, `types.js`).
3. Search `src/runtime_reliability/` and `src/security/boundary.js`.
   Duplicate implementations will be rejected by `complexity-reviewer`.

### Rule 2.4: Zero Ghost Dependencies

Under no circumstances may you add a package to `package.json` or `import` a library without verifying it is already present in `node_modules` and declared in `package.json` dependencies.

---

## 3. Architecture & Modification Boundaries

### Rule 3.1: Read-Only Codebase Intelligence

All operations under `tk understand`, `src/commands/understand.js`, and `.agent/scripts/codebase_intelligence.js` are strictly read-only. Never mutate the target repository during discovery.

### Rule 3.2: Path Containment Invariant

Every file read or write operation MUST validate path containment using `assertWithinRoot(root, target)` from `src/utils/path_containment.js`. Reject directory traversal (`..`), null bytes (`\0`), and path escaping.

### Rule 3.3: Secret Redaction Invariant

Never print unredacted credentials, API keys, JWTs, or private keys to stdout, markdown artifacts, or logs. Always pass data through `redactSecrets()` or `sanitizeActivityEvent()` from `src/activity/schema.js`.

### Rule 3.4: Cycle-Safe Graph Traversal

When cloning or traversing arbitrary JavaScript objects or AST nodes, always use `WeakMap`-backed memoization (`deepClone`) to prevent call stack overflows on cyclic references.

---

## 4. Verification & Testing Discipline

### Rule 4.1: Iron Law of Verification Before Completion (VBC)

Never announce a task or fix as "completed" unless:

1. The relevant test command has actually been executed.
2. The command exited with code `0`.
3. The exact pass count and output findings are recorded in the activity log.

### Rule 4.2: Evidence Integrity Standard

- Never fabricate test counts, benchmark numbers, or elapsed execution durations.
- If progress telemetry is unmetered or awaiting execution, report: `Status: In progress (unmetered)` or `Awaiting execution result`.
- Distinguish planned actions from executed and verified outcomes.

### Rule 4.3: Separation of Planning and Implementation

For complex tasks (Tier 3 impact: auth, schema, breaking changes):

1. Phase 1: Analyze & Research.
2. Phase 2: Plan (`docs/PLAN-{slug}.md`).
3. Phase 3: Solution Architecture (no code generation).
4. Phase 4: Implementation and verification (only after human approval).

---

## 5. Tribunal Activity Protocol

When reporting actions to the user, format all status updates using the canonical Tribunal Activity Protocol:

- `› **Started** · [Operation Title]`
- `› **Activated** `@[agent]` · [Domain / Mandate]`
- `› **Skill Applied** `skill:[name]` · [Target / Purpose]`
- `› **Analyzing** · [Target / Boundary]`
- `› **Executing** · [Tool Name]`
- `› **Testing** · [Test Target]` (`Progress: X/Y suites (Z%) · N pending`)
- `› **Collecting Evidence** · [Source]`
- `✔ **Verified** · [Contract / Invariant]` (`Evidence: [authoritative findings]`)
- `✖ **Failed** · [Operation Title]` (`Error: [message]` and `Remedy: [suggested action]`)
- `⚠ **Warning** · [Condition]` (`Impact: [impact description]`)
- `⏸ **Approval Required** · [Gate Title]` (`Next: Awaiting human sign-off`)
- `✔ **Completed** · [Operation Title]` (`Artifacts: [paths]`)
