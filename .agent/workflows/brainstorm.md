---
description: Structured brainstorming for projects and features. Uses Socratic questioning to explore multiple options before committing to an approach. No implementation during this phase — only exploration.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - brainstorming
  - shape
  - plan-writing
scripts-binding:
  - .agent/scripts/verify_all.js
---

# /brainstorm — Structured Idea Exploration

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before generating options or conducting Socratic architectural exploration, you MUST inspect:

1. Technology Stack Manifest (`package.json`, `tsconfig.json`) → Confirm existing language/framework versions and active library boundaries
2. Workspace File Layout → Understand current module scale and project structure before proposing architectural shifts
3. Pure Exploration Constraint → Enforce zero code edits or file creation during brainstorm phase; restrict output to options, tradeoffs, and recommendations

4. Required Skills → Before executing, load and follow procedural rules from:
   - `brainstorming` (.agent/skills/brainstorming/SKILL.md): Structured ideation and option exploration methodology
   - `shape` (.agent/skills/shape/SKILL.md): Socratic UX interview and feature planning before implementation
   - `plan-writing` (.agent/skills/plan-writing/SKILL.md): Implementation plan structure, phases, and approval gates

---

## Path Classification (Announce First)

Before asking questions, classify the request path out loud so the user can override:

- **Spike:** A quick feasibility probe ("is it possible...", "quick prototype"). Output is a recommendation; any code written is strictly throwaway.
- **Bounded:** A well-scoped change to existing code in this repository (one small endpoint, a new flag). Present short design in chat and get explicit human approval before any implementation.
- **Architectural:** New feature, new subsystem, or interface change. Full process: clarifying questions, 2-3 approaches, written spec committed to `docs/specs/YYYY-MM-DD-<topic>-design.md`, human approval gate, then `/plan-writing` or `/sdd`.

> **One-Way Ratchet:** When in doubt, take the heavier path. If hidden complexity is discovered mid-task, upgrade the path immediately. Never downgrade mid-task.

---

## When to Use /brainstorm

| Use `/brainstorm` when...              | Move to...                        |
| :------------------------------------- | :-------------------------------- |
| Multiple valid approaches exist        | After decision → `/plan`          |
| You're unsure of the best architecture | After plan approval → `/generate` |
| Exploring tradeoffs before committing  | Confirmed approach → `/create`    |
| Looking for second opinions on design  |                                   |

---

## Phase 1 — Question First

Before generating ideas, ask 3 clarifying questions:

```
1. What constraint is non-negotiable? (timeline, tech stack, cost, performance)
2. What has already been tried and ruled out?
3. What does "success" look like for this decision?
```

---

## Phase 2 — Generate 3 Distinct Options

Present minimum 3 meaningfully different approaches:

```
Option A: [Conservative approach]
  Pros: [why this works]
  Cons: [what it sacrifices]
  Effort: [Low / Medium / High]
  Best for: [when this is the right choice]

Option B: [Balanced approach]
  Pros: [why this works]
  Cons: [what it sacrifices]
  Effort: [Low / Medium / High]
  Best for: [when this is the right choice]

Option C: [Ambitious approach]
  Pros: [why this works]
  Cons: [what it sacrifices]
  Effort: [Low / Medium / High]
  Best for: [when this is the right choice]
```

---

## Phase 3 — Socratic Analysis

After presenting options, probe with questions that reveal hidden tradeoffs:

```
□ What happens when this scales to 10x current load?
□ What's the maintenance cost 12 months from now?
□ Which option fails most gracefully under the worst case?
□ Which option are you most likely to regret?
□ What's the opportunity cost of each option?
```

---

## Phase 4 — Recommendation (Evidence-Based)

After exploration, state a recommendation:

```
Recommended: Option [B]

Reasoning:
- [specific reason 1 tied to stated constraints]
- [specific reason 2]
- [specific tradeoff you're accepting and why]

NOT recommended because [reason Option A/C is worse for this specific context]
```

---

## Brainstorm Guard

```
❌ Never present a single option as if it's the only choice
❌ Never recommend without explaining WHY in terms of the stated constraints
❌ Never skip the Socratic probing — it surfaces assumptions
❌ Never proceed to implementation in /brainstorm mode — use /plan after
```

---

## After /brainstorm — Next Steps

| Outcome                                    | Next Command                              |
| :----------------------------------------- | :---------------------------------------- |
| Decision made, ready to plan               | → `/plan` with the Distilled Assertions   |
| Decision made, ready to build from scratch | → `/create` with chosen stack             |
| Need more exploration in a specific domain | → `/brainstorm` again with narrower scope |
| Ready to generate a specific piece         | → `/generate` for a focused snippet       |

---

## Usage Examples

```
/brainstorm real-time collaboration: WebSockets vs Server-Sent Events vs CRDTs
/brainstorm caching strategy: Redis vs in-memory vs CDN for our API responses
/brainstorm auth: next-auth vs Clerk vs custom JWT for our SaaS app
/brainstorm state management: Zustand vs Redux vs TanStack Query
/brainstorm monolith vs microservices for our current team size
```
