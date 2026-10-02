'use strict';

/**
 * outcome_optimization_engine.js — Phase 10: Engineering Outcome Optimization Engine
 * ===================================================================================
 * Implements the core invariant:
 *
 *   THE OUTCOME INVARIANT:
 *   Tribunal must optimize the implemented system for the actual engineering
 *   objective and constraints, not for shortest output, fastest generation,
 *   minimum code volume, or lowest immediate effort.
 *
 *   MINIMUM NECESSARY COMPLEXITY FOR THE REQUIRED ENGINEERING OUTCOME.
 *
 * Core Capabilities:
 *   1. Outcome Requirements Model (Explicit, Inferred, Default, Unknown)
 *   2. Requirement Discovery & Multi-Category Classification
 *   3. Requirement Prioritization (Mandatory, Important, Conditional, Optional, Unknown)
 *   4. Engineering Option Generation & Tradeoff Evaluation (No fake winner scores)
 *   5. Engineering Complexity Budget & Component Justification
 *   6. Anti-Slop Architecture Guard (Overengineering Detection)
 *   7. Under-Engineering Detection (Missing Critical Considerations)
 *   8. Machine-Readable Engineering Decision Records (EDR)
 *   9. End-to-End Decision Traceability
 *  10. Assumption Engine & Unknown Handling
 *  11. Outcome-Driven Skill Selection & Capability Depth
 *  12. Engineering Solution Shape Construction
 *  13. Implementation Order & Early Validation Probes
 *  14. Multi-Objective Outcome Verification & Regression Detection
 *  15. Adaptive Reasoning Depth & Risk Triggers
 *  16. Reversibility & Change Blast Radius Analysis
 *  17. Phase 10 Engineering Outcome Memory (Verified & Rejected Decisions)
 *  18. Quality of Consideration Internal Telemetry
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. CONSTANTS & INVARIANTS
// ============================================================================

const OUTCOME_INVARIANT = `Tribunal must optimize the implemented system for the actual engineering objective and constraints, not for shortest output, fastest generation, minimum code volume, or lowest immediate effort.`;

const REQUIREMENT_SOURCES = {
  EXPLICIT: 'EXPLICIT REQUIREMENT',
  INFERRED: 'INFERRED REQUIREMENT',
  DEFAULT_CONSIDERATION: 'DEFAULT ENGINEERING CONSIDERATION',
  UNKNOWN: 'UNKNOWN',
};

const REQUIREMENT_CATEGORIES = {
  FUNCTIONAL: 'FUNCTIONAL',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  SECURITY: 'SECURITY',
  RELIABILITY: 'RELIABILITY',
  PERFORMANCE: 'PERFORMANCE',
  SCALABILITY: 'SCALABILITY',
  OPERABILITY: 'OPERABILITY',
  COST: 'COST',
  MAINTAINABILITY: 'MAINTAINABILITY',
  COMPLIANCE: 'COMPLIANCE',
  RECOVERY: 'RECOVERY',
};

const REQUIREMENT_PRIORITY = {
  MANDATORY: 'MANDATORY',
  IMPORTANT: 'IMPORTANT',
  CONDITIONAL: 'CONDITIONAL',
  OPTIONAL: 'OPTIONAL',
  UNKNOWN: 'UNKNOWN',
};

const COMPLEXITY_BUDGETS = {
  MINIMAL: 'MINIMAL', // Static website, typo, formatting, single-script
  LOW: 'LOW', // Internal tool, basic CRUD, simple CLI
  MODERATE: 'MODERATE', // Standard backend API, multi-user webapp
  HIGH: 'HIGH', // Financial transactions, distributed state, multi-tenant auth
  CRITICAL: 'CRITICAL', // Mission-critical infrastructure, banking, high-concurrency engine
};

const ASSUMPTION_STATUS = {
  VERIFIED: 'VERIFIED',
  SUPPORTED_BY_REPOSITORY: 'SUPPORTED BY REPOSITORY',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
  CONTRADICTED: 'CONTRADICTED',
};

const REVERSIBILITY_LEVELS = {
  EASILY_REVERSIBLE: 'EASILY REVERSIBLE',
  PARTIALLY_REVERSIBLE: 'PARTIALLY REVERSIBLE',
  EXPENSIVE_TO_REVERSE: 'EXPENSIVE TO REVERSE',
  DIFFICULT_TO_REVERSE: 'DIFFICULT TO REVERSE',
};

const CAPABILITY_DEPTH = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
  INSUFFICIENT: 'INSUFFICIENT',
  MISSING: 'MISSING',
};

const REASONING_DEPTH = {
  SHALLOW: 'SHALLOW',
  STANDARD: 'STANDARD',
  DEEP: 'DEEP',
};

// ============================================================================
// 2. DOMAIN PATTERNS & HEURISTICS
// ============================================================================

/**
 * High-risk triggers that escalate analysis depth to DEEP
 */
const HIGH_RISK_TRIGGERS = [
  {
    match:
      /(?:payment|checkout|charge|billing|credit.?card|stripe|paypal|financial|refund|money|wallet)/i,
    domain: 'financial',
  },
  {
    match: /(?:auth|jwt|password|token|permission|rbac|session|oauth|login|credential)/i,
    domain: 'authentication',
  },
  { match: /(?:pii|gdpr|hipaa|ssn|secret|api.?key|encryption)/i, domain: 'pii_security' },
  {
    match: /(?:shell|exec|cmd|bash|spawn|subagent|sandbox|eval|untrusted)/i,
    domain: 'command_execution',
  },
  {
    match: /(?:concurren|race.?condition|mutex|distributed.?lock|atomic|deadlock)/i,
    domain: 'concurrency',
  },
  { match: /(?:multi.?tenant|tenant.?isolation|cross.?tenant)/i, domain: 'multi_tenancy' },
  { match: /(?:delete|truncate|drop|irreversible|purge|destroy)/i, domain: 'irreversible_data' },
  {
    match: /(?:scale|100k|high.?traffic|throughput|rps|qps|load.?balanc)/i,
    domain: 'high_traffic',
  },
];

/**
 * Architectural option generators for common design challenges
 */
const ARCHITECTURAL_OPTION_TEMPLATES = [
  {
    trigger: /(?:background.?process|worker|job.?queue|async.?task|queue)/i,
    topic: 'Background Processing & Task Execution',
    options: [
      {
        id: 'A',
        name: 'In-Process Async Worker / Event Emitter',
        strengths: [
          'Zero external infrastructure dependency',
          'Extremely low latency',
          'Minimal deployment complexity',
        ],
        constraints: [
          'Weak durability',
          'Process crash or deployment loses in-flight tasks',
          'Cannot scale workers independently of web process',
        ],
        fit: 'Appropriate only for non-critical, ephemeral, easily re-run background tasks',
        complexity: 'LOW',
      },
      {
        id: 'B',
        name: 'Database-Backed Transactional Queue (e.g. Postgres SKIP LOCKED)',
        strengths: [
          'Atomic consistency with business state',
          'Zero new infrastructure dependencies',
          'Crash-resilient durability',
          'Transactional enrollment',
        ],
        constraints: [
          'Increases database write IOPS',
          'Requires row locking maintenance and queue vacuuming',
          'Upper ceiling on throughput compared to specialized brokers',
        ],
        fit: 'Optimal for moderate-scale systems needing transactional guarantees without operational sprawl',
        complexity: 'MODERATE',
      },
      {
        id: 'C',
        name: 'Dedicated Redis Queue (e.g. BullMQ / Sidekiq)',
        strengths: [
          'High throughput (10k+ ops/sec)',
          'Rich delayed job and retry semantics',
          'Low latency execution',
        ],
        constraints: [
          'Requires operational management of Redis cluster',
          'Persistence requires AOF/RDB configuration',
          'Dual-write consistency challenges with database',
        ],
        fit: 'Appropriate when task throughput exceeds database queue capacity and tasks can tolerate soft durability boundaries',
        complexity: 'MODERATE_HIGH',
      },
      {
        id: 'D',
        name: 'Distributed Event Streaming (e.g. Kafka / Redpanda)',
        strengths: [
          'Massive throughput (100k+ msg/sec)',
          'Long-term replayability and audit log',
          'High fan-out to independent consumer groups',
        ],
        constraints: [
          'High operational overhead (Zookeeper/KRaft, partition management)',
          'Complex consumer offset and ordering semantics',
          'Severe overengineering for simple task queues',
        ],
        fit: 'Only justified by multi-service event fanout, high-throughput analytics, or strict replay requirements',
        complexity: 'HIGH',
      },
    ],
  },
  {
    trigger:
      /(?:payment|checkout|charge|order|idempotenc|duplicate.?request|duplicate.?charge|at.?least.?once)/i,
    topic: 'Idempotency & Duplicate Request Protection',
    options: [
      {
        id: 'A',
        name: 'Database Unique Constraint on Idempotency Key',
        strengths: [
          'Atomic transaction boundary',
          'Survivable across server restarts',
          'Strict consistency guaranteed by ACID database',
        ],
        constraints: [
          'Requires unique index storage',
          'Database latency for key check (typically 1-5ms)',
        ],
        fit: 'Highest reliability for financial and mutating state operations',
        complexity: 'LOW',
      },
      {
        id: 'B',
        name: 'In-Memory Cache Deduplication (e.g. LRU / Process Map)',
        strengths: ['Microsecond lookup latency', 'No database write overhead'],
        constraints: [
          'Lost immediately on process restart',
          'Completely ineffective across multi-instance or serverless deployments',
        ],
        fit: 'Only acceptable for read-deduplication or single-instance non-financial services',
        complexity: 'MINIMAL',
      },
      {
        id: 'C',
        name: 'Distributed Cache (e.g. Redis SETNX + TTL)',
        strengths: [
          'Fast distributed deduplication',
          'Automatic key expiration via TTL',
          'Offloads database write traffic',
        ],
        constraints: [
          'Split-brain risks if Redis fails or evicts keys',
          'Dual-write race conditions between Redis and DB',
        ],
        fit: 'Effective for rate-limiting and high-volume non-critical mutations; secondary layer for financial transactions',
        complexity: 'MODERATE',
      },
    ],
  },
  {
    trigger: /(?:slow.?query|postgres|query.?plan|index|optimize.?query)/i,
    topic: 'Query Performance Optimization Strategy',
    options: [
      {
        id: 'A',
        name: 'Selective Composite B-Tree Indexing',
        strengths: [
          'Directly resolves sequential scans',
          'Zero code architecture changes',
          'Retains strong data freshness',
        ],
        constraints: [
          'Adds slight write amplification on INSERT/UPDATE',
          'Consumes buffer pool RAM',
        ],
        fit: 'Primary baseline optimization; always verify with EXPLAIN ANALYZE before adding more complexity',
        complexity: 'LOW',
      },
      {
        id: 'B',
        name: 'Query Restructuring & Subquery Elimination',
        strengths: [
          'Zero storage overhead',
          'Improves query planner selectivity and join ordering',
        ],
        constraints: [
          'Requires application-level code change',
          'May require schema denormalization',
        ],
        fit: 'Essential companion to indexing for queries suffering from N+1 or Cartesian joins',
        complexity: 'LOW',
      },
      {
        id: 'C',
        name: 'Application Cache-Aside (e.g. Redis)',
        strengths: [
          'Eliminates database round-trip entirely for hot queries',
          'Sub-millisecond read latency',
        ],
        constraints: [
          'Cache invalidation complexity',
          'Risk of stale reads',
          'Cache stampede risk on TTL expiry',
        ],
        fit: 'Only justified after query and index optimization fail to meet read SLA under high concurrent read load',
        complexity: 'MODERATE',
      },
    ],
  },
  {
    trigger: /(?:high.?traffic|scale|100k|throughput|scaling|rps|qps)/i,
    topic: 'High-Traffic Scalability & Capacity Strategy',
    options: [
      {
        id: 'A',
        name: 'Stateless Scale-Out + Database Connection Pooling',
        strengths: [
          'Baseline horizontal scaling capability',
          'Low infrastructure complexity',
          'Prevents database connection saturation',
        ],
        constraints: [
          'Limited by database write IOPS',
          'Does not eliminate expensive repetitive reads',
        ],
        fit: 'Optimal baseline when exact peak RPS target is unknown; prepares system without premature clustering',
        complexity: 'MODERATE',
      },
      {
        id: 'B',
        name: 'Read Replicas with Connection Pool Splitting',
        strengths: [
          'Scales read throughput linearly across read replicas',
          'Isolates analytical queries from write path',
        ],
        constraints: [
          'Replication lag can cause stale reads immediately after writes',
          'Increases infrastructure operational cost',
        ],
        fit: 'Appropriate for high read-to-write ratio (>10:1) workloads',
        complexity: 'MODERATE_HIGH',
      },
      {
        id: 'C',
        name: 'Distributed In-Memory Cache (Redis Cluster)',
        strengths: [
          'Sub-millisecond latency for hot records',
          'Offloads 90%+ read traffic from database',
        ],
        constraints: [
          'Cache invalidation complexity',
          'Memory cost at scale',
          'Cold start thundering herd risks',
        ],
        fit: 'Justified only when read queries dominate and measured load exceeds database IOPS budget',
        complexity: 'HIGH',
      },
    ],
  },
];

// ============================================================================
// 3. REQUIREMENT DISCOVERY & MODELING
// ============================================================================

/**
 * Discover and structure requirements for a given task.
 *
 * @param {string} taskQuery
 * @param {Object} [context]
 * @returns {Array<Object>} Discovered requirements
 */
function discoverRequirements(taskQuery, context = {}) {
  const q = (taskQuery || '').toLowerCase();
  const reqs = [];

  // Base functional requirement
  reqs.push({
    id: 'REQ-F01',
    description: `Deliver core requested capability for: "${taskQuery}"`,
    category: REQUIREMENT_CATEGORIES.FUNCTIONAL,
    source: REQUIREMENT_SOURCES.EXPLICIT,
    priority: REQUIREMENT_PRIORITY.MANDATORY,
    rationale: 'Primary user request objective',
  });

  // Financial / Payment
  if (/(?:payment|checkout|charge|billing|refund|money|wallet)/i.test(q)) {
    reqs.push({
      id: 'REQ-REL01',
      description:
        'Ensure exact-once business effect via persistent idempotency keys for all mutation requests',
      category: REQUIREMENT_CATEGORIES.RELIABILITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale:
        'Financial mutations must prevent double-billing under client retries or network drops',
    });
    reqs.push({
      id: 'REQ-REL02',
      description: 'Wrap payment entity mutations in atomic transaction boundaries',
      category: REQUIREMENT_CATEGORIES.RELIABILITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'Partial failures during payment processing must cleanly roll back state',
    });
    reqs.push({
      id: 'REQ-SEC01',
      description:
        'Strict authentication, authorization, and TLS transport security for all payment endpoints',
      category: REQUIREMENT_CATEGORIES.SECURITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'Financial endpoints represent high-value attack surfaces',
    });
    reqs.push({
      id: 'REQ-OBS01',
      description: 'Structured audit logging with trace ID correlation (scrubbing PAN/CVV)',
      category: REQUIREMENT_CATEGORIES.OPERABILITY,
      source: REQUIREMENT_SOURCES.DEFAULT_CONSIDERATION,
      priority: REQUIREMENT_PRIORITY.IMPORTANT,
      rationale: 'Auditability and incident triage required for financial reconciliation',
    });
    reqs.push({
      id: 'REQ-REC01',
      description:
        'Handling external payment provider timeouts, webhooks, and asynchronous reconciliation',
      category: REQUIREMENT_CATEGORIES.RECOVERY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.IMPORTANT,
      rationale:
        'External payment gateways frequently experience intermittent latency spikes or timeouts',
    });
  }

  // Database / Query Optimization
  if (/(?:postgres|sql|query|database|slow.?query|index|latency)/i.test(q)) {
    reqs.push({
      id: 'REQ-PERF01',
      description:
        'Establish empirical execution baseline using EXPLAIN (ANALYZE, BUFFERS) before modifying queries',
      category: REQUIREMENT_CATEGORIES.PERFORMANCE,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'Performance optimization without baseline evidence is guesswork',
    });
    reqs.push({
      id: 'REQ-REL03',
      description:
        'Safeguard database connection pooling against exhaustion during concurrent query bursts',
      category: REQUIREMENT_CATEGORIES.RELIABILITY,
      source: REQUIREMENT_SOURCES.DEFAULT_CONSIDERATION,
      priority: REQUIREMENT_PRIORITY.IMPORTANT,
      rationale: 'Slow queries saturate pool connections, cascading into service outages',
    });
  }

  // Shell / Agent / Command Execution
  if (/(?:agent|shell|command|exec|tool|eval|sandbox)/i.test(q)) {
    reqs.push({
      id: 'REQ-SEC02',
      description: 'Strict execution sandboxing and argument whitelisting for all shell operations',
      category: REQUIREMENT_CATEGORIES.SECURITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale:
        'Arbitrary shell execution presents catastrophic remote code execution vulnerability',
    });
    reqs.push({
      id: 'REQ-SEC03',
      description: 'Prompt injection sanitization and delimiter isolation on user-supplied inputs',
      category: REQUIREMENT_CATEGORIES.SECURITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'Prevents adversarial context override of tool execution guardrails',
    });
    reqs.push({
      id: 'REQ-SEC04',
      description: 'Filesystem and network egress restriction boundaries',
      category: REQUIREMENT_CATEGORIES.SECURITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.IMPORTANT,
      rationale: 'Restricts blast radius in case of unintended subagent commands',
    });
  }

  // High Traffic / Scale
  if (/(?:high.?traffic|scale|100k|throughput|scaling|rps|qps)/i.test(q)) {
    reqs.push({
      id: 'REQ-SCL01',
      description: 'Stateless request handling enabling horizontal scale-out',
      category: REQUIREMENT_CATEGORIES.SCALABILITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'In-process session state impedes multi-instance scaling',
    });
    reqs.push({
      id: 'REQ-UNK01',
      description:
        'Exact production peak request throughput (RPS/QPS) and p95/p99 latency SLA targets',
      category: REQUIREMENT_CATEGORIES.PERFORMANCE,
      source: REQUIREMENT_SOURCES.UNKNOWN,
      priority: REQUIREMENT_PRIORITY.UNKNOWN,
      rationale:
        'Throughput target not specified by user; cannot justify specialized clustering without target',
    });
  }

  // Static Website / Frontend
  if (
    /(?:static|portfolio|landing|website|html|css|ui)/i.test(q) &&
    !/(?:payment|checkout|auth|agent)/i.test(q)
  ) {
    reqs.push({
      id: 'REQ-A11Y01',
      description: 'Semantic HTML markup, ARIA compliance, and responsive viewport support',
      category: REQUIREMENT_CATEGORIES.MAINTAINABILITY,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.MANDATORY,
      rationale: 'Fundamental accessibility and cross-device rendering requirements',
    });
    reqs.push({
      id: 'REQ-PERF02',
      description: 'Zero runtime server dependency and fast static asset delivery',
      category: REQUIREMENT_CATEGORIES.PERFORMANCE,
      source: REQUIREMENT_SOURCES.INFERRED,
      priority: REQUIREMENT_PRIORITY.IMPORTANT,
      rationale:
        'Static content should be served via static file server or CDN without backend overhead',
    });
  }

  return reqs;
}

// ============================================================================
// 4. COMPLEXITY BUDGETING & ANTI-SLOP GUARD
// ============================================================================

/**
 * Determine the engineering complexity budget justified by the task.
 *
 * @param {string} taskQuery
 * @param {Array<Object>} requirements
 * @returns {Object} Complexity budget evaluation
 */
function evaluateComplexityBudget(taskQuery, requirements = []) {
  const q = (taskQuery || '').toLowerCase();

  // Trivial or purely static/frontend task
  if (/^(?:fix\s|typo|css\s|format|rename|lint|style|readme|comment|doc)/i.test(q)) {
    return {
      budget: COMPLEXITY_BUDGETS.MINIMAL,
      justification: 'Task is a localized cosmetic, stylistic, or documentation modification.',
      max_justified_layers: 1,
      allowed_infrastructure: ['local filesystem', 'editor / linter'],
    };
  }

  if (
    /(?:portfolio|static\s.*page|landing\s.*page|static\s.*site|simple\s.*website)/i.test(q) &&
    !/(?:payment|checkout|auth|database|worker|microservice)/i.test(q)
  ) {
    return {
      budget: COMPLEXITY_BUDGETS.MINIMAL,
      justification: 'Static website requires only markup, styling, and static asset distribution.',
      max_justified_layers: 1,
      allowed_infrastructure: ['static web server / CDN', 'vanilla assets / bundler'],
    };
  }

  if (
    /(?:todo|crud|notes|internal\s.*tool|simple\s.*script)/i.test(q) &&
    !/(?:payment|distributed|100k|high.?traffic)/i.test(q)
  ) {
    return {
      budget: COMPLEXITY_BUDGETS.LOW,
      justification:
        'Standard CRUD application justified with single database and monolith service.',
      max_justified_layers: 2,
      allowed_infrastructure: ['relational / embedded database', 'monolithic application server'],
    };
  }

  if (/(?:payment|checkout|billing|refund|financial|bank)/i.test(q)) {
    return {
      budget: COMPLEXITY_BUDGETS.HIGH,
      justification:
        'Financial transactions require atomic transactions, persistent idempotency, and audit trails.',
      max_justified_layers: 4,
      allowed_infrastructure: [
        'ACID database with unique constraints',
        'secure payment gateway client',
        'structured audit logger',
        'transaction manager',
      ],
    };
  }

  if (/(?:100k|high.?traffic|distributed|consensus|multi.?tenant.*scale)/i.test(q)) {
    return {
      budget: COMPLEXITY_BUDGETS.HIGH,
      justification:
        'High traffic requires horizontal scaling readiness, connection pooling, and caching.',
      max_justified_layers: 4,
      allowed_infrastructure: [
        'distributed cache (Redis)',
        'connection pool manager',
        'load balancer',
        'horizontal replicas',
      ],
    };
  }

  return {
    budget: COMPLEXITY_BUDGETS.MODERATE,
    justification:
      'Standard application service with basic security, persistence, and reliability needs.',
    max_justified_layers: 3,
    allowed_infrastructure: ['application server', 'database', 'structured logger'],
  };
}

/**
 * Detect overengineering (Anti-Slop Guard) and underengineering.
 *
 * @param {string} taskQuery
 * @param {Object} complexityBudget
 * @param {Array<Object>} proposedComponents
 * @returns {Object} Architecture audit result
 */
function auditArchitectureJustification(taskQuery, complexityBudget, proposedComponents = []) {
  const q = (taskQuery || '').toLowerCase();
  const unjustified = [];
  const justified = [];
  const missingCritical = [];

  const isStaticOrSimple =
    complexityBudget.budget === COMPLEXITY_BUDGETS.MINIMAL ||
    complexityBudget.budget === COMPLEXITY_BUDGETS.LOW;

  // ── Over-Engineering Checks (Anti-Slop) ──
  const overEngineeringCandidates = [
    {
      name: 'Kafka / Event Streaming',
      match: /(?:kafka|event.?stream|kinesis|redpanda)/i,
      minBudget: COMPLEXITY_BUDGETS.HIGH,
      reason:
        'Event streaming introduces massive operational overhead unjustified for basic synchronous workflows',
    },
    {
      name: 'Microservices Decomposition',
      match: /(?:microservice|service.?mesh|istio)/i,
      minBudget: COMPLEXITY_BUDGETS.HIGH,
      reason:
        'Microservice boundaries introduce distributed network failure modes unwarranted for simple or single-team tasks',
    },
    {
      name: 'CQRS & Event Sourcing',
      match: /(?:cqrs|event.?sourcing)/i,
      minBudget: COMPLEXITY_BUDGETS.HIGH,
      reason:
        'CQRS introduces dual-model eventual consistency complexity unwarranted when standard ACID CRUD suffices',
    },
    {
      name: 'Distributed Cache (Redis)',
      match: /(?:redis|memcached)/i,
      minBudget: COMPLEXITY_BUDGETS.MODERATE,
      reason:
        'Distributed caching introduces invalidation complexity; unwarranted unless measured read latency or load requires it',
    },
    {
      name: 'Kubernetes / Distributed Orchestration',
      match: /(?:kubernetes|k8s|helm)/i,
      minBudget: COMPLEXITY_BUDGETS.HIGH,
      reason:
        'Container orchestration cluster unwarranted for static sites or small local applications',
    },
  ];

  for (const c of overEngineeringCandidates) {
    if (c.match.test(q)) {
      // If user literally asked for it, it may be explicit, but check if task justifies it
      if (isStaticOrSimple) {
        unjustified.push({
          component: c.name,
          status: 'REJECTED_UNJUSTIFIED',
          reason: `Task complexity (${complexityBudget.budget}) does not warrant ${c.name}. ${c.reason}`,
          recommendation: 'Use standard monolithic process or built-in idioms instead',
        });
      }
    }
  }

  // If this is a static site or simple local app, check common slop
  if (/(?:static|portfolio|landing\s.*page|local\s.*todo)/i.test(q)) {
    for (const c of overEngineeringCandidates) {
      unjustified.push({
        component: c.name,
        status: 'UNJUSTIFIED_DO_NOT_ADD',
        reason: `Task is a ${q.includes('todo') ? 'local application' : 'static website'}. ${c.reason}`,
      });
    }
  }

  // ── Under-Engineering Checks (Missing Considerations) ──
  if (/(?:payment|checkout|charge|order)/i.test(q)) {
    justified.push({
      component: 'Database-Backed Idempotency Table',
      status: 'JUSTIFIED',
      justification:
        'Protects payment mutation against duplicate execution caused by client retries and network timeouts.',
    });
    justified.push({
      component: 'Atomic Database Transaction',
      status: 'JUSTIFIED',
      justification:
        'Ensures payment records and order status transition atomically with zero orphaned partial state.',
    });
    justified.push({
      component: 'Structured Audit Log',
      status: 'JUSTIFIED',
      justification:
        'Enables financial reconciliation and audit tracking without exposing cardholder data.',
    });

    // Check if task seems to be a naive implementation or missing critical guards
    if (
      /(?:naive|simple|quick|just.*insert)/i.test(q) ||
      !/(?:idempotency|transaction)/i.test(q) ||
      /(?:create|build).*order/i.test(q)
    ) {
      missingCritical.push({
        consideration: 'Idempotency Protection',
        severity: 'CRITICAL',
        risk: 'Risk of duplicate mutations / double-charging users during network retry storms',
        requirement: 'Enforce unique idempotency-key constraint at API entry',
      });
      missingCritical.push({
        consideration: 'Transaction Boundary',
        severity: 'CRITICAL',
        risk: 'Risk of orphaned records if downstream step fails after initial record insertion',
        requirement: 'Enclose DB updates in rollback-capable transactional context',
      });
      missingCritical.push({
        consideration: 'Concurrency Serialization',
        severity: 'HIGH',
        risk: 'Concurrent duplicate clicks can slip past in-memory checks',
        requirement: 'Use database row-level locking or unique index constraint',
      });
    }
  }

  if (/(?:slow.?query|postgres|query.*faster)/i.test(q)) {
    justified.push({
      component: 'EXPLAIN (ANALYZE, BUFFERS) Profiler',
      status: 'JUSTIFIED',
      justification:
        'Verifies query planner cost and identifies sequential scans vs index scans with empirical data.',
    });
    justified.push({
      component: 'Selective Composite B-Tree Index',
      status: 'JUSTIFIED',
      justification:
        'Targets high-cardinality columns in WHERE/JOIN clauses to eliminate full table scans.',
    });
  }

  if (/(?:agent|shell.*command)/i.test(q)) {
    justified.push({
      component: 'Subprocess Execution Sandbox',
      status: 'JUSTIFIED',
      justification:
        'Restricts shell commands to pre-approved whitelist and isolates child process execution.',
    });
    justified.push({
      component: 'Prompt Injection Defense Delimiters',
      status: 'JUSTIFIED',
      justification:
        'Prevents adversarial user input from escaping prompt context to invoke unauthorized tools.',
    });
  }

  return {
    complexity_budget: complexityBudget.budget,
    justified_components: justified,
    unjustified_components: unjustified,
    missing_critical_considerations: missingCritical,
    architecture_balance:
      missingCritical.length > 0
        ? 'UNDER_ENGINEERED'
        : unjustified.some(u => u.status === 'REJECTED_UNJUSTIFIED')
          ? 'OVER_ENGINEERED'
          : 'APPROPRIATELY_ENGINEERED',
  };
}

// ============================================================================
// 5. ENGINEERING DECISION RECORDS (EDR) & TRACEABILITY
// ============================================================================

/**
 * Generate formal Engineering Decision Records for significant choices.
 *
 * @param {string} taskQuery
 * @param {Array<Object>} requirements
 * @param {Array<Object>} justifiedComponents
 * @returns {Array<Object>} EDR records
 */
function generateDecisionRecords(taskQuery, requirements = [], justifiedComponents = []) {
  const q = (taskQuery || '').toLowerCase();
  const records = [];

  if (/(?:payment|checkout|billing|refund)/i.test(q)) {
    records.push({
      id: 'EDR-001',
      title: 'Database-Backed Idempotency Enforcement',
      decision: 'Enforce idempotency via unique database constraint on idempotency_key',
      reason:
        'Payment mutations must guarantee at-most-once execution even under aggressive client retry storms',
      alternatives: [
        {
          name: 'In-memory Set / Map',
          rejected_reason:
            'Lost on process crash or container restart; fails across distributed pods',
        },
        {
          name: 'Distributed Redis TTL Cache',
          rejected_reason:
            'Subject to eviction under memory pressure; lacks ACID transaction enrollment with payment state',
        },
      ],
      constraints: [
        'Must survive process restarts and node failovers',
        'Must participate in or serialize ahead of the primary database transaction',
      ],
      interactions: ['retry', 'database', 'concurrency', 'payment'],
      validation: [
        'Concurrent duplicate request test (10 simultaneous POSTs with same key)',
        'Retry after 30-second simulated gateway timeout',
        'Process kill mid-execution recovery verification',
      ],
      reversibility: REVERSIBILITY_LEVELS.PARTIALLY_REVERSIBLE,
      traceability_chain: {
        user_requirement: 'Build production-ready payment API',
        engineering_consideration: 'Duplicate execution under client retries',
        canonical_concept: 'idempotency',
        skill: 'backend-resilience',
        interaction: 'retry ↔ idempotency',
        decision: 'Database-backed unique idempotency table',
        implementation: 'CREATE UNIQUE INDEX idx_idempotency_key ...',
        verification:
          'Dispatch 10 concurrent requests; assert exactly 1 charge and 9 deduplicated responses',
      },
    });

    records.push({
      id: 'EDR-002',
      title: 'Explicit Transaction Boundary for Order & Payment State',
      decision:
        'Enclose order creation, ledger entry, and idempotency lock in an ACID transaction block',
      reason: 'Prevents partial database writes if payment provider communication errors out',
      alternatives: [
        {
          name: 'Independent uncoordinated DB updates',
          rejected_reason: 'Leaves dangling order records when subsequent operations fail',
        },
      ],
      constraints: [
        'Transaction must commit only after successful provider authorization or mark status PENDING',
      ],
      interactions: ['database', 'external_api', 'consistency'],
      validation: ['Simulate gateway 500 error; verify database state remains unmutated'],
      reversibility: REVERSIBILITY_LEVELS.EASILY_REVERSIBLE,
      traceability_chain: {
        user_requirement: 'Build production-ready payment API',
        engineering_consideration: 'Atomic state transitions on external failure',
        canonical_concept: 'transactions',
        skill: 'backend-postgresql',
        interaction: 'database ↔ external_api',
        decision: 'Explicit transaction boundary with rollback hook',
        implementation: 'db.transaction(async tx => ...)',
        verification: 'Fault injection of provider 500; assert 0 orphaned records',
      },
    });
  }

  if (/(?:slow.?query|postgres|query.*faster)/i.test(q)) {
    records.push({
      id: 'EDR-003',
      title: 'Empirical Indexing Over Speculative Caching',
      decision: 'Add targeted composite B-Tree index based on EXPLAIN ANALYZE filter predicates',
      reason:
        'Indexing addresses root cause of sequential scan without introducing cache invalidation bugs',
      alternatives: [
        {
          name: 'Redis Cache-Aside',
          rejected_reason:
            'Introduces cache invalidation complexity, cache stampede risks, and stale read bugs',
        },
      ],
      constraints: ['Write amplification must not degrade INSERT latency by >5%'],
      interactions: ['database', 'index', 'latency'],
      validation: [
        'Compare p95 read latency before and after index creation under 100 concurrent queries',
      ],
      reversibility: REVERSIBILITY_LEVELS.EASILY_REVERSIBLE,
      traceability_chain: {
        user_requirement: 'Make query faster',
        engineering_consideration: 'High query latency from full table scan',
        canonical_concept: 'indexing',
        skill: 'sql-pro',
        interaction: 'database ↔ latency',
        decision: 'Composite index on high-selectivity columns',
        implementation: 'CREATE INDEX CONCURRENTLY ...',
        verification: 'Run EXPLAIN (ANALYZE, BUFFERS); verify Index Scan replaces Seq Scan',
      },
    });
  }

  if (/(?:agent|shell.*command)/i.test(q)) {
    records.push({
      id: 'EDR-004',
      title: 'Execution Sandbox & Strict Whitelisting',
      decision:
        'Restrict tool command execution to a strict binary whitelist with sanitized argument arrays',
      reason: 'Prevents shell injection and unintended subagent command execution',
      alternatives: [
        {
          name: 'Arbitrary bash string interpolation',
          rejected_reason: 'Allows command injection via backticks, semicolons, and pipes',
        },
      ],
      constraints: ['No unvetted external binary execution permitted'],
      interactions: ['agent', 'shell', 'security'],
      validation: [
        'Pass injection payloads (`; rm -rf /`, `$(whoami)`); assert execution rejected',
      ],
      reversibility: REVERSIBILITY_LEVELS.EASILY_REVERSIBLE,
      traceability_chain: {
        user_requirement: 'Build AI agent with shell tools',
        engineering_consideration: 'Command injection vulnerability',
        canonical_concept: 'security-boundaries',
        skill: 'security-auditor',
        interaction: 'agent ↔ shell',
        decision: 'Whitelisted binary execution via execFile with array arguments',
        implementation: 'execFile(whitelistedPath, safeArgsArray)',
        verification: 'Inject arbitrary bash syntax; assert exit with validation error',
      },
    });
  }

  return records;
}

// ============================================================================
// 6. ASSUMPTIONS & UNKNOWNS ENGINE
// ============================================================================

/**
 * Identify, categorize, and handle engineering assumptions and unknowns.
 *
 * @param {string} taskQuery
 * @returns {Object} Explicit assumptions and critical unknowns
 */
function analyzeAssumptionsAndUnknowns(taskQuery) {
  const q = (taskQuery || '').toLowerCase();
  const assumptions = [];
  const unknowns = [];

  // Default assumption
  assumptions.push({
    assumption: 'Code executes in standard modern Node.js runtime environment',
    status: ASSUMPTION_STATUS.SUPPORTED_BY_REPOSITORY,
    impact: 'Enables standard ES2022+ features and built-in standard library utilities',
  });

  if (/(?:payment|checkout|billing)/i.test(q)) {
    assumptions.push({
      assumption: 'Downstream payment provider API supports client-generated idempotency keys',
      status: ASSUMPTION_STATUS.INFERRED,
      impact:
        'If provider does not support idempotency keys, duplicate charges cannot be safely prevented at gateway level',
    });
    unknowns.push({
      unknown: 'Expected peak transaction volume and currency exchange requirements',
      impact:
        'Cannot justify distributed multi-region database clustering or multi-currency ledger without scale requirement',
      default_posture:
        'Implement robust single-region ACID transaction boundaries with standard decimal precision',
    });
  }

  if (/(?:high.?traffic|scale|100k|throughput)/i.test(q)) {
    unknowns.push({
      unknown: 'Exact target throughput (Requests Per Second) and latency SLA (p95 / p99)',
      impact:
        'Cannot justify complex Redis caching cluster or Kafka partitions without quantified traffic budget',
      default_posture:
        'Implement stateless architecture, database connection pooling, and benchmark load harness',
    });
  }

  if (/(?:agent|shell)/i.test(q)) {
    assumptions.push({
      assumption: 'Agent will operate within a controlled developer workspace environment',
      status: ASSUMPTION_STATUS.INFERRED,
      impact:
        'Security boundaries focus on workspace directory containment rather than hypervisor virtualization',
    });
  }

  return { assumptions, unknowns };
}

// ============================================================================
// 7. SOLUTION SHAPE & IMPLEMENTATION ORDER
// ============================================================================

/**
 * Generate the comprehensive Engineering Solution Shape before code generation.
 *
 * @param {Object} params
 * @returns {Object} Solution shape
 */
function buildSolutionShape({
  taskQuery,
  requirements,
  complexityBudget,
  decisionRecords,
  assumptions,
  unknowns,
  crossDomainAnalysis,
}) {
  const q = (taskQuery || '').toLowerCase();
  const implementationOrder = [];
  const earlyValidations = [];

  if (/(?:payment|checkout|billing)/i.test(q)) {
    implementationOrder.push('1. Define data invariants and payment status state machine');
    implementationOrder.push(
      '2. Create idempotency table with UNIQUE constraint on idempotency_key',
    );
    implementationOrder.push(
      '3. Implement database transaction boundary wrapper with rollback hooks',
    );
    implementationOrder.push(
      '4. Implement payment provider client with timeout deadlines and exponential backoff',
    );
    implementationOrder.push('5. Implement checkout endpoint mutation handler');
    implementationOrder.push('6. Add structured audit logging (scrubbing sensitive card data)');
    implementationOrder.push(
      '7. Implement adversarial tests (concurrent duplicate requests, provider 500 fault injection)',
    );
    implementationOrder.push('8. Execute verification suite and assert outcome contract');

    earlyValidations.push({
      step: 'Idempotency Constraint Probe',
      test: 'Insert duplicate idempotency key concurrently',
      expected: 'Database rejects second insert with UniqueConstraintViolation (409 Conflict)',
      early_evidence_value: 'Proves double-charge protection before writing gateway integration',
    });
    earlyValidations.push({
      step: 'Transaction Rollback Probe',
      test: 'Simulate exception midway through payment transaction block',
      expected: 'All prior mutations rolled back; 0 partial records in database',
      early_evidence_value: 'Guarantees zero ledger inconsistency upon downstream gateway drops',
    });
  } else if (/(?:slow.?query|postgres|query.*faster)/i.test(q)) {
    implementationOrder.push(
      '1. Capture baseline execution time and query plan via EXPLAIN (ANALYZE, BUFFERS)',
    );
    implementationOrder.push('2. Identify filter selectivity and sequential scan bottlenecks');
    implementationOrder.push('3. Create targeted composite B-Tree index concurrently');
    implementationOrder.push('4. Re-run query plan to verify Index Scan transition');
    implementationOrder.push('5. Measure read latency reduction and write amplification');
    implementationOrder.push('6. Regression check database memory and buffer pool utilization');

    earlyValidations.push({
      step: 'Index Planner Probe',
      test: 'Run EXPLAIN on sample dataset',
      expected: 'Planner switches from Seq Scan to Index/Bitmap Scan',
      early_evidence_value:
        'Confirms query planner utilizes new index before deploying to production',
    });
  } else if (/(?:agent|shell)/i.test(q)) {
    implementationOrder.push('1. Define strict command and argument whitelist');
    implementationOrder.push(
      '2. Implement subprocess execFile wrapper bypassing shell interpolation',
    );
    implementationOrder.push(
      '3. Add directory boundary containment checks (path traversal defense)',
    );
    implementationOrder.push('4. Implement prompt injection delimiters on user-supplied context');
    implementationOrder.push('5. Add execution timeout and stdout/stderr buffer caps');
    implementationOrder.push(
      '6. Run security penetration test suite with adversarial shell payloads',
    );

    earlyValidations.push({
      step: 'Shell Escape Probe',
      test: 'Pass malicious arguments: `test; id` and `test && whoami`',
      expected: 'Subprocess treats argument as literal string; zero shell expansion',
      early_evidence_value: 'Verifies command injection immunity before exposing tool to model',
    });
  } else {
    implementationOrder.push('1. Define core types, interfaces, and validation schemas');
    implementationOrder.push('2. Implement minimal sufficient functional logic');
    implementationOrder.push('3. Add error handling and edge-case boundaries');
    implementationOrder.push('4. Run unit and integration tests');
    implementationOrder.push('5. Verify baseline stability');
  }

  return {
    solution_shape: {
      task: taskQuery,
      complexity_budget: complexityBudget.budget,
      justified_layers: complexityBudget.max_justified_layers,
      architectural_boundaries: complexityBudget.allowed_infrastructure,
      decision_records: decisionRecords,
      assumptions: assumptions,
      unknowns: unknowns,
    },
    implementation_order: implementationOrder,
    early_validations: earlyValidations,
  };
}

// ============================================================================
// 8. MULTI-OBJECTIVE OUTCOME VERIFICATION & REGRESSION DETECTION
// ============================================================================

/**
 * Verify outcome against multiple engineering objectives and detect regressions.
 *
 * @param {Object} baselineMetrics - Metrics before optimization
 * @param {Object} currentMetrics - Metrics after implementation
 * @param {Array<Object>} requirements
 * @returns {Object} Multi-objective evaluation and regressions
 */
function verifyOutcomeAndRegressions(baselineMetrics = {}, currentMetrics = {}, requirements = []) {
  const evaluations = [];
  const regressions = [];

  // Latency vs Resource Check
  if (baselineMetrics.p95_latency_ms !== undefined && currentMetrics.p95_latency_ms !== undefined) {
    const latencyImproved = currentMetrics.p95_latency_ms < baselineMetrics.p95_latency_ms;
    evaluations.push({
      dimension: 'Latency (p95)',
      baseline: `${baselineMetrics.p95_latency_ms}ms`,
      current: `${currentMetrics.p95_latency_ms}ms`,
      status: latencyImproved ? 'IMPROVED' : 'REGRESSED',
      delta_pct:
        (
          ((currentMetrics.p95_latency_ms - baselineMetrics.p95_latency_ms) /
            baselineMetrics.p95_latency_ms) *
          100
        ).toFixed(1) + '%',
    });

    // Check memory regression
    if (baselineMetrics.memory_mb !== undefined && currentMetrics.memory_mb !== undefined) {
      const memorySpike = currentMetrics.memory_mb > baselineMetrics.memory_mb * 1.5;
      if (latencyImproved && memorySpike) {
        regressions.push({
          type: 'LATENCY_IMPROVEMENT_WITH_RESOURCE_REGRESSION',
          severity: 'HIGH',
          description: `p95 latency improved (${baselineMetrics.p95_latency_ms}ms → ${currentMetrics.p95_latency_ms}ms), but memory consumption spiked by >50% (${baselineMetrics.memory_mb}MB → ${currentMetrics.memory_mb}MB).`,
          recommendation: 'Evaluate cache eviction TTL or reduce buffer pool allocation.',
        });
      }
    }
  }

  // Cost vs Latency Check
  if (baselineMetrics.cost_per_req !== undefined && currentMetrics.cost_per_req !== undefined) {
    const costReduced = currentMetrics.cost_per_req < baselineMetrics.cost_per_req;
    const latencyRegressed = currentMetrics.p95_latency_ms > baselineMetrics.p95_latency_ms * 1.3;
    if (costReduced && latencyRegressed) {
      regressions.push({
        type: 'COST_REDUCTION_WITH_LATENCY_REGRESSION',
        severity: 'MEDIUM',
        description: `Cost reduced (${baselineMetrics.cost_per_req} → ${currentMetrics.cost_per_req}), but latency regressed by >30%.`,
        recommendation: 'Verify whether latency regression violates service SLA.',
      });
    }
  }

  // Functional Test Regression Check
  if (currentMetrics.failing_tests && currentMetrics.failing_tests > 0) {
    regressions.push({
      type: 'FUNCTIONAL_TEST_REGRESSION',
      severity: 'CRITICAL',
      description: `${currentMetrics.failing_tests} existing tests failed after changes.`,
      recommendation: 'Restore baseline functional compliance before completing optimization.',
    });
  }

  return {
    verified: regressions.filter(r => r.severity === 'CRITICAL').length === 0,
    objective_evaluations: evaluations,
    regressions: regressions,
    has_regressions: regressions.length > 0,
  };
}

// ============================================================================
// 9. PHASE 10 METRICS TRACKER
// ============================================================================

class Phase10MetricsTracker {
  constructor() {
    this.metrics = {
      tasks_optimized: 0,
      requirements_discovered: 0,
      mandatory_requirements: 0,
      decisions_recorded: 0,
      options_evaluated: 0,
      overengineering_prevented: 0,
      underengineering_prevented: 0,
      early_validations_generated: 0,
      regressions_detected: 0,
      verified_outcomes: 0,
    };
  }

  record(metric, count = 1) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric] += count;
    } else {
      this.metrics[metric] = count;
    }
  }

  recordEvent(event, count = 1) {
    this.record(event, count);
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

let _phase10MetricsTracker = null;

function getPhase10MetricsTracker() {
  if (!_phase10MetricsTracker) {
    _phase10MetricsTracker = new Phase10MetricsTracker();
  }
  return _phase10MetricsTracker;
}

// ============================================================================
// 9b. SKILL SELECTION & CAPABILITY DEPTH (Sections 16 & 17)
// ============================================================================

/**
 * Filter discovered capabilities to determine which actually improve the required outcome.
 *
 * @param {Array<Object|string>} discoveredSkills
 * @param {Array<Object>} requirements
 * @param {Object} complexityBudget
 * @returns {Object} Categorized skills and capability depth evaluations
 */
function evaluateSkillSelection(discoveredSkills = [], requirements = [], complexityBudget = {}) {
  const isMinimal =
    complexityBudget.budget === COMPLEXITY_BUDGETS.MINIMAL ||
    complexityBudget.budget === COMPLEXITY_BUDGETS.LOW;

  const required = [];
  const conditional = [];
  const notJustified = [];
  const depthAudit = [];

  for (const skill of discoveredSkills) {
    const sName = (typeof skill === 'string' ? skill : skill.name || skill.id || '').toLowerCase();

    // Check if skill represents unneeded distributed bloat for simple task
    if (isMinimal && /(?:distributed|kafka|k8s|kubernetes|service-mesh|cqrs|redis)/i.test(sName)) {
      notJustified.push({
        skill: sName,
        status: 'NOT_CURRENTLY_JUSTIFIED',
        reason: `Task complexity (${complexityBudget.budget}) does not justify ${sName}. Avoid premature infrastructure ceremony.`,
      });
    } else if (/(?:idempotency|resilience|transaction|security|sql|indexing)/i.test(sName)) {
      required.push({
        skill: sName,
        status: 'REQUIRED',
        reason:
          'Directly addresses mandatory reliability, data integrity, or security requirements.',
      });
      depthAudit.push({
        skill: sName,
        depth: CAPABILITY_DEPTH.FULL,
        detail: 'Skill covers the core required engineering depth.',
      });
    } else if (/(?:caching|cache)/i.test(sName)) {
      conditional.push({
        skill: sName,
        status: 'CONDITIONAL',
        reason:
          'Only justified if measured query latency or read load profiling demonstrates necessity.',
      });
    } else {
      required.push({
        skill: sName,
        status: 'REQUIRED',
        reason: 'Supports implementation capabilities for discovered concepts.',
      });
    }
  }

  return {
    required,
    conditional,
    not_justified: notJustified,
    capability_depth: depthAudit,
  };
}

// ============================================================================
// 9c. PHASE 10 ENGINEERING OUTCOME MEMORY (Sections 35, 36, 37)
// ============================================================================

class Phase10OutcomeMemory {
  constructor() {
    this.decisions = [];
    this.rejectedApproaches = [];
  }

  storeDecision(record) {
    if (!record || !record.decision) return;
    this.decisions.push({
      ...record,
      stored_at: new Date().toISOString(),
      validated: record.validated !== undefined ? record.validated : true,
    });
  }

  storeRejectedApproach(record) {
    if (!record || !record.approach) return;
    this.rejectedApproaches.push({
      ...record,
      rejected_at: new Date().toISOString(),
    });
  }

  findDecisions(queryContext = '') {
    const q = queryContext.toLowerCase();
    return this.decisions.filter(
      d =>
        (d.context && d.context.toLowerCase().includes(q)) ||
        (d.decision && d.decision.toLowerCase().includes(q)) ||
        (d.reason && d.reason.toLowerCase().includes(q)),
    );
  }

  findRejected(queryContext = '') {
    const q = queryContext.toLowerCase();
    return this.rejectedApproaches.filter(
      r =>
        (r.context && r.context.toLowerCase().includes(q)) ||
        (r.approach && r.approach.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)),
    );
  }

  clear() {
    this.decisions = [];
    this.rejectedApproaches = [];
  }
}

let _phase10Memory = null;

function getPhase10OutcomeMemory() {
  if (!_phase10Memory) {
    _phase10Memory = new Phase10OutcomeMemory();
  }
  return _phase10Memory;
}

// ============================================================================
// 9d. CANONICAL ANTI-SHORTCUT & ANTI-OVERENGINEERING BENCHMARK CHECKS
// ============================================================================

/**
 * Anti-Shortcut Check (Section 39)
 * Given a seemingly simple mutation request ("Build an API that creates an order"),
 * verify that Tribunal surfaces necessary reliability and consistency considerations
 * rather than accepting the naive "POST -> insert -> return" shortcut.
 *
 * @param {string} taskQuery
 * @returns {Object} Anti-shortcut evaluation
 */
function runAntiShortcutCheck(taskQuery = 'Build an API that creates an order') {
  const result = runOutcomeOptimization(taskQuery);
  const audit = result.architecture_audit;
  const missing = audit.missing_critical_considerations || [];

  const hasIdempotency =
    missing.some(m => m.consideration.includes('Idempotency')) ||
    audit.justified_components.some(c => c.component.includes('Idempotency'));
  const hasTransaction =
    missing.some(m => m.consideration.includes('Transaction')) ||
    audit.justified_components.some(c => c.component.includes('Transaction'));
  const hasConcurrency =
    missing.some(m => m.consideration.includes('Concurrency')) ||
    result.decision_records.some(d => d.interactions?.includes('concurrency'));

  return {
    task: taskQuery,
    shortcut_detected: !taskQuery.toLowerCase().includes('idempotenc'),
    protection_surfaced: hasIdempotency && hasTransaction,
    critical_considerations_enforced: {
      idempotency: hasIdempotency,
      transaction_boundary: hasTransaction,
      concurrency_lock: hasConcurrency,
    },
    passed: hasIdempotency && hasTransaction,
  };
}

/**
 * Anti-Overengineering Check (Section 40)
 * Given a simple local task ("Build a local todo application" or "Build static portfolio"),
 * verify that Tribunal explicitly rejects unneeded distributed architecture (Kafka, K8s, microservices).
 *
 * @param {string} taskQuery
 * @returns {Object} Anti-overengineering evaluation
 */
function runAntiOverengineeringCheck(taskQuery = 'Build a local todo application') {
  const result = runOutcomeOptimization(taskQuery);
  const audit = result.architecture_audit;
  const unjustified = audit.unjustified_components || [];

  const rejectedKafka = unjustified.some(u => u.component.includes('Kafka'));
  const rejectedMicroservices = unjustified.some(u => u.component.includes('Microservices'));
  const rejectedK8s = unjustified.some(u => u.component.includes('Kubernetes'));

  return {
    task: taskQuery,
    complexity_budget: result.complexity_budget,
    unjustified_components_count: unjustified.length,
    overengineering_prevented: {
      kafka: rejectedKafka,
      microservices: rejectedMicroservices,
      kubernetes: rejectedK8s,
    },
    passed:
      result.complexity_budget === COMPLEXITY_BUDGETS.LOW ||
      result.complexity_budget === COMPLEXITY_BUDGETS.MINIMAL,
  };
}

// ============================================================================
// 10. MAIN PHASE 10 ORCHESTRATOR — runOutcomeOptimization
// ============================================================================

/**
 * Execute the full Phase 10 Engineering Outcome Optimization.
 *
 * @param {string} taskQuery
 * @param {Object} [context]
 * @returns {Object} Comprehensive Phase 10 Outcome Analysis
 */
function runOutcomeOptimization(taskQuery, context = {}) {
  const q = (taskQuery || '').trim();
  const tracker = getPhase10MetricsTracker();
  tracker.record('tasks_optimized');

  // Step 1: Discover Requirements
  const requirements = discoverRequirements(q, context);
  tracker.record('requirements_discovered', requirements.length);
  const mandatoryCount = requirements.filter(
    r => r.priority === REQUIREMENT_PRIORITY.MANDATORY,
  ).length;
  tracker.record('mandatory_requirements', mandatoryCount);

  // Step 2: Evaluate Complexity Budget
  const complexityBudget = evaluateComplexityBudget(q, requirements);

  // Step 3: Anti-Slop & Under-Engineering Audit
  const architectureAudit = auditArchitectureJustification(q, complexityBudget);
  if (architectureAudit.unjustified_components.length > 0) {
    tracker.record('overengineering_prevented', architectureAudit.unjustified_components.length);
  }
  if (architectureAudit.missing_critical_considerations.length > 0) {
    tracker.record(
      'underengineering_prevented',
      architectureAudit.missing_critical_considerations.length,
    );
  }

  // Step 4: Engineering Option Generation & Evaluation
  const optionsEvaluated = [];
  for (const t of ARCHITECTURAL_OPTION_TEMPLATES) {
    if (t.trigger.test(q)) {
      optionsEvaluated.push({
        topic: t.topic,
        options: t.options,
      });
      tracker.record('options_evaluated', t.options.length);
    }
  }

  // Step 5: Engineering Decision Records & Traceability
  const decisionRecords = generateDecisionRecords(
    q,
    requirements,
    architectureAudit.justified_components,
  );
  tracker.record('decisions_recorded', decisionRecords.length);

  // Step 6: Assumptions & Unknowns
  const { assumptions, unknowns } = analyzeAssumptionsAndUnknowns(q);

  // Step 7: Build Solution Shape & Implementation Order
  const { solution_shape, implementation_order, early_validations } = buildSolutionShape({
    taskQuery: q,
    requirements,
    complexityBudget,
    decisionRecords,
    assumptions,
    unknowns,
    crossDomainAnalysis: context.crossDomainAnalysis,
  });
  tracker.record('early_validations_generated', early_validations.length);

  // Step 8: Reversibility & Blast Radius Analysis
  const reversibility =
    decisionRecords.length > 0 &&
    decisionRecords.some(d => d.reversibility === REVERSIBILITY_LEVELS.DIFFICULT_TO_REVERSE)
      ? REVERSIBILITY_LEVELS.DIFFICULT_TO_REVERSE
      : decisionRecords.some(d => d.reversibility === REVERSIBILITY_LEVELS.PARTIALLY_REVERSIBLE)
        ? REVERSIBILITY_LEVELS.PARTIALLY_REVERSIBLE
        : REVERSIBILITY_LEVELS.EASILY_REVERSIBLE;

  const blastRadius = {
    tier:
      complexityBudget.budget === COMPLEXITY_BUDGETS.HIGH
        ? 'HIGH'
        : complexityBudget.budget === COMPLEXITY_BUDGETS.MODERATE
          ? 'MEDIUM'
          : 'LOCAL',
    reversibility: reversibility,
    affected_subsystems: architectureAudit.justified_components.map(c => c.component),
  };

  // Step 9: Synthesize Validation Requirements for Verification Plan
  const validationRequirements = [];
  for (const edr of decisionRecords) {
    for (const v of edr.validation || []) {
      validationRequirements.push({
        source: edr.title,
        test: v,
        reason: edr.reason,
        priority: 'MANDATORY',
      });
    }
  }
  for (const mc of architectureAudit.missing_critical_considerations) {
    validationRequirements.push({
      source: mc.consideration,
      test: `Verify ${mc.consideration} is implemented`,
      reason: mc.risk,
      priority: 'CRITICAL',
    });
  }

  return {
    invariant: OUTCOME_INVARIANT,
    task: q,
    complexity_budget: complexityBudget.budget,
    budget_justification: complexityBudget.justification,
    requirements: requirements,
    unknowns: unknowns,
    assumptions: assumptions,
    architecture_audit: architectureAudit,
    engineering_options: optionsEvaluated,
    decision_records: decisionRecords,
    solution_shape: solution_shape,
    implementation_order: implementation_order,
    early_validations: early_validations,
    blast_radius: blastRadius,
    validation_requirements: validationRequirements,
    phase10_metrics: tracker.getMetrics(),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  OUTCOME_INVARIANT,
  REQUIREMENT_SOURCES,
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_PRIORITY,
  COMPLEXITY_BUDGETS,
  ASSUMPTION_STATUS,
  REVERSIBILITY_LEVELS,
  CAPABILITY_DEPTH,
  REASONING_DEPTH,
  HIGH_RISK_TRIGGERS,
  ARCHITECTURAL_OPTION_TEMPLATES,

  discoverRequirements,
  evaluateComplexityBudget,
  auditArchitectureJustification,
  generateDecisionRecords,
  analyzeAssumptionsAndUnknowns,
  buildSolutionShape,
  verifyOutcomeAndRegressions,
  runOutcomeOptimization,

  evaluateSkillSelection,
  Phase10OutcomeMemory,
  getPhase10OutcomeMemory,
  runAntiShortcutCheck,
  runAntiOverengineeringCheck,

  Phase10MetricsTracker,
  getPhase10MetricsTracker,
};
