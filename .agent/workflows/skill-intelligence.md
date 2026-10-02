---
description: Autonomous Skill Intelligence Engine for Tribunal Kit. Discover, compose, gate, and verify capabilities across 235+ engineering skills. Enforces Discover First, Compose Second, Create Only When Necessary, Verify Always.
tools: Read, Grep, Glob, Bash, Edit, Write
version: 1.0.0
last-updated: 2026-10-01
required-skills:
  - agent-organizer
  - skill-creator
  - clean-code
scripts-binding:
  - .agent/scripts/skill_intelligence.js
  - .agent/scripts/swarm_dispatcher.js
  - .agent/scripts/verify_all.js
---

# /skill-intelligence — Tribunal Skill Intelligence Engine

```text
DISCOVER FIRST.
COMPOSE SECOND.
CREATE ONLY WHEN NECESSARY.
VERIFY ALWAYS.
```

The Skill Intelligence Engine determines the minimal sufficient set of capabilities required to produce a robust, production-grade outcome for any task without unnecessary skill generation or redundant analysis.

---

## Operating Protocol

### Phase 1 — Discovery (Broad Search)

Before writing or changing code:

1. Parse explicit user requirements and desired outcome.
2. Extract technical concepts, implicit constraints, and likely failure modes.
3. Discover existing skills in the 235+ repository (`node .agent/scripts/skill_intelligence.js --query "<task>"`).
4. Evaluate relevance:
   - **MANDATORY**: Critical safety, correctness, or transaction requirements.
   - **RECOMMENDED**: Observability, performance, or hygiene additions.
   - **OPTIONAL**: Ancillary optimizations.
   - **IRRELEVANT**: Discard.

### Phase 2 — Concept & Engineering Consideration Extraction

1. Extract explicit and implicit concepts from the 35-category taxonomy.
2. Formulate the **Engineering Consideration Matrix**:
   - Categorize by severity: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`.
   - Surface cross-domain risks (e.g. distributed transactions, concurrency race conditions, prompt injection).
   - Enforce **The Consideration Invariant**: _Knowledge Availability ≠ Consideration Coverage_.

### Phase 3 — Skill Coverage & Composition (Pipeline DAG)

1. Measure concept-to-skill coverage: `FULL`, `PARTIAL`, or `NONE`.
2. Automatically promote candidate skills into the execution pipeline DAG.
3. Build an ordered execution DAG (e.g. Contract → Validation → State/DB → Logic → Tests → Security).
4. Establish a **shared task context** (AST nodes, schema models, API types) to eliminate duplicate passes.

### Phase 4 — Creation Gate (The 11-Point Audit)

A new skill may **only** be created if all 11 checks pass:

- [x] Existing skill searched
- [x] Semantic matches searched
- [x] Related skills checked
- [x] Composition attempted & proved insufficient
- [x] Duplicate capability checked
- [x] Material capability gap confirmed
- [x] Long-term reusability justified
- [x] Concept coverage checked
- [x] Failure-mode coverage checked
- [x] Verification capability checked
- [x] Existing skill improvement evaluated
      _Decision Hierarchy: USE → COMPOSE → IMPROVE → EXTEND → CREATE._

### Phase 5 — Materiality Engine & Outcome Contract Generation

1. Evaluate each discovered consideration as `MATERIAL`, `NON_MATERIAL`, or `OPTIONAL` with technical rationale.
2. Enforce **Minimum Sufficient Engineering** to prevent overengineering and respect the **Outcome Budget**.
3. Generate the formal **Outcome Contract** specifying:
   - Objective & Constraints
   - Material Considerations & Tailored Quality Attributes
   - Success Conditions (e.g. single side-effect under duplicate retries)
   - Non-Goals (explicit anti-overengineering bounds)

### Phase 6 — Verification, Post-Implementation Outcome Audit & Regression Analysis

1. Execute concept-aligned verification tests (idempotency safety, atomic rollbacks, concurrency locks).
2. Execute post-execution outcome audit via `auditOutcome`:
   - Categorize outcome into `satisfied`, `partially_satisfied`, `unsatisfied`, `unverified`, `new_risks`, `unnecessary_complexity`.
   - Distinguish **Task Completion** (code exists / tests pass) from **Outcome Completion** (all material considerations satisfied, zero regressions, zero overengineering).
3. Analyze systemic architectural decisions via `detectTradeoffs` (e.g. Concurrency Locking vs Throughput/Latency).
4. Guard against regressions via `evaluateOutcomeRegression`:
   - Enforce: _A fix is only an improvement if the overall outcome improves_.
5. Emit structured corrective actions and re-verify before declaring completion.

### Phase 7 — Engineering Judgment, Uncertainty & Adaptive Execution

1. Evaluate evidence across the 8-tier **Evidence Hierarchy** (Runtime > Tests > Static > Benchmarks > Repo > Config > Docs > Model).
2. Track explicit **Uncertainty** (`verified`, `assumed`, `inferred`, `unknown`, `contradicted`) and calculate **Expected Information Value** before launching expensive investigations.
3. Manage execution state transitions via the **Engineering Judgment State Machine** (`PROCEED`, `INVESTIGATE`, `REPLAN`, `CORRECT`, `ESCALATE`, `DEFER`, `STOP`, `COMPLETE`).
4. Classify **Reversibility** and block irreversible operations (data drops, breaking API changes) using the **Escalation Engine**.
5. Detect **Requirement Conflicts** (e.g. CAP / PACELC bounds, Low Cost vs Multi-Region, Caching vs Freshness) and surface them explicitly.
6. Support **Dynamic Capability Graphs** (`DynamicCapabilityGraph`) to mutate pipelines (`ADD`, `REMOVE`, `REORDER`, `RETRY`, `SKIP`, `BRANCH`, `MERGE`) based on runtime signals (e.g. dynamic SSRF defense injection).
7. Audit **Architectural Anti-Slop** to detect overengineering (premature microservices/Kafka) and underengineering (missing transaction boundaries/idempotency).

### Phase 8 — Engineering Memory & Continuous Capability Evolution (Phase 5)

1. Invariants:
   - `SOLVE ONCE. VERIFY ONCE. LEARN ONCE. REUSE SAFELY.`
   - `MEMORY MUST EARN TRUST THROUGH EVIDENCE.`
   - `CURRENT EVIDENCE > STALE MEMORY.`
   - `MEMORY → HYPOTHESIS → CURRENT EVIDENCE → DECISION.`
   - `DO NOT REPEAT VERIFIED FAILURES. NEGATIVE KNOWLEDGE IS KNOWLEDGE.`
   - `ZERO SILENT SELF-MODIFICATION.`
2. Retrieve typed engineering memories (`pattern`, `failure`, `decision`, `verification`, `anti_pattern`, `skill_performance`, `concept_relationship`, `capability_gap`) as hypotheses.
3. Validate contextual applicability to prevent false transfer across disparate technologies or scales.
4. Promote verified hypotheses into considerations and enhance verification plans with proven strategies.
5. Capture empirical failures into the negative knowledge vault so future executions avoid repeating them.
6. Generate governed **Skill Improvement Proposals** (SIPs) when repeated weaknesses occur, requiring explicit human/governance approval.

### Phase 9 — System Simulation & Pre-Mortem Intelligence (Phase 6)

1. Core Invariants:
   - `PREDICT BEFORE IMPLEMENTATION.`
   - `IF A FAILURE CAN BE REASONED ABOUT BEFORE IMPLEMENTATION, IT SHOULD BE IDENTIFIED.`
   - `PREDICTION IS NOT EVIDENCE. PREDICTION MUST BE VERIFIED.`
2. Canonical 30-Category Failure Taxonomy:
   - Evaluates Functional, Data Integrity, Concurrency, Distributed Systems, Network, Dependency, Security, Auth, Availability, Performance, Scalability, Capacity, Cost, Deployment, Configuration, Observability, Recovery, Human Error, Data Corruption, Consistency, Caching, Messaging, Storage, AI/Agent, Tool, and Supply Chain failures.
3. Causal Failure Chain Modeling:
   - Maps `Trigger → Propagation → Failure → Impact → Detection → Recovery` across multi-domain boundaries.
4. Blast-Radius Analysis (8 Tiers):
   - Categorizes potential fallout: `LOCAL`, `COMPONENT`, `SERVICE`, `WORKFLOW`, `DATASET`, `REGION`, `SYSTEM`, `MULTI_SYSTEM`.
5. Multi-Domain Pre-Mortem Simulators:
   - Dependencies (timeouts, partial/malformed responses, network partitions).
   - Concurrency & Race Conditions (inventory decrement, double spend, lost updates).
   - Retry Amplification & Storms (exponential backoff, jitter, idempotency violations).
   - Queues & Poison Pills (message duplication, poison pill crash loops, lag).
   - Database Failures (distinguishing slow-DB from dead-DB, connection pool exhaustion, replication lag).
   - Cache Stampedes (thundering herd, cold starts, and cache-as-availability-dependency).
   - Load, Capacity & Queueing Analysis (Little's Law arrival rate λ > μ service rate sustainability).
   - Latency Budget (p50/p95/p99 tail latency decomposition).
   - Security Pre-Mortem (SSRF, SQLi, command injection, auth bypass, privilege escalation).
   - AI & Agent Failure Modes (hallucination, infinite loops, context poisoning, prompt injection).
   - Runaway Cost Loops (agent retry spirals, token burn, high-cardinality telemetry).
   - Deployment Version Skew & Rollback Failure (coexistence, schema drift).
   - Chaos Scenario Generation (with strict sandbox/mock boundaries).
6. Simulation Depth Hierarchy (Levels 0–5):
   - LEVEL 0 (Static Reasoning) → LEVEL 1 (Architecture Simulation) → LEVEL 2 (Deterministic Test Simulation) → LEVEL 3 (Load Simulation) → LEVEL 4 (Fault Injection) → LEVEL 5 (Chaos Testing).
   - Enforces **Minimum Sufficient Simulation Depth** proportional to task complexity and risk.
7. Prediction Contract & Unsupported Claim Detection:
   - Strict separation of unverified `PREDICTION` from empirical `FINDING`.
   - Flags unsupported absolute claims ("exactly once", "impossible race conditions", "infinitely scalable").
8. Post-Implementation Prediction vs Observed Verification:
   - Compares predicted hazards against observed execution evidence (`VERIFIED` vs `DISPROVED`).
   - Automatically stores verified outcomes into Phase 5 Engineering Memory to prevent regression.

---

## CLI Integration

```bash
# Discover relevant concepts, considerations, skill coverage, and pipeline DAG
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry"

# Surface relevant engineering memories, hypotheses, and failures to avoid
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry" --memory

# Run Phase 6 Pre-Mortem & Simulation Analysis
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry" --pre-mortem
tk pre-mortem "Build payment processing API with retries"

# Inspect Causal Failure Chains
node .agent/scripts/skill_intelligence.js --query "Build payment API with retries" --chains
tk pre-mortem "Build payment API" --chains

# Detect Unsupported Architectural Claims
node .agent/scripts/skill_intelligence.js --query "Build API with guaranteed exactly once delivery and impossible race conditions" --claims
tk pre-mortem "Build API with guaranteed exactly once delivery" --claims

# Simulate Architecture against Pre-Mortem Engine
tk simulate --architecture architecture.json

# Compare Predictions against Observed Evidence and Update Engineering Memory
tk simulate --verify evidence.json

# Inspect historical failures and negative knowledge vault
node .agent/scripts/skill_intelligence.js --failures

# Inspect continuous capability improvement proposals
node .agent/scripts/skill_intelligence.js --proposals

# Inspect skill performance telemetry and precision ratios
node .agent/scripts/skill_intelligence.js --telemetry

# Inspect the formal Phase 3 Outcome Contract
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry" --contract

# Inspect Phase 4 Engineering Judgment, Reversibility, and Requirement Conflicts
node .agent/scripts/skill_intelligence.js --query "Global API with < 50ms latency, strong cross-region consistency, and zero infrastructure cost" --judgment

# Run Architectural Anti-Slop Audit (detects overengineering / underengineering)
node .agent/scripts/skill_intelligence.js --query "Build simple static documentation website with kafka and kubernetes" --anti-slop

# Output machine-readable JSON (includes memories, outcome_contract, judgment, pre_mortem, and predictions)
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry" --json

# Check if creating a new skill satisfies the 11-check creation gate
node .agent/scripts/skill_intelligence.js --gate --need "webhook-reconciliation"

# Post-execution outcome & verification audit against implementation evidence
node .agent/scripts/skill_intelligence.js --query "Build payment API with idempotency and retry" --evidence evidence.json

# Audit discovery readiness of all registered skills
node .agent/scripts/skill_intelligence.js --audit
```
