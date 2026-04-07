---
description: Generate code using the full Tribunal Anti-Hallucination pipeline. Maker generates grounded in real project context at low temperature → domain-selected reviewers audit in parallel → Human Gate for final approval. Nothing is written to disk without explicit approval.
---

# /generate — Hallucination-Free Code Generation

$ARGUMENTS

---

## When to Use /generate

|Use `/generate` when...|Use something else when...|
|:---|:---|
|New code needs to be written from scratch|Existing code needs modification → `/enhance`|
|A single focused piece of code is needed|Multi-domain build → `/create` or `/swarm`|
|A safe, reviewed snippet is required|You want to understand options first → `/plan`|
|You need a quick but Tribunal-reviewed piece|Full project structure needed → `/create`|

---

## Pipeline Flow

```
Your request
    │
    ▼
Context scan (MANDATORY before first line of code)
├── Read package.json → verify all imports exist
├── Read tsconfig.json → understand strictness, paths aliases
├── Read referenced files → understand actual data shapes
└── Read .env.example → know available environment variables
    │
    ▼
Maker generates at temperature 0.1
├── Only methods verified in official docs
├── Only packages in package.json
├── // VERIFY: [reason] on any uncertain call
└── No full application generation — modules only
    │
    ▼
Reviewers run in parallel (auto-selected by keyword)
    │
    ▼
Human Gate — verdicts shown + unified diff
Y = write to disk | N = discard | R = revise with feedback
```

---
