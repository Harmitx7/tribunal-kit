# Pipeline Pattern

**Purpose**: Link multiple execution steps together with explicit validation gates between them.

## Protocol
When a skill inherits this pattern, the agent must execute its instructions sequentially and rigidly.
1. **Step-by-Step Execution**: You must not skip steps or combine multiple distinct phases into a single massive generative output.
2. **Validation Gates**: After completing Step N, you must validate that the output of Step N meets its success criteria before moving to Step N+1.
3. **Halting**: If any gate fails validation, you must HALT the pipeline and either initiate an Error Recovery Protocol or report the failure to the user. Do not proceed with subsequent steps with broken inputs.
