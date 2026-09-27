---
name: adr-generation
description: 'Formalizes architectural decisions into machine-readable ADR (Architecture Decision Record) documents.'
version: 1.1.0
last-updated: 2026-09-26
skills:
  - fabel-protocol
---

# ADR Generation Skill

Use this skill to produce formal Architecture Decision Records.

## 🔴 Hallucination Traps

- ❌ **Creating ADRs for trivial things** → ✅ Only generate ADRs for decisions that affect boundaries, dependencies, or scale.
- ❌ **Presenting one option as an "Alternative"** → ✅ Always research and list at least 2 viable alternatives.
- ❌ **Inventing Consequences** → ✅ Focus on concrete operational or code-level consequences (e.g., "Requires manual DB migrations").

## 📋 Pre-Flight Checklist

1. Have we identified the core problem?
2. Are there at least two viable alternatives?
3. Did we confirm the Minimal-Change Principle?

## 📝 ADR Markdown Template

Use the following strict template when generating an ADR. Save the file in `.agent/architecture/adrs/YYYY-MM-DD-title.md`.

```markdown
# ADR: [Short Descriptive Title]

## Context

[What is the problem we are solving?]

## Decision

[What is the selected approach?]

## Alternatives Considered

1. **[Option A]**: [Why it was rejected]
2. **[Option B]**: [Why it was rejected]

## Trade-offs

[What are the downsides of the chosen Decision?]

## Consequences

[What does this decision force us to do later? What are the operational impacts?]
```

## 🛡️ Verification-Before-Completion (VBC)

Before concluding, verify that the `system-model.yml` has been updated to reflect this ADR.
