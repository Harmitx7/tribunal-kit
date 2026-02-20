---
name: api-patterns
description: API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# API Design Patterns

> Build APIs that serve their consumers — not APIs that match the tutorial you read last.
> Every decision here has a trade-off. Know the trade-off before you pick a side.

## How to Use This Skill

Only read the files you actually need for this task. The map below tells you where to look.

---

## File Index

| File | What It Covers | Load When |
|---|---|---|
| `api-style.md` | Choosing between REST, GraphQL, and tRPC | Client type is unclear or debated |
| `rest.md` | Endpoint naming, HTTP verbs, status code semantics | Building a REST surface |
| `response.md` | Unified response envelope, error shapes, cursor pagination | Defining response contracts |
| `graphql.md` | Schema-first design, N+1 awareness, when NOT to use GraphQL | GraphQL is on the table |
| `trpc.md` | Type-safe RPC for TypeScript monorepos | Full-stack TypeScript project |
| `versioning.md` | URI, header, and content-type versioning strategies | API needs to evolve without breaking clients |
| `auth.md` | JWT, OAuth 2.0, Passkeys, API keys — picking the right one | Authentication is being designed |
| `rate-limiting.md` | Token bucket vs sliding window, burst handling | Protecting public or high-traffic endpoints |
| `documentation.md` | OpenAPI spec quality, example-driven docs | API is being documented |
| `security-testing.md` | OWASP API Top 10, authorization boundary testing | Security review |

---

## Related Expertise

| If You Also Need | Load This |
|---|---|
| Server implementation | `@[skills/nodejs-best-practices]` |
| Data layer | `@[skills/database-design]` |
| Vulnerability review | `@[skills/vulnerability-scanner]` |

---

## Pre-Design Checklist

Answer these before writing a single route:

- [ ] Who calls this API? (browser, mobile, service-to-service, third party)
- [ ] What data shape does the consumer need — or does it vary per caller?
- [ ] REST, GraphQL, or tRPC — and does the team agree?
- [ ] What does a failed response look like across the whole surface?
- [ ] How will this API change in 6 months without breaking callers?
- [ ] Is there a rate-limit story?
- [ ] Will there be public docs, and who maintains them?

---

## Common Mistakes

**Patterns that cause pain later:**

- Treating REST as default without considering the consumer's actual fetch patterns
- Verbs in endpoint paths (`/getUser`, `/deleteItem`) — REST resources are nouns
- Inconsistent error shapes across routes — consumers have to guess
- Leaking stack traces or internal identifiers in error responses
- No versioning plan until the first breaking change hits production

**What good looks like:**

- API style chosen for the actual use case, not habit
- Consumer requirements asked and confirmed before design starts
- Every response — success and failure — follows the same shape
- HTTP status codes mean what they're supposed to mean

---

## Scripts

| Script | Purpose | Run With |
|---|---|---|
| `scripts/api_validator.py` | Validates endpoint naming and response shape consistency | `python scripts/api_validator.py <project_path>` |
