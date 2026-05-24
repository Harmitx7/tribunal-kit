# Implementation Plan: Tokenless Prompt Compiler (YAML-ification)

## 1. Objective Context
Build a zero-token, local execution script that converts conversational user prompts into dense, machine-optimized YAML structures (Option B). This tool will run entirely locally via Node.js, stripping grammar fluff and formatting the intent into strict key-value pairs, reducing token count and maximizing LLM comprehension by 20x.

## 2. Architectural Handoff
- **Stack:** Pure Node.js (Zero external dependencies to maintain lightning-fast execution speed).
- **Core Logic:** A local script (`prompt_compiler.js`) that uses basic stop-word removal and structural templates to convert a string into YAML. It will output directly to the terminal (and optionally to the clipboard).
- **Documentation:** A new workflow file (`/super-prompt` or `/optimize-prompt`) to instruct the user on how to use it.
- **Constraints:** Must not make any network calls. Must use native Node.js libraries (`fs`, `child_process` for clipboard if needed, `process.argv`).

## 3. Dependency Tree Execution Order
1. **Wave 1 (The Engine):** Write `.agent/scripts/prompt_compiler.js`. This script will parse `process.argv`, strip conversational fillers (e.g., "please", "I want to"), classify the intent, and output clean YAML to the console.
2. **Wave 2 (The Interface):** Create `.agent/workflows/super-prompt.md` to document the command and provide usage examples.
3. **Wave 3 (Verification):** Test the compiler locally by passing a highly conversational prompt and confirming the output is dense YAML.

## 4. File Blueprint
- `[NEW] .agent/scripts/prompt_compiler.js`
- `[NEW] .agent/workflows/super-prompt.md`

## 5. What Could Go Wrong (Failure Modes & Mitigation)
- **Over-Stripping Context:** A naive regex might accidentally strip out technical words if they overlap with stop-words. 
  - *Mitigation:* We will use a highly specific, hardcoded list of conversational fillers (e.g., "can you", "please build", "i need a", "would it be possible to") rather than aggressive generic NLP.
- **Clipboard Compatibility:** Copying to the clipboard differs across Windows/Mac/Linux. 
  - *Mitigation:* We will output the optimized prompt directly to standard output (the terminal) so the user can easily highlight and copy it natively, avoiding brittle OS-specific clipboard commands.

## 6. Verification Protocol
1. **Execution Check:** Run `node .agent/scripts/prompt_compiler.js "Hey, could you please build a login page using React and tailwind?"`
2. **Output Check:** Verify the terminal prints a highly compressed YAML structure like:
   ```yaml
   action: build
   target: login page
   stack: React, tailwind
   ```
3. **Guardrail Check:** Ensure the workflow file (`super-prompt.md`) explicitly explains that it uses zero API tokens.
