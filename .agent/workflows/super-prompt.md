# /super-prompt — Tokenless Prompt Compiler

---

## required-skills: llm-engineering

Converts conversational, fluffy requests into hyper-dense YAML structures that LLMs process perfectly, reducing prompt tokens and drastically improving response accuracy. **Zero API tokens are used during compilation.**

## $CONTEXT_REQUIRED

```
Read BEFORE super-prompting:
□ Target prompt               → Determine what the user wants to achieve
□ .agent/scripts/prompt_compiler.js → Verify script exists
```

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
