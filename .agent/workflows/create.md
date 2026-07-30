---
description: Create new application command. Triggers full stack creation from requirements gathering → stack selection → scaffolding → Tribunal code generation. Everything through the pipeline before writing a single file.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - app-builder
  - architecture
  - project-planner
scripts-binding:
  - .agent/scripts/auto_preview.js
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# /create — Full Application Builder

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before scaffolding a new application, you MUST inspect:
1. Target Directory State → Confirm directory listing is empty or obtain explicit user confirmation before overwriting existing files
2. Runtime & Environment Context → Check Node/npm version and inspect `.env.example` if available
3. Human Gate Before Disk Modification → Enforce explicit approval of Socratic requirements, stack selection, and scaffolding plan before creating any files

---

## When to Use /create

| Use `/create` when...                      | Use something else when...                      |
| :----------------------------------------- | :---------------------------------------------- |
| Starting a new project from scratch        | Adding to an existing project → `/enhance`      |
| No codebase exists yet                     | Generating a focused code snippet → `/generate` |
| You need a working scaffold with structure | Planning and understanding → `/plan`            |

---

## Phase 1 — Requirements Gathering (Socratic Gate)

Before a single line of code is written, the `app-builder` agent asks these questions:

```
1. What does this application DO? (one sentence — the core user action)
2. Who uses it? (end users, internal team, API consumers)
3. What is the target platform? (web, mobile, server, CLI, desktop)
4. Are there any tech constraints? (must use X, must run on Y)
5. What data does it store? (users, products, documents, real-time events)
6. Is authentication required? (yes/no/type: email, OAuth, API key)
7. Are there external integrations? (Stripe, OpenAI, Twilio, etc.)
```

No scaffolding starts until all questions are answered.

---

## Phase 2 — Stack Selection

Based on the answers, the agent selects the appropriate stack:

| App Type                        | Recommended Stack                           |
| :------------------------------ | :------------------------------------------ |
| Web app (content + interaction) | Next.js 15, TypeScript, Tailwind v4, Prisma |
| API server only                 | Hono on Node 22, Zod, TypeScript            |
| Real-time app                   | Next.js 15 + WebSocket (Socket.io) or SSE   |
| Mobile app                      | Expo + React Native, Expo Router v4         |
| CLI tool                        | Node 22, Commander.js, TypeScript           |
| E-commerce                      | Next.js 15 + Stripe + Prisma                |

Stack selection is presented to the user for approval before scaffolding begins.

---

## Phase 3 — Scaffolding Plan

The agent produces an implementation plan showing:

```
Files to create:
├── Core structure (package.json, tsconfig, config files)
├── Database schema (prisma/schema.prisma)
├── Authentication setup (auth.ts, middleware.ts)
├── Core API routes or Server Actions
├── Base UI components and layouts
└── Initial tests and CI pipeline
```

**Human Gate:** User approves the plan before any files are written.

---

## Phase 4 — Tribunal Generation

All generated code runs through the Tribunal pipeline:

```
Maker generates each module individually
    → logic-reviewer + security-auditor on every module
    → domain-specific reviewers activated by module type
    → Human Gate before each major file group is written
```

No module is written without passing Tribunal review.

---

## Phase 5 — Verification

After scaffolding:

```
□ npm install completes without errors
□ npx tsc --noEmit passes clean
□ npm run dev starts successfully
□ npm test runs and passes (for any generated tests)
□ Linting passes (if configured)
```

---

## Hallucination Guard (Create-Specific)

```
❌ Never generate the entire application as one massive code block
❌ Never import packages not added to package.json in this session
❌ Never assume a framework's default file structure — check with --help or docs
❌ Never hardcode environment variables in generated files
❌ Never use deprecated Next.js 13/14 patterns (pages/, getServerSideProps)
❌ Never use React 18 hooks deprecated in React 19
```

---

## Error Recovery

```
npm install fails:
  → Check Node.js version compatibility
  → Clear npm cache: npm cache clean --force
  → Retry with --legacy-peer-deps if peer conflict
  → After 3 failures: HALT and report to human

Template/scaffold not found:
  → Verify npx command with --help first
  → Fall back to manual file creation
  → Never silently continue with partial scaffold

Build fails after scaffold:
  → Run npx tsc --noEmit to identify type errors
  → Fix errors before proceeding to Phase 4
```

---

## After /create — Next Steps

| Outcome                       | Next Command                            |
| :---------------------------- | :-------------------------------------- |
| Scaffold created and verified | → `/preview start` to launch dev server |
| Code generated, needs tests   | → `/test` to add test coverage          |
| Need to add features          | → `/enhance` for feature additions      |
| Full audit before launch      | → `/audit` for health check             |

---

## Usage Examples

```
/create a REST API for a todo app with JWT auth and PostgreSQL
/create a Next.js 15 e-commerce site with Stripe and Prisma
/create a CLI tool for generating Tribunal-compliant code reviews
/create an Expo app for tracking workout sessions with offline support
/create a real-time chat app using Next.js and Server-Sent Events
```
