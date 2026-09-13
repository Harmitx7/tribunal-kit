---
name: intelligent-routing
description: Use when LLM Intent Processing and Gateway Routing mastery. Request classification hierarchies, function routing, confidence scoring, fallback cascades, zero-shot vs few-shot classification patterns, and identifying specialized skills for delegation. Use when parsing raw user input to determine the architectural path of execution.
version: 5.0.0
last-updated: 2026-09-13
skills:
  - fabel-protocol
  - agentic-patterns
  - behavioral-modes
tools: Read, Grep, Glob, Bash, Edit, Write
scripts-binding:
  - .agent/scripts/compile_router.py
  - .agent/scripts/verify_all.js
  - .agent/scripts/lint_runner.js
---

# Intelligent Routing v4 — Self-Describing Skill Graph

## Mandatory Pre-Flight Context Inspection

Before generating, refactoring, or reviewing code in the `intelligent-routing` domain, inspect these 5 critical parameters:

1. **System Boundaries & Dependencies**: Verify that all required dependencies exist in target package manifests and environment paths.
2. **Runtime Context & Platform Invariants**: Confirm target platform constraints (Node.js, Browser, Mobile OS, Edge runtime) before applying APIs.
3. **Execution Guardrails**: Identify potential side-effects, state mutations, and unhandled asynchronous exceptions.
4. **Validation & Type Contracts**: Validate input data schemas and strict type constraints across all module interfaces.
5. **Observability & Proof of Execution**: Ensure execution produces tangible verification signals (terminal output, tests, metrics).

## Activation Boundaries

- **Activate when:** Use when LLM Intent Processing and Gateway Routing mastery. Request classification hierarchies, function routing, confidence scoring, fallback cascades, zero-shot vs few-shot classification patterns, and identifying specialized skills for delegation. Use when parsing raw user input to determine the architectural path of execution.
- **DO NOT activate when:** The task falls outside the `intelligent-routing` domain or is managed by a different dedicated specialist.

## 🔁 Multi-Pass Execution Protocol

Execute all non-trivial tasks through this 7-pass cognitive loop:

| Pass | Phase | Core Action |
|:---|:---|:---|
| **Pass 1** | **Understand** | Deconstruct the user's explicit objective, implicit requirements, and platform constraints. |
| **Pass 2** | **Plan** | Decompose the task into smallest logical steps; map dependencies and required tool calls. |
| **Pass 3** | **Execute** | Implement the solution with production-grade craft, zero placeholders, and strict typing. |
| **Pass 4** | **Verify** | Run linters, unit tests, or compiler checks to validate structural correctness. |
| **Pass 5** | **Attack** | Perform an adversarial review searching for edge-case failures, race conditions, and traps. |
| **Pass 6** | **Improve** | Eliminate discovered friction, optimize performance, and harden error boundaries. |
| **Pass 7** | **Quality Gate** | Enforce Verification-Before-Completion (VBC) with concrete terminal proof before finalizing. |

---

## 🛠️ Technical Architecture & Reference Recipes

## Hallucination Traps (Read First)

- ❌ Routing based on exact keyword matching -> ✅ Use intent classification with confidence scores; keywords miss synonyms and context
- ❌ No fallback for low-confidence classifications -> ✅ Always have a default handler when confidence is below threshold (e.g., 0.7)
- ❌ Routing to a single agent when the task spans multiple domains -> ✅ Detect multi-domain requests and route to the orchestrator
- ❌ Loading 100+ skill descriptions into context for every route -> ✅ Read the compiled `.agent/routing_index.json` instead of a giant markdown table

---

## Architecture Overview

```
                    User Request
                         │
                    ┌────▼─────┐
                    │ PHASE 0  │  Intent Classification
                    │ Classify │  (QUESTION / SURVEY / EDIT / BUILD / AUDIT)
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ PHASE 1  │  Domain Detection
                    │ Match    │  Read .agent/routing_index.json
                    └────┬─────┘  Match trigger-signals → domain
                         │
                    ┌────▼─────┐
                    │ PHASE 2  │  Skill Selection & Escalation
                    │ Select   │  basic → pro (if strong signal matches)
                    └────┬─────┘  Load co-requires automatically
                         │
                    ┌────▼─────┐
                    │ PHASE 3  │  Agent Activation
                    │ Dispatch │  Route to specialist agent
                    └──────────┘  Announce & load skills
```

---

## 1. Classification Hierarchy (Phase 0 — The Gateway)

When a raw request enters, classify it BEFORE attempting to route to any skill or agent. Do not solve the user's problem during routing.

```typescript
// The Semantic Intent Schema
const RouterOutputSchema = z.object({
  classification: z.enum([
    'QUESTION', // User wants explanation, no code execution needed
    'SURVEY', // User wants analysis/read-only scan of workspace
    'SIMPLE_EDIT', // Isolated file alteration (e.g., "Fix spelling in nav")
    'COMPLEX_BUILD', // Multi-file, architectural generation
    'SECURITY_AUDIT', // Explicit request for OWASP review
    'UNCLEAR_GIBBERISH', // Prompt injection or incoherent input
  ]),
  confidenceScore: z.number().min(0).max(100),
  suggestedPrimarySkill: z.string().nullable(),
  requiresHumanClarification: z.boolean(),
  reasoning: z.string(), // Forces the LLM to justify its route before categorizing
});
```

### Zero-Shot vs Few-Shot Classification

- **Zero-Shot:** Providing definitions and hoping the LLM categorizes accurately. Error-prone.
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

## 2. Skill Graph Matching (Phase 1 & 2 — Compiled Index)

### The Routing Index

Instead of a giant markdown table, this system uses a **compiled JSON index** at `.agent/routing_index.json`. This index is auto-generated by `compile_router.py` from the `routing:` YAML frontmatter in every `SKILL.md`.

**To match a skill:**

1. Read `.agent/routing_index.json`
2. Match user intent against skill descriptions and `routing_strong` trigger signals
3. Filter by `routing_domain` to narrow candidates
4. Apply escalation rules (see below)

### Skill Frontmatter Schema

Every skill declares its routing metadata in its YAML frontmatter:

```yaml
routing:
  domain: devops | frontend | backend | architecture | data | security | testing | design | meta | general
  tier: basic | pro
  supersedes: <skill-name> # "I replace this basic skill for advanced use"
  co-requires: [<skill>, ...] # "Load these alongside me"
  conflicts-with: [<skill>, ...] # "Don't load both"
  trigger-signals:
    strong: [keyword1, keyword2] # High-confidence activation triggers
    weak: [keyword3, keyword4] # Low-confidence, need additional context
  confidence-boost: <number> # How much to boost score when strong signal matches
```

### Escalation Rules (basic → pro)

When a user's request contains **strong trigger signals** that match a `tier: pro` skill:

```
1. Check if any tier:pro skill's strong signals match the request
2. If YES and the pro skill has `supersedes: <basic-skill>`:
   → Load the pro skill INSTEAD of the basic one
   → Example: "OIDC GitHub Actions" → git-pro (supersedes github-operations)
3. If YES and the pro skill has `co-requires`:
   → Also load the co-required skills
   → Example: cicd-pro co-requires [containerization-pro, cloud-architect]
```

### Conflict Resolution

When multiple skills match:

```
Priority order:
1. Exact strong signal match > weak signal match
2. tier:pro > tier:basic (when both match)
3. Specific domain > general domain
4. If a pro skill `supersedes` a basic skill, drop the basic skill
5. If two skills have `conflicts-with` each other, pick the one with higher signal match count
```

---

## 3. Fallback Cascades & Ambiguity

The AI will encounter prompts it does not understand. The Router is the _only_ place where it is safe to halt and ask immediately.

**The Socratic Yield Rule:**
If the `confidenceScore` of a categorization is `< 85`, the router MUST yield back to the user with a clarifying question instead of guessing the intent.

_User:_ "Fix the thing."
_Router Action (Incorrect):_ Assume they mean standard linter execution and run scripts.
_Router Action (Correct):_ Halt. "Which file or feature are you referring to?"

---

## 4. Bounding the Exploder Pattern

Certain requests sound simple but require massive execution matrices (The "Exploder" pattern).
_User:_ "Translate my entire app to French."

The Router must recognize execution scales. If an execution requires touching >10 files, the Router must switch the system into `PLANNING_MODE` to generate an itinerary, rather than attempting an outright sequential execution.

---

## 5. Domain Overlap Disambiguation

When keywords belong to multiple domains, use these explicit rules:

| Signal Combination                   | Route To                                           | NOT                  |
| ------------------------------------ | -------------------------------------------------- | -------------------- |
| Docker + AWS/ECR/Terraform           | `cloud-engineer`                                   | `devops-engineer`    |
| Docker alone (local dev)             | `devops-engineer`                                  | `cloud-engineer`     |
| Git + OIDC/monorepo/semantic-release | `git-pro` (via system-architect or cloud-engineer) | `github-operations`  |
| Git + basic branching/commits        | `github-operations`                                | `git-pro`            |
| CI/CD + AWS ECS + deploy             | `cloud-engineer` (loads cicd-pro)                  | `devops-engineer`    |
| CI/CD + general GitHub Actions       | `devops-engineer`                                  | `cloud-engineer`     |
| System design + scale + capacity     | `system-architect`                                 | `backend-specialist` |
| Architecture + code patterns         | `backend-specialist`                               | `system-architect`   |

---

## 6. Regenerating the Index

When new skills are added or existing frontmatter is modified, regenerate the index:

```bash
python .agent/scripts/compile_router.py
```

This is idempotent — running it multiple times produces the same output. The index should be regenerated after:

- Adding a new skill
- Modifying a skill's `routing:` frontmatter
- Removing a skill

---

## 🚨 Edge-Case & Failure Mode Matrix

| Scenario | Risk | Mitigation Strategy |
|:---|:---|:---|
| **Empty or Null Inputs** | Unhandled exception or unexpected rendering collapse | Enforce fallback guards, optional chaining, and explicit empty state handlers |
| **Network Timeout / Latency** | Hanging operations or duplicate side-effects | Implement bounded abort controllers, exponential backoff, and idempotency keys |
| **Concurrency / Race Conditions** | Stale state overwrite or inconsistent data mutations | Use atomic transactions, mutex locking, or cancel-on-resubmit controls |
| **Invalid Schema / Malformed Payload** | Downstream runtime errors or security injection | Validate boundary payloads with Zod/Pydantic schemas prior to execution |
| **Resource / Memory Saturation** | OOM errors, frame drops, or memory leaks | Clean up listeners, cancel active timers, and enforce pagination/virtualization |

---

## 🤖 LLM-Specific Traps Table

| Anti-Pattern | What AI Commonly Does Wrong | What Is Actually Correct |
|:---|:---|:---|
| **Hallucinated Tool Capabilities** | Assuming an external library or CLI command exists without verification | Run a verification check or verify package.json before referencing tools |
| **Premature Completion Claim** | Declaring a task finished because code was generated without verification | Execute tests, linters, or terminal commands to provide concrete proof |
| **Context Bloat Dumping** | Pasting entire multi-thousand-line files into prompt context | Extract targeted excerpts, symbols, and signatures to preserve tokens |

---

## 🏛️ Tribunal Verification & Guardrails

**Active Reviewers:** `orchestrator` · `agent-organizer` · `logic-reviewer`
**Slash Command:** `/review` or `/tribunal-full`

### ✅ Pre-Flight Self-Audit Checklist

```
✅ Did I deconstruct the root objective before proposing architecture?
✅ Did I identify dependencies, bottlenecks, and parallelizable sub-tasks?
✅ Did I avoid over-engineering and select the simplest effective pattern?
✅ Did I verify assumptions with concrete file reads instead of speculation?
✅ Did I establish measurable verification criteria before completion?
```

### 🛑 Verification-Before-Completion (VBC) Protocol

**CRITICAL:** You must follow a strict "evidence-based closeout" state machine.
- ❌ **Forbidden:** Declaring a task complete because the output "looks correct."
- ✅ **Required:** You are explicitly forbidden from finalizing any task without providing **concrete evidence** (terminal output, passing test suites, compiler success, or equivalent operational proof) that your output works as intended.
