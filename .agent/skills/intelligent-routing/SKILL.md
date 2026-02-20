---
name: intelligent-routing
description: Automatic agent selection and intelligent task routing. Analyzes user requests and automatically selects the best specialist agent(s) without requiring explicit user mentions.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Intelligent Agent Routing

> The best specialist response is useless if the wrong specialist shows up.
> Routing is the first decision — and it affects everything after.

---

## How Routing Works

Every incoming request is analyzed before any agent is activated. Routing happens in two steps:

1. **Domain detection** — what kind of work is this?
2. **Complexity detection** — how many domains are involved?

If one domain → activate the matching specialist.
If two or more domains → activate the `orchestrator`, which coordinates multiple specialists.

---

## Domain Detection Rules

Scan the request for keywords and context signals:

| Signals | Domain | Agent |
|---|---|---|
| "api", "endpoint", "route", "REST", "GraphQL", "server", "backend" | Backend | `backend-specialist` |
| "database", "schema", "SQL", "query", "migration", "ORM", "index" | Database | `database-architect` |
| "component", "UI", "React", "Next.js", "hook", "page", "layout", "CSS" | Frontend | `frontend-specialist` |
| "React Native", "Flutter", "iOS", "Android", "mobile", "app store" | Mobile | `mobile-developer` |
| "error", "bug", "crash", "TypeError", "undefined", "not working" | Debugging | `debugger` |
| "vulnerable", "injection", "XSS", "CSRF", "token", "auth bypass" | Security | `security-auditor` |
| "slow", "bottleneck", "optimize", "performance", "latency", "N+1" | Performance | `performance-optimizer` |
| "Docker", "CI/CD", "deploy", "pipeline", "Kubernetes", "nginx" | DevOps | `devops-engineer` |
| "test", "spec", "coverage", "mock", "fixture", "unit test", "e2e" | Testing | `test-engineer` |
| "explain", "how does", "what is", "teach me" | Teaching | No specialist — direct answer |

---

## Complexity Detection Rules

**Single domain:** One primary concern. One specialist.

```
"Add JWT auth to my Express routes"  →  backend-specialist
"Fix the N+1 in my Prisma query"     →  database-architect
"Debug why login returns 500"        →  debugger
```

**Multi-domain:** Multiple concerns interacting. Use orchestrator.

```
"Build a user auth system with a login UI and PostgreSQL storage"
→ orchestrator coordinates: backend-specialist + frontend-specialist + database-architect

"My React app is slow and the API responses are huge"
→ orchestrator coordinates: performance-optimizer + backend-specialist + frontend-specialist
```

---

## Routing Announcement Format

Every routing decision is announced to the user:

```
🤖 Applying knowledge of @[agent-name]...
```

For multi-agent:
```
🤖 Coordinating via @orchestrator → @backend-specialist + @database-architect
```

This is not decoration. It tells the user which expertise is being applied and makes the system transparent.

---

## Override Rules

If the user explicitly mentions an agent (`@debugger`, `@security-auditor`), that selection overrides auto-routing. Never second-guess an explicit mention.

```
User: "@security-auditor review this login form"
→ Activate security-auditor regardless of what domain detection suggested
```

---

## When to Use Orchestrator vs. Single Agent

| Situation | Route To |
|---|---|
| Clear single concern | Matching specialist |
| 2+ domains, request can be split into sequential steps | Orchestrator |
| 2+ domains, concerns are deeply intertwined | Orchestrator |
| Vague multi-domain request | Orchestrator (start with brainstorming) |
| Full-stack feature build | Orchestrator |

---

## Routing Failures to Avoid

| Failure | Effect |
|---|---|
| Defaulting to `orchestrator` for everything | Slower, more verbose, loses specialist depth |
| Using `frontend-specialist` for React Native | Wrong mental model — mobile has different constraints |
| Not routing to `debugger` when the request is clearly a bug | Specialist context speeds up diagnosis significantly |
| Activating a specialist without announcing it | User can't verify which expertise was applied |
