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

---

## What Happens

**First, the problem is clarified:**

> "What specific outcome should exist that doesn't exist today? Who experiences the problem? What constraints are fixed?"

If those aren't answered, I ask before going further.

**Then, at least 3 distinct approaches are surfaced.** Not variations — genuinely different paths with different tradeoffs.

**Each approach is assessed on:**
- What problem it solves well
- Where it creates friction
- Realistic effort level

**Finally, one approach is recommended** — not hedged, not "it depends." A clear pick with a clear reason.

---

## Response Template

```
## Exploration: [Problem Statement]

Why we're looking at this:
[What's the actual friction being solved]

────────────────────────────────────────

Approach 1 — [Name]
[What this is and how it works]

Where it wins:
› [Specific advantage 1]
› [Specific advantage 2]

Where it struggles:
› [Real tradeoff — not a vague concern]

Effort: ◼◼◽◽◽ (Low) | ◼◼◼◽◽ (Medium) | ◼◼◼◼◽ (High)

────────────────────────────────────────

Approach 2 — [Name]
...

────────────────────────────────────────

Approach 3 — [Name]
...

────────────────────────────────────────

Verdict:
Approach [N] — because [specific reason tied to the user's stated constraints].

What direction should we go deeper on?
```

---

## Hallucination Guard

- No invented libraries or tools — every named option must be a real, documented choice
- No performance claims without a cited benchmark
- Every "pro" must be grounded in how this approach actually works — not wishful thinking
- Assumptions about the user's codebase are always labeled: `[ASSUMPTION — verify first]`

---

## Usage

```
/brainstorm caching layer for a high-traffic API
/brainstorm auth approach for a multi-tenant SaaS
/brainstorm how to structure shared state in a large React app
```
