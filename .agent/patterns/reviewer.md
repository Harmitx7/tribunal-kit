# Reviewer Pattern

**Purpose**: Evaluate code or content against a strict external checklist.

## Protocol
When a skill inherits this pattern, the agent assumes the role of an evaluator. Do NOT generate novel content or fix the problem automatically unless explicitly instructed.
1. **Checklist Enforcement**: You must read the evaluation checklist provided in the specific skill.
2. **Review Output**: For every item in the checklist, determine if it passes or fails.
3. **Severity Grading**: Group all findings by severity:
   - **Critical**: Must fix before proceeding (e.g. security violations, build errors)
   - **Warning**: Should fix (e.g. best practice violations, performance risks)
   - **Info**: Stylistic or minor suggestions
4. **Separation of Concerns**: Only evaluate the "what" (the checklist) based on the "how" (this standard format). Do not blur your own opinions into the checklist constraints.
