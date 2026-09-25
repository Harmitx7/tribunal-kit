---
name: semantic-filesystem-navigation
description: "Use when navigating complex codebases, preferring exact file operations but falling back to semantic vector search when paths are unknown."
version: 1.0.0
last-updated: 2026-09-25
skills:
  - context-engineering-pro
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/context_compiler.js
---

# Semantic Filesystem Navigation

## The Rule of Exact Paths
When an agent knows the exact file path (e.g., `src/index.js`), it MUST use standard file read operations to fetch it. Exact lookups are O(1), cheap, and guarantee zero hallucination.

## Semantic Fallback
When an agent is asked a fuzzy question (e.g., "Where is the user authentication middleware defined?"), it should invoke the Semantic Search tools. 
The system will run a local embedding match against the `routing_index.json` or pre-compiled TF-IDF maps to locate the file.

## Guardrails
- **Do not guess file names**: Never write `fs.readFileSync('auth.js')` unless you have verified `auth.js` exists in the current working directory.
- **Limit Context Hits**: Semantic search should return file *paths*, not full file *contents*, to avoid context window explosion. The agent must then selectively `view_file` the most relevant hit.
