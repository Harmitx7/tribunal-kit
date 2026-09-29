---
id: ADR-001
title: 'System Architecture Intelligence Layer'
status: Accepted
date: 2026-09-27
---

# ADR-001: System Architecture Intelligence Layer

## Context

Tribunal Kit v9.2.4 had strong code-level review capabilities (57 agents, 29 reviewers across 3 waves) but lacked macro-level architectural reasoning. The `system-architect` agent operated in a vacuum — excellent at greenfield system design (DAU, QPS, CAP) but unable to reason about the actual repository state. No mechanism existed to detect architectural drift between intended and actual design.

## Decision

Introduce a 3-part System Architecture Intelligence layer:

1. **`architecture_mapper.js`** — A deterministic static analysis script that extracts API routes, database queries, external services, auth boundaries, queues, and environment variables into a machine-readable `architecture.idx.json` (the System Model).
2. **`system-architect` agent (upgraded)** — Grounded in the System Model. Must read `architecture.idx.json` before proposing changes. Produces ADRs for significant decisions.
3. **`architecture-auditor` agent (new)** — A Wave 3 Tribunal reviewer that audits code diffs against the System Model and ADRs for boundary violations, drift, and anti-patterns.

## Rationale

- **Deterministic extraction over LLM exploration**: Using a script for system exploration saves 50K-100K tokens per interaction and eliminates hallucinated architecture claims.
- **Upgrade over replacement**: Reuses the existing `system-architect` agent and `graph_builder.js` infrastructure rather than building from scratch.
- **Minimal new agents**: Only 1 new agent (`architecture-auditor`) added. Avoids agent proliferation.

## Trade-offs

- **Positive**: Token-efficient, evidence-based, integrates with existing Tribunal pipeline
- **Negative**: Regex-based static analysis may miss dynamic patterns (pub/sub events, runtime service discovery)
- **Mitigation**: The System Model is explicitly marked as "deterministic extraction" and agents must mark undetected patterns as UNKNOWN

## Consequences

- All architecture proposals now require System Model consultation
- ADRs become a persistent architectural memory
- Architecture drift is continuously auditable

## Verification

1. Run `node .agent/scripts/architecture_mapper.js` — should produce valid JSON
2. `architecture-auditor` should appear in Wave 3 reviewer list
3. `system-architect` should refuse to design without reading the System Model

## Revisit When

- The project adopts microservices or polyglot services where regex extraction is insufficient
- A proper AST parser (e.g., oxc, swc) becomes available for deeper extraction
