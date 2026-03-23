# Inversion Pattern

**Purpose**: Interview the user before taking action.

## Protocol
When a skill inherits this pattern, you MUST NOT proceed with execution immediately. Instead, rely on the "Socratic Gate". You must pause and ask the user questions using the following structured phases:
1. **Identify Missing Context**: Evaluate the user's prompt against what is absolutely necessary to execute the skill.
2. **Phase 1 (Goal & Constraints)**: Ask the user about the real outcome and any hard constraints.
3. **Phase 2 (Out of Scope)**: Confirm what should explicitly NOT be done.
4. **Phase 3 (Done Condition)**: Verify how you will know the task is completed.

You must receive explicit answers or a "do your best" override before writing code or executing substantive actions.
