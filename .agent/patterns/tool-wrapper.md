# Tool Wrapper Pattern

**Purpose**: Package an external library's or CLI tool's conventions as on-demand, executable knowledge.

## Protocol
When a skill inherits this pattern, the agent MUST NOT guess how to use the target tool. You are acting strictly as a wrapper for this specific utility.
1. **Consult References**: Read the provided documentation, usage examples, or reference notes in the skill definitions BEFORE issuing any commands.
2. **Strict Adherence**: Follow the rules defined in the skill exactly as written. Do not improvise flags, parameters, or endpoints that are not explicitly authorized by the reference.
3. **Command Execution**: If the tool is a CLI command or Python script (e.g. `test_runner.py`), construct the command accurately based solely on the referenced conventions, execute it, and report the direct output.
