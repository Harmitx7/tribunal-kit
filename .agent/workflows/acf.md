---
description: Distills human-written markdown documents into highly structured Agent Context Format (.acf) YAML files to minimize token usage and hallucination.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - clean-code
  - documentation-templates
scripts-binding:
  - .agent/scripts/lint_runner.js
---

# /acf — Agent Context Format Distiller

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before distilling markdown specs into `.acf` YAML files, you MUST inspect:
1. Target Document Source → Read source `.md` specification (PRD, design spec, or architecture doc)
2. Existing Context Registry (`context/*.acf`) → Check target directory to prevent duplicate context creation
3. YAML Schema Strictness → Validate output against ACF schema (rules, constraints, tech-stack, boundaries) before writing to disk

---

## When to Use /acf

| Use `/acf` when...                                    | Move to...                       |
| :---------------------------------------------------- | :------------------------------- |
| You have a new `PRD.md` or feature spec in markdown   | After distillation → `/generate` |
| The human-written specs have changed and need syncing | After sync → `/plan`             |
| You want to reduce context window token usage         | When coding against the spec     |

---

## The ACF Philosophy: Semantic Compression

LLMs struggle with long prose, ambiguous requirements, and duplicate information. They perform best with structured data, explicit constraints, and atomic facts.

The `/acf` command acts as a **Semantic Compressor**. It reads human-friendly Markdown and extracts only the deterministic facts into `.acf` files formatted as strict YAML.

---

## 1. Distillation Protocol

When the user runs `/acf [filename]`:

1. **Read Target:** Read the target Markdown file.
2. **Extract Facts:** Ignore all narrative prose, conversational filler, and explanations.
3. **Map Relationships:** Identify goals, inputs, outputs, constraints, dependencies, and requirements.
4. **Generate ACF:** Output the atomic `.acf` files into the `context/` directory at the project root. Ensure output is strict YAML.

---

## 2. Supported ACF Node Types

When distilling, categorize the extracted facts into these specific ACF schemas:

### Feature Nodes (`context/features/[feature_name].acf`)

Describes a specific application capability.

```yaml
feature: [name]
goal: [1-3 word description]
inputs:
  - [data element]
outputs:
  - [data element]
requirements:
  - REQ-001: [specific testable criteria]
constraints:
  - [hard limitation, e.g., max_length: 8]
dependencies:
  - [reference to other nodes, e.g., db.users]
```

### Context Nodes (`context/context.acf`)

Permanent project truth.

```yaml
project:
  name: [name]
stack:
  frontend: [framework]
  backend: [framework]
  database: [db]
```

### Rule Nodes (`context/rules.acf`)

Hard constraints for the codebase.

```yaml
forbidden:
  - [e.g., any, ts-ignore]
required:
  - [e.g., zod, server_actions]
```

### Memory Nodes (`context/memory.acf`)

Lessons learned from past iterations.

```yaml
mistakes:
  [id]:
    cause: [reason]
decisions:
  [id]:
    reason: [justification]
```

---

## 3. The Distiller Guardrails

```
❌ NEVER copy/paste paragraphs of text into the .acf file.
❌ NEVER invent dependencies that aren't explicitly mentioned or structurally obvious.
❌ NEVER output unstructured text. Every line must be valid YAML.
❌ NEVER merge multiple distinct features into a single .acf file. Create atomic files for each feature.
```

---

## Usage Examples

```
/acf docs/PRD.md
/acf brainstorm.md
/acf architecture.md
```

---

## After /acf — Next Steps

| Outcome                | Next Command                                      |
| :--------------------- | :------------------------------------------------ |
| ACF files generated    | → `/generate` to code against the structured spec |
| ACF needs a plan first | → `/plan` to create implementation plan           |
| ACF reveals ambiguity  | → Ask user to clarify the source document         |

---
