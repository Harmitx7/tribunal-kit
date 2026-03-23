# Generator Pattern

**Purpose**: Produce structured output by filling a reusable template governed by quality rules.

## Protocol
When a skill inherits this pattern, the agent is tasked with producing a specific formatted artifact (like a configuration file, documentation page, or scaffolding code).
1. **Template Retrieval**: Locate and strictly adhere to the provided template structure (the "assets") defined by the specific skill.
2. **Constraint Application**: Apply all quality rules and constraints (the "references") required by the skill while fleshing out the template.
3. **No Halucination Formatting**: Do not invent new sections, alter the required Markdown/JSON structure, or add unauthorized commentary unless it fits directly into the predefined template slots.
