---
name: architecture
description: Architectural decision-making framework. Requirements analysis, trade-off evaluation, ADR documentation. Use when making architecture decisions or analyzing system design.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
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

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ Architecture Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/brainstorm` or `/plan`**
**Active reviewers: `project-planner` · `logic-reviewer`**

### ❌ Forbidden AI Tropes in Architecture

1. **Defaulting to Microservices** — never recommend Microservices for a new or small project without explicit scale requirements. Monolith first.
2. **Over-engineering with CQRS/Event Sourcing** — do not suggest complex distributed patterns unless the domain demands it.
3. **Assuming AWS/Cloud Provider** — ask where the user deploys, do not hallucinate AWS services as the default solution.
4. **Ignoring Operational Cost** — do not recommend architectures that require dedicated DevOps teams if the user is a solo developer.
5. **Failing to Document Trade-offs** — every architecture decision has a downside. Never present a "perfect" solution.

### ✅ Pre-Flight Self-Audit

Review these questions before proposing an architecture:
```
✅ Did I start with the simplest architecture that satisfies the constraints?
✅ Did I explicitly document the downsides (cost, complexity, maintainability) of my proposal?
✅ Is my proposal grounded in the user's actual constraints (team size, budget, timeline)?
✅ Did I ask about the read/write ratio and data shape before choosing a database?
✅ Is my solution resilient to partial failures?
```


---

## 🤖 LLM-Specific Traps

AI coding assistants often fall into specific bad habits when dealing with this domain. These are strictly forbidden:

1. **Over-engineering:** Proposing complex abstractions or distributed systems when a simpler approach suffices.
2. **Hallucinated Libraries/Methods:** Using non-existent methods or packages. Always `// VERIFY` or check `package.json` / `requirements.txt`.
3. **Skipping Edge Cases:** Writing the "happy path" and ignoring error handling, timeouts, or data validation.
4. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.
5. **Silent Degradation:** Catching and suppressing errors without logging or re-raising.

---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/review` or `/tribunal-full`**
**Active reviewers: `logic-reviewer` · `security-auditor`**

### ❌ Forbidden AI Tropes

1. **Blind Assumptions:** Never make an assumption without documenting it clearly with `// VERIFY: [reason]`.
2. **Silent Degradation:** Catching and suppressing errors without logging or handling.
3. **Context Amnesia:** Forgetting the user's constraints and offering generic advice instead of tailored solutions.

### ✅ Pre-Flight Self-Audit

Review these questions before confirming output:
```
✅ Did I rely ONLY on real, verified tools and methods?
✅ Is this solution appropriately scoped to the user's constraints?
✅ Did I handle potential failure modes and edge cases?
✅ Have I avoided generic boilerplate that doesn't add value?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing tests, compile success, or equivalent proof) that your output works as intended.
