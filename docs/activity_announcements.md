# Tribunal-Kit Context-Aware Agent & Skill Announcements (Phase 4)

## Overview

Phase 4 eliminates repetitive, generic, and noisy agent and skill announcements across Tribunal-Kit's supported environments (Antigravity, Claude Code, Cursor, Windsurf, Copilot, Codex).

By introducing an **Announcement Intelligence Engine** and expanding the **Core Specialist Agent Registry**, every announcement is context-aware, concise, accurate, visually consistent, and useful to the developer—without changing underlying agent selection, routing rules, or execution semantics.

---

## 1. Announcement Decision Model

The announcement system strictly distinguishes between execution states:

| Execution State | Decision | Rationale |
|---|---|---|
| `considered` | **SUPPRESS** | Internal candidate evaluation; never visible in developer chat |
| `selected` | **SUPPRESS** / Deferred | Agent/skill selected by router; held until actual task execution starts |
| `activated` | **ANNOUNCE** (Once per attempt) | Agent or skill assigned to task with verified domain and mandate |
| `executing` | **ANNOUNCE** (Milestones only) | Emits tool/analysis status; deduplicates identical 0-delta progress ticks |
| `finished` | **ANNOUNCE** | Meaningful completion with verification artifacts or findings |
| `failed` | **ANNOUNCE** (Always) | Critical failure state; provides error code and actionable remedy |
| `blocked` | **ANNOUNCE** (Always) | Critical gating condition; provides unblocking directive |
| `retrying` | **ANNOUNCE** (Always) | New attempt counter with backoff reason; resets attempt-scoped deduplication |

---

## 2. Operation-Scoped Deduplication

Deduplication is strictly scoped to an `operationId`:

1. **Attempt-Bound Deduplication**:
   - Calling `tracker.activateAgent('resilience-reviewer')` multiple times within the same attempt emits the formatted announcement once and cleanly suppresses subsequent duplicates (`suppressedReason: 'duplicate_suppressed'`).
   - Suppressed events are still logged to the internal operation history for debugging and telemetry.
2. **Retry Resets**:
   - When an operation transitions to `retrying` (e.g. `attempt = 2`), attempt-scoped caches are reset.
   - Legitimate re-activations on retry attempts are announced with the updated attempt context.
3. **Cross-Operation Isolation**:
   - Independent operations (`op_A` and `op_B`) maintain isolated deduplicators.
   - Activating `@security-auditor` in `op_A` will never suppress `@security-auditor` in `op_B`.

---

## 3. Core Agent Registry

The built-in registry resolves 31 core Tribunal specialist agents with zero filesystem I/O:

- `backend-specialist`: Server Architecture & API Engineering
- `api-architect`: API Contract Design & Protocols
- `frontend-specialist`: Interface Systems & React Architecture
- `react-specialist`: Advanced React Architecture
- `vue-expert`: Vue & Nuxt Architecture
- `mobile-developer`: Cross-Platform Mobile Engineering
- `security-auditor`: Application Security & OWASP Defense
- `penetration-tester`: Attack Surface & Threat Modeling
- `ai-code-reviewer`: LLM Integration & Prompt Defense
- `resilience-reviewer`: Fault Tolerance & Error Resilience
- `database-architect`: Database Schema & Query Integrity
- `sql-pro`: Advanced SQL & Analytical Queries
- `db-latency-auditor`: Database Performance & Query Tuning
- `orchestrator`: Multi-Agent Coordination & Synthesis
- `agent-organizer`: Agent Swarm Coordination
- `project-planner`: System Architecture & Phased Milestones
- `test-engineer`: Behavioral Test Coverage & Verification
- `qa-automation-engineer`: Automated E2E & Integration Testing
- `logic-reviewer`: Core Logic & Business Invariants
- `type-safety-reviewer`: Type Integrity & Schema Compliance
- `performance-optimizer`: Runtime Efficiency & Resource Optimization
- `throughput-optimizer`: Throughput & High-Load Architecture
- `vitals-reviewer`: Core Web Vitals Optimization
- `anti-pattern-reviewer`: Clean Code & Architectural Design
- `dependency-reviewer`: Dependency Supply Chain & Audit
- `devops-engineer`: CI/CD Pipelines & Containerization
- `devops-incident-responder`: Production Incident Recovery & SRE
- `platform-engineer`: Platform Infrastructure & Cloud Engineering
- `system-architect`: Distributed Systems & Scale
- `code-archaeologist`: Legacy Codebase Archaeology
- `debugger`: Systematic Bug Diagnosis

### Safe Fallback for Custom or Unknown Agents
Unknown agents (e.g. `@cloud-migration-reviewer`) are dynamically humanized into display names (`Cloud Migration Reviewer`) and domains (`Cloud Migration Reviewer Specialist`) without crashing or guessing unverified facts.

---

## 4. Context-Aware Announcement Formatting

Legacy announcements like `🤖 Applying knowledge of @[agent-name]...` have been completely replaced across all instruction files (`.claude/CLAUDE.md`, `.gemini/GEMINI.md`, `AGENTS.md`, `kernel.md`).

### Canonical Activated Pattern
```markdown
› **Activated** `@[agent-name]` · [Domain / Mandate]
  [Context-aware task summary focusing on domain standards.]
```

### Example: Security Auditor on JWT Check
```markdown
› **Activated** `@security-auditor` · Application Security & OWASP Defense
  Auditing JWT signature verification and algorithm enforcement. Focus: Audits injection vectors, auth barriers, secrets exposure, and input sanitization.
```

---

## 5. Performance & Concurrency Benchmarks

Authoritative measurements from `scripts/benchmark_announcements.js`:

| Scenario | Workload | Elapsed | Measured Throughput |
|---|---|---|---|
| **Metadata Resolution** | 150,000 lookups | 121.14 ms | **1,238,285 ops/sec** (~0.81 µs/op) |
| **Announcement Decision (`shouldAnnounce`)** | 50,000 checks | 10.67 ms | **4,686,167 ops/sec** (~0.21 µs/op) |
| **Duplicate Stream Suppression** | 10,000 activations | 673.01 ms | **100% duplicate noise suppressed** |
| **Concurrent Operation Isolation** | 1,000 independent ops | 88.11 ms | **11,349 ops/sec** (Zero cross-talk) |

