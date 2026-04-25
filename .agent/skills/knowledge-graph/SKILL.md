---
name: Knowledge Graph Analyzer
description: Understands the architecture and dependencies of the codebase without token bloat.
version: 1.0.0
---

# /graph — Knowledge Graph Skill

Use this skill when the user types `/graph` or when you need to deeply understand the architecture of an unfamiliar codebase without suffering from context-window bloat.

## Pre-Flight Checklist
Before answering architectural questions or making broad code changes, you must understand the environment.
- [ ] Have I run the Macro Mapper to get the high-level architecture?
- [ ] Have I used the Micro Zoomer on the specific files related to the user's request to see their exact signatures?

## Execution Protocol

1. **Step 1: The Macro Map (World View)**
   Execute the graph builder to map module boundaries. This runs incrementally and respects `.gitignore`.
   ```bash
   node .agent/scripts/graph_builder.js
   ```
   Read the output file at `.agent/history/architecture-graph.yaml`. **Do NOT try to read every file in the project.** Use this map to identify which files export the functions or components you need.

2. **Step 2: The Micro Zoom (Street View)**
   Once you know which file to investigate, use the zoomer to get its structural skeleton. This strips out the internal logic and returns only imports, exports, class signatures, and function parameters.
   ```bash
   node .agent/scripts/graph_zoom.js --focus <path_to_file>
   ```
   *Example: `node .agent/scripts/graph_zoom.js --focus src/components/Button.tsx`*

3. **Step 3: Analyze and Advise**
   Present the user with your findings. Highlight hidden dependencies, circular imports, or structural insights based on what you discovered in the graphs.

## VBC Protocol (Verification-Before-Completion)
You are explicitly forbidden from guessing or "hallucinating" what functions, props, or variables exist inside a file. You MUST use the `graph_zoom.js` script to verify a component's exact signature before you attempt to call it, mock it, or rewrite it.
