---
description: Tokenless Prompt Compiler. Converts conversational requests into hyper-dense YAML structures that LLMs process perfectly, reducing prompt tokens and improving response accuracy. Zero API tokens used during compilation.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - llm-engineering
  - clean-code
scripts-binding:
  - .agent/scripts/prompt_compiler.js
---

# /super-prompt — Tokenless Prompt Compiler

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before compiling prompts or running prompt compression, you MUST inspect:
1. Target Input Request Text → Read target user request to strip conversational fillers
2. Prompt Compiler Script (`.agent/scripts/prompt_compiler.js`) → Verify availability of local prompt compiler script
3. Zero Token Overhead Principle → Ensure compilation executes locally without invoking LLM API calls

---

## Usage

Instead of typing your prompt into the AI chat directly, run the local compiler from your terminal:

```bash
node .agent/scripts/prompt_compiler.js "Hey, could you please build a login page using React and tailwind for me?"
```

## Expected Output

The script strips conversational fillers and outputs a dense YAML block to your terminal instantly:

```yaml
---
action: build
target: login page using React and tailwind
stack: [react, tailwind]
---
```

## Next Step

Copy the YAML output and paste it into the AI chat. The LLM will use this structured format to generate a highly accurate response while saving massive amounts of context window tokens!

---

## After /super-prompt — Next Steps

| Outcome        | Next Command                                        |
| :------------- | :-------------------------------------------------- |
| YAML generated | → Paste into chat to trigger `/generate` or similar |

---
