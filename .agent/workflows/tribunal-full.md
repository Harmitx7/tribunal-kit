---
description: Runs ALL 21 parallel reviewers simultaneously. Maximum hallucination coverage. Use before merging any AI-generated code, before production deployments, or when maximum confidence is required.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 3.0.0
last-updated: 2026-07-30
required-skills:
  - clean-code
  - backend-security-expert
  - frontend-design
  - database-design
  - mobile-design
  - performance-profiling
scripts-binding:
  - .agent/scripts/security_scan.js
  - .agent/scripts/dependency_analyzer.js
  - .agent/scripts/lint_runner.js
  - .agent/scripts/schema_validator.js
  - .agent/scripts/test_runner.js
  - .agent/scripts/bundle_analyzer.js
  - .agent/scripts/verify_all.js
---

# /tribunal-full — Complete 21-Reviewer Audit

$ARGUMENTS

---

## Mandatory Pre-Flight Context Inspection

Before launching the full 21-reviewer audit, you MUST inspect:
1. Pending Code Modifications (`git diff` / modified files) → Inspect diffs across all domains (frontend, backend, database, mobile)
2. Workspace Configuration Context (`package.json`, `tsconfig.json`, `tailwind.config`) → Verify project build contracts
3. 21-Reviewer Synthesis Gate → Execute all 21 specialized reviewers in parallel; halt on any security violation or critical bug before Human Gate approval

---

## When to Use /tribunal-full

| Use `/tribunal-full` when...         | Use targeted tribunal when...        |
| :----------------------------------- | :----------------------------------- |
| Before merging any AI-generated code | Backend only → `/tribunal-backend`   |
| Before production deployment         | Frontend only → `/tribunal-frontend` |
| Security-critical feature review     | DB only → `/tribunal-database`       |
| Code affects auth, payments, or PII  |                                      |
| Maximum confidence required          |                                      |

---

## 21 Reviewers — Stage-Partitioned Execution (3 Waves)

To eliminate context window saturation and reviewer attention dilution, the 21 reviewers execute in 3 partitioned passes:

```
Wave 1: Core Integrity & Precedences (Pass 1)
├── precedence-reviewer    → Checks local repo Case Law for past rejections
├── logic-reviewer         → Hallucinated methods, impossible logic, undefined refs
├── schema-reviewer        → Missing input validation, loose schemas, raw req.body
└── resilience-reviewer    → Swallowed errors, unhandled rejections, missing retries

Wave 2: Security, Types & Code Quality (Pass 2)
├── security-auditor       → OWASP 2025, injection, JWT, SSRF, IDOR
├── dependency-reviewer    → Fabricated packages, supply chain, version compatibility
├── type-safety-reviewer   → 'any' epidemic, Zod parse vs cast, unguarded access
├── complexity-reviewer    → Enforces the Dependency Ladder to prevent over-engineering
└── sql-reviewer           → Injection, N+1, missing indexes, unscoped mutations

Wave 3: Domain, UI & Performance (Pass 3)
├── frontend-reviewer      → React 19 APIs, RSC violations, hook rules, hydration
├── performance-reviewer   → Core Web Vitals targets, re-render cascades, memory leaks
├── mobile-reviewer        → Reanimated thread safety, FlashList, safe area insets
├── ai-code-reviewer       → Model name hallucinations, prompt injection, cost explosion
├── test-coverage-reviewer → Happy path only, brittle selectors, missing edge cases
├── accessibility-reviewer → WCAG 2.2 AA, ARIA misuse, focus management, live regions
├── ui-ux-auditor          → Generic AI aesthetics, missing hover states, contrast
├── review-animations      → UI animations >300ms, origin-unaware popovers, ease-in
├── vitals-reviewer        → Frontend CWV depth: Suspense waterfalls, paint jank
├── db-latency-auditor     → DB layer: N+1, unbounded queries, unindexed WHERE
└── throughput-optimizer   → Server runtime: event-loop blocks, serialized awaits
```

---

## Active Reviewers by Code Type

Not all 21 reviewers produce meaningful findings on all code types. Active reviewers detect their first finding immediately — inactive reviewers auto-pass with "N/A for this code type."

| Code Under Review   | Critical Reviewers                                                |
| :------------------ | :---------------------------------------------------------------- |
| REST API route      | logic, security, dependency, type-safety, sql, schema, resilience |
| React component     | logic, frontend, accessibility, type-safety, resilience, ui-ux    |
| Database query      | logic, security, sql, resilience                                  |
| AI LLM integration  | logic, security, ai-code, dependency                              |
| Test file           | test-coverage, logic                                              |
| React Native / Expo | mobile, logic, security, performance, ui-ux                       |
| Next.js page        | logic, frontend, performance, accessibility, ui-ux                       |
| Auth/JWT code       | security, logic, type-safety                                      |

---

## Verdict Aggregation

```
All 21 verdicts are collected. Aggregated result:

If ANY reviewer = ❌ REJECTED → Global verdict: ❌ REJECTED (must fix before Human Gate)
If any reviewer = ⚠️ WARNING  → Global verdict: ⚠️ WARNINGS (proceed with attention)
If all reviewers = ✅ APPROVED → Global verdict: ✅ APPROVED (proceed to Human Gate)
```

---

## Retry Protocol

When code is rejected:

```
Attempt 1: Maker revises with reviewer feedback
Attempt 2: Maker revises with stricter constraints + full reviewer context
Attempt 3: Maker revises with maximum constraints + full context dump

After 3 failed attempts:
  → HALT
  → Report to human with full failure history
  → DO NOT retry silently
```

---

## Usage Examples

```
/tribunal-full audit all changes since last commit
```

---

## After /tribunal-full — Next Steps

| Outcome                    | Next Command                                   |
| :------------------------- | :--------------------------------------------- |
| All 21 reviewers approve   | → `/deploy` — highest confidence state         |
| Reject with multiple fixes | → `/fix` for simple issues, `/debug` for logic |
| Performance rejection      | → `/tribunal-speed` for granular profiling     |
| Security rejection         | → Immediate `/tribunal-backend` to resolve     |

---
