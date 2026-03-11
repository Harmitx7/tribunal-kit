---
description: Structured brainstorming for projects and features. Explores multiple options before implementation.
---

# /brainstorm — Idea Space

$ARGUMENTS

---

This command puts the AI into **exploration mode** — no implementation, no code. The goal is to map the problem and surface real alternatives before committing to a path.

---

## When to Use This

Before any `/create` or `/enhance` command when:
- The problem is not yet well-defined
- You want to evaluate multiple architectural paths
- You need an honest assessment of tradeoffs before starting
- Decision between two tools or approaches is unclear
- The team needs to align on direction before work begins

---

## The Brainstorming Contract

- Minimum **3 distinct approaches** will be surfaced — not variations of one idea, but genuinely different paths
- Every approach is assessed on **specific tradeoffs**, not vague pros/cons
- A **clear verdict** is given at the end — not "it depends" as a final answer
- No code is written during brainstorming
- Every tool or library named must be **real and documented**

---

## What Happens

**First, the problem is clarified:**

> "What specific outcome should exist that doesn't exist today? Who experiences the problem? What constraints are fixed (stack, timeline, team size)?"

If those aren't answered, the session asks before going further.

**Then, at least 3 distinct approaches are surfaced**, each with:
- How it works (mechanism, not just name)
- Where it wins (specific advantage)
- Where it struggles (real tradeoff — not "it can be complex")
- Realistic effort level

**Finally, one approach is recommended** — not hedged, not "it depends." A clear pick with a clear reason tied to the user's stated constraints.

---

## Response Template

```
## Exploration: [Problem Statement]

Why we're looking at this:
[What's the actual friction or outcome gap being solved]

User context:
[Stack, constraints, team size, timeline — if known]

────────────────────────────────────────

Approach 1 — [Name]
[What this is and how it actually works — mechanism, not just label]

Where it wins:
› [Specific advantage tied to this use case]
› [Second specific advantage]

Where it struggles:
› [Real tradeoff — operational cost, learning curve, limitation]

Effort: ◼◽◽◽◽ Low | ◼◼◼◽◽ Medium | ◼◼◼◼◽ High

────────────────────────────────────────

Approach 2 — [Name]
...

────────────────────────────────────────

Approach 3 — [Name]
...

────────────────────────────────────────

Verdict:
Approach [N] — because [specific reason tied to the stated constraints].

[If it truly depends on one variable]: 
  → If [condition A]: Approach 1
  → If [condition B]: Approach 2

What direction should we go deeper on?
```

---

## Questions That Unlock Better Exploration

The brainstorming agent may ask:

| Question | Why it matters |
|---|---|
| What's the scale? (RPS, users, data volume) | Changes which approaches are viable |
| Is the team familiar with X? | Affects "effort" rating significantly |
| What's the failure cost? | Changes risk tolerance and complexity budget |
| Is this greenfield or adding to existing? | Existing constraints eliminate some options |
| What's the time horizon? (prototype vs 5-year system) | Short-term vs long-term tradeoffs differ |

---

## Hallucination Guard

- **No invented libraries or tools** — every named option must be a real, documented choice
- **No performance claims without a cited benchmark** — "X is faster" requires a source
- **Every "pro" must be mechanically grounded** — how does this approach actually achieve the advantage?
- **Assumptions about the user's codebase** are labeled: `[ASSUMPTION — verify before committing to this approach]`
- **Effort estimates** are ranges, not single values, with a confidence label

---

## Cross-Workflow Navigation

| After /brainstorm, the next step is... |
|---|
| Decision made → `/plan` to write the formal plan |
| Decision made, simple task → `/generate` directly |
| Decision made, large build → `/create` with known approach |
| Still unclear → ask more Socratic questions before proceeding |

---

## Usage

```
/brainstorm caching layer for a high-traffic API
/brainstorm auth approach for a multi-tenant SaaS
/brainstorm how to structure shared state in a large React app
/brainstorm whether to use a message queue or direct API calls for notifications
/brainstorm database: PostgreSQL vs MongoDB for our event sourcing system
```
