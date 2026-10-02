#!/usr/bin/env node
/**
 * architecture_intelligence.js — Tribunal Kit Phase 7: Architecture & Trade-Off Intelligence
 * ===========================================================================================
 * Core Invariant:
 *   AN ARCHITECTURE MUST BE JUSTIFIED BY REQUIREMENTS, CONSTRAINTS, AND EVIDENCE.
 *   NO ARCHITECTURAL CHOICE SHOULD BE MADE SOLELY BECAUSE IT IS FAMILIAR, POPULAR,
 *   MODERN, OR EASY FOR THE MODEL TO GENERATE.
 *
 * Pipeline:
 *   TASK → REQUIREMENTS → CONSTRAINTS → CONSIDERATIONS → ARCHITECTURE DISCOVERY
 *   → CANDIDATE GENERATION → VALIDATION → TRADE-OFF ANALYSIS → FAILURE ANALYSIS
 *   → COST/PERF/SECURITY/OPS ANALYSIS → DECISION RECORD → VERIFICATION
 *
 * Implements Phase 7 Sections 4–46.
 */

'use strict';

const crypto = require('crypto');

// ============================================================================
// 1. REQUIREMENT INTELLIGENCE (SECTIONS 4–5)
// ============================================================================

const REQUIREMENT_TYPES = {
  FUNCTIONAL: 'functional',
  NON_FUNCTIONAL: 'non_functional',
  CONSTRAINT: 'constraint',
  PREFERENCE: 'preference',
  ASSUMPTION: 'assumption',
  UNKNOWN: 'unknown',
};

const CONFIDENCE_LEVELS = {
  EXPLICIT: 'explicit',
  INFERRED: 'inferred',
  ASSUMED: 'assumed',
  UNKNOWN: 'unknown',
};

/**
 * Functional requirement detection patterns.
 * Each pattern maps a keyword domain to a functional requirement.
 */
const FUNCTIONAL_PATTERNS = [
  {
    match: /(?:messag|chat|inbox|conversation|dm|direct message)/i,
    req: 'messaging',
    domain: 'communication',
  },
  {
    match: /(?:presence|online|offline|status|active user)/i,
    req: 'presence',
    domain: 'communication',
  },
  {
    match: /(?:history|archive|log|conversation record)/i,
    req: 'conversation history',
    domain: 'data',
  },
  {
    match: /(?:payment|checkout|charge|billing|invoice|subscription)/i,
    req: 'payment processing',
    domain: 'financial',
  },
  {
    match: /(?:auth|login|signup|register|sso|oauth|credential)/i,
    req: 'authentication',
    domain: 'security',
  },
  {
    match: /(?:permission|role|rbac|acl|access control|authorization)/i,
    req: 'authorization',
    domain: 'security',
  },
  {
    match: /(?:upload|file|attachment|media|image|video)/i,
    req: 'file management',
    domain: 'storage',
  },
  { match: /(?:search|filter|query|lookup|find|full.text)/i, req: 'search', domain: 'data' },
  {
    match: /(?:notification|alert|push|email|sms|webhook)/i,
    req: 'notifications',
    domain: 'communication',
  },
  {
    match: /(?:dashboard|report|analytic|metric|chart|graph)/i,
    req: 'analytics & reporting',
    domain: 'data',
  },
  { match: /(?:feed|timeline|stream|wall|activity)/i, req: 'activity feed', domain: 'social' },
  { match: /(?:recommend|suggest|personalize|ml|ai model)/i, req: 'recommendations', domain: 'ai' },
  {
    match: /(?:collaboration|realtime|collab|edit.*together|shared.*doc)/i,
    req: 'real-time collaboration',
    domain: 'collaboration',
  },
  {
    match: /(?:crud|create|read|update|delete|manage.*record)/i,
    req: 'CRUD operations',
    domain: 'data',
  },
  { match: /(?:import|export|csv|excel|bulk)/i, req: 'data import/export', domain: 'data' },
  {
    match: /(?:schedule|cron|timer|queue|background|worker|job)/i,
    req: 'background processing',
    domain: 'compute',
  },
  {
    match: /(?:tenant|multi.?tenant|workspace|organization)/i,
    req: 'multi-tenancy',
    domain: 'isolation',
  },
  {
    match: /(?:agent|tool|llm|prompt|chain|rag|vector)/i,
    req: 'AI agent integration',
    domain: 'ai',
  },
  { match: /(?:api|endpoint|rest|graphql|grpc|gateway)/i, req: 'API layer', domain: 'integration' },
  { match: /(?:cache|redis|memcache|cdn)/i, req: 'caching layer', domain: 'performance' },
];

/**
 * Non-functional requirement detection patterns.
 */
const NON_FUNCTIONAL_PATTERNS = [
  {
    match: /(?:low.?latency|fast|responsive|sub.?\d+ms|p99|p95|latency)/i,
    req: 'low latency',
    category: 'performance',
  },
  {
    match: /(?:high.?availability|uptime|99\.9|five.?nine|four.?nine|ha\b)/i,
    req: 'high availability',
    category: 'reliability',
  },
  {
    match: /(?:scal|horizontal|vertical|elastic|auto.?scale)/i,
    req: 'scalability',
    category: 'scalability',
  },
  {
    match: /(?:secure|encrypt|tls|ssl|zero.?trust|penetration)/i,
    req: 'security',
    category: 'security',
  },
  {
    match: /(?:reliable|fault.?tolerant|resilient|durable|crash.?safe)/i,
    req: 'reliability',
    category: 'reliability',
  },
  {
    match: /(?:consistent|acid|lineariz|serial|strong.?consisten)/i,
    req: 'strong consistency',
    category: 'consistency',
  },
  {
    match: /(?:eventual|async|lazy|background.?sync)/i,
    req: 'eventual consistency',
    category: 'consistency',
  },
  {
    match: /(?:observab|monitor|trace|log|metric|opentelemetry)/i,
    req: 'observability',
    category: 'operations',
  },
  {
    match: /(?:test|ci|cd|pipeline|deploy|rollback)/i,
    req: 'CI/CD & deployability',
    category: 'operations',
  },
  {
    match: /(?:maintain|clean|modular|readable|document)/i,
    req: 'maintainability',
    category: 'quality',
  },
  {
    match: /(?:audit|compliance|gdpr|hipaa|sox|pci|regulatory)/i,
    req: 'compliance & auditability',
    category: 'governance',
  },
  {
    match: /(?:cost|budget|cheap|expensive|billing.?optim)/i,
    req: 'cost efficiency',
    category: 'cost',
  },
];

/**
 * Constraint extraction patterns.
 */
const CONSTRAINT_PATTERNS = [
  {
    match: /(\d[\d,.]*)\s*(?:user|customer|account|subscriber)/i,
    req: 'user count',
    extractor: m => m[1],
    category: 'scale',
  },
  {
    match: /(\d[\d,.]*)\s*(?:req|request|rps|qps|tps)(?:\/s|\/sec|\/second)?/i,
    req: 'request throughput',
    extractor: m => m[1],
    category: 'performance',
  },
  {
    match: /(\d[\d,.]*)\s*(?:gb|tb|pb|mb)\s*(?:data|storage|size)/i,
    req: 'data volume',
    extractor: m => m[1],
    category: 'storage',
  },
  {
    match: /(?:aws|gcp|azure|vercel|cloudflare|heroku|digital.?ocean|fly\.io)/i,
    req: 'cloud provider',
    category: 'infrastructure',
  },
  {
    match: /(?:postgres|mysql|mongo|dynamo|redis|sqlite|cockroach|supabase|planetscale|neon)/i,
    req: 'database technology',
    category: 'technology',
  },
  {
    match: /(?:react|vue|angular|svelte|next|nuxt|remix|astro)/i,
    req: 'frontend framework',
    category: 'technology',
  },
  {
    match: /(?:node|python|go|rust|java|c#|\.net|ruby|elixir|php)/i,
    req: 'backend language',
    category: 'technology',
  },
  {
    match: /(?:docker|kubernetes|k8s|serverless|lambda|container)/i,
    req: 'deployment platform',
    category: 'infrastructure',
  },
  {
    match: /(?:team of (\d+)|(\d+)\s*dev|solo|one.?person|small team|large team)/i,
    req: 'team size',
    category: 'team',
  },
  {
    match: /(?:deadline|timeline|sprint|week|month|quarter|mvp|prototype|poc)/i,
    req: 'timeline',
    category: 'schedule',
  },
  {
    match: /(?:gdpr|hipaa|sox|pci|ccpa|iso.?27001|fedramp)/i,
    req: 'compliance requirement',
    category: 'governance',
  },
  {
    match: /(?:data.?residen|sovereign|eu.?only|us.?only|region.?restrict)/i,
    req: 'data residency',
    category: 'governance',
  },
  {
    match: /(?:existing|legacy|migrate|current system|brownfield)/i,
    req: 'existing system',
    category: 'migration',
  },
  {
    match: /(?:budget|cost.?limit|\$\d+|free.?tier|startup)/i,
    req: 'budget constraint',
    category: 'cost',
  },
  {
    match: /(?:real.?time|sub.?second|instant|live|streaming)/i,
    req: 'real-time requirement',
    category: 'performance',
  },
  {
    match: /(?:offline|pwa|local.?first|sync)/i,
    req: 'offline capability',
    category: 'availability',
  },
];

/**
 * Extract structured requirements from a natural-language task description.
 *
 * @param {string} taskQuery
 * @returns {Object} Structured requirements
 */
function extractRequirements(taskQuery) {
  const q = (taskQuery || '').trim();
  if (!q)
    return {
      functional: [],
      non_functional: [],
      constraints: [],
      preferences: [],
      assumptions: [],
      unknowns: [],
      raw_task: q,
    };

  const functional = [];
  const nonFunctional = [];
  const constraints = [];
  const preferences = [];
  const assumptions = [];
  const unknowns = [];
  const seen = new Set();

  // Extract functional requirements
  for (const p of FUNCTIONAL_PATTERNS) {
    if (p.match.test(q) && !seen.has(p.req)) {
      seen.add(p.req);
      functional.push({
        requirement: p.req,
        source: 'task_description',
        type: REQUIREMENT_TYPES.FUNCTIONAL,
        confidence: CONFIDENCE_LEVELS.EXPLICIT,
        domain: p.domain,
        evidence: [{ type: 'keyword_match', detail: `Detected "${p.req}" from task description` }],
      });
    }
  }

  // Extract non-functional requirements
  for (const p of NON_FUNCTIONAL_PATTERNS) {
    if (p.match.test(q) && !seen.has(p.req)) {
      seen.add(p.req);
      nonFunctional.push({
        requirement: p.req,
        source: 'task_description',
        type: REQUIREMENT_TYPES.NON_FUNCTIONAL,
        confidence: CONFIDENCE_LEVELS.EXPLICIT,
        category: p.category,
        evidence: [{ type: 'keyword_match', detail: `Detected "${p.req}" from task description` }],
      });
    }
  }

  // Extract constraints
  for (const p of CONSTRAINT_PATTERNS) {
    const m = q.match(p.match);
    if (m && !seen.has(p.req)) {
      seen.add(p.req);
      constraints.push({
        requirement: p.req,
        source: 'task_description',
        type: REQUIREMENT_TYPES.CONSTRAINT,
        confidence: CONFIDENCE_LEVELS.EXPLICIT,
        category: p.category,
        value: p.extractor ? p.extractor(m) : m[0],
        evidence: [{ type: 'keyword_match', detail: `Detected "${p.req}" constraint: ${m[0]}` }],
      });
    }
  }

  // Infer implicit requirements based on functional requirements
  if (functional.some(f => f.domain === 'financial') && !seen.has('idempotency')) {
    seen.add('idempotency');
    nonFunctional.push({
      requirement: 'idempotency',
      source: 'inferred_from_financial_domain',
      type: REQUIREMENT_TYPES.NON_FUNCTIONAL,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'reliability',
      evidence: [
        {
          type: 'domain_inference',
          detail: 'Financial transactions require idempotency to prevent duplicate charges',
        },
      ],
    });
  }

  if (functional.some(f => f.domain === 'financial') && !seen.has('auditability')) {
    seen.add('auditability');
    nonFunctional.push({
      requirement: 'auditability',
      source: 'inferred_from_financial_domain',
      type: REQUIREMENT_TYPES.NON_FUNCTIONAL,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'governance',
      evidence: [
        {
          type: 'domain_inference',
          detail: 'Financial systems require audit trails for regulatory compliance',
        },
      ],
    });
  }

  if (functional.some(f => f.domain === 'communication') && !seen.has('low latency')) {
    seen.add('low latency');
    nonFunctional.push({
      requirement: 'low latency',
      source: 'inferred_from_communication_domain',
      type: REQUIREMENT_TYPES.NON_FUNCTIONAL,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'performance',
      evidence: [
        {
          type: 'domain_inference',
          detail: 'Communication systems require low latency for user experience',
        },
      ],
    });
  }

  // Identify unknowns based on what's NOT specified
  const unknownChecks = [
    { condition: !constraints.some(c => c.category === 'scale'), unknown: 'peak concurrent users' },
    {
      condition: !constraints.some(c => c.req === 'request throughput'),
      unknown: 'request rate / throughput',
    },
    {
      condition: !constraints.some(c => c.category === 'storage'),
      unknown: 'data retention period',
    },
    {
      condition: !constraints.some(c => c.req === 'data residency'),
      unknown: 'geographic distribution',
    },
    {
      condition: !constraints.some(c => c.category === 'team'),
      unknown: 'team size and expertise',
    },
    { condition: !constraints.some(c => c.category === 'cost'), unknown: 'budget' },
    { condition: !constraints.some(c => c.category === 'schedule'), unknown: 'timeline' },
  ];

  for (const check of unknownChecks) {
    if (check.condition) {
      unknowns.push({
        requirement: check.unknown,
        type: REQUIREMENT_TYPES.UNKNOWN,
        confidence: CONFIDENCE_LEVELS.UNKNOWN,
        evidence: [],
      });
    }
  }

  return {
    functional,
    non_functional: nonFunctional,
    constraints,
    preferences,
    assumptions,
    unknowns,
    raw_task: q,
    total: functional.length + nonFunctional.length + constraints.length,
  };
}

// ============================================================================
// 2. CONSTRAINT EXTRACTION (SECTION 6)
// ============================================================================

/**
 * Extract and categorize all constraints from task + requirements.
 *
 * @param {string} taskQuery
 * @param {Object} requirements
 * @returns {Object} Structured constraints
 */
function extractConstraints(taskQuery, requirements) {
  const q = (taskQuery || '').toLowerCase();
  const existingConstraints = (requirements && requirements.constraints) || [];

  const allConstraints = [...existingConstraints];
  const categories = new Set(existingConstraints.map(c => c.category));

  // Budget constraint inference
  if (
    !categories.has('cost') &&
    /(?:startup|bootstrap|mvp|poc|prototype|free.?tier|hobby)/i.test(q)
  ) {
    allConstraints.push({
      requirement: 'limited budget',
      type: REQUIREMENT_TYPES.CONSTRAINT,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'cost',
      value: 'low',
      evidence: [
        {
          type: 'context_inference',
          detail: 'Startup/MVP/prototype context suggests limited budget',
        },
      ],
    });
  }

  // Team expertise inference
  if (
    !categories.has('team') &&
    /(?:solo|one.?person|small team|junior|learning|first time)/i.test(q)
  ) {
    allConstraints.push({
      requirement: 'limited team capacity',
      type: REQUIREMENT_TYPES.CONSTRAINT,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'team',
      value: 'small',
      evidence: [
        {
          type: 'context_inference',
          detail: 'Small team or solo developer context constrains operational complexity',
        },
      ],
    });
  }

  // Operational maturity inference
  if (
    !categories.has('operations') &&
    /(?:no.?devops|no.?infra|managed|serverless|simple.?deploy)/i.test(q)
  ) {
    allConstraints.push({
      requirement: 'limited operational maturity',
      type: REQUIREMENT_TYPES.CONSTRAINT,
      confidence: CONFIDENCE_LEVELS.INFERRED,
      category: 'operations',
      value: 'low',
      evidence: [
        {
          type: 'context_inference',
          detail: 'No DevOps expertise mentioned; prefer simpler operational models',
        },
      ],
    });
  }

  return {
    constraints: allConstraints,
    categories: [...new Set(allConstraints.map(c => c.category))],
    total: allConstraints.length,
  };
}

// ============================================================================
// 3. ARCHITECTURE PATTERN REGISTRY (SECTION 8)
// ============================================================================

const ARCHITECTURE_PATTERNS = {
  monolith: {
    pattern: 'Monolith',
    use_cases: ['small-to-medium applications', 'early-stage products', 'simple domain'],
    strengths: [
      'simple deployment',
      'simple debugging',
      'low operational cost',
      'strong consistency',
      'fast development',
      'easy testing',
    ],
    weaknesses: [
      'scaling limitations',
      'deployment coupling',
      'technology lock-in',
      'team coupling',
    ],
    failure_modes: ['single point of failure', 'memory exhaustion', 'deployment blocks'],
    operational_cost: 'low',
    scaling_characteristics: {
      horizontal: 'limited',
      vertical: 'primary',
      data_partitioning: 'difficult',
    },
    security_considerations: ['single trust boundary', 'shared memory space'],
    related_patterns: ['modular_monolith', 'layered'],
    anti_patterns: ['god_service'],
    required_capabilities: ['single deployment pipeline'],
  },
  modular_monolith: {
    pattern: 'Modular Monolith',
    use_cases: [
      'medium applications',
      'clear domain boundaries',
      'team growth path',
      'payment systems',
      'SaaS platforms',
    ],
    strengths: [
      'domain isolation within single deployment',
      'simple operations',
      'strong consistency',
      'easy refactoring to services later',
      'independent module development',
    ],
    weaknesses: [
      'requires discipline to maintain module boundaries',
      'shared database',
      'single deployment unit',
    ],
    failure_modes: ['boundary erosion', 'shared state leakage', 'deployment coupling persists'],
    operational_cost: 'low',
    scaling_characteristics: {
      horizontal: 'moderate',
      vertical: 'primary',
      data_partitioning: 'module-scoped',
    },
    security_considerations: ['module-level access control', 'shared process space'],
    related_patterns: ['monolith', 'hexagonal', 'microservices'],
    anti_patterns: ['distributed_monolith'],
    required_capabilities: ['module boundary enforcement', 'internal API contracts'],
  },
  microservices: {
    pattern: 'Microservices',
    use_cases: [
      'large-scale systems',
      'multiple teams',
      'independent deployment',
      'polyglot technology',
    ],
    strengths: [
      'independent deployment',
      'technology flexibility',
      'team autonomy',
      'independent scaling',
      'fault isolation',
    ],
    weaknesses: [
      'distributed system complexity',
      'network latency',
      'data consistency challenges',
      'operational overhead',
      'debugging difficulty',
    ],
    failure_modes: [
      'cascading failures',
      'network partitions',
      'distributed deadlocks',
      'service discovery failures',
      'data inconsistency',
    ],
    operational_cost: 'high',
    scaling_characteristics: {
      horizontal: 'excellent',
      vertical: 'per-service',
      data_partitioning: 'per-service',
    },
    security_considerations: [
      'service-to-service auth',
      'network segmentation',
      'secret distribution',
      'multiple trust boundaries',
    ],
    related_patterns: ['soa', 'api_gateway', 'service_mesh', 'saga'],
    anti_patterns: ['premature_microservices', 'distributed_monolith', 'chatty_services'],
    required_capabilities: [
      'service discovery',
      'distributed tracing',
      'circuit breakers',
      'container orchestration',
      'CI/CD per service',
    ],
  },
  serverless: {
    pattern: 'Serverless',
    use_cases: [
      'event-driven workloads',
      'variable traffic',
      'rapid prototyping',
      'webhook handlers',
      'scheduled jobs',
    ],
    strengths: [
      'zero server management',
      'auto-scaling',
      'pay-per-use',
      'fast deployment',
      'no idle cost',
    ],
    weaknesses: [
      'cold starts',
      'execution time limits',
      'vendor lock-in',
      'debugging difficulty',
      'limited local testing',
      'stateless constraint',
    ],
    failure_modes: [
      'cold start latency',
      'timeout errors',
      'concurrent execution limits',
      'vendor outages',
    ],
    operational_cost: 'very_low_to_variable',
    scaling_characteristics: {
      horizontal: 'automatic',
      vertical: 'limited_by_runtime',
      data_partitioning: 'external',
    },
    security_considerations: [
      'IAM roles',
      'environment variable secrets',
      'function-level permissions',
    ],
    related_patterns: ['event_driven', 'api_gateway'],
    anti_patterns: ['over_engineering'],
    required_capabilities: ['managed database', 'event source integration'],
  },
  event_driven: {
    pattern: 'Event-Driven',
    use_cases: [
      'async workflows',
      'decoupled systems',
      'audit trails',
      'real-time processing',
      'CQRS',
    ],
    strengths: [
      'loose coupling',
      'async processing',
      'audit trail',
      'replay capability',
      'temporal decoupling',
    ],
    weaknesses: [
      'eventual consistency',
      'debugging complexity',
      'event ordering',
      'schema evolution',
      'idempotency requirement',
    ],
    failure_modes: [
      'event loss',
      'duplicate events',
      'out-of-order processing',
      'poison pills',
      'consumer lag',
    ],
    operational_cost: 'medium_to_high',
    scaling_characteristics: {
      horizontal: 'excellent',
      vertical: 'per-consumer',
      data_partitioning: 'partition-based',
    },
    security_considerations: [
      'event payload encryption',
      'consumer authorization',
      'event source verification',
    ],
    related_patterns: ['cqrs', 'event_sourcing', 'saga', 'transactional_outbox'],
    anti_patterns: ['dual_write'],
    required_capabilities: [
      'message broker',
      'dead-letter queue',
      'idempotent consumers',
      'schema registry',
    ],
  },
  cqrs: {
    pattern: 'CQRS',
    use_cases: [
      'read-heavy systems',
      'complex queries',
      'separate read/write scaling',
      'event sourcing complement',
    ],
    strengths: ['optimized read/write models', 'independent scaling', 'query flexibility'],
    weaknesses: [
      'increased complexity',
      'eventual consistency between read/write',
      'synchronization logic',
    ],
    failure_modes: ['read model staleness', 'sync failures', 'write model corruption'],
    operational_cost: 'medium',
    scaling_characteristics: {
      horizontal: 'per-model',
      vertical: 'per-model',
      data_partitioning: 'read/write split',
    },
    security_considerations: ['separate read/write authorization'],
    related_patterns: ['event_driven', 'event_sourcing'],
    anti_patterns: ['over_engineering'],
    required_capabilities: ['separate data stores or views', 'sync mechanism'],
  },
  event_sourcing: {
    pattern: 'Event Sourcing',
    use_cases: [
      'audit-critical systems',
      'financial ledgers',
      'temporal queries',
      'regulatory compliance',
    ],
    strengths: [
      'complete audit trail',
      'temporal queries',
      'replay capability',
      'debugging via event replay',
    ],
    weaknesses: ['storage growth', 'complexity', 'snapshot management', 'schema evolution'],
    failure_modes: ['event store corruption', 'projection failures', 'snapshot inconsistency'],
    operational_cost: 'high',
    scaling_characteristics: {
      horizontal: 'partition-based',
      vertical: 'moderate',
      data_partitioning: 'aggregate-based',
    },
    security_considerations: ['immutable event store access control', 'PII in events'],
    related_patterns: ['cqrs', 'event_driven'],
    anti_patterns: [],
    required_capabilities: ['event store', 'projection engine', 'snapshot mechanism'],
  },
  hexagonal: {
    pattern: 'Hexagonal (Ports & Adapters)',
    use_cases: [
      'domain-driven applications',
      'testable business logic',
      'infrastructure-agnostic core',
    ],
    strengths: ['infrastructure independence', 'highly testable', 'clear domain boundaries'],
    weaknesses: ['more boilerplate', 'learning curve', 'over-abstraction risk'],
    failure_modes: ['port/adapter mismatch', 'leaky abstractions'],
    operational_cost: 'low',
    scaling_characteristics: {
      horizontal: 'inherited',
      vertical: 'inherited',
      data_partitioning: 'inherited',
    },
    security_considerations: ['adapter-level validation'],
    related_patterns: ['clean_architecture', 'modular_monolith'],
    anti_patterns: ['over_engineering'],
    required_capabilities: ['dependency injection'],
  },
  api_gateway: {
    pattern: 'API Gateway',
    use_cases: [
      'microservices entry point',
      'rate limiting',
      'auth consolidation',
      'request routing',
    ],
    strengths: [
      'centralized cross-cutting concerns',
      'client simplification',
      'protocol translation',
    ],
    weaknesses: ['single point of failure', 'added latency', 'deployment bottleneck'],
    failure_modes: ['gateway overload', 'routing errors', 'configuration drift'],
    operational_cost: 'medium',
    scaling_characteristics: {
      horizontal: 'excellent',
      vertical: 'moderate',
      data_partitioning: 'not_applicable',
    },
    security_considerations: ['auth termination point', 'rate limiting', 'DDoS protection'],
    related_patterns: ['microservices', 'bff'],
    anti_patterns: ['god_service'],
    required_capabilities: ['load balancer', 'health checks'],
  },
  saga: {
    pattern: 'Saga (Distributed Transactions)',
    use_cases: [
      'cross-service transactions',
      'long-running workflows',
      'compensating transactions',
    ],
    strengths: ['distributed consistency without 2PC', 'fault tolerance', 'eventual consistency'],
    weaknesses: ['compensation complexity', 'debugging difficulty', 'partial failure handling'],
    failure_modes: ['compensation failures', 'orphaned sagas', 'timeout deadlocks'],
    operational_cost: 'medium_to_high',
    scaling_characteristics: {
      horizontal: 'per-step',
      vertical: 'per-step',
      data_partitioning: 'per-service',
    },
    security_considerations: ['step authorization', 'compensation authorization'],
    related_patterns: ['event_driven', 'transactional_outbox', 'microservices'],
    anti_patterns: ['distributed_transaction_without_need'],
    required_capabilities: [
      'saga orchestrator or choreography',
      'compensating actions',
      'idempotent steps',
    ],
  },
  transactional_outbox: {
    pattern: 'Transactional Outbox',
    use_cases: ['reliable event publishing', 'dual write prevention', 'at-least-once delivery'],
    strengths: ['atomicity between DB write and event publish', 'reliable delivery'],
    weaknesses: [
      'polling overhead',
      'outbox table growth',
      'at-least-once semantics require idempotent consumers',
    ],
    failure_modes: ['outbox reader lag', 'duplicate delivery'],
    operational_cost: 'low_to_medium',
    scaling_characteristics: {
      horizontal: 'moderate',
      vertical: 'moderate',
      data_partitioning: 'per-service',
    },
    security_considerations: ['outbox table access control'],
    related_patterns: ['event_driven', 'saga'],
    anti_patterns: ['dual_write'],
    required_capabilities: ['database with transactional support', 'outbox reader/poller'],
  },
  streaming: {
    pattern: 'Streaming Architecture',
    use_cases: [
      'real-time analytics',
      'IoT data processing',
      'event processing',
      'log aggregation',
    ],
    strengths: ['real-time processing', 'high throughput', 'temporal windowing'],
    weaknesses: [
      'complexity',
      'ordering challenges',
      'exactly-once difficulty',
      'operational cost',
    ],
    failure_modes: ['backpressure', 'out-of-order events', 'late data'],
    operational_cost: 'high',
    scaling_characteristics: {
      horizontal: 'partition-based',
      vertical: 'per-consumer',
      data_partitioning: 'topic/partition',
    },
    security_considerations: ['stream encryption', 'consumer group authorization'],
    related_patterns: ['event_driven', 'lambda_architecture', 'kappa_architecture'],
    anti_patterns: ['over_engineering'],
    required_capabilities: ['stream processing framework', 'message broker with partitioning'],
  },
  bff: {
    pattern: 'Backend for Frontend',
    use_cases: ['multiple client types', 'mobile + web + API', 'client-specific aggregation'],
    strengths: ['client-optimized API', 'reduced over-fetching', 'client-specific caching'],
    weaknesses: ['code duplication across BFFs', 'added services', 'sync overhead'],
    failure_modes: ['BFF-backend desync', 'BFF proliferation'],
    operational_cost: 'medium',
    scaling_characteristics: {
      horizontal: 'per-BFF',
      vertical: 'per-BFF',
      data_partitioning: 'not_applicable',
    },
    security_considerations: ['per-client auth', 'data filtering per client type'],
    related_patterns: ['api_gateway', 'microservices'],
    anti_patterns: ['god_service'],
    required_capabilities: ['per-client deployment pipelines'],
  },
  distributed_workers: {
    pattern: 'Distributed Workers',
    use_cases: [
      'background processing',
      'task queues',
      'parallel computation',
      'email/notification pipelines',
    ],
    strengths: ['horizontal scaling', 'fault isolation', 'async processing'],
    weaknesses: ['monitoring complexity', 'dead-letter handling', 'worker coordination'],
    failure_modes: ['worker crash', 'poison pills', 'starvation', 'thundering herd'],
    operational_cost: 'medium',
    scaling_characteristics: {
      horizontal: 'excellent',
      vertical: 'per-worker',
      data_partitioning: 'queue-based',
    },
    security_considerations: ['worker credential management', 'job payload validation'],
    related_patterns: ['event_driven', 'serverless'],
    anti_patterns: ['unbounded_retry'],
    required_capabilities: ['message queue', 'dead-letter queue', 'health monitoring'],
  },
  batch: {
    pattern: 'Batch Architecture',
    use_cases: ['ETL pipelines', 'data warehousing', 'report generation', 'nightly processing'],
    strengths: ['high throughput', 'simple error handling', 'resource scheduling'],
    weaknesses: ['high latency', 'resource spikes', 'stale data'],
    failure_modes: ['timeout', 'partial failure', 'data corruption on restart'],
    operational_cost: 'low_to_medium',
    scaling_characteristics: {
      horizontal: 'partition-based',
      vertical: 'moderate',
      data_partitioning: 'time/partition-based',
    },
    security_considerations: ['data access scoping', 'temporary credential lifecycle'],
    related_patterns: ['streaming', 'distributed_workers'],
    anti_patterns: [],
    required_capabilities: ['scheduler', 'data pipeline framework'],
  },
};

/**
 * Retrieve all architecture patterns or a specific one.
 *
 * @param {string} [patternName]
 * @returns {Object|Object[]}
 */
function getArchitecturePatterns(patternName) {
  if (patternName) {
    const key = patternName.toLowerCase().replace(/[\s-]+/g, '_');
    return ARCHITECTURE_PATTERNS[key] || null;
  }
  return { ...ARCHITECTURE_PATTERNS };
}

// ============================================================================
// 4. ANTI-PATTERN REGISTRY (SECTION 9)
// ============================================================================

const ANTI_PATTERNS = {
  premature_microservices: {
    name: 'Premature Microservices',
    description:
      'Adopting microservices before the domain is understood or the team can operate them.',
    detection: /(?:microservice|micro.service)/i,
    contraindications: ['small team', 'mvp', 'prototype', 'solo', 'startup', 'simple', 'crud'],
    severity: 'HIGH',
    rationale:
      'Microservices introduce distributed system complexity (network failures, data consistency, deployment coordination) that is unjustified when a modular monolith suffices.',
    alternative: 'modular_monolith',
  },
  distributed_monolith: {
    name: 'Distributed Monolith',
    description: 'Multiple services that must be deployed together and share a database.',
    detection:
      /(?:distributed.monolith|shared.database.*microservice|microservice.*shared.database)/i,
    contraindications: [],
    severity: 'CRITICAL',
    rationale:
      'Combines the complexity of distributed systems with none of the benefits (independent deployment, fault isolation).',
    alternative: 'modular_monolith',
  },
  shared_database_coupling: {
    name: 'Shared Database Coupling',
    description: 'Multiple services directly accessing the same database tables.',
    detection: /(?:shared.database|common.db|same.database)/i,
    contraindications: [],
    severity: 'HIGH',
    rationale:
      'Creates implicit coupling: schema changes in one service break others. Prevents independent scaling and deployment.',
    alternative: 'transactional_outbox',
  },
  synchronous_chain: {
    name: 'Synchronous Chain',
    description: 'Long chains of synchronous service-to-service calls.',
    detection: /(?:synchronous.chain|sync.call.*chain|chain.*sync)/i,
    contraindications: [],
    severity: 'HIGH',
    rationale:
      'Latency compounds multiplicatively; any service failure cascades through the entire chain.',
    alternative: 'event_driven',
  },
  cache_as_source_of_truth: {
    name: 'Cache as Source of Truth',
    description: 'Using cache as the primary data store instead of a durable database.',
    detection: /(?:cache.as.source|cache.only|redis.only.store)/i,
    contraindications: [],
    severity: 'CRITICAL',
    rationale:
      'Caches are ephemeral by design; eviction, restart, or memory pressure causes data loss.',
    alternative: 'modular_monolith',
  },
  dual_write: {
    name: 'Dual Write',
    description: 'Writing to two systems (DB + message broker) without atomicity.',
    detection: /(?:dual.write|write.*both|db.*and.*queue.*write)/i,
    contraindications: [],
    severity: 'HIGH',
    rationale:
      'If either write fails, the systems become permanently inconsistent. Use transactional outbox instead.',
    alternative: 'transactional_outbox',
  },
  unbounded_retry: {
    name: 'Unbounded Retry',
    description: 'Retrying failed operations without backoff, jitter, or circuit breaking.',
    detection: /(?:retry.*forever|unlimited.retry|no.backoff)/i,
    contraindications: [],
    severity: 'HIGH',
    rationale: 'Creates retry storms that overwhelm recovering services and amplify failures.',
    alternative: null,
  },
  over_engineering: {
    name: 'Over-Engineering',
    description: 'Using complex patterns (Kafka, K8s, event sourcing) for simple problems.',
    detection: /(?:kafka|kubernetes|k8s|event.sourc|cqrs)/i,
    contraindications: [
      'high throughput',
      'million',
      'distributed',
      'multi-region',
      'audit trail',
      'regulatory',
      'compliance',
      'large team',
      'real-time analytics',
    ],
    severity: 'MEDIUM',
    rationale:
      'Complexity without corresponding requirements creates operational burden, slows development, and introduces unnecessary failure modes.',
    alternative: 'modular_monolith',
  },
  under_engineering: {
    name: 'Under-Engineering',
    description:
      'Missing critical engineering for the requirements (no transactions for payments, no auth for sensitive data).',
    detection: null, // Detected by absence, not by keyword
    contraindications: [],
    severity: 'CRITICAL',
    rationale:
      'Missing engineering fundamentals causes data corruption, security breaches, and financial loss.',
    alternative: null,
  },
};

/**
 * Detect architecture anti-patterns in a task description.
 *
 * @param {string} taskQuery
 * @param {Object} [requirements]
 * @returns {Array<Object>} Detected anti-patterns with context
 */
function detectAntiPatterns(taskQuery, requirements) {
  const q = (taskQuery || '').toLowerCase();
  const detected = [];
  const detectedKeys = new Set();

  for (const [key, ap] of Object.entries(ANTI_PATTERNS)) {
    if (!ap.detection) continue;
    if (!ap.detection.test(q)) continue;

    // Check contraindications — if task mentions a valid use case, this isn't an anti-pattern
    const hasValidContext = ap.contraindications.some(ci => q.includes(ci));
    if (hasValidContext && key === 'over_engineering') continue; // Don't flag overengineering when context justifies it

    // For premature_microservices, flag only if contraindications match (e.g. "microservices" + "startup")
    if (key === 'premature_microservices' && !hasValidContext) continue;

    if (key === 'premature_microservices') {
      detected.push({
        anti_pattern: ap.name,
        severity: ap.severity,
        rationale: ap.rationale,
        context_aware: true,
        contraindication_match: ap.contraindications.filter(ci => q.includes(ci)),
        alternative: ap.alternative ? ARCHITECTURE_PATTERNS[ap.alternative]?.pattern : null,
      });
    } else {
      detected.push({
        anti_pattern: ap.name,
        severity: ap.severity,
        rationale: ap.rationale,
        context_aware: key === 'over_engineering',
        alternative: ap.alternative ? ARCHITECTURE_PATTERNS[ap.alternative]?.pattern : null,
      });
    }
    detectedKeys.add(key);
  }

  // Check for over-engineering specifically (only if not already detected in loop)
  if (!detectedKeys.has('over_engineering')) {
    const overEng = ANTI_PATTERNS.over_engineering;
    if (overEng.detection.test(q)) {
      const hasJustification = overEng.contraindications.some(ci => q.includes(ci));
      if (!hasJustification) {
        detected.push({
          anti_pattern: overEng.name,
          severity: overEng.severity,
          rationale: overEng.rationale,
          context_aware: true,
          missing_justification:
            'No high-scale, regulatory, or multi-team requirement detected to justify this complexity.',
          alternative: ARCHITECTURE_PATTERNS[overEng.alternative]?.pattern || null,
        });
      }
    }
  }

  return detected;
}

// ============================================================================
// 5. CANDIDATE GENERATION (SECTION 7)
// ============================================================================

/**
 * Score how well a pattern matches requirements and constraints.
 */
function scoreCandidate(patternKey, pattern, requirements, constraints) {
  let score = 0;
  const reasons = [];
  const risks = [];
  const q = (requirements.raw_task || '').toLowerCase();
  const allConstraints = (constraints && constraints.constraints) || [];

  // Scale matching
  const scaleConstraint = allConstraints.find(c => c.category === 'scale');
  const scaleValue = scaleConstraint
    ? parseInt(String(scaleConstraint.value).replace(/[,.\s]/g, ''), 10)
    : 0;

  if (scaleValue > 1000000) {
    if (['microservices', 'event_driven', 'streaming'].includes(patternKey)) {
      score += 3;
      reasons.push('Architecture supports high-scale workloads');
    } else if (['monolith'].includes(patternKey)) {
      score -= 2;
      risks.push(
        'Single-process architecture may not handle millions of users without decomposition',
      );
    }
  } else if (scaleValue > 0 && scaleValue <= 100000) {
    if (['monolith', 'modular_monolith'].includes(patternKey)) {
      score += 2;
      reasons.push('Simpler architecture sufficient for moderate scale');
    }
    if (['microservices'].includes(patternKey)) {
      score -= 1;
      risks.push('Microservices complexity may not be justified at this scale');
    }
  }

  // Team constraint
  const teamConstraint = allConstraints.find(c => c.category === 'team');
  if (teamConstraint && /(?:small|solo|1|2|3)/.test(String(teamConstraint.value))) {
    if (['monolith', 'modular_monolith', 'serverless'].includes(patternKey)) {
      score += 2;
      reasons.push('Low operational overhead matches small team capacity');
    }
    if (['microservices', 'streaming'].includes(patternKey)) {
      score -= 2;
      risks.push('Small team cannot sustain operational overhead of distributed architecture');
    }
  }

  // Financial domain
  if (requirements.functional && requirements.functional.some(f => f.domain === 'financial')) {
    if (['modular_monolith', 'hexagonal'].includes(patternKey)) {
      score += 2;
      reasons.push('Strong consistency and transaction support for financial operations');
    }
    if (['serverless'].includes(patternKey)) {
      score -= 1;
      risks.push(
        'Serverless cold starts and execution limits may conflict with payment processing SLAs',
      );
    }
  }

  // Real-time / communication domain
  if (
    requirements.functional &&
    requirements.functional.some(f => f.domain === 'communication' || f.domain === 'collaboration')
  ) {
    if (['event_driven', 'streaming'].includes(patternKey)) {
      score += 2;
      reasons.push('Event-driven architecture supports real-time communication patterns');
    }
  }

  // Multi-tenancy
  if (requirements.functional && requirements.functional.some(f => f.domain === 'isolation')) {
    if (['modular_monolith', 'microservices'].includes(patternKey)) {
      score += 1;
      reasons.push('Architecture supports tenant isolation boundaries');
    }
  }

  // Cost constraint
  const costConstraint = allConstraints.find(c => c.category === 'cost');
  if (costConstraint && /(?:low|limited|budget|startup|free)/i.test(String(costConstraint.value))) {
    if (['monolith', 'modular_monolith', 'serverless'].includes(patternKey)) {
      score += 1;
      reasons.push('Lower infrastructure cost');
    }
    if (['microservices', 'streaming', 'event_sourcing'].includes(patternKey)) {
      score -= 1;
      risks.push('Higher infrastructure cost may exceed budget constraints');
    }
  }

  // Timeline constraint
  const timeConstraint = allConstraints.find(c => c.category === 'schedule');
  if (
    timeConstraint &&
    /(?:mvp|prototype|poc|fast|quick|week)/i.test(String(timeConstraint.value || ''))
  ) {
    if (['monolith', 'modular_monolith', 'serverless'].includes(patternKey)) {
      score += 2;
      reasons.push('Faster time to first deployment');
    }
    if (['microservices', 'event_sourcing'].includes(patternKey)) {
      score -= 1;
      risks.push('Higher upfront investment delays time to market');
    }
  }

  return { pattern: patternKey, name: pattern.pattern, score, reasons, risks };
}

/**
 * Generate architecture candidates based on requirements and constraints.
 *
 * @param {Object} requirements
 * @param {Object} constraints
 * @param {Array} [considerations]
 * @returns {Object} Architecture candidates with scores
 */
function generateCandidates(requirements, constraints, considerations) {
  const scored = [];

  for (const [key, pattern] of Object.entries(ARCHITECTURE_PATTERNS)) {
    // Skip highly specific patterns that are sub-components rather than top-level architectures
    if (['api_gateway', 'bff', 'saga', 'transactional_outbox'].includes(key)) continue;

    const result = scoreCandidate(key, pattern, requirements, constraints);
    scored.push(result);
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top 2-4 candidates with meaningful differentiation
  const topScore = scored[0]?.score || 0;
  const candidates = scored.filter(s => s.score >= topScore - 3 && s.score >= -1).slice(0, 4);

  return {
    candidates: candidates.map((c, idx) => ({
      rank: idx + 1,
      pattern: c.pattern,
      name: c.name,
      score: c.score,
      reasons: c.reasons,
      risks: c.risks,
      details: ARCHITECTURE_PATTERNS[c.pattern] || {},
    })),
    total_evaluated: scored.length,
    recommendation: candidates[0] ? candidates[0].name : 'Unknown',
    recommendation_rationale: candidates[0]
      ? candidates[0].reasons.join('; ')
      : 'No matching pattern found',
  };
}

// ============================================================================
// 6. TRADE-OFF ENGINE (SECTIONS 10–11)
// ============================================================================

const TRADEOFF_CRITERIA = [
  'complexity',
  'scalability',
  'performance',
  'reliability',
  'availability',
  'consistency',
  'security',
  'cost',
  'development_speed',
  'operational_burden',
  'observability',
  'testing_difficulty',
  'deployment_complexity',
  'recovery_complexity',
  'team_complexity',
  'data_management',
  'vendor_lock_in',
  'future_evolution',
];

/**
 * Rate a candidate on a single criterion (LOW / MODERATE / HIGH / VERY_HIGH).
 */
function rateCriterion(patternKey, criterion) {
  const ratings = {
    monolith: {
      complexity: 'LOW',
      scalability: 'LOW',
      performance: 'HIGH',
      reliability: 'MODERATE',
      availability: 'MODERATE',
      consistency: 'HIGH',
      security: 'MODERATE',
      cost: 'LOW',
      development_speed: 'HIGH',
      operational_burden: 'LOW',
      observability: 'MODERATE',
      testing_difficulty: 'LOW',
      deployment_complexity: 'LOW',
      recovery_complexity: 'LOW',
      team_complexity: 'LOW',
      data_management: 'LOW',
      vendor_lock_in: 'LOW',
      future_evolution: 'LOW',
    },
    modular_monolith: {
      complexity: 'MODERATE',
      scalability: 'MODERATE',
      performance: 'HIGH',
      reliability: 'MODERATE',
      availability: 'MODERATE',
      consistency: 'HIGH',
      security: 'MODERATE',
      cost: 'LOW',
      development_speed: 'HIGH',
      operational_burden: 'LOW',
      observability: 'MODERATE',
      testing_difficulty: 'LOW',
      deployment_complexity: 'LOW',
      recovery_complexity: 'LOW',
      team_complexity: 'LOW',
      data_management: 'MODERATE',
      vendor_lock_in: 'LOW',
      future_evolution: 'MODERATE',
    },
    microservices: {
      complexity: 'VERY_HIGH',
      scalability: 'VERY_HIGH',
      performance: 'MODERATE',
      reliability: 'HIGH',
      availability: 'HIGH',
      consistency: 'LOW',
      security: 'HIGH',
      cost: 'HIGH',
      development_speed: 'LOW',
      operational_burden: 'VERY_HIGH',
      observability: 'HIGH',
      testing_difficulty: 'HIGH',
      deployment_complexity: 'HIGH',
      recovery_complexity: 'MODERATE',
      team_complexity: 'HIGH',
      data_management: 'HIGH',
      vendor_lock_in: 'MODERATE',
      future_evolution: 'HIGH',
    },
    serverless: {
      complexity: 'MODERATE',
      scalability: 'HIGH',
      performance: 'MODERATE',
      reliability: 'HIGH',
      availability: 'HIGH',
      consistency: 'MODERATE',
      security: 'MODERATE',
      cost: 'LOW',
      development_speed: 'HIGH',
      operational_burden: 'LOW',
      observability: 'MODERATE',
      testing_difficulty: 'MODERATE',
      deployment_complexity: 'LOW',
      recovery_complexity: 'LOW',
      team_complexity: 'LOW',
      data_management: 'MODERATE',
      vendor_lock_in: 'HIGH',
      future_evolution: 'MODERATE',
    },
    event_driven: {
      complexity: 'HIGH',
      scalability: 'HIGH',
      performance: 'MODERATE',
      reliability: 'HIGH',
      availability: 'HIGH',
      consistency: 'LOW',
      security: 'MODERATE',
      cost: 'MODERATE',
      development_speed: 'MODERATE',
      operational_burden: 'MODERATE',
      observability: 'MODERATE',
      testing_difficulty: 'HIGH',
      deployment_complexity: 'MODERATE',
      recovery_complexity: 'MODERATE',
      team_complexity: 'MODERATE',
      data_management: 'MODERATE',
      vendor_lock_in: 'MODERATE',
      future_evolution: 'HIGH',
    },
    cqrs: {
      complexity: 'HIGH',
      scalability: 'HIGH',
      performance: 'HIGH',
      reliability: 'MODERATE',
      availability: 'MODERATE',
      consistency: 'LOW',
      security: 'MODERATE',
      cost: 'MODERATE',
      development_speed: 'LOW',
      operational_burden: 'MODERATE',
      observability: 'MODERATE',
      testing_difficulty: 'HIGH',
      deployment_complexity: 'MODERATE',
      recovery_complexity: 'MODERATE',
      team_complexity: 'MODERATE',
      data_management: 'HIGH',
      vendor_lock_in: 'LOW',
      future_evolution: 'HIGH',
    },
    streaming: {
      complexity: 'VERY_HIGH',
      scalability: 'VERY_HIGH',
      performance: 'HIGH',
      reliability: 'HIGH',
      availability: 'HIGH',
      consistency: 'LOW',
      security: 'MODERATE',
      cost: 'HIGH',
      development_speed: 'LOW',
      operational_burden: 'HIGH',
      observability: 'MODERATE',
      testing_difficulty: 'HIGH',
      deployment_complexity: 'HIGH',
      recovery_complexity: 'MODERATE',
      team_complexity: 'HIGH',
      data_management: 'HIGH',
      vendor_lock_in: 'MODERATE',
      future_evolution: 'HIGH',
    },
    hexagonal: {
      complexity: 'MODERATE',
      scalability: 'MODERATE',
      performance: 'HIGH',
      reliability: 'MODERATE',
      availability: 'MODERATE',
      consistency: 'HIGH',
      security: 'MODERATE',
      cost: 'LOW',
      development_speed: 'MODERATE',
      operational_burden: 'LOW',
      observability: 'MODERATE',
      testing_difficulty: 'LOW',
      deployment_complexity: 'LOW',
      recovery_complexity: 'LOW',
      team_complexity: 'MODERATE',
      data_management: 'LOW',
      vendor_lock_in: 'LOW',
      future_evolution: 'HIGH',
    },
    batch: {
      complexity: 'LOW',
      scalability: 'MODERATE',
      performance: 'LOW',
      reliability: 'MODERATE',
      availability: 'LOW',
      consistency: 'HIGH',
      security: 'MODERATE',
      cost: 'LOW',
      development_speed: 'HIGH',
      operational_burden: 'LOW',
      observability: 'LOW',
      testing_difficulty: 'LOW',
      deployment_complexity: 'LOW',
      recovery_complexity: 'LOW',
      team_complexity: 'LOW',
      data_management: 'MODERATE',
      vendor_lock_in: 'LOW',
      future_evolution: 'LOW',
    },
    distributed_workers: {
      complexity: 'MODERATE',
      scalability: 'HIGH',
      performance: 'MODERATE',
      reliability: 'HIGH',
      availability: 'MODERATE',
      consistency: 'MODERATE',
      security: 'MODERATE',
      cost: 'MODERATE',
      development_speed: 'MODERATE',
      operational_burden: 'MODERATE',
      observability: 'MODERATE',
      testing_difficulty: 'MODERATE',
      deployment_complexity: 'MODERATE',
      recovery_complexity: 'MODERATE',
      team_complexity: 'MODERATE',
      data_management: 'MODERATE',
      vendor_lock_in: 'LOW',
      future_evolution: 'MODERATE',
    },
    event_sourcing: {
      complexity: 'VERY_HIGH',
      scalability: 'HIGH',
      performance: 'MODERATE',
      reliability: 'HIGH',
      availability: 'MODERATE',
      consistency: 'HIGH',
      security: 'MODERATE',
      cost: 'HIGH',
      development_speed: 'LOW',
      operational_burden: 'HIGH',
      observability: 'HIGH',
      testing_difficulty: 'HIGH',
      deployment_complexity: 'MODERATE',
      recovery_complexity: 'MODERATE',
      team_complexity: 'HIGH',
      data_management: 'VERY_HIGH',
      vendor_lock_in: 'LOW',
      future_evolution: 'HIGH',
    },
  };

  const patternRatings = ratings[patternKey];
  if (!patternRatings) return 'UNKNOWN';
  return patternRatings[criterion] || 'UNKNOWN';
}

/**
 * Build a full trade-off matrix comparing candidates.
 *
 * @param {Array} candidates
 * @param {Object} requirements
 * @param {Object} constraints
 * @returns {Object} Trade-off matrix
 */
function analyzeTradeoffs(candidates, requirements, constraints) {
  if (!candidates || candidates.length < 2) {
    return {
      matrix: [],
      summary: 'Single candidate — no trade-off comparison needed.',
      meaningful_differences: [],
    };
  }

  const matrix = [];
  const meaningfulDifferences = [];

  for (const criterion of TRADEOFF_CRITERIA) {
    const row = {
      criterion,
      importance: determineCriterionImportance(criterion, requirements, constraints),
      candidate_values: {},
      evidence: [],
      uncertainty: 'MODERATE',
    };

    const values = {};
    for (const cand of candidates) {
      const rating = rateCriterion(cand.pattern, criterion);
      row.candidate_values[cand.name] = rating;
      values[cand.name] = rating;
    }

    // Detect meaningful differences
    const uniqueValues = new Set(Object.values(values));
    if (uniqueValues.size > 1 && row.importance !== 'LOW') {
      meaningfulDifferences.push({
        criterion,
        importance: row.importance,
        values,
      });
    }

    matrix.push(row);
  }

  return {
    matrix,
    summary: `Compared ${candidates.length} candidates across ${TRADEOFF_CRITERIA.length} criteria. ${meaningfulDifferences.length} meaningful differences found.`,
    meaningful_differences: meaningfulDifferences,
    candidates_compared: candidates.map(c => c.name),
  };
}

/**
 * Determine how important a criterion is given the requirements.
 */
function determineCriterionImportance(criterion, requirements, constraints) {
  const nfrs = (requirements && requirements.non_functional) || [];
  const frs = (requirements && requirements.functional) || [];

  const highImportance = {
    scalability: nfrs.some(n => n.category === 'scalability'),
    performance: nfrs.some(n => n.category === 'performance'),
    reliability: nfrs.some(n => n.category === 'reliability'),
    security:
      nfrs.some(n => n.category === 'security') ||
      frs.some(f => f.domain === 'financial' || f.domain === 'security'),
    consistency: frs.some(f => f.domain === 'financial'),
    cost: ((constraints && constraints.constraints) || []).some(c => c.category === 'cost'),
    operational_burden: ((constraints && constraints.constraints) || []).some(
      c => c.category === 'team' || c.category === 'operations',
    ),
    availability: nfrs.some(n => n.category === 'reliability'),
  };

  if (highImportance[criterion]) return 'HIGH';
  if (['complexity', 'development_speed', 'testing_difficulty'].includes(criterion))
    return 'MEDIUM';
  return 'LOW';
}

// ============================================================================
// 7. DECISION SENSITIVITY & BREAKPOINTS (SECTIONS 12–13)
// ============================================================================

/**
 * Identify which assumptions could change the architecture decision.
 *
 * @param {Array} candidates
 * @param {Object} tradeoffs
 * @param {Object} requirements
 * @returns {Array<Object>} Decision-sensitive assumptions
 */
function analyzeDecisionSensitivity(candidates, tradeoffs, requirements) {
  const sensitivities = [];
  const unknowns = (requirements && requirements.unknowns) || [];

  // Traffic assumption sensitivity
  if (
    unknowns.some(
      u =>
        u.requirement === 'request rate / throughput' || u.requirement === 'peak concurrent users',
    )
  ) {
    sensitivities.push({
      assumption: 'Current traffic estimate',
      current_value: 'UNKNOWN',
      threshold: 'If traffic exceeds 100K requests/day, consider service decomposition.',
      impact: 'Architecture decision may shift from monolith to service-based.',
      type: 'DECISION_SENSITIVE',
      evidence_quality: 'UNKNOWN',
    });
  }

  // Team growth sensitivity
  if (unknowns.some(u => u.requirement === 'team size and expertise')) {
    sensitivities.push({
      assumption: 'Team size remains stable',
      current_value: 'UNKNOWN',
      threshold:
        'If team grows beyond 8-10 engineers, modular monolith may need service decomposition.',
      impact: 'Architecture decision may shift to support independent team ownership.',
      type: 'DECISION_SENSITIVE',
      evidence_quality: 'UNKNOWN',
    });
  }

  // Data volume sensitivity
  if (unknowns.some(u => u.requirement === 'data retention period')) {
    sensitivities.push({
      assumption: 'Data volume remains manageable',
      current_value: 'UNKNOWN',
      threshold: 'If data exceeds single-node DB capacity, partitioning/sharding strategy needed.',
      impact: 'Database architecture may need fundamental change.',
      type: 'DECISION_SENSITIVE',
      evidence_quality: 'UNKNOWN',
    });
  }

  // Cost sensitivity
  if (unknowns.some(u => u.requirement === 'budget')) {
    sensitivities.push({
      assumption: 'Budget is sufficient for chosen architecture',
      current_value: 'UNKNOWN',
      threshold:
        'If budget is severely constrained, prefer monolith/serverless over microservices.',
      impact: 'Cost model may invalidate complex architecture choices.',
      type: 'DECISION_SENSITIVE',
      evidence_quality: 'UNKNOWN',
    });
  }

  return sensitivities;
}

/**
 * Identify architectural breakpoints — thresholds where architecture should change.
 *
 * @param {Object} candidate
 * @param {Object} requirements
 * @returns {Array<Object>} Breakpoints
 */
function identifyBreakpoints(candidate, requirements) {
  const breakpoints = [];
  const patternKey = candidate.pattern || '';

  if (['monolith', 'modular_monolith'].includes(patternKey)) {
    breakpoints.push({
      dimension: 'traffic',
      current_range: '0–100K requests/day',
      breakpoint: '100K–1M requests/day',
      action: 'Scale application horizontally + database read replicas',
      evidence_quality: 'ESTIMATED',
      next_architecture: 'Consider service decomposition at >1M requests/day',
    });
    breakpoints.push({
      dimension: 'team_size',
      current_range: '1–8 engineers',
      breakpoint: '8–15 engineers',
      action: 'Enforce module ownership boundaries, consider domain service extraction',
      evidence_quality: 'ESTIMATED',
      next_architecture: 'Module → Service transition for >15 engineers',
    });
    breakpoints.push({
      dimension: 'data_volume',
      current_range: 'Single-node database',
      breakpoint: 'Database exceeds single-node capacity',
      action: 'Implement read replicas, then partitioning/sharding',
      evidence_quality: 'ESTIMATED',
      next_architecture: 'Per-domain database ownership',
    });
  }

  if (['microservices'].includes(patternKey)) {
    breakpoints.push({
      dimension: 'team_size',
      current_range: '>8 engineers',
      breakpoint: '<4 engineers',
      action:
        'Consolidate services into modular monolith — team cannot sustain operational overhead',
      evidence_quality: 'ESTIMATED',
      next_architecture: 'Modular Monolith',
    });
  }

  if (['serverless'].includes(patternKey)) {
    breakpoints.push({
      dimension: 'execution_duration',
      current_range: 'Sub-15-minute tasks',
      breakpoint: 'Tasks exceeding runtime limits',
      action: 'Move long-running workflows to container-based workers',
      evidence_quality: 'DOCUMENTED',
      next_architecture: 'Distributed Workers or container-based services',
    });
    breakpoints.push({
      dimension: 'cold_start_tolerance',
      current_range: 'Acceptable cold start latency',
      breakpoint: 'p99 latency exceeds SLA due to cold starts',
      action: 'Provisioned concurrency or move to always-on containers',
      evidence_quality: 'MEASURED',
      next_architecture: 'Container-based deployment',
    });
  }

  return breakpoints;
}

// ============================================================================
// 8. DOMAIN-SPECIFIC ANALYZERS (SECTIONS 14–27)
// ============================================================================

/**
 * Analyze build vs buy decisions for common components.
 */
function analyzeBuildVsBuy(taskQuery, requirements) {
  const q = (taskQuery || '').toLowerCase();
  const decisions = [];

  const components = [
    {
      match: /(?:auth|login|sso|oauth)/i,
      component: 'Authentication',
      buy: 'Auth0, Clerk, Supabase Auth, Firebase Auth',
      build_reason: 'Custom auth flows, data sovereignty, no vendor dependency',
      buy_reason: 'Faster implementation, proven security, compliance certifications',
    },
    {
      match: /(?:payment|billing|subscription|charge)/i,
      component: 'Payment Processing',
      buy: 'Stripe, Paddle, LemonSqueezy',
      build_reason: 'Rarely justified — regulatory and PCI compliance burden',
      buy_reason: 'PCI compliance handled, fraud detection, global payment methods',
    },
    {
      match: /(?:search|full.text|elastic)/i,
      component: 'Search',
      buy: 'Algolia, Meilisearch, Typesense, ElasticSearch (managed)',
      build_reason: 'Custom ranking algorithms, data privacy',
      buy_reason: 'Performance, relevance tuning, faceted search out-of-box',
    },
    {
      match: /(?:email|smtp|transactional.mail)/i,
      component: 'Email',
      buy: 'Resend, SendGrid, Postmark, AWS SES',
      build_reason: 'Almost never justified',
      buy_reason: 'Deliverability, reputation management, compliance',
    },
    {
      match: /(?:observab|monitor|trace|log|metric)/i,
      component: 'Observability',
      buy: 'Datadog, Grafana Cloud, New Relic',
      build_reason: 'Cost at scale, data privacy',
      buy_reason: 'Immediate visibility, alerting, dashboards',
    },
    {
      match: /(?:vector|embedding|rag|semantic.search)/i,
      component: 'Vector Database',
      buy: 'Pinecone, Weaviate Cloud, Qdrant Cloud',
      build_reason: 'pgvector for simple cases, data sovereignty',
      buy_reason: 'Optimized ANN search, managed scaling',
    },
    {
      match: /(?:feature.flag|toggle|experiment)/i,
      component: 'Feature Flags',
      buy: 'LaunchDarkly, Flagsmith, Unleash',
      build_reason: 'Simple boolean flags can be DIY',
      buy_reason: 'Percentage rollouts, A/B testing, audit trail',
    },
  ];

  for (const c of components) {
    if (c.match.test(q)) {
      decisions.push({
        component: c.component,
        recommendation:
          c.component === 'Payment Processing' || c.component === 'Email' ? 'BUY' : 'EVALUATE',
        buy_options: c.buy,
        build_rationale: c.build_reason,
        buy_rationale: c.buy_reason,
      });
    }
  }

  return decisions;
}

/**
 * Analyze data architecture requirements.
 */
function analyzeDataArchitecture(taskQuery, requirements) {
  const q = (taskQuery || '').toLowerCase();
  const analysis = {
    consistency_model: 'UNKNOWN',
    transaction_boundaries: [],
    read_write_pattern: 'UNKNOWN',
    recommendations: [],
    considerations: [],
  };

  // Consistency model
  if (/(?:payment|financial|ledger|order|inventory|booking)/i.test(q)) {
    analysis.consistency_model = 'STRONG';
    analysis.considerations.push(
      'Financial data requires strong consistency — use ACID transactions.',
    );
    analysis.transaction_boundaries.push(
      'payment execution',
      'inventory reservation',
      'order creation',
    );
  } else if (/(?:feed|timeline|analytics|recommendation|cache)/i.test(q)) {
    analysis.consistency_model = 'EVENTUAL';
    analysis.considerations.push(
      'Feed/analytics data can tolerate eventual consistency for better performance.',
    );
  } else if (/(?:collaboration|editor|realtime)/i.test(q)) {
    analysis.consistency_model = 'CAUSAL';
    analysis.considerations.push(
      'Collaborative editing requires causal consistency with conflict resolution (CRDT/OT).',
    );
  }

  // Read/write pattern
  if (/(?:feed|timeline|dashboard|report|analytics)/i.test(q)) {
    analysis.read_write_pattern = 'READ_HEAVY';
    analysis.recommendations.push('Consider read replicas, caching, and materialized views.');
  } else if (/(?:log|audit|event|ingest|import)/i.test(q)) {
    analysis.read_write_pattern = 'WRITE_HEAVY';
    analysis.recommendations.push(
      'Consider write-optimized storage, append-only logs, and batch inserts.',
    );
  } else {
    analysis.read_write_pattern = 'BALANCED';
  }

  // Database recommendations
  if (
    /(?:relational|sql|postgres|mysql|transaction|acid|join|foreign.key)/i.test(q) ||
    analysis.consistency_model === 'STRONG'
  ) {
    analysis.recommendations.push(
      'PostgreSQL: Strong ACID, extensible (pgvector, PostGIS), mature ecosystem.',
    );
  }
  if (/(?:document|json|flexible.schema|mongo|nosql)/i.test(q)) {
    analysis.recommendations.push(
      'Document store (MongoDB, DynamoDB): Flexible schema, horizontal scaling. Evaluate if relational model is truly insufficient.',
    );
  }
  if (/(?:time.series|iot|sensor|metric|tsdb)/i.test(q)) {
    analysis.recommendations.push(
      'Time-series DB (TimescaleDB, InfluxDB): Optimized for temporal queries and retention.',
    );
  }
  if (/(?:graph|relation|connection|social|network|knowledge)/i.test(q)) {
    analysis.recommendations.push(
      'Graph DB (Neo4j, Neptune): Consider if relationships are the primary query target.',
    );
  }

  return analysis;
}

/**
 * Analyze communication patterns.
 */
function analyzeCommunicationPatterns(taskQuery) {
  const q = (taskQuery || '').toLowerCase();
  const patterns = [];

  if (/(?:api|endpoint|crud|rest)/i.test(q)) {
    patterns.push({
      pattern: 'REST',
      rationale: 'Standard HTTP API for CRUD operations',
      fit: 'HIGH',
    });
  }
  if (/(?:realtime|websocket|presence|chat|collaboration)/i.test(q)) {
    patterns.push({
      pattern: 'WebSocket',
      rationale: 'Bidirectional real-time communication',
      fit: 'HIGH',
    });
  }
  if (/(?:notification|webhook|event.trigger)/i.test(q)) {
    patterns.push({ pattern: 'Webhook', rationale: 'Push-based event notification', fit: 'HIGH' });
  }
  if (/(?:stream|sse|server.sent)/i.test(q)) {
    patterns.push({ pattern: 'SSE', rationale: 'Server-to-client streaming', fit: 'MODERATE' });
  }
  if (/(?:grpc|protobuf|internal.service|high.throughput.rpc)/i.test(q)) {
    patterns.push({
      pattern: 'gRPC',
      rationale: 'High-performance service-to-service communication',
      fit: 'MODERATE',
    });
  }
  if (/(?:graphql|flexible.query|client.driven)/i.test(q)) {
    patterns.push({
      pattern: 'GraphQL',
      rationale: 'Client-driven flexible queries',
      fit: 'MODERATE',
    });
  }
  if (/(?:queue|async|background|worker|job)/i.test(q)) {
    patterns.push({
      pattern: 'Message Queue',
      rationale: 'Asynchronous decoupled processing',
      fit: 'HIGH',
    });
  }

  if (patterns.length === 0) {
    patterns.push({
      pattern: 'REST',
      rationale: 'Default API pattern for HTTP services',
      fit: 'MODERATE',
    });
  }

  return patterns;
}

/**
 * Analyze security architecture.
 */
function analyzeSecurityArchitecture(taskQuery, requirements) {
  const q = (taskQuery || '').toLowerCase();
  const analysis = {
    trust_boundaries: [],
    authentication_model: 'UNKNOWN',
    authorization_model: 'UNKNOWN',
    considerations: [],
    trust_boundary_graph: [],
  };

  // Trust boundary graph
  analysis.trust_boundary_graph = [
    { from: 'Internet', to: 'CDN/WAF', trust_transition: true },
    { from: 'CDN/WAF', to: 'Load Balancer', trust_transition: false },
    { from: 'Load Balancer', to: 'Application', trust_transition: true },
    { from: 'Application', to: 'Database', trust_transition: true },
  ];

  if (/(?:auth|login|jwt|session|oauth|sso)/i.test(q)) {
    analysis.authentication_model = /(?:jwt|token)/i.test(q) ? 'JWT/Token-based' : 'Session-based';
    analysis.considerations.push('Enforce cryptographic signature verification on all tokens.');
    analysis.considerations.push('Implement token expiration and refresh rotation.');
  }

  if (/(?:rbac|role|permission|acl|authorization)/i.test(q)) {
    analysis.authorization_model = 'RBAC';
    analysis.considerations.push('Define authorization matrix: User × Role × Resource × Action.');
    analysis.considerations.push('Enforce authorization before business logic, never after.');
  }

  if (/(?:multi.tenant|tenant|workspace)/i.test(q)) {
    analysis.considerations.push('CRITICAL: Tenant isolation at every data access boundary.');
    analysis.considerations.push(
      'Verify cross-tenant access is impossible at database query level.',
    );
    analysis.trust_boundary_graph.push({
      from: 'Application',
      to: 'Tenant Boundary',
      trust_transition: true,
    });
  }

  if (/(?:agent|llm|prompt|ai|tool)/i.test(q)) {
    analysis.considerations.push(
      'Agent sandboxing: restrict subprocess execution and tool permissions.',
    );
    analysis.considerations.push(
      'Prompt injection defense: isolate user input from system instructions.',
    );
    analysis.trust_boundary_graph.push({
      from: 'Application',
      to: 'AI Agent Sandbox',
      trust_transition: true,
    });
  }

  return analysis;
}

/**
 * Analyze cost architecture for a candidate.
 */
function analyzeCostArchitecture(candidate, constraints) {
  const patternKey = candidate.pattern || '';
  const costDrivers = {
    compute: 'UNKNOWN',
    database: 'UNKNOWN',
    storage: 'UNKNOWN',
    network: 'UNKNOWN',
    managed_services: 'UNKNOWN',
    observability: 'UNKNOWN',
    operations: 'UNKNOWN',
  };

  const costProfiles = {
    monolith: {
      compute: 'LOW',
      database: 'LOW',
      storage: 'LOW',
      network: 'LOW',
      managed_services: 'LOW',
      observability: 'LOW',
      operations: 'LOW',
    },
    modular_monolith: {
      compute: 'LOW',
      database: 'LOW',
      storage: 'LOW',
      network: 'LOW',
      managed_services: 'LOW',
      observability: 'LOW',
      operations: 'LOW',
    },
    microservices: {
      compute: 'HIGH',
      database: 'HIGH',
      storage: 'MODERATE',
      network: 'HIGH',
      managed_services: 'HIGH',
      observability: 'HIGH',
      operations: 'HIGH',
    },
    serverless: {
      compute: 'VARIABLE',
      database: 'MODERATE',
      storage: 'LOW',
      network: 'LOW',
      managed_services: 'MODERATE',
      observability: 'MODERATE',
      operations: 'LOW',
    },
    event_driven: {
      compute: 'MODERATE',
      database: 'MODERATE',
      storage: 'MODERATE',
      network: 'MODERATE',
      managed_services: 'MODERATE',
      observability: 'MODERATE',
      operations: 'MODERATE',
    },
    streaming: {
      compute: 'HIGH',
      database: 'HIGH',
      storage: 'HIGH',
      network: 'HIGH',
      managed_services: 'HIGH',
      observability: 'HIGH',
      operations: 'HIGH',
    },
  };

  const profile = costProfiles[patternKey] || {};
  Object.assign(costDrivers, profile);

  return {
    pattern: candidate.name || patternKey,
    cost_drivers: costDrivers,
    cost_category: ['monolith', 'modular_monolith'].includes(patternKey)
      ? 'LOW'
      : ['microservices', 'streaming'].includes(patternKey)
        ? 'HIGH'
        : 'MODERATE',
    scaling_cost_model: ['serverless'].includes(patternKey) ? 'PAY_PER_USE' : 'FIXED_PLUS_VARIABLE',
    notes: [],
  };
}

/**
 * Analyze operational complexity for a candidate.
 */
function analyzeOperationalComplexity(candidate) {
  const patternKey = candidate.pattern || '';
  const profiles = {
    monolith: {
      deployment_units: 1,
      services: 1,
      databases: 1,
      queues: 0,
      secrets: 'FEW',
      monitoring: 'BASIC',
      on_call: 'LOW',
    },
    modular_monolith: {
      deployment_units: 1,
      services: 1,
      databases: 1,
      queues: 0,
      secrets: 'FEW',
      monitoring: 'BASIC',
      on_call: 'LOW',
    },
    microservices: {
      deployment_units: 'MANY',
      services: 'MANY',
      databases: 'MANY',
      queues: 'SEVERAL',
      secrets: 'MANY',
      monitoring: 'COMPLEX',
      on_call: 'HIGH',
    },
    serverless: {
      deployment_units: 'MANY_FUNCTIONS',
      services: 'MANY_FUNCTIONS',
      databases: 1,
      queues: 'FEW',
      secrets: 'MODERATE',
      monitoring: 'MODERATE',
      on_call: 'LOW',
    },
    event_driven: {
      deployment_units: 'SEVERAL',
      services: 'SEVERAL',
      databases: 'FEW',
      queues: 'SEVERAL',
      secrets: 'MODERATE',
      monitoring: 'MODERATE',
      on_call: 'MODERATE',
    },
    streaming: {
      deployment_units: 'MANY',
      services: 'MANY',
      databases: 'SEVERAL',
      queues: 'MANY',
      secrets: 'MANY',
      monitoring: 'COMPLEX',
      on_call: 'HIGH',
    },
  };

  return (
    profiles[patternKey] || {
      deployment_units: 'UNKNOWN',
      services: 'UNKNOWN',
      databases: 'UNKNOWN',
      queues: 'UNKNOWN',
      secrets: 'UNKNOWN',
      monitoring: 'UNKNOWN',
      on_call: 'UNKNOWN',
    }
  );
}

// ============================================================================
// 9. MIGRATION & EVOLUTION INTELLIGENCE (SECTIONS 28–29)
// ============================================================================

/**
 * Analyze migration path between architectures.
 */
function analyzeMigration(currentArch, targetArch) {
  const migration = {
    current: currentArch,
    target: targetArch,
    strategy: 'INCREMENTAL',
    risk_level: 'MODERATE',
    steps: [],
    rollback_plan: 'Maintain dual deployment during migration; route traffic via feature flags.',
    considerations: [],
  };

  if (currentArch === 'monolith' && targetArch === 'modular_monolith') {
    migration.risk_level = 'LOW';
    migration.steps = [
      'Identify domain boundaries in existing code',
      'Extract shared code into internal library modules',
      'Define module interfaces (internal API contracts)',
      'Enforce module boundaries via import restrictions',
      'Add module-level integration tests',
    ];
  } else if (currentArch === 'modular_monolith' && targetArch === 'microservices') {
    migration.risk_level = 'HIGH';
    migration.strategy = 'STRANGLER_FIG';
    migration.steps = [
      'Identify highest-value module for extraction (highest deployment friction)',
      'Set up service infrastructure (discovery, auth, observability)',
      'Extract module to independent service behind API gateway',
      'Implement dual-write/read with consistency verification',
      'Migrate traffic incrementally via feature flags',
      'Decommission monolith module after verification period',
    ];
    migration.considerations.push(
      'CRITICAL: Big-bang migration has high failure risk. Use Strangler Fig pattern.',
    );
  }

  return migration;
}

/**
 * Analyze evolution paths for an architecture.
 */
function analyzeEvolution(candidate) {
  const patternKey = candidate.pattern || '';
  const evolution = {
    pattern: candidate.name || patternKey,
    evolution_paths: [],
    growth_directions: [],
  };

  if (['monolith', 'modular_monolith'].includes(patternKey)) {
    evolution.evolution_paths = [
      {
        trigger: 'Traffic growth beyond single-node',
        target: 'Horizontal scaling + read replicas',
      },
      { trigger: 'Team growth beyond 8–10', target: 'Service decomposition via Strangler Fig' },
      {
        trigger: 'New compliance requirements',
        target: 'Add audit logging module, encryption at rest',
      },
      { trigger: 'Geographic expansion', target: 'Multi-region deployment with read replicas' },
    ];
    evolution.growth_directions = ['vertical_first', 'then_horizontal', 'then_decomposition'];
  }

  if (['microservices'].includes(patternKey)) {
    evolution.evolution_paths = [
      { trigger: 'Team shrinkage', target: 'Consolidate services into fewer, larger services' },
      {
        trigger: 'Service mesh complexity',
        target: 'Evaluate managed service mesh or simplification',
      },
      {
        trigger: 'Data consistency challenges',
        target: 'Introduce saga orchestrator or event sourcing',
      },
    ];
    evolution.growth_directions = ['service_per_team', 'independent_scaling'];
  }

  if (['serverless'].includes(patternKey)) {
    evolution.evolution_paths = [
      {
        trigger: 'Cold start exceeds SLA',
        target: 'Provisioned concurrency or container migration',
      },
      {
        trigger: 'Vendor lock-in concern',
        target: 'Abstract via ports & adapters for portability',
      },
      {
        trigger: 'Long-running workflows',
        target: 'Step Functions / Durable Functions or container workers',
      },
    ];
    evolution.growth_directions = ['function_per_feature', 'managed_services'];
  }

  return evolution;
}

// ============================================================================
// 10. ADR GENERATION (SECTION 30)
// ============================================================================

/**
 * Generate an Architecture Decision Record.
 *
 * @param {Object} params
 * @returns {Object} ADR
 */
function generateADR(params) {
  const {
    task,
    requirements,
    constraints,
    candidates,
    tradeoffs,
    decision,
    antiPatterns,
    sensitivity,
    breakpoints,
    securityAnalysis,
  } = params;

  const selectedCandidate = decision || (candidates && candidates[0]) || {};
  const rejectedCandidates = (candidates || []).filter(c => c.name !== selectedCandidate.name);

  return {
    id: `ADR-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
    title: `Architecture Decision: ${selectedCandidate.name || 'Unknown'}`,
    status: 'PROPOSED',
    date: new Date().toISOString(),
    context: {
      task: task || '',
      functional_requirements: (requirements && requirements.functional) || [],
      non_functional_requirements: (requirements && requirements.non_functional) || [],
      constraints: (constraints && constraints.constraints) || [],
      unknowns: (requirements && requirements.unknowns) || [],
    },
    decision: {
      architecture: selectedCandidate.name || 'Unknown',
      pattern: selectedCandidate.pattern || '',
      rationale: selectedCandidate.reasons || [],
      score: selectedCandidate.score || 0,
    },
    tradeoffs: tradeoffs || {},
    rejected_alternatives: rejectedCandidates.map(c => ({
      architecture: c.name,
      pattern: c.pattern,
      rejection_reason: c.risks || [],
      score: c.score || 0,
    })),
    anti_patterns_detected: antiPatterns || [],
    assumptions: (requirements && requirements.assumptions) || [],
    evidence: [],
    risks: selectedCandidate.risks || [],
    decision_sensitivity: sensitivity || [],
    breakpoints: breakpoints || [],
    security_considerations: (securityAnalysis && securityAnalysis.considerations) || [],
    verification_plan: [
      'Verify architecture handles expected load via load test',
      'Verify failure behavior via Phase 6 pre-mortem simulation',
      'Verify security boundaries via Phase 8 validation',
      'Review decision sensitivity assumptions quarterly',
    ],
    revisit_conditions: [
      'Traffic exceeds estimated breakpoint thresholds',
      'Team size changes significantly',
      'New compliance requirements imposed',
      'Cost exceeds projected budget by >50%',
      'Critical failure mode materializes in production',
    ],
  };
}

// ============================================================================
// 11. ARCHITECTURE GRAPH (SECTION 39)
// ============================================================================

/**
 * Generate a machine-readable architecture graph.
 */
function generateArchitectureGraph(candidate, requirements, securityAnalysis) {
  const patternKey = candidate.pattern || '';
  const nodes = [];
  const edges = [];

  // Always have a client
  nodes.push({
    id: 'client',
    type: 'external',
    technology: 'Browser/Mobile',
    responsibility: 'User interaction',
    scaling_model: 'N/A',
  });

  // API layer
  nodes.push({
    id: 'api',
    type: 'service',
    technology: 'API Server',
    responsibility: 'Request handling, routing, validation',
    scaling_model: 'horizontal',
    security_boundary: true,
  });
  edges.push({ from: 'client', to: 'api', protocol: 'HTTPS' });

  // Database
  nodes.push({
    id: 'database',
    type: 'datastore',
    technology: 'PostgreSQL',
    responsibility: 'Primary data persistence',
    scaling_model: 'vertical + read replicas',
    security_boundary: true,
  });
  edges.push({ from: 'api', to: 'database', protocol: 'TCP' });

  // Pattern-specific nodes
  if (['event_driven', 'microservices', 'distributed_workers'].includes(patternKey)) {
    nodes.push({
      id: 'queue',
      type: 'infrastructure',
      technology: 'Message Queue',
      responsibility: 'Async task routing',
      scaling_model: 'partition-based',
    });
    nodes.push({
      id: 'worker',
      type: 'service',
      technology: 'Background Worker',
      responsibility: 'Async processing',
      scaling_model: 'horizontal',
    });
    edges.push({ from: 'api', to: 'queue', protocol: 'AMQP/SQS' });
    edges.push({ from: 'queue', to: 'worker', protocol: 'AMQP/SQS' });
    edges.push({ from: 'worker', to: 'database', protocol: 'TCP' });
  }

  // Cache
  if (
    requirements &&
    requirements.functional &&
    requirements.functional.some(f => f.domain === 'performance' || f.req === 'caching layer')
  ) {
    nodes.push({
      id: 'cache',
      type: 'infrastructure',
      technology: 'Redis',
      responsibility: 'Query caching, session storage',
      scaling_model: 'horizontal',
    });
    edges.push({ from: 'api', to: 'cache', protocol: 'TCP' });
  }

  // External services
  if (
    requirements &&
    requirements.functional &&
    requirements.functional.some(f => f.domain === 'financial')
  ) {
    nodes.push({
      id: 'payment_gateway',
      type: 'external',
      technology: 'Stripe/Payment Provider',
      responsibility: 'Payment processing',
      scaling_model: 'managed',
    });
    edges.push({ from: 'api', to: 'payment_gateway', protocol: 'HTTPS' });
  }

  return { nodes, edges, pattern: candidate.name || patternKey };
}

// ============================================================================
// 12. ARCHITECTURE DIFFERENCE ENGINE (SECTION 40)
// ============================================================================

/**
 * Compare two architectures and identify material differences.
 */
function diffArchitectures(archA, archB) {
  const diff = {
    architectures: { a: archA.name || 'A', b: archB.name || 'B' },
    components_added: [],
    components_removed: [],
    dependencies_changed: [],
    failure_modes_changed: [],
    consistency_changed: false,
    cost_changed: false,
    operational_burden_changed: false,
    security_boundaries_changed: false,
    scaling_behavior_changed: false,
    summary: '',
  };

  const patternA = ARCHITECTURE_PATTERNS[archA.pattern] || {};
  const patternB = ARCHITECTURE_PATTERNS[archB.pattern] || {};

  // Compare required capabilities
  const capsA = new Set(patternA.required_capabilities || []);
  const capsB = new Set(patternB.required_capabilities || []);
  diff.components_added = [...capsB].filter(c => !capsA.has(c));
  diff.components_removed = [...capsA].filter(c => !capsB.has(c));

  // Compare failure modes
  const fmA = new Set(patternA.failure_modes || []);
  const fmB = new Set(patternB.failure_modes || []);
  diff.failure_modes_changed = [...fmB].filter(f => !fmA.has(f));

  // Compare operational cost
  diff.cost_changed = patternA.operational_cost !== patternB.operational_cost;
  diff.operational_burden_changed = patternA.operational_cost !== patternB.operational_cost;

  // Compare scaling
  const scaleA = JSON.stringify(patternA.scaling_characteristics || {});
  const scaleB = JSON.stringify(patternB.scaling_characteristics || {});
  diff.scaling_behavior_changed = scaleA !== scaleB;

  // Compare security
  const secA = (patternA.security_considerations || []).length;
  const secB = (patternB.security_considerations || []).length;
  diff.security_boundaries_changed = secA !== secB;

  diff.summary =
    `Moving from ${diff.architectures.a} to ${diff.architectures.b}: ` +
    `+${diff.components_added.length} components, -${diff.components_removed.length} components, ` +
    `${diff.failure_modes_changed.length} new failure modes.`;

  return diff;
}

// ============================================================================
// 13. DECISION REVERSIBILITY & CONFIDENCE (SECTIONS 31–32)
// ============================================================================

/**
 * Classify architecture decision reversibility.
 */
function classifyArchitectureReversibility(decisionType) {
  const classifications = {
    ui_library: 'EASILY_REVERSIBLE',
    css_framework: 'EASILY_REVERSIBLE',
    api_framework: 'MODERATELY_REVERSIBLE',
    database_choice: 'HARD_TO_REVERSE',
    data_model: 'HARD_TO_REVERSE',
    consistency_model: 'HARD_TO_REVERSE',
    api_contract: 'MODERATELY_REVERSIBLE',
    deployment_platform: 'MODERATELY_REVERSIBLE',
    architecture_pattern: 'HARD_TO_REVERSE',
    message_broker: 'MODERATELY_REVERSIBLE',
    auth_provider: 'MODERATELY_REVERSIBLE',
    cloud_provider: 'HARD_TO_REVERSE',
  };
  return classifications[decisionType] || 'UNKNOWN';
}

/**
 * Assess architecture confidence across dimensions.
 */
function assessArchitectureConfidence(requirements) {
  const confidence = {};
  const constraints = (requirements && requirements.constraints) || [];
  const unknowns = (requirements && requirements.unknowns) || [];

  confidence.database = constraints.some(c => c.category === 'technology') ? 'KNOWN' : 'ESTIMATED';
  confidence.traffic = constraints.some(c => c.category === 'scale' || c.category === 'performance')
    ? 'SUPPORTED'
    : 'UNKNOWN';
  confidence.team = constraints.some(c => c.category === 'team') ? 'KNOWN' : 'UNKNOWN';
  confidence.budget = constraints.some(c => c.category === 'cost') ? 'KNOWN' : 'UNKNOWN';
  confidence.compliance = constraints.some(c => c.category === 'governance') ? 'KNOWN' : 'UNKNOWN';
  confidence.geographic = constraints.some(c => c.req === 'data residency') ? 'KNOWN' : 'UNKNOWN';

  return confidence;
}

// ============================================================================
// 14. FITNESS TEST GENERATOR (SECTION 42)
// ============================================================================

/**
 * Generate architecture fitness tests for a candidate + ADR.
 */
function generateFitnessTests(candidate, adr) {
  const tests = [];
  const patternKey = candidate.pattern || '';

  // Universal tests
  tests.push({
    name: 'no_circular_dependencies',
    description: 'No circular dependency chains between modules/services',
    type: 'structural',
    automated: true,
  });
  tests.push({
    name: 'no_forbidden_dependencies',
    description: 'No module imports from forbidden layers (e.g., infrastructure importing domain)',
    type: 'structural',
    automated: true,
  });
  tests.push({
    name: 'no_missing_timeouts',
    description: 'All external HTTP/RPC calls have explicit timeout configuration',
    type: 'resilience',
    automated: true,
  });
  tests.push({
    name: 'no_unbounded_retries',
    description: 'All retry logic has maximum attempt limits and backoff',
    type: 'resilience',
    automated: true,
  });

  // Pattern-specific tests
  if (['modular_monolith', 'hexagonal'].includes(patternKey)) {
    tests.push({
      name: 'module_boundary_enforcement',
      description: 'Modules access each other only through defined interfaces, not direct imports',
      type: 'structural',
      automated: true,
    });
  }

  if (['microservices', 'event_driven'].includes(patternKey)) {
    tests.push({
      name: 'no_shared_database',
      description: 'Each service owns its database; no direct cross-service DB access',
      type: 'data_ownership',
      automated: true,
    });
    tests.push({
      name: 'no_synchronous_chain',
      description: 'No synchronous call chain exceeding 3 services deep',
      type: 'resilience',
      automated: true,
    });
  }

  if (adr && adr.security_considerations && adr.security_considerations.length > 0) {
    tests.push({
      name: 'auth_before_business_logic',
      description:
        'All API endpoints enforce authentication and authorization before executing business logic',
      type: 'security',
      automated: true,
    });
  }

  return tests;
}

// ============================================================================
// 15. DRIFT DETECTION (SECTION 41)
// ============================================================================

/**
 * Detect architectural drift between implementation and ADR.
 */
function detectArchitecturalDrift(implementation, adr) {
  const drifts = [];

  if (!implementation || !adr) return drifts;

  // Check for unauthorized dependencies
  const implDeps = implementation.dependencies || [];
  const adrDeps = (adr.decision && adr.decision.rationale) || [];

  // Check for new direct database access bypassing intended boundaries
  if (implementation.direct_db_access_from_unauthorized_layer) {
    drifts.push({
      type: 'BOUNDARY_VIOLATION',
      severity: 'HIGH',
      description:
        'Direct database access detected from unauthorized layer, bypassing repository boundary.',
      adr_reference: adr.id || 'N/A',
    });
  }

  // Check for new service dependencies creating synchronous cycles
  if (implementation.synchronous_cycle_detected) {
    drifts.push({
      type: 'DEPENDENCY_CYCLE',
      severity: 'CRITICAL',
      description:
        'New synchronous service dependency creates a cycle, contradicting ADR architecture.',
      adr_reference: adr.id || 'N/A',
    });
  }

  // Check for new cache creating second source of truth
  if (implementation.new_cache_without_invalidation) {
    drifts.push({
      type: 'DATA_INTEGRITY',
      severity: 'HIGH',
      description:
        'New cache introduced without invalidation strategy creates second source of truth.',
      adr_reference: adr.id || 'N/A',
    });
  }

  // Check for new API bypassing auth middleware
  if (implementation.api_bypasses_auth) {
    drifts.push({
      type: 'SECURITY_VIOLATION',
      severity: 'CRITICAL',
      description: 'New API endpoint bypasses authentication/authorization middleware.',
      adr_reference: adr.id || 'N/A',
    });
  }

  return drifts;
}

// ============================================================================
// 16. PHASE 7 METRICS TRACKER (SECTION 45)
// ============================================================================

class Phase7MetricsTracker {
  constructor() {
    this.metrics = {
      requirement_extraction_accuracy: { correct: 0, total: 0 },
      constraint_discovery_rate: { discovered: 0, total: 0 },
      candidate_relevance: { relevant: 0, total: 0 },
      tradeoff_coverage: { covered: 0, total: 0 },
      unsupported_assumption_detection: { detected: 0, total: 0 },
      architecture_failure_discovery: { discovered: 0, total: 0 },
      adr_completeness: { complete_fields: 0, total_fields: 0 },
      drift_detection: { detected: 0, total: 0 },
      decision_reversal_detection: { detected: 0, total: 0 },
      simulation_decision_coverage: { covered: 0, total: 0 },
      historical_reuse_accuracy: { accurate: 0, total: 0 },
    };
  }

  record(metric, success) {
    if (this.metrics[metric]) {
      this.metrics[metric].total++;
      if (success) {
        const key = Object.keys(this.metrics[metric]).find(k => k !== 'total');
        if (key) this.metrics[metric][key]++;
      }
    }
  }

  getMetrics() {
    const result = {};
    for (const [key, val] of Object.entries(this.metrics)) {
      result[key] = {
        ...val,
        rate: val.total > 0 ? val[Object.keys(val).find(k => k !== 'total')] / val.total : 0,
      };
    }
    return result;
  }
}

let _phase7MetricsTracker = null;

function getPhase7MetricsTracker() {
  if (!_phase7MetricsTracker) {
    _phase7MetricsTracker = new Phase7MetricsTracker();
  }
  return _phase7MetricsTracker;
}

// ============================================================================
// 17. PROGRESSIVE ANALYSIS (SECTION 46)
// ============================================================================

/**
 * Determine how deep the architecture analysis should go.
 *
 * @param {string} taskQuery
 * @returns {string} 'NONE' | 'MINIMAL' | 'STANDARD' | 'FULL'
 */
function determineAnalysisDepth(taskQuery) {
  const q = (taskQuery || '').toLowerCase();

  // Tier 0: No architecture analysis needed
  if (/(?:^fix|^typo|^css|^format|^rename|^lint|^style|^readme|^comment|^doc)/i.test(q.trim())) {
    return 'NONE';
  }

  // Tier 1: Minimal — single file change, simple logic
  if (/(?:^add.*button|^change.*color|^update.*text|^modify.*config|^add.*field)/i.test(q.trim())) {
    return 'MINIMAL';
  }

  // Tier 3: Full — architectural keywords present
  if (
    /(?:architect|design.*system|multi.?tenant|distributed|microservice|platform|saas|scale|million|enterprise|migrate)/i.test(
      q,
    )
  ) {
    return 'FULL';
  }

  // Tier 2: Standard — multi-component work
  if (/(?:build|create|implement|api|backend|frontend|database|service|application|app)/i.test(q)) {
    return 'STANDARD';
  }

  return 'MINIMAL';
}

// ============================================================================
// 18. MAIN ORCHESTRATOR — runArchitectureAnalysis
// ============================================================================

/**
 * Run the full Phase 7 architecture intelligence pipeline.
 *
 * @param {string} taskQuery
 * @param {Object} [options]
 * @returns {Object} Full architecture analysis
 */
function runArchitectureAnalysis(taskQuery, options = {}) {
  const depth = options.depth || determineAnalysisDepth(taskQuery);

  if (depth === 'NONE') {
    return {
      task: taskQuery,
      depth: 'NONE',
      skipped: true,
      reason: 'Task does not require architecture analysis (Tier 0).',
      requirements: null,
      candidates: null,
      tradeoffs: null,
      adr: null,
    };
  }

  // Step 1: Extract requirements
  const requirements = extractRequirements(taskQuery);

  // Step 2: Extract constraints
  const constraintResult = extractConstraints(taskQuery, requirements);

  if (depth === 'MINIMAL') {
    return {
      task: taskQuery,
      depth: 'MINIMAL',
      requirements,
      constraints: constraintResult,
      candidates: null,
      tradeoffs: null,
      adr: null,
      anti_patterns: [],
      reason: 'Task requires minimal architecture analysis (Tier 1).',
    };
  }

  // Step 3: Detect anti-patterns
  const antiPatterns = detectAntiPatterns(taskQuery, requirements);

  // Step 4: Generate candidates
  const candidateResult = generateCandidates(requirements, constraintResult);

  // Step 5: Build trade-offs
  let tradeoffResult = null;
  if (candidateResult.candidates.length >= 2) {
    tradeoffResult = analyzeTradeoffs(candidateResult.candidates, requirements, constraintResult);
  }

  // Step 6: Decision sensitivity
  const sensitivity = analyzeDecisionSensitivity(
    candidateResult.candidates,
    tradeoffResult,
    requirements,
  );

  // Step 7: Breakpoints for top candidate
  const breakpoints = candidateResult.candidates[0]
    ? identifyBreakpoints(candidateResult.candidates[0], requirements)
    : [];

  // Step 8: Domain-specific analysis
  const buildVsBuy = analyzeBuildVsBuy(taskQuery, requirements);
  const dataArchitecture = analyzeDataArchitecture(taskQuery, requirements);
  const communicationPatterns = analyzeCommunicationPatterns(taskQuery);
  const securityArchitecture = analyzeSecurityArchitecture(taskQuery, requirements);

  // Step 9: Cost & operational analysis for top candidate
  let costAnalysis = null;
  let operationalAnalysis = null;
  if (candidateResult.candidates[0]) {
    costAnalysis = analyzeCostArchitecture(candidateResult.candidates[0], constraintResult);
    operationalAnalysis = analyzeOperationalComplexity(candidateResult.candidates[0]);
  }

  // Step 10: Evolution analysis
  const evolutionAnalysis = candidateResult.candidates[0]
    ? analyzeEvolution(candidateResult.candidates[0])
    : null;

  // Step 11: Architecture graph
  const architectureGraph = candidateResult.candidates[0]
    ? generateArchitectureGraph(candidateResult.candidates[0], requirements, securityArchitecture)
    : null;

  // Step 12: Confidence assessment
  const confidence = assessArchitectureConfidence(requirements);

  // Step 13: Fitness tests
  let fitnessTests = [];
  let adr = null;

  if (depth === 'FULL' || candidateResult.candidates.length > 0) {
    // Step 14: Generate ADR
    adr = generateADR({
      task: taskQuery,
      requirements,
      constraints: constraintResult,
      candidates: candidateResult.candidates,
      tradeoffs: tradeoffResult,
      decision: candidateResult.candidates[0],
      antiPatterns,
      sensitivity,
      breakpoints,
      securityAnalysis: securityArchitecture,
    });

    fitnessTests = candidateResult.candidates[0]
      ? generateFitnessTests(candidateResult.candidates[0], adr)
      : [];
  }

  return {
    task: taskQuery,
    depth,
    requirements,
    constraints: constraintResult,
    anti_patterns: antiPatterns,
    candidates: candidateResult,
    tradeoffs: tradeoffResult,
    decision_sensitivity: sensitivity,
    breakpoints,
    build_vs_buy: buildVsBuy,
    data_architecture: dataArchitecture,
    communication_patterns: communicationPatterns,
    security_architecture: securityArchitecture,
    cost_analysis: costAnalysis,
    operational_analysis: operationalAnalysis,
    evolution: evolutionAnalysis,
    architecture_graph: architectureGraph,
    confidence,
    fitness_tests: fitnessTests,
    adr,
    memory_updates: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  REQUIREMENT_TYPES,
  CONFIDENCE_LEVELS,
  ARCHITECTURE_PATTERNS,
  ANTI_PATTERNS,
  TRADEOFF_CRITERIA,

  // Requirement Intelligence (§4–§5)
  extractRequirements,

  // Constraint Extraction (§6)
  extractConstraints,

  // Pattern Registry (§8)
  getArchitecturePatterns,

  // Anti-Pattern Detection (§9)
  detectAntiPatterns,

  // Candidate Generation (§7)
  generateCandidates,

  // Trade-Off Engine (§10–§11)
  analyzeTradeoffs,
  rateCriterion,
  determineCriterionImportance,

  // Decision Sensitivity & Breakpoints (§12–§13)
  analyzeDecisionSensitivity,
  identifyBreakpoints,

  // Domain-Specific Analyzers (§14–§27)
  analyzeBuildVsBuy,
  analyzeDataArchitecture,
  analyzeCommunicationPatterns,
  analyzeSecurityArchitecture,
  analyzeCostArchitecture,
  analyzeOperationalComplexity,

  // Migration & Evolution (§28–§29)
  analyzeMigration,
  analyzeEvolution,

  // ADR Generation (§30)
  generateADR,

  // Architecture Graph (§39)
  generateArchitectureGraph,

  // Difference Engine (§40)
  diffArchitectures,

  // Reversibility & Confidence (§31–§32)
  classifyArchitectureReversibility,
  assessArchitectureConfidence,

  // Fitness Tests (§42)
  generateFitnessTests,

  // Drift Detection (§41)
  detectArchitecturalDrift,

  // Metrics (§45)
  Phase7MetricsTracker,
  getPhase7MetricsTracker,

  // Progressive Analysis (§46)
  determineAnalysisDepth,

  // Main Orchestrator
  runArchitectureAnalysis,
};
