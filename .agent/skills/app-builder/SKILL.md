---
name: app-builder
description: Main application building orchestrator. Creates full-stack applications from natural language requests. Determines project type, selects tech stack, coordinates agents.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
last-updated: 2026-03-12
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# App Builder — Application Orchestrator

> Building a full application is a coordination problem, not a coding problem.
> Coordinate the experts. Keep the boundaries clean.

---

## When This Skill Activates

Activate when the user request involves:
- Creating a new application from scratch
- Building a major feature that spans frontend + backend + database
- Bootstrapping a project structure for a new stack

---

## Orchestration Flow

```
1. CLARIFY      → Understand what and who for
2. DECIDE       → Choose the stack
3. PLAN         → Break into ordered, dependency-aware tasks
4. COORDINATE   → Run specialists in the right sequence
5. INTEGRATE    → Verify boundaries are consistent
6. PREVIEW      → Start the dev server
```

---

## Phase 1 — Clarification

Before selecting a stack or writing a line of code, ask:

```
1. What is the core thing this app does? (not features — the primary purpose)
2. Who uses it? (internal tool, public-facing, B2B, mobile users?)
3. What constraints matter most? (time to ship, cost, performance, existing stack?)
4. What already exists that this integrates with?
```

Wait for answers. Stack decisions depend on these answers.

---

## Phase 2 — Stack Selection

| App Type | Frontend | Backend | Database |
|---|---|---|---|
| Content / marketing site | Next.js | Next.js API routes | PostgreSQL (if dynamic) |
| SaaS web app | Next.js | Next.js API routes / Fastify | PostgreSQL + Redis |
| Mobile app (cross-platform) | React Native (Expo) | Node.js API | PostgreSQL |
| Internal dashboard / admin | Next.js | Next.js API routes | Existing |
| Real-time (chat, collaboration) | Next.js | Fastify + WebSockets | PostgreSQL + Redis |
| Data-heavy API | — | FastAPI (Python) | PostgreSQL |
| AI assistant / RAG app | Next.js (streaming) | Fastify + LLM SDK | PostgreSQL + pgvector |
| Edge-global, latency-critical | Next.js | Hono (Cloudflare Workers) | Turso / Cloudflare KV |

**If unclear:** Next.js + PostgreSQL covers 80% of use cases and is the safest default for web apps.

---

## AI-Native App Orchestration

For RAG apps and AI assistants, the build order changes:

```
Step 1: vector-database-architect
  → Design the embedding schema and chunking strategy
  → Output: schema with vector column + indexing strategy

Step 2: ingest-pipeline (backend-specialist)
  → Build document ingestion: load → chunk → embed → store
  → Output: ingest API endpoint

Step 3: retrieval-api (backend-specialist, uses Steps 1+2)
  → Build: embed query → vector search → rerank → prompt assembly
  → Output: /api/generate endpoint with SSE streaming

Step 4: streaming-frontend (frontend-specialist, uses Step 3)
  → Build: EventSource consumer → streaming text UI → loading states
  → Output: AI chat or search interface
```

**Never wire the frontend to the LLM directly** — always proxy through your backend to keep API keys server-side.

---

## Phase 3 — Project Structure

**Web (Next.js):**

```
app/
  (auth)/       Auth pages — login, register
  (app)/        Protected app routes
  api/          API routes
components/
  ui/           Primitive components (button, input, modal)
  features/     Feature-specific components
lib/
  db/           Database client and utilities
  auth/         Auth helpers
  utils/        Shared utilities
```

**API-only (Node.js / Fastify):**

```
src/
  routes/       Route definitions (thin)
  handlers/     Request handling and response formatting
  services/     Business logic
  repositories/ Database access
  lib/          Shared utilities
```

---

## Phase 4 — Agent Coordination

Build in dependency order:

```
Step 1: database-architect
  → Design and document the schema
  → Output: SQL schema, type definitions

Step 2: backend-specialist (uses schema from Step 1)
  → Build API routes
  → Output: API endpoint spec (URL, method, request, response shapes)

Step 3: frontend-specialist (uses API spec from Step 2)
  → Build UI components
  → Connect to real API contracts
  → Output: Working pages

Step 4: test-engineer (uses all of the above)
  → Create integration and E2E tests
  → Output: Test suite
```

**Never run Step 2 against a guessed schema. Never run Step 3 against a guessed API.**

---

## Phase 5 — Integration Verification

Before presenting to the user, verify consistency:

- API endpoints the frontend calls → exist on the backend
- Database column names the backend queries → exist in the schema
- TypeScript types match across package boundaries
- Environment variables referenced in code → are in `.env.example`

---

## Phase 6 — Preview Launch

After integration verification, start the dev server:

```bash
# Check for dev script
python .agent/scripts/auto_preview.py start

# Or manually
npm run dev
```

Report the URL to the user.

---

## Template Index

| Template | Path | When to Use |
|---|---|---|
| Next.js Full-Stack | `templates/nextjs-app/` | Web app with API routes |
| React Native | `templates/react-native-app/` | Cross-platform mobile |
| API Only | `templates/api-only/` | Backend service, no UI |

---

## Output Format

When this skill produces a recommendation or design decision, structure your output as:

```
━━━ App Builder Recommendation ━━━━━━━━━━━━━━━━
Decision:    [what was chosen / proposed]
Rationale:   [why — one concise line]
Trade-offs:  [what is consciously accepted]
Next action: [concrete next step for the user]
─────────────────────────────────────────────────
Pre-Flight:  ✅ All checks passed
             or ❌ [blocking item that must be resolved first]
```


---

## 🏛️ Tribunal Integration (Anti-Hallucination)

**Slash command: `/create`**
**Active reviewers: `orchestrator` · `project-planner`**

### ❌ Forbidden AI Tropes in App Building

1. **Skipping Constraints** — immediately starting to generate code without asking the user about their constraints and audience.
2. **Building the Whole App at Once** — attempting to generate 50 files in a single turn.
3. **Out-of-Order Execution** — writing frontend components before the API or DB schema is actually designed.
4. **Magic Dependencies** — assuming packages are installed without updating `package.json`.
5. **Ignoring Boundaries** — mismatching the API response format between the server and the frontend client.

### ✅ Pre-Flight Self-Audit

Review these questions before orchestrating a full app build:
```
✅ Did I ask the clarifying questions regarding constraints and target audience?
✅ Is my generated plan broken into modular, sequenced steps (DB -> API -> UI)?
✅ Have I explicitly defined the API contracts so the frontend and backend match?
✅ Did I correctly track which dependencies need to be installed?
✅ Am I verifying integration at each boundary before moving to the next layer?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring an application architecture or full-stack integration complete without verifying the seams.
- ✅ **Required:** You are explicitly forbidden from completing an app build or integration phase without providing **concrete terminal evidence** (e.g., successful local dev server start logs, passing build logs, or successful API local test results).
