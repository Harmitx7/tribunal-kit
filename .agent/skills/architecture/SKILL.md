---
name: architecture
description: Architectural decision-making framework. Requirements analysis, trade-off evaluation, ADR documentation. Use when making architecture decisions or analyzing system design.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Architecture Decision Framework

> An architecture decision is only good until the constraints change.
> Document the decision AND the reasoning — future teams need both.

---

## When to Use This Skill

- A new system, service, or major feature is being designed
- An existing architecture is being evaluated for scaling, cost, or maintainability problems
- A team disagrees on technical direction and needs a structured decision process
- A decision needs to be documented so future engineers understand the "why"

---

## The Decision Process

Good architecture decisions follow a sequence. Skipping steps creates decisions that look good in a diagram and fail in production.

### Phase 1 — Understand the Forces

Before proposing anything, map what actually constrains the design:

```
Requirements:     What must this system do?
Quality attributes: Speed, reliability, security, cost, maintainability — rank them
Constraints:      Team size, existing tech, regulatory, budget
Team context:     What does the team already know? What can they operate?
```

**The trap:** Jumping to technology before understanding quality attributes.
If the top priority is "cheap to run" — that's a different answer than "sub-100ms response time."

### Phase 2 — Generate Options

Produce at least 2 real alternates. "We could do X, or we could not" is not a comparison.

For each option document:
- How it satisfies the top quality attributes
- Where it falls short
- Long-term operational cost (not just build cost)
- Risk to the team given their current knowledge

### Phase 3 — Evaluate Trade-offs

Use a table:

| Quality Attribute | Option A | Option B | Option C |
|---|---|---|---|
| Time to first delivery | ★★★ | ★★ | ★★★★ |
| Operational complexity | Low | High | Medium |
| Cost at 10x scale | $ | $$$ | $$ |

The option with the most stars doesn't always win. **The one that best fits the top-priority attributes wins.**

### Phase 4 — Document the Decision (ADR)

Every significant architecture decision gets an ADR (Architecture Decision Record).

```markdown
# ADR-NNN: [Short title]

## Status
Accepted / Proposed / Deprecated / Superseded by ADR-NNN

## Context
[What situation or problem prompted this decision?]

## Options Considered
[Brief description of each option]

## Decision
[What was chosen and why]

## Trade-offs Accepted
[What downsides are being consciously accepted?]

## Consequences
[What becomes easier? What becomes harder?]
```

---

## File Index

| File | Covers | When to Load |
|---|---|---|
| `context-discovery.md` | Questions to map requirements and constraints | Early in design |
| `pattern-selection.md` | Monolith vs microservices, event-driven, CQRS, etc. | Choosing structural patterns |
| `patterns-reference.md` | Reference descriptions of common patterns | Evaluating patterns |
| `trade-off-analysis.md` | Scoring and comparison frameworks | Decision phase |
| `examples.md` | Worked architecture examples | Concrete reference |

---

## Anti-Patterns in Architecture Work

| Pattern | Problem |
|---|---|
| Resume-driven architecture | Choosing tech because it's interesting, not because it fits |
| Premature microservices | Splitting a monolith before the domain boundaries are known |
| Ignoring operational cost | Systems that are brilliant to build and terrible to run |
| No ADR | Decision rationale lost — future engineers repeat the same debates |
| One option considered | Not an evaluation, just a justification |
