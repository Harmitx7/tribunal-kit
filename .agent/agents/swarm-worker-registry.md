# 🗂️ Swarm Worker Registry

Maps task types and domain keywords to the correct specialist Worker agents.
Used by `supervisor-agent` to select the correct `agent` field in every `WorkerRequest`.
All agents listed here MUST exist as `.md` files in `.agent/agents/`.

---

## Primary Routing Table

|Task Type|Domain Keywords|Route to Agent|
|---|---|---|
|`research`|any|`explorer-agent`|
|`research`|security, vulnerability, owasp|`security-auditor`|
|`research`|database, schema, sql, orm|`database-architect`|
|`research`|performance, profiling, optimization|`performance-optimizer`|
|`generate_code`|api, route, endpoint, server, express, auth, jwt|`backend-specialist`|
|`generate_code`|python, fastapi, django, flask|`python-pro`|
|`generate_code`|c#, .net, blazor, aspnet|`dotnet-core-expert`|
|`generate_code`|component, hook, react, next, ui, css|`frontend-specialist`|
|`generate_code`|mobile, react native, flutter, ios, android|`mobile-developer`|
|`generate_code`|docker, ci, cd, deploy, github actions, cloud|`devops-engineer`|
|`generate_code`|sql, query, migration, prisma, drizzle|`sql-pro`|
|`generate_code`|vue, nuxt|`vue-expert`|
|`review_code`|api, backend, auth|`backend-specialist`|
|`review_code`|react, component, hook|`frontend-specialist`|
|`review_code`|sql, query|`sql-pro`|
|`review_code`|security (any domain)|`security-auditor`|
|`debug`|any|`debugger`|
|`plan`|any|`project-planner`|
|`design_schema`|any|`database-architect`|
|`write_docs`|any|`documentation-writer`|
|`security_audit`|any|`security-auditor`|
|`optimize`|any|`performance-optimizer`|
|`test`|any|`test-engineer`|

---

## Tiebreaker Rules

When multiple domain keywords match, apply the following priority order:

1. **Most specific agent wins.** `sql-pro` beats `database-architect` for SQL query generation. `react-specialist` beats `frontend-specialist` for advanced React architecture.
2. **Security always runs in parallel.** Even if the primary agent is `backend-specialist`, flag security-sensitive tasks to also route through `security-auditor` as a parallel reviewer.
3. **When in doubt, use `explorer-agent` first.** If the codebase is unknown, map it before generating.

---

## Agent Capability Summary

Quick reference for Supervisor triage. Full instructions are in each agent's `.md` file.

|Agent File|Best For|Do NOT Use For|
|---|---|---|
|`backend-specialist.md`|REST APIs, auth flows, server logic|React components|
|`python-pro.md`|FastAPI, Django, data scripts|Node/TypeScript code|
|`dotnet-core-expert.md`|.NET 8+, C#, Blazor, AOT|Python or Node backends|
|`frontend-specialist.md`|Web UI, CSS, components|Server code|
|`react-specialist.md`|Advanced React patterns, Next.js architecture|Vue or mobile|
|`vue-expert.md`|Vue 3, Nuxt 3, Pinia|React or Angular|
|`mobile-developer.md`|React Native, Flutter|Web browser UI|
|`database-architect.md`|Schema design, ORM selection, migrations|Raw SQL query tuning|
|`sql-pro.md`|Complex queries, CTEs, window functions, indexes|Schema design|
|`devops-engineer.md`|CI/CD, Docker, Kubernetes, cloud infra|Application code|
|`security-auditor.md`|OWASP review, pen test findings, auth hardening|Feature development|
|`performance-optimizer.md`|Profiling, bottleneck resolution, caching|New feature design|
|`debugger.md`|Root cause analysis, systematic issue isolation|Code generation|
|`project-planner.md`|Planning, task breakdown, estimates|Implementation|
|`documentation-writer.md`|READMEs, API docs, inline comments|Code or schemas|
|`test-engineer.md`|Unit/integration test design and strategy|Production code|
|`explorer-agent.md`|Mapping unknown codebases before acting|Building new features|

---

## Hard Constraints

```
❌ Never route to an agent not listed in this registry
❌ Never route "generate_code" to "project-planner" or "documentation-writer"
❌ Never route "plan" to any code-generating agent
❌ Never route multi-domain tasks to a single agent — split into multiple WorkerRequests
```

---

## Adding New Workers

When a new specialist agent is added to `.agent/agents/`, update this registry:

1. Add a row to the **Primary Routing Table** for each `type` and keyword combination it handles
2. Add a row to the **Agent Capability Summary** with "Best For" and "Do NOT Use For" guidance
3. Run `python .agent/scripts/config-validator.py` to verify consistency
