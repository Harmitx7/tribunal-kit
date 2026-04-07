---
description: Structured brainstorming for projects and features. Uses Socratic questioning to explore multiple options before committing to an approach. No implementation during this phase — only exploration.
---

# /brainstorm — Structured Idea Exploration

$ARGUMENTS

---

## When to Use /brainstorm

|Use `/brainstorm` when...|Move to...|
|:---|:---|
|Multiple valid approaches exist|After decision → `/plan`|
|You're unsure of the best architecture|After plan approval → `/generate`|
|Exploring tradeoffs before committing|Confirmed approach → `/create`|
|Looking for second opinions on design||

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

## Usage Examples

```
/brainstorm real-time collaboration: WebSockets vs Server-Sent Events vs CRDTs
/brainstorm caching strategy: Redis vs in-memory vs CDN for our API responses
/brainstorm auth: next-auth vs Clerk vs custom JWT for our SaaS app
/brainstorm state management: Zustand vs Redux vs TanStack Query
/brainstorm monolith vs microservices for our current team size
```
