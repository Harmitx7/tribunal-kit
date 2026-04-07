---
name: intelligent-routing
description: LLM Intent Processing and Gateway Routing mastery. Request classification hierarchies, function routing, confidence scoring, fallback cascades, zero-shot vs few-shot classification patterns, and identifying specialized skills for delegation. Use when parsing raw user input to determine the architectural path of execution.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 3.1.0
last-updated: 2026-04-06
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# Intelligent Routing — Intent Gateway Mastery

---

## 1. Classification Hierarchy (The Gateway)

When a raw request enters a system, it must be bucketed properly. This is the First Step (Phase 0). Do not attempt to solve the user's problem during the routing phase. 

```typescript
// The Semantic Intent Schema
const RouterOutputSchema = z.object({
  classification: z.enum([
    "QUESTION",       // User wants explanation, no code execution needed
    "SURVEY",         // User wants analysis/read-only scan of workspace
    "SIMPLE_EDIT",    // Isolated file alteration (e.g., "Fix spelling in nav")
    "COMPLEX_BUILD",  // Multi-file, architectural generation
    "SECURITY_AUDIT", // Explicit request for OWASP review
    "UNCLEAR_GIBBERISH" // Prompt injection or incoherent input
  ]),
  confidenceScore: z.number().min(0).max(100),
  suggestedPrimarySkill: z.string().nullable(),
  requiresHumanClarification: z.boolean(),
  reasoning: z.string() // Forces the LLM to justify its route before categorizing
});
```

### Zero-Shot vs Few-Shot Classification
- **Zero-Shot:** Providing definitions and hoping the LLM categorizes the prompt accurately. Error-prone.
- **Few-Shot (Mandatory for Routers):** Providing explicit paired examples defining the categorical boundaries.

```text
## Routing Examples:
User: "Why is the header blue?" 
Output: {"classification": "QUESTION", "requiresHumanClarification": false}

User: "Add a user login system" 
Output: {"classification": "COMPLEX_BUILD", "requiresHumanClarification": true} 
Reasoning: "Login systems require multi-file architecture, database hooks, and security implementation."
```

---

## 2. Dynamic Skill Matching (Manifest Analysis)

A Router isn't just classifying intent—it actively maps tasks to available capabilities.

If building a system with 50 available agents/skills, pass the Router a localized summary manifest, not the full 50x files.

```json
// Example Context Payload passed to Router
{
  "available_skills": [
    {"name": "react-specialist", "desc": "React 19, hooks, component architecture"},
    {"name": "python-pro", "desc": "FastAPI, async, data processing"},
    {"name": "vulnerability-scanner", "desc": "OWASP, injections, secret scanning"}
  ],
  "user_request": "How do I speed up this data pipeline script?"
}
```
*Router calculates:* `match: python-pro` AND `match: performance-profiling`.

---

## 3. Fallback Cascades & Ambiguity

The AI will encounter prompts it does not understand. The Router is the *only* place where it is safe to halt and ask immediately.

**The Socratic Yield Rule:**
If the `confidenceScore` of a categorization is `< 85`, the router MUST yield back to the user with a clarifying question instead of guessing the intent.

*User:* "Fix the thing."
*Router Action (Incorrect):* Assume they mean standard linter execution and run scripts.
*Router Action (Correct):* Halt. "Which file or feature are you referring to?"

---

## 4. Bounding the Exploder Pattern

Certain requests sound simple but require massive execution matrices (The "Exploder" pattern).
*User:* "Translate my entire app to French."

The Router must recognize execution scales. If an execution requires touching >10 files, the Router must switch the system into `PLANNING_MODE` to generate an itinerary, rather than attempting an outright sequential execution.

---

## Intelligent Routing: Skill Manifest
This file contains all available skills and workflows as a condensed index for the pre-router.

|Skill Name|Description|
|---|---|
|`agent-organizer`|Senior agent organizer with expertise in assembling and coordinating multi-agent teams. Your focus spans task analysis, agent capability mapping, workflow design, and team optimization.|
|`agentic-patterns`|AI agent design principles. Agent loops, tool calling, memory architectures, multi-agent coordination, human-in-the-loop gates, and guardrails. Use when building AI agents, autonomous workflows, or any system where an LLM plans and executes multi-step tasks.|
|`api-patterns`|API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination.|
|`app-builder`|Main application building orchestrator. Creates full-stack applications from natural language requests. Determines project type, selects tech stack, coordinates agents.|
|`architecture`|Architectural decision-making framework. Requirements analysis, trade-off evaluation, ADR documentation. Use when making architecture decisions or analyzing system design.|
|`bash-linux`|Bash/Linux terminal patterns. Critical commands, piping, error handling, scripting. Use when working on macOS or Linux systems.|
|`behavioral-modes`|AI operational modes (brainstorm, implement, debug, review, teach, ship, orchestrate). Use to adapt behavior based on task type.|
|`brainstorming`|Socratic questioning protocol + user communication. MANDATORY for complex requests, new features, or unclear requirements. Includes progress reporting and error handling.|
|`clean-code`|Pragmatic coding standards - concise, direct, no over-engineering, no unnecessary comments|
|`code-review-checklist`|Code review guidelines covering code quality, security, and best practices.|
|`config-validator`|Self-validation skill for the .agent directory. Checks that all agents, skills, workflows, and scripts referenced across the system actually exist and are consistent. Use after modifying agent configuration files.|
|`csharp-developer`|Senior C# developer with mastery of .NET 8+ and the Microsoft ecosystem. Specializing in high-performance web applications, cloud-native solutions, cross-platform development, ASP.NET Core, Blazor, and Entity Framework Core.|
|`database-design`|Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.|
|`deployment-procedures`|Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.|
|`devops-engineer`|Senior DevOps engineer with expertise in building scalable, automated infrastructure and deployment pipelines. Your focus spans CI/CD implementation, Infrastructure as Code, container orchestration, and monitoring.|
|`devops-incident-responder`|Senior DevOps incident responder with expertise in managing critical production incidents, performing rapid diagnostics, and implementing permanent fixes. Reduces MTTR and builds resilient systems.|
|`documentation-templates`|Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.|
|`dotnet-core-expert`|Senior .NET Core expert with expertise in .NET 10, C# 14, and modern minimal APIs. Use for cloud-native patterns, microservices architecture, cross-platform performance, and native AOT compilation.|
|`edge-computing`|Edge function design principles. Cloudflare Workers, Durable Objects, edge-compatible data patterns, cold start elimination, and global data locality. Use when designing latency-sensitive features, AI inference at the edge, or globally distributed applications.|
|`frontend-design`|Design thinking and decision-making for web UI. Use when designing components, layouts, color schemes, typography, or creating aesthetic interfaces. Teaches principles, not fixed values.|
|`game-development`|Game development orchestrator. Routes to platform-specific skills based on project needs.|
|`geo-fundamentals`|Generative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).|
|`i18n-localization`|Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.|
|`intelligent-routing`|Automatic agent selection and intelligent task routing. Analyzes user requests and automatically selects the best specialist agent(s) without requiring explicit user mentions.|
|`lint-and-validate`|Linting and validation principles for code quality enforcement.|
|`llm-engineering`|LLM engineering principles for production AI systems. RAG pipeline design, vector store selection, prompt engineering, evals, and LLMOps. Use when building AI features, chat interfaces, semantic search, or any system calling an LLM API.|
|`local-first`|Local-first software principles. Offline-capable apps, CRDTs, sync engines (ElectricSQL, Replicache, Zero), conflict resolution, and the migration path from REST-first to local-first architecture. Use when building apps that need offline support, fast UI, or collaborative editing.|
|`mcp-builder`|MCP (Model Context Protocol) server building principles. Tool design, resource patterns, best practices.|
|`mobile-design`|Mobile-first and Spatial computing design thinking for iOS, Android, Foldables, and WebXR. Touch interaction, advanced haptics, on-device AI patterns, performance extremis. Teaches principles, not fixed values.|
|`nextjs-react-expert`|Next.js App Router and React v19+ performance optimization from Vercel Engineering. Use when building React components, optimizing performance, implementing React Compiler patterns, eliminating waterfalls, reducing JS payload, or implementing Streaming/PPR optimizations.|
|`nodejs-best-practices`|Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.|
|`observability`|Production observability principles. OpenTelemetry traces, structured logs, metrics, SLOs/SLIs/error budgets, and AI observability. Use when setting up monitoring, debugging production issues, or designing observable distributed systems.|
|`parallel-agents`|Multi-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.|
|`performance-profiling`|Performance profiling principles. Measurement, analysis, and optimization techniques.|
|`plan-writing`|Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.|
|`platform-engineer`|Senior platform engineer with deep expertise in building internal developer platforms, self-service infrastructure, and developer portals. Reduces cognitive load and accelerates software delivery.|
|`powershell-windows`|PowerShell Windows patterns. Critical pitfalls, operator syntax, error handling.|
|`python-patterns`|Python development principles and decision-making. Framework selection, async patterns, type hints, project structure. Teaches thinking, not copying.|
|`python-pro`|Senior Python developer (3.11+) specializing in idiomatic, type-safe, and performant Python. Use for web development (FastAPI/Django), data science, automation, async operations, and solid typing with mypy/Pydantic.|
|`react-specialist`|Senior React specialist (React 18+) focusing on advanced patterns, state management, performance optimization, and production architectures (Next.js/Remix).|
|`realtime-patterns`|Real-time and collaborative application patterns. WebSockets, Server-Sent Events for AI streaming, CRDTs for conflict-free collaboration, presence, and sync engines. Use when building live collaboration, AI streaming UIs, live dashboards, or multiplayer features.|
|`red-team-tactics`|Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.|
|`rust-pro`|Master Rust 1.75+ with modern async patterns, advanced type system features, and production-ready systems programming. Expert in the latest Rust ecosystem including Tokio, axum, and cutting-edge crates. Use PROACTIVELY for Rust development, performance optimization, or systems programming.|
|`seo-fundamentals`|SEO fundamentals, E-E-A-T, Core Web Vitals, and Google algorithm principles.|
|`server-management`|Server management principles and decision-making. Process management, monitoring strategy, and scaling decisions. Teaches thinking, not commands.|
|`sql-pro`|Senior SQL developer across major databases (PostgreSQL, MySQL, SQL Server, Oracle). Use for complex query design, performance optimization, indexing strategies, CTEs, window functions, and schema architecture.|
|`systematic-debugging`|4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.|
|`tailwind-patterns`|Tailwind CSS v4+ principles for extreme frontend engineering. CSS-first configuration, scroll-driven animations, logical properties, advanced container style queries, and `@property` Houdini patterns.|
|`tdd-workflow`|Test-Driven Development workflow principles. RED-GREEN-REFACTOR cycle.|
|`test-result-analyzer`|Ingests test logs and identifies root causes across multiple failing test files. Provides actionable fix recommendations.|
|`testing-patterns`|Testing patterns and principles. Unit, integration, mocking strategies.|
|`trend-researcher`|Creative muse and design trend analyzer for modern web/mobile interfaces.|
|`ui-ux-pro-max`|Plan and implement cutting-edge advanced UI/UX. Create distinctive, production-grade frontend interfaces with high design quality.|
|`ui-ux-researcher`|Expert auditor for accessibility, cognitive load, and premium design heuristics.|
|`vue-expert`|Vue 3 Composition API and modern Vue ecosystem expert. Use when building Vue applications, optimizing reactivity, component architecture, Nuxt 3 development, performance tuning, and State Management (Pinia).|
|`vulnerability-scanner`|Advanced vulnerability analysis principles. OWASP 2025, Supply Chain Security, attack surface mapping, risk prioritization.|
|`web-design-guidelines`|Review UI code for Next-Generation Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".|
|`webapp-testing`|Web application testing principles. E2E, Playwright, deep audit strategies.|
|`whimsy-injector`|Micro-delight generator for frontend interfaces. Suggests and implements subtle animations, playful transitions, and interaction polish across any frontend stack.|
|`workflow-optimizer`|Analyzes agent tool-calling patterns and task execution efficiency to suggest process improvements.|
