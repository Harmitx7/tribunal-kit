---
name: documentation-templates
description: Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Documentation Standards

> Documentation is a product. It has users. Those users are often future-you,
> three months from now, having completely forgotten how this works.

---

## Documentation Types and Their Audiences

| Type | Audience | Goal |
|---|---|---|
| README | New developer joining the project | "Get me running in 10 minutes" |
| API docs | External integrator or frontend dev | "Tell me exactly what I can call and what I'll get back" |
| Architecture decision (ADR) | Future engineer inheriting the codebase | "Tell me why it works this way, not just how" |
| Code comment | Reviewer, maintainer | "Explain the non-obvious; skip the obvious" |
| Runbook | On-call engineer at 2am | "Tell me what to do, not what to think about" |

---

## README Template

```markdown
# Project Name

One sentence: what this is and what problem it solves.

## Quick Start

\`\`\`bash
git clone ...
cd project
npm install
cp .env.example .env
npm run dev
\`\`\`

Open http://localhost:3000

## Requirements

- Node.js 20+
- PostgreSQL 15+
- [Any other hard requirements]

## Project Structure

\`\`\`
src/
  api/        API routes
  lib/        Shared utilities
  services/   Business logic
\`\`\`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Secret for signing JWTs |

## Running Tests

\`\`\`bash
npm test              # unit tests
npm run test:e2e      # end-to-end tests
\`\`\`

## Contributing

[Brief contribution guide or link to CONTRIBUTING.md]
```

---

## API Documentation Standards

For each endpoint, document:

```markdown
### POST /api/users

Creates a new user account.

**Request Body**
\`\`\`json
{
  "email": "string (required, valid email)",
  "name": "string (required, 2–100 chars)",
  "role": "admin | user (optional, default: user)"
}
\`\`\`

**Responses**

| Status | Meaning | Body |
|---|---|---|
| 201 | User created | `{ data: User }` |
| 400 | Validation failed | `{ error: string, details: string[] }` |
| 409 | Email already exists | `{ error: string }` |

**Example**
\`\`\`bash
curl -X POST /api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "Jane"}'
\`\`\`
```

---

## Code Comment Rules

**Comment the why, not the what:**

```ts
// ❌ States what the code does (obvious from reading it)
// Multiply price by tax rate
const total = price * taxRate;

// ✅ Explains why this specific value exists
// Vietnamese tax law requires 10% VAT on all digital goods (Circular 92/2015)
const VN_DIGITAL_TAX_RATE = 1.10;
const total = price * VN_DIGITAL_TAX_RATE;
```

**When to always comment:**
- Non-obvious business rules
- Workarounds for external library bugs (with issue link if possible)
- Performance decisions that look like premature optimization but aren't
- Magic numbers and why they have that value

---

## AI-Friendly Documentation

When a codebase will be worked on by AI assistants:

- Keep a `CODEBASE.md` at root with: tech stack, folder structure, key conventions
- Add a `ARCHITECTURE.md` with: system boundaries, data flow, key decisions
- Add `// @purpose:` comments on complex functions so AI can understand intent without reading the full implementation
- Document which files are auto-generated and should not be edited directly

---

## Runbook Template

```markdown
# Runbook: [Service or Incident Type]

## Symptoms
- [What the user or monitor reports]

## Likely Causes
1. [Most common cause]
2. [Second most common]

## Investigation Steps
\`\`\`bash
# Check service health
kubectl get pods -n production

# Check recent errors
kubectl logs deployment/api --since=15m | grep ERROR
\`\`\`

## Resolution Steps
### If Cause 1:
[Exact steps to resolve]

### If Cause 2:
[Exact steps to resolve]

## Escalation
If unresolved after 30 minutes → page @on-call-lead

## Post-Incident
[ ] Write incident report
[ ] Add monitoring for this failure mode
[ ] Update this runbook if steps changed
```
