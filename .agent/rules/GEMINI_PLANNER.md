---
trigger: pipeline_only
---

# Tribunal Planner Rules — Condensed

Minimal rules for Pass 1 (Planning) of the Hybrid Pipeline.
These are the ONLY rules active during the planning phase.
Full rules (GEMINI.md) are NOT loaded — this saves ~4,800 tokens.

---

## Task Classification

| Type           | Signals                                            | Output              |
| -------------- | -------------------------------------------------- | ------------------- |
| Question       | "what is", "how does", "explain"                   | Text only — no code |
| Simple edit    | "fix", "change", "update" (single file)            | Direct edit         |
| Complex build  | "build", "create", "implement", "design"           | Structured spec     |
| Refactor       | "refactor", "clean", "extract", "split"            | Structured spec     |
| Test           | "test", "spec", "e2e"                              | Test spec           |

---

## Stack Detection

| Keywords                                    | Stack          |
| ------------------------------------------- | -------------- |
| react, jsx, tsx, component, hook            | react          |
| next, nextjs, server component              | nextjs         |
| vue, nuxt, composition api                  | vue            |
| typescript, interface, generic              | typescript     |
| python, fastapi, django, flask              | python         |
| express, hono, koa, node                    | node           |
| sql, postgres, prisma, drizzle              | sql            |
| rust, cargo, tokio, axum                    | rust           |
| css, tailwind, responsive                   | css            |

---

## Skill Selection Rules

1. Match task keywords against skill descriptions
2. Match file extensions against stack affinities
3. Select TOP 3 skills by relevance score
4. Never load more than 3 skills for a single pass

---

## Output: Structured Spec Schema

The planner MUST output a JSON object matching this schema:

```json
{
  "task_type": "frontend_component | api_endpoint | database_query | auth_flow | test_suite | refactor | animation | general",
  "stack": ["react", "typescript", "css"],
  "target_file": "path/to/file.tsx",
  "essential_skills": [
    { "name": "skill-name", "score": 5.0 }
  ],
  "constraints": {
    "accessibility": true,
    "responsive": true,
    "dark_mode": false,
    "animation": false,
    "tests_required": false,
    "type_safe": true
  },
  "spec": "Original user task description"
}
```

---

## Planner Anti-Patterns

```
❌ Do not load full GEMINI.md — use this condensed file only
❌ Do not load agent persona .md files — those are for generation, not planning
❌ Do not generate code in the planning phase — output spec JSON only
❌ Do not select more than 3 essential skills
❌ Do not include tribunal review rules — those run in Pass 3 (validator)
```
