#!/usr/bin/env node
/**
 * cross_domain_engine.js — Tribunal Kit Phase 9: Cross-Domain Engineering Intelligence
 * ====================================================================================
 * Core Invariant:
 *   DISCOVER FIRST. COMPOSE SECOND. CREATE ONLY WHEN NECESSARY.
 *   VERIFY ALWAYS. TRACE INTERACTIONS.
 *
 * Added Invariant:
 *   CROSS-DOMAIN INTERACTION INVARIANT:
 *   An engineering decision must not be evaluated only within
 *   the domain in which it appears.
 *
 * Pipeline:
 *   CONCEPTS → DOMAINS → INTERACTION GRAPH → SECOND-ORDER EFFECTS
 *   → FAILURE PROPAGATION → RESOURCE CONTENTION → SECURITY BOUNDARIES
 *   → CONSTRAINT CONFLICTS → TRADEOFFS → VALIDATION REQUIREMENTS
 *   → ENGINEERING MEMORY FEEDBACK
 *
 * This module:
 *   - USES existing concept_extractor.js for concept + domain discovery
 *   - USES existing consideration_engine.js for per-concept considerations
 *   - USES existing simulation_engine.js for failure chains + blast radius
 *   - USES existing engineering_memory.js for historical failure reuse
 *   - EXTENDS analysis with cross-domain interaction graph
 *   - EXTENDS analysis with second-order effect chains
 *   - EXTENDS analysis with failure propagation graphs
 *   - EXTENDS analysis with cross-domain validation requirements
 *   - DOES NOT duplicate concept extraction or failure taxonomy
 */

'use strict';

// ============================================================================
// 1. RELATIONSHIP TAXONOMY (Section 5)
// ============================================================================

const RELATIONSHIP_TYPES = {
  DEPENDENCY: 'DEPENDENCY',
  CONFLICT: 'CONFLICT',
  TRADEOFF: 'TRADEOFF',
  AMPLIFICATION: 'AMPLIFICATION',
  MITIGATION: 'MITIGATION',
  COUPLING: 'COUPLING',
  CONSTRAINT: 'CONSTRAINT',
  SIDE_EFFECT: 'SIDE_EFFECT',
  FAILURE_PROPAGATION: 'FAILURE_PROPAGATION',
  RESOURCE_CONTENTION: 'RESOURCE_CONTENTION',
  SECURITY_BOUNDARY: 'SECURITY_BOUNDARY',
  CONSISTENCY_INTERACTION: 'CONSISTENCY_INTERACTION',
  PERFORMANCE_INTERACTION: 'PERFORMANCE_INTERACTION',
  COST_INTERACTION: 'COST_INTERACTION',
  OPERATIONAL_DEPENDENCY: 'OPERATIONAL_DEPENDENCY',
  RECOVERY_DEPENDENCY: 'RECOVERY_DEPENDENCY',
};

const INTERACTION_PRIORITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

const INTERACTION_CONFIDENCE = {
  VERIFIED: 'VERIFIED',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  SPECULATIVE: 'SPECULATIVE',
};

// ============================================================================
// 2. CROSS-DOMAIN INTERACTION GRAPH (Sections 4, 7)
// ============================================================================

/**
 * Canonical interaction rules.
 * Each rule defines a relationship between two concepts (or concept domains).
 * These are reusable, evidence-backed engineering relationships.
 *
 * Format:
 *   { a, b, relationship, effect, priority, confidence, reason, domains, validation }
 *
 * "a" and "b" can be concept IDs (matching taxonomy) or domain patterns.
 */
const INTERACTION_RULES = [
  // ── Retry Domain ──
  {
    a: 'retry',
    b: 'idempotency',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'Retried requests may duplicate side effects without idempotency protection',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Any retried mutation that lacks an idempotency guard can execute the business effect twice',
    domains: ['reliability', 'backend', 'data-integrity'],
    validation: ['duplicate_request_test', 'idempotency_key_enforcement'],
  },
  {
    a: 'retry',
    b: 'database',
    relationship: RELATIONSHIP_TYPES.AMPLIFICATION,
    effect: 'Retries amplify database load proportionally to retry count',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Each retry attempt creates additional database queries, consuming connection pool resources',
    domains: ['reliability', 'database', 'performance'],
    validation: ['connection_pool_saturation_test', 'load_test_under_retry'],
  },
  {
    a: 'retry',
    b: 'rate_limiting',
    relationship: RELATIONSHIP_TYPES.AMPLIFICATION,
    effect: 'Retries consume rate-limit budget, potentially blocking legitimate traffic',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Retried requests are counted against the same rate-limit bucket as original requests',
    domains: ['reliability', 'security', 'networking'],
    validation: ['rate_limit_budget_test'],
  },
  {
    a: 'retry',
    b: 'circuit_breaker',
    relationship: RELATIONSHIP_TYPES.MITIGATION,
    effect: 'Circuit breaker prevents retry storms from overwhelming recovering services',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Without circuit breaking, retries during outage compound the failure instead of containing it',
    domains: ['reliability', 'distributed-systems'],
    validation: ['circuit_breaker_open_test'],
  },
  {
    a: 'retry',
    b: 'timeout',
    relationship: RELATIONSHIP_TYPES.AMPLIFICATION,
    effect: 'Timeout + retry creates multiplicative latency and load amplification',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Each retry waits for the full timeout before retrying, creating n * timeout total delay',
    domains: ['reliability', 'performance'],
    validation: ['timeout_retry_amplification_test'],
  },
  {
    a: 'retry',
    b: 'external_api',
    relationship: RELATIONSHIP_TYPES.COST_INTERACTION,
    effect: 'Retries multiply external API call costs (tokens, quotas, charges)',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Each retry is billed as a separate API call by the external provider',
    domains: ['cost', 'reliability'],
    validation: ['cost_under_retry_analysis'],
  },

  // ── Cache Domain ──
  {
    a: 'cache',
    b: 'consistency',
    relationship: RELATIONSHIP_TYPES.CONFLICT,
    effect: 'Cache introduces potential data staleness for reads',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Cached values may become stale after the source of truth is updated',
    domains: ['performance', 'data-integrity'],
    validation: ['cache_invalidation_test', 'stale_read_detection_test'],
  },
  {
    a: 'cache',
    b: 'authorization',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'Cached authorization data may persist after permission revocation',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'If authorization decisions are cached, a revoked permission remains active until cache expires',
    domains: ['security', 'performance'],
    validation: ['permission_revocation_propagation_test'],
  },
  {
    a: 'cache',
    b: 'multi_tenancy',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'Cache key without tenant scope can leak data across tenants',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Shared cache keys not scoped by tenant ID return data belonging to other tenants',
    domains: ['security', 'performance', 'isolation'],
    validation: ['cross_tenant_cache_leakage_test'],
  },
  {
    a: 'cache',
    b: 'database',
    relationship: RELATIONSHIP_TYPES.TRADEOFF,
    effect: 'Cache reduces database load but introduces invalidation complexity',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Trade: lower DB queries and latency vs. invalidation engineering and potential stale reads',
    domains: ['performance', 'database'],
    validation: ['cache_hit_rate_test', 'invalidation_correctness_test'],
  },
  {
    a: 'cache',
    b: 'availability',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'If cache is required for performance, cache outage degrades the entire application',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Systems that depend on cache for acceptable latency fail during cache unavailability',
    domains: ['reliability', 'performance'],
    validation: ['cache_outage_fallback_test'],
  },
  {
    a: 'cache',
    b: 'cost',
    relationship: RELATIONSHIP_TYPES.TRADEOFF,
    effect: 'Cache reduces database cost but adds infrastructure cost (Redis memory)',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.MODERATE,
    reason: 'Redis memory is more expensive per GB than database storage',
    domains: ['cost', 'infrastructure'],
    validation: ['cost_analysis'],
  },

  // ── Database Domain ──
  {
    a: 'database',
    b: 'concurrency',
    relationship: RELATIONSHIP_TYPES.RESOURCE_CONTENTION,
    effect: 'Concurrent writes to the same row can cause deadlocks or lost updates',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Without proper locking or optimistic concurrency, concurrent transactions overwrite each other',
    domains: ['database', 'concurrency'],
    validation: ['concurrent_write_test', 'deadlock_detection_test'],
  },
  {
    a: 'database_index',
    b: 'write_performance',
    relationship: RELATIONSHIP_TYPES.TRADEOFF,
    effect: 'Indexes speed reads but slow writes and increase storage',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Each write must update all affected indexes, adding latency proportional to index count',
    domains: ['database', 'performance'],
    validation: ['write_latency_with_indexes_test'],
  },
  {
    a: 'database',
    b: 'connection_pool',
    relationship: RELATIONSHIP_TYPES.RESOURCE_CONTENTION,
    effect: 'Connection pool exhaustion blocks all database operations',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Fixed-size connection pool under high concurrency causes request queuing or rejection',
    domains: ['database', 'scalability', 'reliability'],
    validation: ['connection_pool_exhaustion_test'],
  },

  // ── Payment Domain ──
  {
    a: 'payment',
    b: 'idempotency',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'Payment operations require idempotency to prevent double charges',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Network retries, client timeouts, and infrastructure failures can cause duplicate payment execution',
    domains: ['financial', 'reliability', 'data-integrity'],
    validation: ['payment_idempotency_test', 'duplicate_charge_prevention_test'],
  },
  {
    a: 'payment',
    b: 'observability',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'Payment operations require correlation IDs for audit and debugging',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Financial transactions must be traceable across all system components for compliance and debugging',
    domains: ['financial', 'observability'],
    validation: ['correlation_id_propagation_test'],
  },
  {
    a: 'payment',
    b: 'security',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'Payment requires authentication and authorization at every step',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Unauthenticated or improperly authorized payment operations lead to financial fraud',
    domains: ['financial', 'security'],
    validation: ['payment_auth_test'],
  },

  // ── Messaging / Queue Domain ──
  {
    a: 'queue',
    b: 'idempotency',
    relationship: RELATIONSHIP_TYPES.DEPENDENCY,
    effect: 'At-least-once delivery requires idempotent consumers',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Message brokers guarantee at-least-once, meaning consumers will receive duplicates',
    domains: ['messaging', 'reliability', 'data-integrity'],
    validation: ['duplicate_message_test', 'idempotent_consumer_test'],
  },
  {
    a: 'queue',
    b: 'ordering',
    relationship: RELATIONSHIP_TYPES.CONSTRAINT,
    effect: 'Message ordering is not guaranteed across partitions',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Distributed message systems partition for scale, breaking cross-partition ordering guarantees',
    domains: ['messaging', 'distributed-systems'],
    validation: ['out_of_order_message_test'],
  },
  {
    a: 'queue',
    b: 'database',
    relationship: RELATIONSHIP_TYPES.CONSISTENCY_INTERACTION,
    effect: 'Database write + message publish is not atomic without transactional outbox',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Writing to DB and publishing to queue in sequence can lose the event if the process crashes between operations',
    domains: ['messaging', 'database', 'data-integrity'],
    validation: ['dual_write_consistency_test'],
  },

  // ── Microservices Domain ──
  {
    a: 'microservices',
    b: 'network',
    relationship: RELATIONSHIP_TYPES.FAILURE_PROPAGATION,
    effect: 'Service decomposition introduces network failure modes',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Every service-to-service call is a potential failure point: timeouts, DNS failures, TLS errors',
    domains: ['architecture', 'networking', 'distributed-systems'],
    validation: ['network_failure_injection_test'],
  },
  {
    a: 'microservices',
    b: 'consistency',
    relationship: RELATIONSHIP_TYPES.TRADEOFF,
    effect: 'Service decomposition weakens data consistency guarantees',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Distributed data ownership means cross-service transactions require saga/outbox patterns',
    domains: ['architecture', 'database', 'data-integrity'],
    validation: ['distributed_consistency_test'],
  },
  {
    a: 'microservices',
    b: 'observability',
    relationship: RELATIONSHIP_TYPES.OPERATIONAL_DEPENDENCY,
    effect: 'Distributed services require distributed tracing to debug issues',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Without trace propagation, failures across service boundaries become invisible',
    domains: ['architecture', 'observability'],
    validation: ['trace_propagation_test'],
  },
  {
    a: 'microservices',
    b: 'cost',
    relationship: RELATIONSHIP_TYPES.COST_INTERACTION,
    effect: 'More services = more infrastructure, more monitoring, more operational overhead',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Each service needs its own deployment, logging, monitoring, and alerting infrastructure',
    domains: ['architecture', 'cost', 'operations'],
    validation: ['infrastructure_cost_analysis'],
  },

  // ── AI / Agent Domain ──
  {
    a: 'llm',
    b: 'prompt_injection',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'User input concatenated into prompts enables prompt injection',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'User-controlled text in system prompts can override AI instructions',
    domains: ['ai', 'security'],
    validation: ['prompt_injection_test'],
  },
  {
    a: 'agent',
    b: 'tool_execution',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'AI agent with tool access can execute unauthorized system operations',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'An agent with shell/file access can read credentials, write arbitrary files, or exfiltrate data',
    domains: ['ai', 'security'],
    validation: ['agent_tool_sandbox_test', 'credential_exposure_test'],
  },
  {
    a: 'llm',
    b: 'cost',
    relationship: RELATIONSHIP_TYPES.COST_INTERACTION,
    effect: 'LLM retries and long contexts create runaway token costs',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Each LLM call is billed per token; retries, long prompts, and streaming multiply costs rapidly',
    domains: ['ai', 'cost'],
    validation: ['token_cost_analysis'],
  },
  {
    a: 'llm',
    b: 'latency',
    relationship: RELATIONSHIP_TYPES.PERFORMANCE_INTERACTION,
    effect: 'LLM inference adds 500ms–30s latency to request paths',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'LLM inference is orders of magnitude slower than traditional API calls',
    domains: ['ai', 'performance'],
    validation: ['llm_latency_budget_test'],
  },

  // ── Autoscaling Domain ──
  {
    a: 'autoscaling',
    b: 'cold_start',
    relationship: RELATIONSHIP_TYPES.AMPLIFICATION,
    effect: 'Autoscaling under traffic burst introduces cold-start latency',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'New instances take time to initialize; during burst, all new capacity has cold-start latency',
    domains: ['scalability', 'performance'],
    validation: ['cold_start_under_burst_test'],
  },

  // ── Rate Limiting Domain ──
  {
    a: 'rate_limiting',
    b: 'distributed_systems',
    relationship: RELATIONSHIP_TYPES.CONSISTENCY_INTERACTION,
    effect: 'Distributed rate limiting requires shared state or accepts inconsistency',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Local counters are inconsistent across instances; shared counters add latency and availability dependency',
    domains: ['security', 'distributed-systems', 'performance'],
    validation: ['distributed_rate_limit_consistency_test'],
  },

  // ── Authentication Domain ──
  {
    a: 'authentication',
    b: 'session',
    relationship: RELATIONSHIP_TYPES.CONSISTENCY_INTERACTION,
    effect: 'Session state must be consistently available across replicas',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Sticky sessions or centralized session store required for horizontal scaling',
    domains: ['security', 'scalability'],
    validation: ['session_consistency_test'],
  },

  // ── Encryption Domain ──
  {
    a: 'encryption',
    b: 'search',
    relationship: RELATIONSHIP_TYPES.CONFLICT,
    effect: 'Encrypted data cannot be searched without specialized techniques',
    priority: INTERACTION_PRIORITY.MEDIUM,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason:
      'Full-text search on encrypted fields requires homomorphic encryption or search-specific indexes',
    domains: ['security', 'search'],
    validation: ['encrypted_search_capability_test'],
  },

  // ── Multi-Tenancy Domain ──
  {
    a: 'multi_tenancy',
    b: 'database',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'Every database query must include tenant scoping to prevent cross-tenant data access',
    priority: INTERACTION_PRIORITY.CRITICAL,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: "Missing WHERE tenant_id = ? clause exposes all tenants' data",
    domains: ['security', 'database'],
    validation: ['cross_tenant_query_test'],
  },
  {
    a: 'multi_tenancy',
    b: 'queue',
    relationship: RELATIONSHIP_TYPES.SECURITY_BOUNDARY,
    effect: 'Queue messages must carry and validate tenant context',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: "Workers processing jobs without tenant context may operate on the wrong tenant's data",
    domains: ['security', 'messaging'],
    validation: ['tenant_context_propagation_test'],
  },

  // ── File Upload Domain ──
  {
    a: 'file_upload',
    b: 'storage',
    relationship: RELATIONSHIP_TYPES.RESOURCE_CONTENTION,
    effect: 'Unrestricted file uploads can exhaust storage capacity',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Without size limits and quotas, storage grows unbounded and costs escalate',
    domains: ['storage', 'cost', 'security'],
    validation: ['storage_quota_test'],
  },

  // ── Replication Domain ──
  {
    a: 'replication',
    b: 'read_consistency',
    relationship: RELATIONSHIP_TYPES.CONSISTENCY_INTERACTION,
    effect: 'Read replicas serve stale data during replication lag',
    priority: INTERACTION_PRIORITY.HIGH,
    confidence: INTERACTION_CONFIDENCE.HIGH,
    reason: 'Async replication creates a window where reads from replicas return outdated data',
    domains: ['database', 'consistency'],
    validation: ['replication_lag_read_test'],
  },
];

// ============================================================================
// 3. CONCEPT-TO-INTERACTION MATCHER (Section 7)
// ============================================================================

/**
 * Normalize a concept identifier for matching against interaction rules.
 */
function normalizeConceptId(id) {
  return (id || '')
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/and_/g, '')
    .replace(/_and$/g, '');
}

/**
 * Map concept IDs from the taxonomy to interaction rule tokens.
 */
const CONCEPT_TO_RULE_MAP = {
  'retry-and-backoff': ['retry', 'circuit_breaker', 'timeout'],
  idempotency: ['idempotency'],
  'transaction-integrity': ['database', 'consistency'],
  'concurrency-control': ['concurrency', 'database'],
  'query-optimization': ['database', 'database_index'],
  'caching-and-invalidation': ['cache'],
  'authentication-and-authorization': ['authentication', 'authorization', 'security'],
  'input-validation-and-sanitization': ['security'],
  'structured-observability': ['observability'],
  'file-upload-and-storage': ['file_upload', 'storage'],
  'ai-agent-security-and-sandboxing': ['agent', 'tool_execution', 'llm'],
  'realtime-collaboration-and-sync': ['consistency'],
  'cicd-and-deployment-safety': ['deployment'],
  'distributed-job-processing': ['queue', 'ordering'],
  'rag-and-vector-retrieval': ['llm', 'search'],
  'event-driven-data-pipelines': ['queue', 'ordering'],
  'notification-delivery-and-dispatch': ['queue', 'rate_limiting'],
  'search-indexing-and-ranking': ['search', 'database_index'],
  'multi-region-consistency-and-replication': ['replication', 'consistency', 'read_consistency'],
  'responsive-ui-and-accessibility': [],
};

/**
 * Additional concept token extraction from task query keywords.
 */
const TASK_TOKEN_PATTERNS = [
  {
    match: /(?:retry|backoff|circuit.?break|timeout)/i,
    tokens: ['retry', 'timeout', 'circuit_breaker'],
  },
  { match: /(?:cache|redis|memcache|cdn)/i, tokens: ['cache'] },
  { match: /(?:idempoten)/i, tokens: ['idempotency'] },
  { match: /(?:payment|charge|checkout|billing|invoice)/i, tokens: ['payment'] },
  { match: /(?:queue|kafka|rabbitmq|sqs|worker|job|event.?driven)/i, tokens: ['queue'] },
  { match: /(?:microservice|micro.?service|service.?mesh)/i, tokens: ['microservices'] },
  { match: /(?:auth|login|jwt|session|oauth|sso)/i, tokens: ['authentication'] },
  { match: /(?:permission|role|rbac|acl|authorization)/i, tokens: ['authorization'] },
  { match: /(?:encrypt|tls|ssl)/i, tokens: ['encryption'] },
  { match: /(?:multi.?tenant|tenant|workspace)/i, tokens: ['multi_tenancy'] },
  { match: /(?:llm|gpt|claude|openai|anthropic|prompt|rag|vector)/i, tokens: ['llm'] },
  {
    match: /(?:agent|tool.?call|function.?call|shell|sandbox)/i,
    tokens: ['agent', 'tool_execution'],
  },
  { match: /(?:upload|file|attachment|media)/i, tokens: ['file_upload'] },
  { match: /(?:index|covering.?index)/i, tokens: ['database_index'] },
  { match: /(?:rate.?limit|throttl)/i, tokens: ['rate_limiting'] },
  { match: /(?:autoscal|auto.?scale|elastic)/i, tokens: ['autoscaling'] },
  { match: /(?:replica|replication|read.?replica)/i, tokens: ['replication'] },
  { match: /(?:search|elastic|algolia|full.?text)/i, tokens: ['search'] },
  { match: /(?:concurrent|race|parallel|lock|mutex)/i, tokens: ['concurrency'] },
  { match: /(?:database|sql|postgres|mysql|query|table)/i, tokens: ['database'] },
  { match: /(?:observab|monitor|trace|log|metric)/i, tokens: ['observability'] },
  { match: /(?:api|endpoint|rest|graphql)/i, tokens: ['external_api'] },
  { match: /(?:cost|budget|billing.?optim|token.?cost)/i, tokens: ['cost'] },
  { match: /(?:deploy|rollback|canary|blue.?green)/i, tokens: ['deployment'] },
  { match: /(?:consistent|consisten|acid|transaction)/i, tokens: ['consistency'] },
  { match: /(?:connection.?pool)/i, tokens: ['connection_pool'] },
  { match: /(?:cold.?start|warm.?up|startup.?time)/i, tokens: ['cold_start'] },
  { match: /(?:session|cookie)/i, tokens: ['session'] },
  { match: /(?:network|dns|tcp|http)/i, tokens: ['network'] },
  { match: /(?:latency|p99|p95|response.?time)/i, tokens: ['latency'] },
  { match: /(?:storage|s3|blob|disk)/i, tokens: ['storage'] },
  { match: /(?:order|ordering|sequence|fifo)/i, tokens: ['ordering'] },
  { match: /(?:security|owasp|injection|xss|csrf)/i, tokens: ['security'] },
  { match: /(?:prompt.?inject)/i, tokens: ['prompt_injection'] },
  {
    match: /(?:scale|scaling|100k|10k|1m|high.?traffic|throughput|requests?.?per?.?sec|rps|qps)/i,
    tokens: ['autoscaling', 'database', 'cache', 'connection_pool', 'observability'],
  },
  { match: /(?:load.?balanc)/i, tokens: ['network', 'autoscaling'] },
  { match: /(?:monolith|split|decompos|extract.?service)/i, tokens: ['microservices'] },
  {
    match: /(?:performance|optimi[sz]|faster|speed|latency.?reduc)/i,
    tokens: ['cache', 'database_index', 'database'],
  },
  {
    match: /(?:availability|sla|uptime|nine.?nine|99\.9)/i,
    tokens: ['autoscaling', 'cache', 'replication'],
  },
  { match: /(?:worker|background.?job|cron|async.?process)/i, tokens: ['queue', 'database'] },
  { match: /(?:webhook|callback)/i, tokens: ['external_api', 'retry', 'idempotency'] },
];

/**
 * Extract interaction-relevant tokens from concepts + task query.
 *
 * @param {Array} concepts - Extracted concept objects (from concept_extractor)
 * @param {string} taskQuery
 * @returns {Set<string>} Unique tokens
 */
function extractInteractionTokens(concepts, taskQuery) {
  const tokens = new Set();

  // From concept IDs via mapping
  for (const c of concepts || []) {
    const mapped = CONCEPT_TO_RULE_MAP[c.id];
    if (mapped) {
      for (const t of mapped) tokens.add(t);
    }
  }

  // From task query keywords
  const q = (taskQuery || '').toLowerCase();
  for (const p of TASK_TOKEN_PATTERNS) {
    if (p.match.test(q)) {
      for (const t of p.tokens) tokens.add(t);
    }
  }

  return tokens;
}

/**
 * Discover relevant interactions for a set of tokens.
 * Only returns interactions where BOTH sides are present in the token set.
 * This prevents irrelevant interaction noise.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Matching interactions
 */
function discoverInteractions(tokens) {
  const interactions = [];
  const seen = new Set();

  for (const rule of INTERACTION_RULES) {
    const aMatch = tokens.has(rule.a);
    const bMatch = tokens.has(rule.b);

    if (aMatch && bMatch) {
      const key = `${rule.a}↔${rule.b}`;
      if (!seen.has(key)) {
        seen.add(key);
        interactions.push({ ...rule, source: rule.a, target: rule.b, match_type: 'BOTH_PRESENT' });
      }
    }
  }

  return interactions;
}

/**
 * Discover interactions where one side is present and the other
 * is a high-risk implicit concern (e.g., "payment" implies "idempotency").
 * These are INFERRED interactions — still relevant but lower confidence.
 *
 * @param {Set<string>} tokens
 * @param {string} taskQuery
 * @returns {Array<Object>} Inferred interactions
 */
function discoverInferredInteractions(tokens, taskQuery) {
  const inferred = [];
  const seen = new Set();

  // Only infer for high-impact domains
  const inferenceRules = [
    // If payment is present but idempotency is not explicitly mentioned, still surface it
    {
      trigger: 'payment',
      implies: 'idempotency',
      reason: 'Payment operations always require idempotency protection',
    },
    {
      trigger: 'payment',
      implies: 'observability',
      reason: 'Financial transactions require audit trails',
    },
    {
      trigger: 'payment',
      implies: 'security',
      reason: 'Financial operations require strict authentication',
    },
    {
      trigger: 'queue',
      implies: 'idempotency',
      reason: 'At-least-once delivery requires idempotent consumers',
    },
    {
      trigger: 'retry',
      implies: 'idempotency',
      reason: 'Retry without idempotency creates duplicate side effects',
    },
    { trigger: 'cache', implies: 'consistency', reason: 'Caching introduces staleness concerns' },
    {
      trigger: 'multi_tenancy',
      implies: 'security',
      reason: 'Multi-tenant systems require tenant isolation at every boundary',
    },
    {
      trigger: 'agent',
      implies: 'security',
      reason: 'AI agents with tool access require sandboxing',
    },
    { trigger: 'llm', implies: 'cost', reason: 'LLM inference costs scale with usage' },
    {
      trigger: 'microservices',
      implies: 'observability',
      reason: 'Distributed services require distributed tracing',
    },
    {
      trigger: 'database',
      implies: 'connection_pool',
      reason: 'Database connections are a finite shared resource',
    },
  ];

  for (const ir of inferenceRules) {
    if (tokens.has(ir.trigger) && !tokens.has(ir.implies)) {
      // Find matching interaction rules for the implied pair
      for (const rule of INTERACTION_RULES) {
        const matches =
          (rule.a === ir.trigger && rule.b === ir.implies) ||
          (rule.b === ir.trigger && rule.a === ir.implies);
        if (matches) {
          const key = `${rule.a}↔${rule.b}`;
          if (!seen.has(key)) {
            seen.add(key);
            inferred.push({
              ...rule,
              source: rule.a,
              target: rule.b,
              match_type: 'INFERRED',
              inference_reason: ir.reason,
              confidence: INTERACTION_CONFIDENCE.MODERATE,
            });
          }
        }
      }
    }
  }

  return inferred;
}

// ============================================================================
// 4. SECOND-ORDER EFFECT ENGINE (Section 8)
// ============================================================================

/**
 * Second-order effect chain templates.
 * Each chain describes a cascading consequence sequence.
 */
const EFFECT_CHAINS = [
  {
    trigger: 'retry',
    chain: [
      { step: 'Retry configured', domain: 'reliability' },
      { step: 'Additional requests to downstream', domain: 'networking' },
      { step: 'Increased database load', domain: 'database' },
      { step: 'Connection pool pressure', domain: 'database' },
      { step: 'Higher latency for all requests', domain: 'performance' },
      { step: 'More request timeouts', domain: 'reliability' },
      { step: 'More retries triggered', domain: 'reliability' },
      { step: 'Retry storm (positive feedback loop)', domain: 'reliability' },
    ],
    severity: 'CRITICAL',
    name: 'Retry Amplification Cascade',
    mitigation: 'Exponential backoff with jitter + circuit breaker + max retry limit',
  },
  {
    trigger: 'cache',
    chain: [
      { step: 'Cache added for performance', domain: 'performance' },
      { step: 'Stale data possible after source update', domain: 'consistency' },
      { step: 'Invalidation logic required', domain: 'data-integrity' },
      { step: 'Invalidation race condition possible', domain: 'concurrency' },
      { step: 'Authorization data may be stale', domain: 'security' },
      { step: 'Cross-tenant data leakage if cache key not scoped', domain: 'security' },
      { step: 'Cache memory pressure under load', domain: 'infrastructure' },
      { step: 'Cache outage cascades to database', domain: 'reliability' },
    ],
    severity: 'HIGH',
    name: 'Cache Side-Effect Cascade',
    mitigation: 'Tenant-scoped keys + event-driven invalidation + cache fallback strategy',
  },
  {
    trigger: 'database_index',
    chain: [
      { step: 'Index added to speed up reads', domain: 'performance' },
      { step: 'Write latency increases', domain: 'performance' },
      { step: 'More storage consumed', domain: 'storage' },
      { step: 'Larger replication workload', domain: 'database' },
      { step: 'Longer migration times', domain: 'operations' },
    ],
    severity: 'MEDIUM',
    name: 'Index Write-Amplification Chain',
    mitigation: 'Selective indexing, composite indexes, and partial indexes where appropriate',
  },
  {
    trigger: 'microservices',
    chain: [
      { step: 'Monolith split into services', domain: 'architecture' },
      { step: 'In-process calls become network calls', domain: 'networking' },
      { step: 'Network failure modes introduced', domain: 'reliability' },
      { step: 'Distributed tracing required', domain: 'observability' },
      { step: 'Data consistency weakened', domain: 'data-integrity' },
      { step: 'More infrastructure to manage', domain: 'operations' },
      { step: 'Higher operational cost', domain: 'cost' },
    ],
    severity: 'HIGH',
    name: 'Microservices Complexity Cascade',
    mitigation:
      'Start with modular monolith, extract services only when justified by scale/team needs',
  },
  {
    trigger: 'llm',
    chain: [
      { step: 'LLM integrated into request path', domain: 'ai' },
      { step: 'High inference latency (500ms–30s)', domain: 'performance' },
      { step: 'Token cost per request', domain: 'cost' },
      { step: 'Retry on LLM timeout multiplies cost', domain: 'cost' },
      { step: 'Prompt injection risk from user input', domain: 'security' },
      { step: 'Hallucination risk in output', domain: 'data-integrity' },
    ],
    severity: 'HIGH',
    name: 'LLM Integration Side-Effects',
    mitigation: 'Streaming responses, cost caps, input sanitization, output validation',
  },
  {
    trigger: 'agent',
    chain: [
      { step: 'AI agent has tool/shell access', domain: 'ai' },
      { step: 'Prompt injection can trigger tool invocation', domain: 'security' },
      { step: 'Tool executes filesystem/network operations', domain: 'security' },
      { step: 'Credential files accessible', domain: 'security' },
      { step: 'Data exfiltration possible', domain: 'security' },
      { step: 'Lateral movement within infrastructure', domain: 'security' },
    ],
    severity: 'CRITICAL',
    name: 'Agent Privilege Escalation Cascade',
    mitigation: 'Sandboxing, allowlisted tools only, network policy, credential isolation',
  },
  {
    trigger: 'autoscaling',
    chain: [
      { step: 'Autoscaling configured for traffic bursts', domain: 'scalability' },
      { step: 'Traffic burst arrives', domain: 'performance' },
      { step: 'New instances provisioned', domain: 'infrastructure' },
      { step: 'Cold start latency for all new instances', domain: 'performance' },
      { step: 'Capacity lag during scale-up window', domain: 'reliability' },
      { step: 'Users experience degraded performance during burst', domain: 'performance' },
    ],
    severity: 'MEDIUM',
    name: 'Autoscaling Capacity Lag',
    mitigation: 'Pre-warmed instances, predictive scaling, provisioned capacity floor',
  },
  {
    trigger: 'rate_limiting',
    chain: [
      { step: 'Rate limiting added for protection', domain: 'security' },
      { step: 'Distributed rate limiter requires shared state', domain: 'distributed-systems' },
      { step: 'Shared state adds network dependency', domain: 'networking' },
      { step: 'Network dependency increases latency', domain: 'performance' },
      { step: 'Rate limiter outage blocks all traffic', domain: 'availability' },
    ],
    severity: 'MEDIUM',
    name: 'Rate Limiter Availability Coupling',
    mitigation: 'Local rate limiter with periodic sync, graceful degradation on limiter failure',
  },
  {
    trigger: 'payment',
    chain: [
      { step: 'Client sends payment request', domain: 'financial' },
      { step: 'Request times out (network issue)', domain: 'networking' },
      { step: 'Client retries with same payment intent', domain: 'reliability' },
      { step: 'Server executes payment again (no idempotency)', domain: 'financial' },
      { step: 'External payment provider charges twice', domain: 'financial' },
      { step: 'Duplicate event published to queue', domain: 'messaging' },
      { step: 'Duplicate notification sent to user', domain: 'communication' },
    ],
    severity: 'CRITICAL',
    name: 'Payment Double-Charge Cascade',
    mitigation:
      'Database-enforced idempotency key + external provider dedup + transactional outbox',
  },
  {
    trigger: 'queue',
    chain: [
      { step: 'Message published to queue', domain: 'messaging' },
      { step: 'Consumer processes message', domain: 'backend' },
      { step: 'Consumer crashes mid-processing', domain: 'reliability' },
      { step: 'Broker redelivers message', domain: 'messaging' },
      { step: 'Non-idempotent consumer executes side effect again', domain: 'data-integrity' },
      { step: 'Duplicate database writes / notifications', domain: 'data-integrity' },
    ],
    severity: 'HIGH',
    name: 'Message Redelivery Side-Effect Chain',
    mitigation: 'Idempotent consumer pattern + processed message dedup table + DLQ',
  },
  {
    trigger: 'replication',
    chain: [
      { step: 'Write committed to primary', domain: 'database' },
      { step: 'Async replication to read replica', domain: 'database' },
      { step: 'Client reads from replica before sync', domain: 'data-integrity' },
      { step: 'Stale data returned', domain: 'consistency' },
      { step: 'Client makes decision on stale data', domain: 'functional' },
    ],
    severity: 'HIGH',
    name: 'Replication Lag Read Staleness',
    mitigation:
      'Read-after-write from primary, causal consistency tokens, or sync replication for critical reads',
  },
];

/**
 * Discover second-order effect chains triggered by present tokens.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Matched chains
 */
function discoverSecondOrderEffects(tokens) {
  const effects = [];
  const seen = new Set();

  for (const chain of EFFECT_CHAINS) {
    if (tokens.has(chain.trigger) && !seen.has(chain.trigger)) {
      seen.add(chain.trigger);
      effects.push({
        name: chain.name,
        trigger: chain.trigger,
        severity: chain.severity,
        chain: chain.chain,
        depth: chain.chain.length,
        mitigation: chain.mitigation,
        domains_affected: [...new Set(chain.chain.map(s => s.domain))],
      });
    }
  }

  return effects;
}

// ============================================================================
// 5. FAILURE PROPAGATION GRAPH (Section 17)
// ============================================================================

/**
 * Failure propagation rules.
 * Models how a failure in one component cascades to others.
 */
const FAILURE_PROPAGATION_RULES = [
  {
    source: 'cache',
    failure: 'Cache outage (Redis down)',
    propagation: [
      {
        target: 'database',
        effect: 'Traffic spike as all requests hit database',
        severity: 'HIGH',
      },
      { target: 'api', effect: 'Latency spike from cache miss', severity: 'HIGH' },
      { target: 'client', effect: 'Degraded response time', severity: 'MEDIUM' },
    ],
  },
  {
    source: 'database',
    failure: 'Database saturation',
    propagation: [
      { target: 'api', effect: 'Connection wait → request timeouts', severity: 'CRITICAL' },
      {
        target: 'queue_worker',
        effect: 'Worker jobs fail due to DB connection errors',
        severity: 'HIGH',
      },
      { target: 'client', effect: 'HTTP 500 / 503 responses', severity: 'CRITICAL' },
    ],
  },
  {
    source: 'external_api',
    failure: 'External API outage / degradation',
    propagation: [
      { target: 'api', effect: 'Requests block waiting for external response', severity: 'HIGH' },
      {
        target: 'database',
        effect: 'Open transactions held longer, consuming connections',
        severity: 'MEDIUM',
      },
      { target: 'client', effect: 'Timeout or partial failure visible to user', severity: 'HIGH' },
    ],
  },
  {
    source: 'queue',
    failure: 'Message broker outage',
    propagation: [
      { target: 'api', effect: 'Async operations fail silently or block', severity: 'HIGH' },
      { target: 'queue_worker', effect: 'Workers idle, backlog accumulates', severity: 'HIGH' },
      {
        target: 'database',
        effect: 'If synchronous fallback, DB load increases',
        severity: 'MEDIUM',
      },
    ],
  },
  {
    source: 'network',
    failure: 'Network partition between services',
    propagation: [
      { target: 'microservices', effect: 'Service-to-service calls fail', severity: 'CRITICAL' },
      { target: 'database', effect: 'If multi-region, replication may halt', severity: 'HIGH' },
      { target: 'cache', effect: 'Cache cluster may split-brain', severity: 'HIGH' },
    ],
  },
  {
    source: 'llm',
    failure: 'LLM provider outage / rate limit',
    propagation: [
      { target: 'api', effect: 'AI-dependent endpoints fail', severity: 'HIGH' },
      { target: 'queue_worker', effect: 'AI processing jobs pile up in queue', severity: 'MEDIUM' },
      { target: 'client', effect: 'AI features unavailable', severity: 'MEDIUM' },
    ],
  },
];

/**
 * Discover relevant failure propagation paths based on present tokens.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Matched propagation paths
 */
function discoverFailurePropagation(tokens) {
  const paths = [];

  for (const rule of FAILURE_PROPAGATION_RULES) {
    if (tokens.has(rule.source)) {
      paths.push({
        source: rule.source,
        failure: rule.failure,
        cascading_effects: rule.propagation,
        severity: rule.propagation[0]?.severity || 'MEDIUM',
        domains: [rule.source, ...rule.propagation.map(p => p.target)],
      });
    }
  }

  return paths;
}

// ============================================================================
// 6. RESOURCE CONTENTION ANALYSIS (Section 18)
// ============================================================================

const SHARED_RESOURCES = [
  {
    resource: 'Database Connection Pool',
    match: ['database', 'connection_pool'],
    contenders: ['api_requests', 'background_workers', 'retry_logic', 'health_checks'],
    risk: 'Pool exhaustion blocks all database operations',
    mitigation: 'Separate pools for API and workers, connection limits per component',
  },
  {
    resource: 'CPU',
    match: ['llm', 'search', 'encryption'],
    contenders: ['llm_inference', 'search_indexing', 'encryption_operations', 'request_processing'],
    risk: 'CPU-intensive operations starve request processing threads',
    mitigation: 'Isolate CPU-intensive workloads to dedicated workers/pods',
  },
  {
    resource: 'Memory',
    match: ['cache', 'llm', 'file_upload'],
    contenders: ['cache_storage', 'llm_context', 'file_buffers', 'request_bodies'],
    risk: 'Memory exhaustion (OOM) crashes the process',
    mitigation: 'Memory limits, streaming processing, bounded cache eviction',
  },
  {
    resource: 'Network Bandwidth',
    match: ['replication', 'file_upload', 'llm'],
    contenders: ['database_replication', 'file_transfers', 'llm_streaming', 'client_traffic'],
    risk: 'Bandwidth saturation increases latency for all traffic',
    mitigation: 'Traffic shaping, compression, CDN for static assets',
  },
  {
    resource: 'API Quota',
    match: ['external_api', 'llm', 'payment'],
    contenders: ['user_requests', 'retry_logic', 'background_processing'],
    risk: 'Quota exhaustion blocks all external API calls',
    mitigation: 'Quota-aware rate limiting, request batching, caching API responses',
  },
  {
    resource: 'Queue Capacity',
    match: ['queue'],
    contenders: ['producers', 'retry_requeue', 'dead_letter_overflow'],
    risk: 'Queue backlog growth causes memory pressure on broker',
    mitigation: 'Backpressure, consumer auto-scaling, queue depth monitoring',
  },
];

/**
 * Identify shared resource contention risks.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Contention risks
 */
function analyzeResourceContention(tokens) {
  const risks = [];

  for (const sr of SHARED_RESOURCES) {
    const matching = sr.match.filter(m => tokens.has(m));
    if (matching.length >= 1) {
      risks.push({
        resource: sr.resource,
        triggered_by: matching,
        contenders: sr.contenders,
        risk: sr.risk,
        mitigation: sr.mitigation,
        severity: matching.length >= 2 ? INTERACTION_PRIORITY.HIGH : INTERACTION_PRIORITY.MEDIUM,
      });
    }
  }

  return risks;
}

// ============================================================================
// 7. SECURITY BOUNDARY ANALYSIS (Section 19)
// ============================================================================

/**
 * Analyze security boundary propagation.
 *
 * @param {Set<string>} tokens
 * @param {string} taskQuery
 * @returns {Object} Security boundary analysis
 */
function analyzeSecurityBoundaries(tokens, taskQuery) {
  const concerns = [];

  if (tokens.has('multi_tenancy')) {
    concerns.push({
      boundary: 'Tenant Isolation',
      question:
        'Does tenant identity propagate through ALL system components (DB, cache, queue, workers)?',
      risk: 'Missing tenant scoping at any boundary enables cross-tenant data access',
      priority: INTERACTION_PRIORITY.CRITICAL,
      components_to_verify: [
        'database queries',
        'cache keys',
        'queue messages',
        'worker context',
        'API responses',
      ],
    });
  }

  if (tokens.has('authentication') || tokens.has('authorization')) {
    concerns.push({
      boundary: 'Authentication/Authorization',
      question: 'Is auth enforced BEFORE business logic at every endpoint?',
      risk: 'Auth bypass allows unauthorized access to protected resources',
      priority: INTERACTION_PRIORITY.CRITICAL,
      components_to_verify: [
        'API middleware',
        'WebSocket connections',
        'background jobs',
        'webhook handlers',
      ],
    });
  }

  if (tokens.has('agent') || tokens.has('tool_execution')) {
    concerns.push({
      boundary: 'AI Agent Sandbox',
      question: 'Can the agent execute operations outside its permitted scope?',
      risk: 'Prompt injection → tool invocation → unauthorized system access',
      priority: INTERACTION_PRIORITY.CRITICAL,
      components_to_verify: [
        'tool allowlist',
        'filesystem access policy',
        'network access policy',
        'credential isolation',
      ],
    });
  }

  if (tokens.has('cache') && (tokens.has('authorization') || tokens.has('multi_tenancy'))) {
    concerns.push({
      boundary: 'Cache Security',
      question: 'Can cached data leak across authorization or tenant boundaries?',
      risk: 'Shared cache keys return data belonging to other users/tenants',
      priority: INTERACTION_PRIORITY.CRITICAL,
      components_to_verify: [
        'cache key format includes tenant/user scope',
        'cache TTL for auth data',
        'invalidation on permission change',
      ],
    });
  }

  if (tokens.has('queue') && tokens.has('multi_tenancy')) {
    concerns.push({
      boundary: 'Queue Tenant Propagation',
      question: 'Do queue messages carry and validate tenant context?',
      risk: 'Workers processing jobs without tenant context operate on wrong tenant data',
      priority: INTERACTION_PRIORITY.HIGH,
      components_to_verify: [
        'message payload includes tenant_id',
        'worker validates tenant context before DB access',
      ],
    });
  }

  return {
    concerns,
    total: concerns.length,
    has_critical: concerns.some(c => c.priority === INTERACTION_PRIORITY.CRITICAL),
  };
}

// ============================================================================
// 8. CONSTRAINT CONFLICT DETECTION (Section 15)
// ============================================================================

const CONSTRAINT_CONFLICTS = [
  {
    a: 'security',
    b: 'performance',
    conflict: 'Security controls (encryption, auth checks, input validation) add latency',
    resolution:
      'Cannot eliminate — quantify the cost and set latency budget that includes security overhead',
  },
  {
    a: 'consistency',
    b: 'availability',
    conflict: 'Strong consistency requires coordination that reduces availability (CAP theorem)',
    resolution: 'Choose consistency model per use case: strong for payments, eventual for feeds',
  },
  {
    a: 'consistency',
    b: 'performance',
    conflict: 'Strong consistency (serializable transactions) reduces throughput',
    resolution: 'Use minimum sufficient isolation level per operation',
  },
  {
    a: 'cost',
    b: 'performance',
    conflict: 'Lower latency requires more infrastructure (caching, CDN, replicas)',
    resolution: 'Set performance targets, then optimize cost to meet them — not the reverse',
  },
  {
    a: 'cost',
    b: 'reliability',
    conflict: 'Higher reliability requires redundancy, which increases cost',
    resolution: 'Define SLA targets and design redundancy to meet them',
  },
  {
    a: 'security',
    b: 'cost',
    conflict: 'Security controls (WAF, encryption, audit logging) add infrastructure cost',
    resolution: 'Security is non-negotiable for regulated data; budget accordingly',
  },
  {
    a: 'scalability',
    b: 'consistency',
    conflict: 'Horizontal scaling requires data partitioning that complicates consistency',
    resolution:
      'Partition by bounded context; use strong consistency within partition, eventual across',
  },
  {
    a: 'observability',
    b: 'performance',
    conflict: 'Detailed tracing and logging add overhead to every request',
    resolution: 'Sample traces at high volume; always log errors and critical paths',
  },
];

/**
 * Detect constraint conflicts from tokens.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Detected conflicts
 */
function detectConstraintConflicts(tokens) {
  const conflicts = [];

  for (const cc of CONSTRAINT_CONFLICTS) {
    const aPresent = tokens.has(cc.a) || tokens.has(cc.a.replace(/_/g, ''));
    const bPresent = tokens.has(cc.b) || tokens.has(cc.b.replace(/_/g, ''));

    if (aPresent && bPresent) {
      conflicts.push({
        constraint_a: cc.a,
        constraint_b: cc.b,
        conflict: cc.conflict,
        resolution: cc.resolution,
        priority: INTERACTION_PRIORITY.HIGH,
      });
    }
  }

  return conflicts;
}

// ============================================================================
// 9. TRADEOFF GRAPH (Section 16)
// ============================================================================

/**
 * Build decision tradeoff representations.
 *
 * @param {Array} interactions
 * @param {Array} secondOrderEffects
 * @returns {Array<Object>} Tradeoff decisions
 */
function buildTradeoffGraph(interactions, secondOrderEffects) {
  const tradeoffs = [];

  // Extract tradeoff-type interactions
  for (const i of interactions || []) {
    if (i.relationship === RELATIONSHIP_TYPES.TRADEOFF) {
      tradeoffs.push({
        decision: `${i.a} ↔ ${i.b}`,
        relationship: RELATIONSHIP_TYPES.TRADEOFF,
        benefits: [i.effect.split(' but ')[0] || i.effect],
        costs: i.effect.includes(' but ') ? [i.effect.split(' but ')[1]] : [],
        risks: [],
        domains: i.domains,
        priority: i.priority,
      });
    }
  }

  // Extract tradeoffs from second-order effects
  for (const soe of secondOrderEffects || []) {
    const benefits = soe.chain.slice(0, 1).map(s => s.step);
    const costs = soe.chain.slice(1).map(s => s.step);
    tradeoffs.push({
      decision: soe.trigger,
      relationship: 'SECOND_ORDER',
      benefits,
      costs,
      risks: [soe.chain[soe.chain.length - 1]?.step || ''],
      domains: soe.domains_affected,
      priority:
        soe.severity === 'CRITICAL' ? INTERACTION_PRIORITY.CRITICAL : INTERACTION_PRIORITY.HIGH,
      mitigation: soe.mitigation,
    });
  }

  return tradeoffs;
}

// ============================================================================
// 10. CROSS-DOMAIN VALIDATION REQUIREMENTS (Section 31)
// ============================================================================

/**
 * Generate Phase 8 validation requirements from detected interactions.
 *
 * @param {Array} interactions
 * @param {Array} secondOrderEffects
 * @param {Array} failurePropagation
 * @param {Object} securityBoundaries
 * @returns {Array<Object>} Validation requirements for Phase 8
 */
function generateValidationRequirements(
  interactions,
  secondOrderEffects,
  failurePropagation,
  securityBoundaries,
) {
  const requirements = [];
  const seen = new Set();

  // From interactions
  for (const i of interactions || []) {
    if (i.validation) {
      for (const v of i.validation) {
        if (!seen.has(v)) {
          seen.add(v);
          requirements.push({
            test: v,
            source: `interaction:${i.a}↔${i.b}`,
            priority: i.priority,
            reason: i.effect,
            type: 'interaction',
          });
        }
      }
    }
  }

  // From second-order effects
  for (const soe of secondOrderEffects || []) {
    const testName = `second_order_${soe.trigger}_cascade_test`;
    if (!seen.has(testName)) {
      seen.add(testName);
      requirements.push({
        test: testName,
        source: `second_order:${soe.name}`,
        priority:
          soe.severity === 'CRITICAL' ? INTERACTION_PRIORITY.CRITICAL : INTERACTION_PRIORITY.HIGH,
        reason: `Verify ${soe.name} cascade does not materialize under load`,
        type: 'second_order',
      });
    }
  }

  // From failure propagation
  for (const fp of failurePropagation || []) {
    const testName = `failure_propagation_${fp.source}_test`;
    if (!seen.has(testName)) {
      seen.add(testName);
      requirements.push({
        test: testName,
        source: `failure_propagation:${fp.source}`,
        priority:
          fp.severity === 'CRITICAL' ? INTERACTION_PRIORITY.CRITICAL : INTERACTION_PRIORITY.HIGH,
        reason: `Verify graceful degradation when ${fp.source} fails: ${fp.failure}`,
        type: 'failure_propagation',
      });
    }
  }

  // From security boundaries
  for (const sb of (securityBoundaries && securityBoundaries.concerns) || []) {
    for (const component of sb.components_to_verify) {
      const testName = `security_boundary_${sb.boundary.toLowerCase().replace(/\s+/g, '_')}_${component.replace(/\s+/g, '_')}`;
      if (!seen.has(testName)) {
        seen.add(testName);
        requirements.push({
          test: testName,
          source: `security_boundary:${sb.boundary}`,
          priority: sb.priority,
          reason: sb.question,
          type: 'security_boundary',
        });
      }
    }
  }

  return requirements;
}

// ============================================================================
// 11. BLIND SPOT DETECTION (Section 38)
// ============================================================================

/**
 * Detect domains that are relevant but have no skill coverage or interaction analysis.
 *
 * @param {Array} concepts
 * @param {Array} interactions
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Blind spots
 */
function detectBlindSpots(concepts, interactions, tokens) {
  const blindSpots = [];

  // Domains that should be considered based on token presence
  const expectedDomains = new Set();
  if (tokens.has('payment') || tokens.has('database')) expectedDomains.add('data-integrity');
  if (tokens.has('api') || tokens.has('external_api')) expectedDomains.add('rate_limiting');
  if (tokens.has('llm') || tokens.has('agent')) expectedDomains.add('cost');
  if (tokens.has('database') || tokens.has('cache')) expectedDomains.add('observability');
  if (tokens.has('queue') || tokens.has('microservices')) expectedDomains.add('observability');
  if (tokens.has('file_upload')) expectedDomains.add('storage_exhaustion');
  if (tokens.has('multi_tenancy')) expectedDomains.add('data_isolation');
  if (tokens.has('retry')) expectedDomains.add('idempotency');

  // Check which expected domains aren't covered by concepts or interactions
  const coveredDomains = new Set([
    ...(concepts || []).map(c => c.domain),
    ...(interactions || []).flatMap(i => i.domains || []),
  ]);

  for (const expected of expectedDomains) {
    if (!coveredDomains.has(expected) && !tokens.has(expected)) {
      blindSpots.push({
        domain: expected,
        status: 'CAPABILITY_GAP',
        reason: `Domain "${expected}" is likely relevant but has no explicit consideration`,
        recommendation:
          'Review whether this domain needs skill coverage or explicit interaction analysis',
      });
    }
  }

  return blindSpots;
}

// ============================================================================
// 12. EMERGENT FAILURE PATTERNS (Section 25)
// ============================================================================

const EMERGENT_FAILURE_PATTERNS = [
  {
    components: ['retry', 'timeout', 'rate_limiting'],
    pattern: 'Retry Amplification',
    description:
      'Retries consume rate-limit budget, causing legitimate traffic to be throttled, triggering more timeouts and retries',
    severity: 'CRITICAL',
  },
  {
    components: ['cache', 'authorization', 'multi_tenancy'],
    pattern: 'Cross-Tenant Cache Leakage',
    description:
      'Cached authorization data with insufficient tenant scoping leaks permissions across tenants',
    severity: 'CRITICAL',
  },
  {
    components: ['queue', 'idempotency'],
    pattern: 'Duplicate Side Effects',
    description:
      'At-least-once delivery with non-idempotent consumers produces duplicate business effects',
    severity: 'HIGH',
  },
  {
    components: ['autoscaling', 'cold_start'],
    pattern: 'Capacity Lag',
    description:
      'Autoscaling during traffic burst introduces cold-start latency, failing to meet SLA during scale-up window',
    severity: 'MEDIUM',
  },
  {
    components: ['llm', 'agent', 'prompt_injection'],
    pattern: 'Agent Privilege Escalation via Injection',
    description:
      'Prompt injection tricks agent into executing unauthorized tools, accessing credentials or exfiltrating data',
    severity: 'CRITICAL',
  },
  {
    components: ['database', 'cache', 'consistency'],
    pattern: 'Dual Source of Truth',
    description:
      'Cache and database diverge; reads from cache return stale data while database has the correct state',
    severity: 'HIGH',
  },
  {
    components: ['retry', 'external_api', 'cost'],
    pattern: 'Runaway API Cost',
    description:
      'Aggressive retries against expensive external API (LLM, payment) multiply per-request cost',
    severity: 'HIGH',
  },
  {
    components: ['database', 'retry', 'connection_pool'],
    pattern: 'Connection Pool Starvation',
    description:
      'Retries hold database connections longer, starving other requests and creating cascading failures',
    severity: 'HIGH',
  },
  {
    components: ['encryption', 'search'],
    pattern: 'Encrypted Data Unsearchable',
    description:
      'Full-text search cannot index encrypted fields without specialized searchable encryption',
    severity: 'MEDIUM',
  },
  {
    components: ['multi_tenancy', 'queue'],
    pattern: 'Noisy Neighbor Queue Starvation',
    description: "One tenant's high-volume queue production starves processing for other tenants",
    severity: 'HIGH',
  },
];

/**
 * Detect emergent failure patterns from present tokens.
 *
 * @param {Set<string>} tokens
 * @returns {Array<Object>} Detected emergent failures
 */
function detectEmergentFailures(tokens) {
  const detected = [];

  for (const pattern of EMERGENT_FAILURE_PATTERNS) {
    // At least 2 of the components must be present
    const presentCount = pattern.components.filter(c => tokens.has(c)).length;
    if (presentCount >= 2) {
      detected.push({
        pattern: pattern.pattern,
        description: pattern.description,
        severity: pattern.severity,
        components_present: pattern.components.filter(c => tokens.has(c)),
        components_total: pattern.components,
        completeness: presentCount / pattern.components.length,
        evidence: `${presentCount}/${pattern.components.length} components detected in task`,
      });
    }
  }

  return detected;
}

// ============================================================================
// 13. PHASE 9 METRICS TRACKER (Section 43)
// ============================================================================

class Phase9MetricsTracker {
  constructor() {
    this.metrics = {
      tasks_analyzed: 0,
      interactions_discovered: 0,
      inferred_interactions: 0,
      second_order_effects: 0,
      failure_propagations: 0,
      resource_contentions: 0,
      security_concerns: 0,
      constraint_conflicts: 0,
      emergent_failures: 0,
      blind_spots: 0,
      validation_requirements_generated: 0,
      false_positives: 0,
      true_positives: 0,
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

  getPrecision() {
    const total = (this.metrics.true_positives || 0) + (this.metrics.false_positives || 0);
    return total > 0 ? (this.metrics.true_positives || 0) / total : 1;
  }
}

let _phase9MetricsTracker = null;

function getPhase9MetricsTracker() {
  if (!_phase9MetricsTracker) {
    _phase9MetricsTracker = new Phase9MetricsTracker();
  }
  return _phase9MetricsTracker;
}

// ============================================================================
// 14. MAIN ORCHESTRATOR — runCrossDomainAnalysis
// ============================================================================

/**
 * Run the full Phase 9 cross-domain interaction analysis.
 *
 * @param {string} taskQuery
 * @param {Object} [conceptData] - Output from concept_extractor.extractConcepts()
 * @param {Object} [options]
 * @returns {Object} Full cross-domain analysis
 */
function runCrossDomainAnalysis(taskQuery, conceptData, options = {}) {
  const q = (taskQuery || '').trim();
  const tracker = getPhase9MetricsTracker();
  tracker.record('tasks_analyzed');

  // Step 0: Quick bail for trivial tasks
  if (/^(?:fix\s|typo|css\s|format|rename|lint|style|readme|comment|doc)/i.test(q)) {
    return {
      task: q,
      skipped: true,
      reason: 'Task does not require cross-domain analysis',
      interactions: [],
      second_order_effects: [],
      failure_propagation: [],
      resource_contention: [],
      security_boundaries: { concerns: [], total: 0 },
      constraint_conflicts: [],
      emergent_failures: [],
      tradeoffs: [],
      blind_spots: [],
      validation_requirements: [],
    };
  }

  // Step 1: Extract interaction tokens
  let concepts = [];
  if (conceptData && conceptData.all_concepts) {
    concepts = conceptData.all_concepts;
  } else if (Array.isArray(conceptData)) {
    concepts = conceptData;
  } else {
    try {
      const { extractConcepts } = require('./concept_extractor');
      const extracted = extractConcepts(q, process.cwd());
      concepts = extracted ? extracted.all_concepts || [] : [];
    } catch {
      concepts = [];
    }
  }
  const tokens = extractInteractionTokens(concepts, taskQuery);

  // Step 2: Discover direct interactions
  const directInteractions = discoverInteractions(tokens);
  tracker.record('interactions_discovered', directInteractions.length);

  // Step 3: Discover inferred interactions
  const inferredInteractions = discoverInferredInteractions(tokens, taskQuery);
  tracker.record('inferred_interactions', inferredInteractions.length);

  const allInteractions = [...directInteractions, ...inferredInteractions];

  // Step 4: Discover second-order effects
  const secondOrderEffects = discoverSecondOrderEffects(tokens);
  tracker.record('second_order_effects', secondOrderEffects.length);

  // Step 5: Discover failure propagation
  const failurePropagation = discoverFailurePropagation(tokens);
  tracker.record('failure_propagations', failurePropagation.length);

  // Step 6: Analyze resource contention
  const resourceContention = analyzeResourceContention(tokens);
  tracker.record('resource_contentions', resourceContention.length);

  // Step 7: Analyze security boundaries
  const securityBoundaries = analyzeSecurityBoundaries(tokens, taskQuery);
  tracker.record('security_concerns', securityBoundaries.total);

  // Step 8: Detect constraint conflicts
  const constraintConflicts = detectConstraintConflicts(tokens);
  tracker.record('constraint_conflicts', constraintConflicts.length);

  // Step 9: Detect emergent failures
  const emergentFailures = detectEmergentFailures(tokens);
  tracker.record('emergent_failures', emergentFailures.length);

  // Step 10: Build tradeoff graph
  const tradeoffs = buildTradeoffGraph(allInteractions, secondOrderEffects);

  // Step 11: Detect blind spots
  const blindSpots = detectBlindSpots(concepts, allInteractions, tokens);
  tracker.record('blind_spots', blindSpots.length);

  // Step 12: Generate validation requirements for Phase 8
  const validationRequirements = generateValidationRequirements(
    allInteractions,
    secondOrderEffects,
    failurePropagation,
    securityBoundaries,
  );
  tracker.record('validation_requirements_generated', validationRequirements.length);

  // Step 13: Compute summary domains
  const allDomains = new Set();
  for (const i of allInteractions) (i.domains || []).forEach(d => allDomains.add(d));
  for (const soe of secondOrderEffects)
    (soe.domains_affected || []).forEach(d => allDomains.add(d));

  return {
    task: q,
    skipped: false,
    tokens: [...tokens],
    domains: [...allDomains],
    interactions: {
      direct: directInteractions,
      inferred: inferredInteractions,
      total: allInteractions.length,
      all: allInteractions,
    },
    second_order_effects: secondOrderEffects,
    failure_propagation: failurePropagation,
    resource_contention: resourceContention,
    security_boundaries: securityBoundaries,
    constraint_conflicts: constraintConflicts,
    emergent_failures: emergentFailures,
    tradeoffs,
    blind_spots: blindSpots,
    validation_requirements: validationRequirements,
    summary: {
      total_interactions: allInteractions.length,
      critical_interactions: allInteractions.filter(
        i => i.priority === INTERACTION_PRIORITY.CRITICAL,
      ).length,
      second_order_chains: secondOrderEffects.length,
      failure_propagation_paths: failurePropagation.length,
      resource_contention_risks: resourceContention.length,
      security_boundary_concerns: securityBoundaries.total,
      constraint_conflicts: constraintConflicts.length,
      emergent_failures: emergentFailures.length,
      blind_spots: blindSpots.length,
      validation_tests_generated: validationRequirements.length,
    },
    phase9_metrics: tracker.getMetrics(),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  RELATIONSHIP_TYPES,
  INTERACTION_PRIORITY,
  INTERACTION_CONFIDENCE,
  INTERACTION_RULES,
  EFFECT_CHAINS,
  FAILURE_PROPAGATION_RULES,
  SHARED_RESOURCES,
  CONSTRAINT_CONFLICTS,
  EMERGENT_FAILURE_PATTERNS,

  // Core Functions
  extractInteractionTokens,
  discoverInteractions,
  discoverInferredInteractions,
  discoverSecondOrderEffects,
  discoverFailurePropagation,
  analyzeResourceContention,
  analyzeSecurityBoundaries,
  detectConstraintConflicts,
  buildTradeoffGraph,
  generateValidationRequirements,
  detectBlindSpots,
  detectEmergentFailures,

  // Metrics
  Phase9MetricsTracker,
  getPhase9MetricsTracker,

  // Main Orchestrator
  runCrossDomainAnalysis,
};
