---
description: Create project plan using project-planner agent. 4-phase approach: Analyze → Research → Plan Document → Human Gate. NO code writing — only plan file generation. Writing begins only after explicit human approval.
---

# /plan — Strategic Implementation Planning

$ARGUMENTS

---

## When to Use /plan

|Use `/plan` when...|Skip plan and go to...|
|:---|:---|
|New feature with unclear scope|Simple, well-defined single file edit → just edit|
|Multi-file change with dependencies|Generating a snippet → `/generate`|
|Architecture decisions to make|Fixing a bug → `/debug`|
|Risk needs to be assessed first|Adding to an existing feature → `/enhance`|
|Stakeholder requirements → technical spec||

---

## The Plan Contract: No Code Before Approval

```
The project-planner agent is the only agent active in /plan mode.
It does NOT write code.
It DOES read existing code to inform the plan.
No other agents activate, no code is generated.
```

---

## Phase 1 — Socratic Gate (5 Questions)

```
1. GOAL: What specific outcome defines success? (not "add a feature" — a measurable outcome)
2. USERS: Who exactly uses this? What do they currently do without this feature?
3. SCOPE: What is explicitly OUT of scope for this version/sprint?
4. RISK: What is the highest-risk assumption this plan rests on?
5. STACK: Is the technology stack decided? Any constraints?
```

If any answer is "I don't know" → **ask before writing the plan document.**

---

## Phase 2 — Research (Read Before Planning)

```bash
# What currently exists?
ls -la src/      # Understand directory structure
cat package.json # Understand actual dependencies
cat tsconfig.json # Understand TypeScript config and path aliases
git log --oneline -5 # Recent work context

# Domain-specific reads:
cat prisma/schema.prisma    # If DB changes planned
cat src/middleware.ts        # If auth changes planned
cat src/lib/auth.ts          # If auth changes planned
```

---

## Phase 3 — Wave Decomposition

Plans execute in topological waves:

```
Wave 1 — Foundation (always first)
├── Database schema changes (must precede all code)
├── Shared types and Zod schemas (must precede callers)
└── Auth/middleware changes (must precede protected routes)

Wave 2 — Core Implementation
├── API routes / Server Actions (depends on Wave 1 schema)
├── Business logic layer
└── Unit tests for Wave 1

Wave 3 — Integration
├── Frontend components (depends on Wave 2 API)
├── Integration tests
└── E2E tests for critical paths

Wave 4 — Polish
├── Performance optimization
├── Accessibility audit
└── Deploy prep
```

---

## Phase 4 — Implementation Plan Document

```markdown
# Implementation Plan: [Feature Name]

## Goal
[Single sentence: what is true when this is complete]

## User Review Required
> [!IMPORTANT]
[Breaking changes, architectural choices needing approval]

## Research Findings
- [what currently exists that's relevant]
- [constraints discovered]

## Proposed Changes

### Wave 1 — Foundation
#### [MODIFY] prisma/schema.prisma
[What changes and why]

#### [NEW] src/lib/validators/newFeature.ts
[What this creates]

### Wave 2 — Core
#### [NEW] src/app/api/new-feature/route.ts
[What this creates]

## Out of Scope (This Version)
- [explicit exclusion]

## Verification Plan
- [ ] npx tsc --noEmit passes
- [ ] npm test passes
- [ ] [specific behavioral assertion]
```

---

## Human Gate — Mandatory Before Execution

After the plan document is written:

```
━━━ Plan Ready for Review ━━━━━━━━━━━━━━━━━

[summary of what will change across N files in N waves]

Approve?
Y = begin execution (proceed to /generate or /enhance)
N = discard plan
R = revise with feedback
```

**Zero code is written until "Y" is received.**

---

## Anti-Pattern Guard

```
❌ Never write code during /plan mode
❌ Never assume what the user wants — ask if unclear
❌ Never plan without reading the existing codebase first
❌ Never omit the Out of Scope section (it's how scope creep is prevented)
❌ Never skip the Socratic Gate — even for "simple" features
❌ Never write a plan that requires understanding unexplored files
```

---

## Usage Examples

```
/plan a user notification system with email + in-app notifications
/plan migrate the authentication from next-auth v4 to v5
/plan add Stripe subscription billing to the existing user model
/plan refactor the monolithic api.ts into domain-specific route files
/plan implement real-time collaborative editing using CRDTs
```
