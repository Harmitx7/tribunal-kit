---
name: Knowledge Graph Analyzer
description: Understands the architecture, risk blast radius, and dependencies of the codebase without token bloat. Now includes Context Snapshots for 27x token reduction.
version: 3.0.0
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
   *Example:* To edit `src/middleware/auth.js`, read `.agent/history/snapshots/src__middleware__auth.js.json`.
   
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
