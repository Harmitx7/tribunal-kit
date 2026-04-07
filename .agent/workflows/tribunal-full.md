---
description: Run ALL 11 Tribunal reviewer agents simultaneously. Maximum hallucination coverage. Use before merging any AI-generated code, before production deployments, or when maximum confidence is required.
---

# /tribunal-full — Complete 11-Reviewer Audit

$ARGUMENTS

---

## When to Use /tribunal-full

|Use `/tribunal-full` when...|Use targeted tribunal when...|
|:---|:---|
|Before merging any AI-generated code|Backend only → `/tribunal-backend`|
|Before production deployment|Frontend only → `/tribunal-frontend`|
|Security-critical feature review|DB only → `/tribunal-database`|
|Code affects auth, payments, or PII||
|Maximum confidence required||

---

## 11 Reviewers — All Active Simultaneously

```
Tier 1: Always active (universal concerns)
├── logic-reviewer         → Hallucinated methods, impossible logic, undefined refs
└── security-auditor       → OWASP 2025, injection, JWT, SSRF, IDOR

Tier 2: Code quality
├── dependency-reviewer    → Fabricated packages, supply chain, version compatibility
├── type-safety-reviewer   → 'any' epidemic, Zod parse vs cast, unguarded access
└── sql-reviewer           → Injection, N+1, missing indexes, unscoped mutations

Tier 3: Domain-specific
├── frontend-reviewer      → React 19 APIs, RSC violations, hook rules, hydration
├── performance-reviewer   → 2026 CWV targets, re-render cascades, memory leaks
├── mobile-reviewer        → Reanimated thread safety, FlashList, safe area insets
├── ai-code-reviewer       → Model name hallucinations, prompt injection, cost explosion
├── test-coverage-reviewer → Happy path only, brittle selectors, missing edge cases
└── accessibility-reviewer → WCAG 2.2 AA, ARIA misuse, focus management, live regions
```

---

## Active Reviewers by Code Type

Not all 11 reviewers produce meaningful findings on all code types. Active reviewers detect their first finding immediately — inactive reviewers auto-pass with "N/A for this code type."

|Code Under Review|Critical Reviewers|
|:---|:---|
|REST API route|logic, security, dependency, type-safety, sql|
|React component|logic, frontend, accessibility, type-safety|
|Database query|logic, security, sql|
|AI LLM integration|logic, security, ai-code, dependency|
|Test file|test-coverage, logic|
|React Native / Expo|mobile, logic, security, performance|
|Next.js page|logic, frontend, performance, accessibility|
|Auth/JWT code|security, logic, type-safety|

---

## Verdict Aggregation

```
All 11 verdicts are collected. Aggregated result:

If ANY reviewer = ❌ REJECTED → Global verdict: ❌ REJECTED (must fix before Human Gate)
If any reviewer = ⚠️ WARNING  → Global verdict: ⚠️ WARNINGS (proceed with attention)
If all reviewers = ✅ APPROVED → Global verdict: ✅ APPROVED (proceed to Human Gate)
```

---

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
