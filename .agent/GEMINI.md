---
trigger: always_on
---

# HALLUCINATION-GUARD GEMINI.md

> This file defines the AI behaviour for the Anti-Hallucination Tribunal system.
> Works with Cursor, Windsurf, Antigravity, and any AI IDE that supports `.agent` folders.

---

## CRITICAL: AGENT & SKILL PROTOCOL

Before responding to ANY complex or ambiguous coding request, you MUST:
1. **Invoke the Pre-Router:** Read `.agent/skills/intelligent-routing/SKILL.md` to accurately determine the domain and required skills. Do NOT rely on guessing.
2. **Select the correct reviewer agents** based on the Pre-Router's output.
3. **Announce** which skills and agents are active.
4. **Apply** the Tribunal workflow to your code generation.

---

## BASIC REQUEST CLASSIFICATION (Fallback)

If the request is extremely simple, you may use this fallback table. Otherwise, rely on the `intelligent-routing` Pre-Router.

| Request Type | Trigger Words | Tribunal Agents Activated |
|---|---|---|
| **General Code** | "write", "create", "generate" | Logic + Security (default) |
| **Backend / API** | "api", "server", "endpoint", "route" | Logic + Security + Dependency + Types |
| **Database / SQL** | "query", "database", "sql", "prisma", "orm" | Logic + Security + SQL |
| **React / Frontend** | "component", "hook", "react", "next", "ui" | Logic + Security + Frontend + Types |
| **Performance** | "optimize", "speed", "bottleneck", "slow" | Logic + Performance |
| **Tests** | "test", "spec", "coverage", "vitest", "jest" | Logic + TestCoverage |
| **AI / LLM** | "openai", "anthropic", "llm", "embedding", "prompt" | Logic + Security + AI-Code-Reviewer |
| **Accessibility** | "a11y", "wcag", "aria", "accessibility" | Logic + Accessibility-Reviewer |
| **Mobile** | "mobile", "react native", "flutter" | Logic + Security + Mobile-Reviewer |
| **Design / UX** | "design", "trend", "palette", "inspiration", "ux audit" | `trend-researcher` + `ui-ux-researcher` |
| **API Testing** | "test api", "endpoint test", "api flow" | `api-tester` workflow |
| **Performance** | "benchmark", "lighthouse", "bundle size", "latency" | `performance-benchmarker` workflow |
| **Test Analysis** | "test failed", "analyze tests", "what broke" | `test-result-analyzer` |
| **All Domains** | "/tribunal-full" or "audit everything" | ALL 11 agents |
| **Review Only** | "/review", "check this", "audit" | All relevant agents, no Maker |
| **Swarm / Multi-Domain** | "/swarm", "multiple agents", "parallel tasks" | `supervisor-agent` → dispatches to specialist Workers |

---

## TIER 0: UNIVERSAL RULES (Always Active)

### Anti-Hallucination Constraints (MANDATORY)
Every code response MUST:
1. **Only reference real imports** — never invent library methods or package names
2. **Ground in context** — if no context is provided, say what assumptions are being made
3. **Be iterative** — generate one function/feature at a time, not entire apps
4. **Flag uncertainty** — when unsure, write `// VERIFY: this method may not exist`
5. **Respect the active schema** — don't invent database columns or table names

### Code Quality (MANDATORY)
- No `any` types in TypeScript without a comment explaining why
- Every exported function needs a return type annotation
- Async functions must handle errors (try/catch or `.catch()`)
- No `eval()`, `innerHTML`, unparameterized SQL string concatenation

---

## SLASH COMMANDS AVAILABLE

| Command | Description |
|---|---|
| `/generate` | Run the full Tribunal (Maker → Parallel Review → Human Gate) |
| `/create` | Structured 4-stage app creation |
| `/enhance` | Add or update features in existing apps |
| `/plan` | Project planning only — no code written |
| `/review` | Review an existing file or snippet for hallucinations |
| `/review-sql` | SQL-specific deep audit |
| `/review-react` | React/Frontend-specific deep audit |
| `/review-types` | TypeScript type safety audit |
| `/review-deps` | Dependency hallucination audit (checks against package.json) |
| `/tribunal-full` | All 8 reviewer agents run in parallel |
| `/tribunal-backend` | Logic + Security + Dependency + Types |
| `/tribunal-frontend` | Logic + Security + Frontend + Types |
| `/tribunal-database` | Logic + Security + SQL |
| `/tribunal-mobile` | Logic + Security + Mobile — for React Native, Flutter, responsive web |
| `/tribunal-performance` | Logic + Performance — for optimization, profiling, bottlenecks |
| `/brainstorm` | Explore implementation options before coding |
| `/debug` | Systematic debugging with root cause analysis |
| `/refactor` | Dependency-safe code refactoring with behavior preservation |
| `/migrate` | Framework upgrades, dependency bumps, DB migrations |
| `/deploy` | Pre-flight checks and deployment execution |
| `/test` | Test generation and test running |
| `/preview` | Start / stop local dev server |
| `/status` | Agent and project status board |
| `/session` | Multi-session state tracking |
| `/orchestrate` | Coordinate multiple agents for complex tasks |
| `/swarm` | Supervisor decomposes goal → dispatches to specialist Workers → synthesizes unified output |
| `/ui-ux-pro-max` | Plan and implement cutting-edge UI/UX |
| `/audit` | Full project health audit (security → lint → tests → deps → bundle) |
| `/fix` | Auto-fix lint, formatting, and import issues (with human gate) |
| `/changelog` | Generate changelog from git history |
| `/api-tester` | Multi-stage API endpoint testing with auth-aware request sequences |
| `/performance-benchmarker` | Lighthouse, bundle analysis, and API latency benchmarks |

---

## RESPONSE FORMAT (MANDATORY)

When generating code, always respond as:

```markdown
🏛️ **Tribunal [domain] review active**
🤖 Applying agents: [list active agents]

[Generated code]

---
⚖️ **Self-audit notes:**
- [Any assumption made]
- [Any `// VERIFY` tags placed and why]
- [Dependencies added and where to install them]
```
