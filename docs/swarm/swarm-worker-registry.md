# 🗂️ Swarm Worker Registry

Maps task types and domain keywords to canonical specialist Worker agents.
Used by `supervisor-agent` to select the correct `agent` field in every `WorkerRequest`.
All agents listed here MUST exist as valid persona files in `.agent/agents/` and be registered in `.agent/config/specialist-registry.json`.

---

## Primary Routing Table

| Task Type        | Domain Keywords                                   | Route to Agent           | Required Capability / Skill |
| ---------------- | ------------------------------------------------- | ------------------------ | --------------------------- |
| `research`       | any                                               | `explorer-agent`         | Codebase exploration        |
| `research`       | security, vulnerability, owasp                    | `security-auditor`       | Threat identification       |
| `research`       | database, schema, sql, orm                        | `database-architect`     | Data modeling               |
| `research`       | performance, profiling, optimization              | `performance-optimizer`  | Bottleneck profiling        |
| `generate_code`  | api, route, endpoint, server, express, auth, jwt  | `backend-specialist`     | REST / HTTP endpoints       |
| `generate_code`  | python, fastapi, django, flask                    | `backend-specialist`     | Python backend skill        |
| `generate_code`  | c#, .net, blazor, aspnet                          | `backend-specialist`     | C# / .NET backend skill     |
| `generate_code`  | component, hook, react, next, ui, css             | `frontend-specialist`    | React / Web UI              |
| `generate_code`  | mobile, react native, flutter, ios, android       | `mobile-developer`       | Mobile app frameworks       |
| `generate_code`  | docker, ci, cd, deploy, github actions, cloud     | `devops-engineer`        | Infrastructure automation   |
| `generate_code`  | sql, query, migration, prisma, drizzle            | `database-architect`     | SQL & schema engineering    |
| `generate_code`  | vue, nuxt                                         | `frontend-specialist`    | Vue / Nuxt frontend skill   |
| `review_code`    | api, backend, auth                                | `backend-specialist`     | Backend code review         |
| `review_code`    | react, component, hook                            | `frontend-reviewer`      | React / UI code review      |
| `review_code`    | sql, query                                        | `sql-reviewer`           | SQL injection & lock review |
| `review_code`    | security (any domain)                             | `security-auditor`       | OWASP security audit        |
| `debug`          | any                                               | `debugger`               | Root cause isolation        |
| `plan`           | any                                               | `project-planner`        | Scope & step breakdown      |
| `design_schema`  | any                                               | `database-architect`     | Relational & NoSQL design   |
| `write_docs`     | any                                               | `documentation-writer`   | Technical documentation     |
| `security_audit` | any                                               | `security-auditor`       | Comprehensive threat audit  |
| `optimize`       | any                                               | `performance-optimizer`  | Latency & throughput tuning |
| `test`           | any                                               | `test-engineer`          | Test suite implementation   |
| `visual_audit`   | ui, component, visual, screenshot, layout, render | `frontend-reviewer`      | Visual & layout audit       |
| `generate_code`  | aws, terraform, ecs, fargate, lambda, iac, vpc    | `cloud-engineer`         | Cloud infrastructure        |
| `plan`           | system design, scale, capacity, architecture      | `system-architect`       | Distributed system design   |
| `test`           | e2e, playwright, automation, cypress              | `qa-automation-engineer` | End-to-end automation       |

---

## Tiebreaker Rules

When multiple domain keywords match, apply the following priority order:

1. **Most specific canonical agent wins.** `database-architect` handles database migrations and queries; `frontend-specialist` handles UI frameworks (React, Vue).
2. **Security always runs in parallel.** Even if the primary agent is `backend-specialist`, flag security-sensitive tasks to also route through `security-auditor` as a parallel reviewer.
3. **When in doubt, use `explorer-agent` first.** If the codebase is unknown, map it before generating.

---

## Agent Capability Summary

Quick reference for Supervisor triage. Full instructions are in each agent's `.md` file.

| Agent File                  | Best For                                        | Do NOT Use For          |
| --------------------------- | ----------------------------------------------- | ----------------------- |
| `backend-specialist.md`     | REST APIs, auth flows, Python/C#/Node logic     | Frontend browser UI     |
| `frontend-specialist.md`    | Web UI, React, Vue, CSS, component state        | Direct database queries |
| `mobile-developer.md`       | React Native, Flutter, mobile platforms         | Web browser UI          |
| `database-architect.md`     | Schema design, ORM selection, SQL queries, DDL  | Pure frontend logic     |
| `devops-engineer.md`        | CI/CD, Docker, Kubernetes, cloud infra          | Application code        |
| `security-auditor.md`       | OWASP review, pen test findings, auth hardening | Feature development     |
| `performance-optimizer.md`  | Profiling, bottleneck resolution, caching       | New feature design      |
| `debugger.md`               | Root cause analysis, systematic issue isolation | Code generation         |
| `project-planner.md`        | Planning, task breakdown, estimates             | Implementation          |
| `documentation-writer.md`   | READMEs, API docs, inline comments              | Code or schemas         |
| `test-engineer.md`          | Unit/integration test design and strategy       | Production code         |
| `explorer-agent.md`         | Mapping unknown codebases before acting         | Building new features   |
| `cloud-engineer.md`         | AWS, Terraform, Docker, ECS, GitHub Actions CI  | Application code        |
| `system-architect.md`       | System design, capacity planning, scalability   | Implementation details  |
| `qa-automation-engineer.md` | E2E testing, Playwright, test automation        | Unit test design        |
| `frontend-reviewer.md`      | React hooks, UI re-renders, visual audit, WCAG  | Server-only logic       |

---

## Hard Constraints

```
❌ Never route to an agent not listed in this registry
❌ Never route "generate_code" to "project-planner" or "documentation-writer"
❌ Never route "plan" to any code-generating agent
❌ Never route multi-domain tasks to a single agent — split into multiple WorkerRequests
```
