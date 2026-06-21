---
name: Knowledge Graph Analyzer
description: Understands the architecture, risk blast radius, and dependencies of the codebase without token bloat. Now includes Context Snapshots for 27x token reduction.
version: 3.0.0
routing:
  domain: general
  tier: basic
---

# /graph — Knowledge Graph Skill v3.0

Use this skill when the user types `/graph` or when you need to deeply understand the architecture of an unfamiliar codebase without suffering from context-window bloat.

## The Token Reduction Protocol (Option C)

**DO NOT READ RAW SOURCE FILES IF A SNAPSHOT EXISTS.**
Reading raw project files wastes up to 50,000 tokens per edit. You must use the pre-computed Context Snapshots instead. These snapshots contain the file's content, resolved imports, dependent files, and risk scores all in one JSON blob.

## Pre-Flight Checklist

- [ ] Have I run the Macro Mapper to generate the latest Context Snapshots?
- [ ] Am I reading from `.agent/history/snapshots/` instead of directly grepping the project?
- [ ] Have I respected the `blastRadius` before modifying a file?

## Execution Protocol

1. **Step 1: The Macro Map (Blast Radius & Snapshot Engine)**
   Execute the graph builder to map module boundaries and compute downstream risk scores. This also automatically generates a Context Snapshot for every file.

   ```bash
   node .agent/scripts/graph_builder.js
   ```

2. **Step 2: Read Context Snapshots (MANDATORY)**
   Instead of using `cat` or `grep` to read a file, read its snapshot. Snapshots are stored in `.agent/history/snapshots/` with slashes replaced by `__`.
   _Example:_ To edit `src/middleware/auth.js`, read `.agent/history/snapshots/src__middleware__auth.js.json`.

   This gives you:
   - The full source code of the target file.
   - The exported symbols of every file it imports.
   - The list of files that depend on it.
   - Its exact `riskScore` and `blastRadius`.

3. **Step 3: Interactive Visualization (For Humans)**
   The user can view a sleek, zero-dependency visualizer of the codebase. You can prompt them to run:

   ```bash
   npx tribunal-kit graph
   ```

4. **Step 4: The Micro Zoom (Legacy Street View)**
   If a snapshot is unavailable or too large, you can fall back to the zoomer to get its structural skeleton:
   ```bash
   node .agent/scripts/graph_zoom.js --focus <path_to_file>
   ```

## VBC Protocol (Verification-Before-Completion)

You are explicitly forbidden from guessing or "hallucinating" what functions, props, or variables exist inside a file. You MUST read the Context Snapshot (or use `graph_zoom.js`) to verify a component's exact signature before you attempt to call it, mock it, or rewrite it. Always respect the Blast Radius Risk Score before deleting or mutating files.

---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:

```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.

- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
