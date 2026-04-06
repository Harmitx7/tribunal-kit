---
name: app-builder
description: Main application building orchestrator. Creates full-stack applications from natural language requests. Determines project type, selects tech stack, coordinates agents.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# App Builder — Application Orchestrator

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

|App Type|Frontend|Backend|Database|
|Content / marketing site|Next.js|Next.js API routes|PostgreSQL (if dynamic)|
|SaaS web app|Next.js|Next.js API routes / Fastify|PostgreSQL + Redis|
|Mobile app (cross-platform)|React Native (Expo)|Node.js API|PostgreSQL|
|Internal dashboard / admin|Next.js|Next.js API routes|Existing|
|Real-time (chat, collaboration)|Next.js|Fastify + WebSockets|PostgreSQL + Redis|
|Data-heavy API|—|FastAPI (Python)|PostgreSQL|
|AI assistant / RAG app|Next.js (streaming)|Fastify + LLM SDK|PostgreSQL + pgvector|
|Edge-global, latency-critical|Next.js|Hono (Cloudflare Workers)|Turso / Cloudflare KV|

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

|Template|Path|When to Use|
|Next.js Full-Stack|`templates/nextjs-app/`|Web app with API routes|
|React Native|`templates/react-native-app/`|Cross-platform mobile|
|API Only|`templates/api-only/`|Backend service, no UI|

---

---

## Agent Coordination

How App Builder orchestrates specialist agents.

### Agent Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                   APP BUILDER (Orchestrator)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     PROJECT PLANNER                          │
│  • Task breakdown                                            │
│  • Dependency graph                                          │
│  • File structure planning                                   │
│  • Create {task-slug}.md in project root (MANDATORY)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              CHECKPOINT: PLAN VERIFICATION                   │
│  🔴 VERIFY: Does {task-slug}.md exist in project root?       │
│  🔴 If NO → STOP → Create plan file first                    │
│  🔴 If YES → Proceed to specialist agents                    │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ DATABASE        │ │ BACKEND         │ │ FRONTEND        │
│ ARCHITECT       │ │ SPECIALIST      │ │ SPECIALIST      │
│                 │ │                 │ │                 │
│ • Schema design │ │ • API routes    │ │ • Components    │
│ • Migrations    │ │ • Controllers   │ │ • Pages         │
│ • Seed data     │ │ • Middleware    │ │ • Styling       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 PARALLEL PHASE (Optional)                    │
│  • Security Auditor → Vulnerability check                   │
│  • Test Engineer → Unit tests                               │
│  • Performance Optimizer → Bundle analysis                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DEVOPS ENGINEER                          │
│  • Environment setup                                         │
│  • Preview deployment                                        │
│  • Health check                                              │
└─────────────────────────────────────────────────────────────┘
```

### Execution Order

|Phase|Agent(s)|Parallel?|Prerequisite|CHECKPOINT|
|-------|----------|-----------|--------------|------------|
|0|Socratic Gate|❌|-|✅ Ask 3 questions|
|1|Project Planner|❌|Questions answered|✅ **PLAN.md created**|
|1.5|**PLAN VERIFICATION**|❌|PLAN.md exists|✅ **File exists in root**|
|2|Database Architect|❌|Plan ready|Schema defined|
|3|Backend Specialist|❌|Schema ready|API routes created|
|4|Frontend Specialist|✅|API ready (partial)|UI components ready|
|5|Security Auditor, Test Engineer|✅|Code ready|Tests & audit pass|
|6|DevOps Engineer|❌|All code ready|Deployment ready|

> 🔴 **CRITICAL:** Phase 1.5 is MANDATORY. No specialist agents proceed without PLAN.md verification.

---

## Feature Building

How to analyze and implement new features.

### Feature Analysis

```
Request: "add payment system"

Analysis:
├── Required Changes:
│   ├── Database: orders, payments tables
│   ├── Backend: /api/checkout, /api/webhooks/stripe
│   ├── Frontend: CheckoutForm, PaymentSuccess
│   └── Config: Stripe API keys
│
├── Dependencies:
│   ├── stripe package
│   └── Existing user authentication
│
└── Estimated Time: 15-20 minutes
```

### Iterative Enhancement Process

```
1. Analyze existing project
2. Create change plan
3. Present plan to user
4. Get approval
5. Apply changes
6. Test
7. Show preview
```

### Error Handling

|Error Type|Solution Strategy|
|------------|-------------------|
|TypeScript Error|Fix type, add missing import|
|Missing Dependency|Run npm install|
|Port Conflict|Suggest alternative port|
|Database Error|Check migration, validate connection|

### Recovery Strategy

```
1. Detect error
2. Try automatic fix
3. If failed, report to user
4. Suggest alternative
5. Rollback if necessary
```

---

## Project Type Detection

Analyze user requests to determine project type and template.

### Keyword Matrix

|Keywords|Project Type|Template|
|----------|--------------|----------|
|blog, post, article|Blog|astro-static|
|e-commerce, product, cart, payment|E-commerce|nextjs-saas|
|dashboard, panel, management|Admin Dashboard|nextjs-fullstack|
|api, backend, service, rest|API Service|express-api|
|python, fastapi, django|Python API|python-fastapi|
|mobile, android, ios, react native|Mobile App (RN)|react-native-app|
|flutter, dart|Mobile App (Flutter)|flutter-app|
|portfolio, personal, cv|Portfolio|nextjs-static|
|crm, customer, sales|CRM|nextjs-fullstack|
|saas, subscription, stripe|SaaS|nextjs-saas|
|landing, promotional, marketing|Landing Page|nextjs-static|
|docs, documentation|Documentation|astro-static|
|extension, plugin, chrome|Browser Extension|chrome-extension|
|desktop, electron|Desktop App|electron-desktop|
|cli, command line, terminal|CLI Tool|cli-tool|
|monorepo, workspace|Monorepo|monorepo-turborepo|

### Detection Process

```
1. Tokenize user request
2. Extract keywords
3. Determine project type
4. Detect missing information → forward to conversation-manager
5. Suggest tech stack
```

---

## Project Scaffolding

---

### Next.js Full-Stack Structure (2025 Optimized)

```
project-name/
├── src/
│   ├── app/                        # Routes only (thin layer)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── (auth)/                 # Route group - auth pages
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/            # Route group - dashboard layout
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── [resource]/route.ts
│   │
│   ├── features/                   # Feature-based modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── actions.ts          # Server Actions
│   │   │   ├── queries.ts          # Data fetching
│   │   │   └── types.ts
│   │   ├── products/
│   │   │   ├── components/
│   │   │   ├── actions.ts
│   │   │   └── queries.ts
│   │   └── cart/
│   │       └── ...
│   │
│   ├── shared/                     # Shared utilities
│   │   ├── components/ui/          # Reusable UI components
│   │   ├── lib/                    # Utils, helpers
│   │   └── hooks/                  # Global hooks
│   │
│   └── server/                     # Server-only code
│       ├── db/                     # Database client (Prisma)
│       ├── auth/                   # Auth config
│       └── services/               # External API integrations
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

### Structure Principles

|Principle|Implementation|
|-----------|----------------|
|**Feature isolation**|Each feature in `features/` with its own components, hooks, actions|
|**Server/Client separation**|Server-only code in `server/`, prevents accidental client imports|
|**Thin routes**|`app/` only for routing, logic lives in `features/`|
|**Route groups**|`(groupName)/` for layout sharing without URL impact|
|**Shared code**|`shared/` for truly reusable UI and utilities|

---

### Core Files

|File|Purpose|
|------|---------|
|`package.json`|Dependencies|
|`tsconfig.json`|TypeScript + path aliases (`@/features/*`)|
|`tailwind.config.ts`|Tailwind config|
|`.env.example`|Environment template|
|`README.md`|Project documentation|
|`.gitignore`|Git ignore rules|
|`prisma/schema.prisma`|Database schema|

---

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/server/*": ["./src/server/*"]
    }
  }
}
```

---

### When to Use What

|Need|Location|
|------|----------|
|New page/route|`app/(group)/page.tsx`|
|Feature component|`features/[name]/components/`|
|Server action|`features/[name]/actions.ts`|
|Data fetching|`features/[name]/queries.ts`|
|Reusable button/input|`shared/components/ui/`|
|Database query|`server/db/`|
|External API call|`server/services/`|

---

## Tech Stack Selection (2026)

Default and alternative technology choices for web applications.

### Default Stack (Web App - 2026)

```yaml
Frontend:
  framework: Next.js 16 (Stable)
  language: TypeScript 5.7+
  styling: Tailwind CSS v4
  state: React 19 Actions / Server Components
  bundler: Turbopack (Stable for Dev)

Backend:
  runtime: Node.js 23
  framework: Next.js API Routes / Hono (for Edge)
  validation: Zod / TypeBox

Database:
  primary: PostgreSQL
  orm: Prisma / Drizzle
  hosting: Supabase / Neon

Auth:
  provider: Auth.js (v5) / Clerk

Monorepo:
  tool: Turborepo 2.0
```

### Alternative Options

|Need|Default|Alternative|
|------|---------|-------------|
|Real-time|-|Supabase Realtime, Socket.io|
|File storage|-|Cloudinary, S3|
|Payment|Stripe|LemonSqueezy, Paddle|
|Email|-|Resend, SendGrid|
|Search|-|Algolia, Typesense|
