---
name: semantic-filesystem-navigation
description: "Use when navigating, searching, and exploring large codebases efficiently. Enforces token-conscious search patterns: ripgrep-first, line-range viewing, symbol indexing, and strict bans on dumping entire directories or multi-thousand line files."
version: 6.0.0
last-updated: 2026-09-29
skills:
  - clean-code
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/lint_runner.js
  - .agent/scripts/verify_all.js
inputs:
  task: "string"
  target_file: "string"
outputs:
  result: "string"
  verification_status: "boolean"
trigger:
  - "semantic"
  - "filesystem"
  - "navigation"
  - "navigating"
---

# Semantic Filesystem Navigation — Token-Conserving Codebase Exploration

## Activation Boundaries
- **Activate when:** Use when navigating, searching, and exploring large codebases efficiently. Enforces token-conscious search patterns: ripgrep-first, line-range viewing, symbol indexing, and strict bans on dumping entire directories or multi-thousand line files.
- **DO NOT activate when:** The task falls outside the `semantic-filesystem-navigation` domain or is managed by a different dedicated specialist agent.


## 🔁 Multi-Pass Execution Protocol

| Pass | Phase | Core Action | Adaptive Depth |
|:---|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. | Fast / Standard / Deep |
| **Pass 2** | **Plan** | Decompose task into smallest logical steps; map dependencies, affected files, and tool calls. | Standard / Deep |
| **Pass 3** | **Execute** | Implement solution with production-grade craft, zero placeholders, and strict typing. | All Modes |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. | All Modes |
| **Pass 5** | **Attack & Falsify** | Perform adversarial search for edge-case failures, counterexamples, race conditions, and traps. | Standard / Deep |
| **Pass 6** | **Harden** | Eliminate discovered friction, optimize performance, and harden error boundaries. | Standard / Deep |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. | All Modes |


## Mandatory Pre-Flight Context Inspection
1. **Search Budget**: Determine the minimal information needed to answer the question or make the edit.
2. **Grep-First Protocol**: Use exact grep or ripgrep search for symbols/functions before opening files.
3. **Line-Range Slicing**: When viewing files, slice precise line ranges (`StartLine`, `EndLine`); NEVER view 2,000 lines at once.
4. **Directory Bounding**: Filter `list_dir` searches; avoid listing directories inside `node_modules`, `.git`, or `target`.
5. **Caller Mapping**: Before modifying any function, grep for all callers across the workspace.

## 🛠️ Technical Architecture & Reference Recipes

### 1. The 3-Step Token-Efficient Search Pipeline
```
1. LOCATE SYMBOL:  grep_search("function handlePayment", Includes: ["*.ts"])
       │ Returns: src/services/payment.ts, line 42
       ▼
2. INSPECT CONTEXT: view_file(src/services/payment.ts, StartLine: 35, EndLine: 65)
       │ Reads only 30 lines instead of 1,200 lines
       ▼
3. MAP CALLERS:    grep_search("handlePayment(", Includes: ["!*.test.ts"])
       │ Discovers all 3 consumers before applying modifications
```

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Production Mitigation |
|:---|:---|:---|
| **Context Window Saturation** | Reading full 3,000-line files pushes instructions out of LLM context | Always slice files into 50-100 line chunks centered on the target function |
| **Stale File Hallucination** | Editing a file based on memory without re-reading the active version on disk | Always re-read the target file range immediately prior to editing |

## 🏛️ Tribunal Verification & Guardrails

### 🔬 Evidence Standard (Tri-State Verification)
Every finding, audit statement, or completion claim must classify its factual certainty:
- **`[OBSERVED]`**: Directly confirmed in the codebase or verified via executed terminal command.
- **`[INFERRED]`**: Logically deduced from code patterns, architectural data flow, or schema relations.
- **`[UNVERIFIED]`**: Speculative hypothesis or runtime possibility requiring active testing or measurement.

- **Active Reviewers:** `logic-reviewer`, `orchestrator`
- **Evidence Standard:** Cite exact file paths and line numbers (`[OBSERVED]`) for all codebase statements.

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |
