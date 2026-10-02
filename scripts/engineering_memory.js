#!/usr/bin/env node
/**
 * engineering_memory.js — Tribunal Kit Engineering Memory Engine (Phase 5)
 * =========================================================================
 * Implements the core operating principles:
 *   SOLVE ONCE.
 *   VERIFY ONCE.
 *   LEARN ONCE.
 *   REUSE SAFELY.
 *   MEMORY MUST EARN TRUST THROUGH EVIDENCE.
 *   CURRENT EVIDENCE > STALE MEMORY.
 *   MEMORY → HYPOTHESIS → CURRENT EVIDENCE → DECISION.
 *   FAILURES ARE KNOWLEDGE.
 *   NEGATIVE KNOWLEDGE IS KNOWLEDGE.
 *   DO NOT REPEAT VERIFIED FAILURES.
 *   DO NOT TRANSFER CONTEXT WITHOUT PROVING APPLICABILITY.
 *   DO NOT LET MEMORY OVERRIDE CURRENT EVIDENCE.
 *   DO NOT SILENTLY SELF-MODIFY.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// 1. CONSTANTS, ENUMS & TAXONOMIES (SECTIONS 2, 4, 5, 22)
// ============================================================================

const MEMORY_TYPES = {
  PATTERN: 'pattern',
  FAILURE: 'failure',
  DECISION: 'decision',
  VERIFICATION: 'verification',
  ANTI_PATTERN: 'anti_pattern',
  SKILL_PERFORMANCE: 'skill_performance',
  CONCEPT_RELATIONSHIP: 'concept_relationship',
  CAPABILITY_GAP: 'capability_gap',
};

const PROVENANCE_TYPES = {
  VERIFIED_IMPLEMENTATION: 'verified_implementation',
  AUTOMATED_TEST: 'automated_test',
  BENCHMARK: 'benchmark',
  STATIC_ANALYSIS: 'static_analysis',
  SECURITY_FINDING: 'security_finding',
  PRODUCTION_INCIDENT: 'production_incident',
  REPOSITORY_EVIDENCE: 'repository_evidence',
  HUMAN_DECISION: 'human_decision',
  EXTERNAL_DOCUMENTATION: 'external_documentation',
  MODEL_INFERENCE: 'model_inference',
};

const TRUST_STATES = {
  UNVERIFIED: 'UNVERIFIED',
  OBSERVED: 'OBSERVED',
  TESTED: 'TESTED',
  VERIFIED: 'VERIFIED',
  REPEATEDLY_VERIFIED: 'REPEATEDLY_VERIFIED',
  CONTRADICTED: 'CONTRADICTED',
  STALE: 'STALE',
  RETIRED: 'RETIRED',
};

const TRUST_RANKS = {
  RETIRED: 0,
  CONTRADICTED: 0,
  STALE: 1,
  UNVERIFIED: 2,
  OBSERVED: 3,
  TESTED: 4,
  VERIFIED: 5,
  REPEATEDLY_VERIFIED: 6,
};

const MEMORY_SCOPES = {
  GLOBAL: 'global',
  PROJECT: 'project',
  REPOSITORY: 'repository',
  TASK: 'task',
};

// ============================================================================
// 2. PRIVACY, DATA MINIMIZATION & POISONING DEFENSE (SECTIONS 21 & 23)
// ============================================================================

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9_\-\.=:_+/]+/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /\bsk-[A-Za-z0-9_-]{10,}\b/gi,
  /\bkey-[A-Za-z0-9_-]{10,}\b/gi,
  /(?:api[\s_-]?key|secret|password|passwd|auth[\s_-]?token|private[\s_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-\.!@#$%^&*]{6,}['"]?/gi,
  /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email PII
];

const PROMPT_INJECTION_PATTERNS = [
  /<system>[\s\S]*?<\/system>/gi,
  /<script>[\s\S]*?<\/script>/gi,
  /\[INST\][\s\S]*?\[\/INST\]/gi,
  /ignore\s+(?:all\s+)?previous\s+instructions/gi,
  /you\s+are\s+now\s+(?:an?\s+)?unrestricted/gi,
  /override\s+system\s+prompt/gi,
  /bypass\s+all\s+(?:guardrails|governance|verification)/gi,
];

/**
 * Sanitizes input text to eliminate secrets, PII, and prompt injections.
 * Enforces strict data minimization.
 *
 * @param {string} text
 * @returns {string} Sanitized string
 */
function sanitizeContentAndEvidence(text) {
  if (typeof text !== 'string') return '';
  let sanitized = text;

  // Redact secrets and credentials
  for (const pat of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pat, '[REDACTED_SECRET]');
  }

  // Strip prompt injection payloads
  for (const pat of PROMPT_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pat, '[BLOCKED_INJECTION_ATTEMPT]');
  }

  // Bounded length to prevent resource exhaustion / context stuffing
  if (sanitized.length > 2500) {
    sanitized = sanitized.slice(0, 2500) + '... [TRUNCATED]';
  }

  return sanitized.trim();
}

/**
 * Validates a memory admission candidate for poisoning attempts and evidence gating.
 *
 * @param {Object} memoryRecord
 * @returns {{ valid: boolean, sanitizedRecord: Object, reason: string|null }}
 */
function validateMemoryAdmission(memoryRecord) {
  if (!memoryRecord || typeof memoryRecord !== 'object') {
    return { valid: false, sanitizedRecord: null, reason: 'Memory record must be an object' };
  }

  // Check required title / content
  if (!memoryRecord.title || !memoryRecord.content) {
    return { valid: false, sanitizedRecord: null, reason: 'Title and content are required' };
  }

  // Check for prompt injection attempts in title or content
  const rawText = `${memoryRecord.title} ${memoryRecord.content}`;
  for (const pat of PROMPT_INJECTION_PATTERNS) {
    if (pat.test(rawText)) {
      return {
        valid: false,
        sanitizedRecord: null,
        reason: 'Memory admission rejected: Prompt injection vector detected',
      };
    }
  }

  // Provenance & Evidence Gating (Section 4 & 21)
  // An unverified model inference cannot enter as VERIFIED or REPEATEDLY_VERIFIED
  const provenance = memoryRecord.provenance || PROVENANCE_TYPES.MODEL_INFERENCE;
  let status = memoryRecord.status || TRUST_STATES.UNVERIFIED;

  const isEmpiricalProvenance = [
    PROVENANCE_TYPES.AUTOMATED_TEST,
    PROVENANCE_TYPES.BENCHMARK,
    PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
  ].includes(provenance);
  const hasEmpiricalEvidence =
    (Array.isArray(memoryRecord.evidence) &&
      memoryRecord.evidence.length > 0 &&
      memoryRecord.evidence.some(e =>
        [
          PROVENANCE_TYPES.AUTOMATED_TEST,
          PROVENANCE_TYPES.BENCHMARK,
          PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
        ].includes(e.type || provenance),
      )) ||
    (isEmpiricalProvenance && (!memoryRecord.evidence || memoryRecord.evidence.length === 0));

  if (
    !hasEmpiricalEvidence &&
    (status === TRUST_STATES.VERIFIED || status === TRUST_STATES.REPEATEDLY_VERIFIED)
  ) {
    // Downgrade to UNVERIFIED or OBSERVED
    status = TRUST_STATES.OBSERVED;
  }

  // Sanitize content and evidence
  const sanitizedRecord = {
    ...memoryRecord,
    title: sanitizeContentAndEvidence(memoryRecord.title),
    content: sanitizeContentAndEvidence(memoryRecord.content),
    status,
    evidence: (memoryRecord.evidence || []).map(e => ({
      ...e,
      source: sanitizeContentAndEvidence(typeof e === 'string' ? e : e.source || e.detail || ''),
    })),
  };

  return { valid: true, sanitizedRecord, reason: null };
}

// ============================================================================
// 3. CANONICAL MEMORY RECORD SCHEMA FACTORY (SECTION 3)
// ============================================================================

/**
 * Creates a normalized memory record conforming to the canonical schema.
 *
 * @param {Object} params
 * @returns {Object} Canonical memory record
 */
function createMemoryRecord(params = {}) {
  const now = new Date().toISOString();
  const idSeed = `${params.type || 'mem'}_${params.title || ''}_${now}_${Math.random()}`;
  const id =
    params.id || `mem_${crypto.createHash('sha256').update(idSeed).digest('hex').slice(0, 12)}`;

  const record = {
    id,
    type: params.type || MEMORY_TYPES.PATTERN,
    title: params.title || 'Untitled Memory',
    content: params.content || '',
    concepts: Array.isArray(params.concepts) ? params.concepts : [],
    domains: Array.isArray(params.domains) ? params.domains : [],
    context: {
      technologies: Array.isArray(params.context?.technologies) ? params.context.technologies : [],
      architecture: params.context?.architecture || 'generic',
      scale: params.context?.scale || 'standard',
      workload: params.context?.workload || 'balanced',
      scope: params.context?.scope || MEMORY_SCOPES.GLOBAL,
      project_id: params.context?.project_id || null,
      ...(params.context || {}),
    },
    evidence: Array.isArray(params.evidence) ? params.evidence : [],
    source_task: params.source_task || 'system_initialization',
    source_skill: params.source_skill || 'generic',
    provenance: params.provenance || PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
    verification: {
      strategy: params.verification?.strategy || 'Functional verification',
      assertion: params.verification?.assertion || 'test_passes == true',
      verified_at: params.verification?.verified_at || now,
      ...(params.verification || {}),
    },
    confidence: params.confidence || 'HIGH', // HIGH, MEDIUM, LOW
    applicability: {
      applicable_when: Array.isArray(params.applicability?.applicable_when)
        ? params.applicability.applicable_when
        : ['General engineering application'],
      not_applicable_when: Array.isArray(params.applicability?.not_applicable_when)
        ? params.applicability.not_applicable_when
        : [],
      technologies: Array.isArray(params.applicability?.technologies)
        ? params.applicability.technologies
        : [],
      constraints: Array.isArray(params.applicability?.constraints)
        ? params.applicability.constraints
        : [],
    },
    constraints: Array.isArray(params.constraints) ? params.constraints : [],
    created_at: params.created_at || now,
    last_verified_at: params.last_verified_at || now,
    staleness_threshold_days: params.staleness_threshold_days || 180,
    usage_count: params.usage_count || 0,
    successful_usage_count: params.successful_usage_count || 0,
    failed_usage_count: params.failed_usage_count || 0,
    status: params.status || TRUST_STATES.VERIFIED,
    conflicts: Array.isArray(params.conflicts) ? params.conflicts : [],
  };

  const validation = validateMemoryAdmission(record);
  if (!validation.valid) {
    throw new Error(`Invalid memory record: ${validation.reason}`);
  }
  return validation.sanitizedRecord;
}

// ============================================================================
// 4. CONTEXTUAL APPLICABILITY & ANTI-FALSE-TRANSFER (SECTION 6 & BENCHMARK 2)
// ============================================================================

/**
 * Validates whether a memory is contextually applicable to a given task and context.
 * Strictly prevents false transfer across disparate technologies or scales.
 *
 * @param {Object} memoryRecord
 * @param {Object} currentContext
 * @returns {{ applicable: boolean, score: number, reasons: string[] }}
 */
function validateApplicability(memoryRecord, currentContext = {}) {
  const reasons = [];
  let score = 1.0;

  if (!memoryRecord || !memoryRecord.applicability) {
    return { applicable: true, score: 0.5, reasons: ['Default applicability (unconstrained)'] };
  }

  // 1. Cross-Project Isolation Check (Section 22 & Benchmark 8)
  const memScope = memoryRecord.context?.scope || MEMORY_SCOPES.GLOBAL;
  if (memScope === MEMORY_SCOPES.PROJECT || memScope === MEMORY_SCOPES.REPOSITORY) {
    const memProjectId = memoryRecord.context?.project_id;
    const currentProjectId = currentContext.project_id || currentContext.projectId;
    if (memProjectId && currentProjectId && memProjectId !== currentProjectId) {
      return {
        applicable: false,
        score: 0.0,
        reasons: [
          `Cross-project isolation boundary: Memory belongs to project '${memProjectId}', current is '${currentProjectId}'`,
        ],
      };
    }
    if (memProjectId && !currentProjectId) {
      return {
        applicable: false,
        score: 0.0,
        reasons: [
          `Cross-project isolation boundary: Memory requires specific project context '${memProjectId}'`,
        ],
      };
    }
  }

  const taskText = (currentContext.task || currentContext.query || '').toLowerCase();
  const currentTechs = (currentContext.technologies || []).map(t => t.toLowerCase());
  const currentScale = (currentContext.scale || 'standard').toLowerCase();
  const currentWorkload = (currentContext.workload || 'balanced').toLowerCase();

  // 2. Negative Applicability Triggers ("not_applicable_when")
  const notWhen = memoryRecord.applicability.not_applicable_when || [];
  for (const condition of notWhen) {
    const condLower = condition.toLowerCase();

    // Check tiny workload / single-node / embedded checks
    if (
      (condLower.includes('tiny workload') ||
        condLower.includes('low traffic') ||
        condLower.includes('small scale')) &&
      (currentScale === 'small' ||
        taskText.includes('small') ||
        taskText.includes('simple cli') ||
        taskText.includes('single user'))
    ) {
      reasons.push(`Violates condition: ${condition}`);
      return { applicable: false, score: 0.0, reasons };
    }

    // Check zero-staleness / strong freshness requirement
    if (
      (condLower.includes('zero-staleness') ||
        condLower.includes('zero staleness') ||
        condLower.includes('freshness requirement')) &&
      (taskText.includes('zero staleness') ||
        taskText.includes('zero-staleness') ||
        taskText.includes('strict freshness') ||
        taskText.includes('no staleness') ||
        currentContext.strict_freshness)
    ) {
      reasons.push(`Violates condition: ${condition}`);
      return { applicable: false, score: 0.0, reasons };
    }

    // Check in-memory / local CLI vs shared infrastructure
    if (
      (condLower.includes('no shared cache') ||
        condLower.includes('embedded') ||
        condLower.includes('local cli')) &&
      (currentTechs.includes('sqlite') ||
        taskText.includes('embedded') ||
        taskText.includes('cli tool'))
    ) {
      reasons.push(`Violates condition: ${condition}`);
      return { applicable: false, score: 0.0, reasons };
    }

    // Check read-only queries vs mutations
    if (
      condLower.includes('read-only') &&
      (taskText.startsWith('read') ||
        taskText.startsWith('get ') ||
        taskText.includes('fetch only'))
    ) {
      reasons.push(`Violates condition: ${condition}`);
      return { applicable: false, score: 0.0, reasons };
    }
  }

  // 3. Technology Alignment
  const appTechs = (memoryRecord.applicability.technologies || []).map(t => t.toLowerCase());
  if (appTechs.length > 0 && currentTechs.length > 0) {
    const hasTechMatch = currentTechs.some(ct => appTechs.includes(ct));
    if (!hasTechMatch) {
      score *= 0.5;
      reasons.push(
        `Technology divergence: Memory tailored for [${appTechs.join(', ')}], task uses [${currentTechs.join(', ')}]`,
      );
    } else {
      score *= 1.2;
      reasons.push(
        `Technology match confirmed: [${currentTechs.filter(ct => appTechs.includes(ct)).join(', ')}]`,
      );
    }
  }

  // 4. Positive Applicability Triggers ("applicable_when")
  const appWhen = memoryRecord.applicability.applicable_when || [];
  let positiveMatches = 0;
  for (const condition of appWhen) {
    const cLower = condition.toLowerCase();
    const words = cLower.split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => taskText.includes(w)).length;
    if (matches >= 2 || (words.length <= 2 && matches >= 1)) {
      positiveMatches++;
    }
  }

  if (
    appWhen.length > 0 &&
    positiveMatches === 0 &&
    !taskText.includes(memoryRecord.title.toLowerCase())
  ) {
    score *= 0.6;
    reasons.push('Weak alignment with positive applicability conditions');
  } else if (positiveMatches > 0) {
    score *= 1.0 + positiveMatches * 0.15;
    reasons.push(`Satisfies ${positiveMatches} positive applicability criteria`);
  }

  const isApplicable = score >= 0.4;
  return {
    applicable: isApplicable,
    score: Math.min(score, 2.0),
    reasons: reasons.length > 0 ? reasons : ['Applicable under general criteria'],
  };
}

// ============================================================================
// 5. STALENESS & DECAY EVALUATOR (SECTION 16 & BENCHMARK 5)
// ============================================================================

/**
 * Evaluates whether a memory is stale based on elapsed time or runtime drift.
 *
 * @param {Object} memoryRecord
 * @param {Object} envContext
 * @returns {{ isStale: boolean, ageDays: number, reason: string|null }}
 */
function evaluateMemoryStaleness(memoryRecord, envContext = {}) {
  if (!memoryRecord) return { isStale: false, ageDays: 0, reason: null };

  const lastVerified = new Date(
    memoryRecord.last_verified_at || memoryRecord.created_at || Date.now(),
  );
  const now = new Date(envContext.currentDate || Date.now());
  const ageMs = Math.max(0, now.getTime() - lastVerified.getTime());
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const thresholdDays = memoryRecord.staleness_threshold_days || 180;

  // Age-based staleness
  if (ageDays > thresholdDays) {
    return {
      isStale: true,
      ageDays,
      reason: `Memory exceeds staleness threshold (${ageDays} days > ${thresholdDays} days). Requires fresh verification.`,
    };
  }

  // Framework / Environment Version Drift (e.g. Next.js 12 Pages vs Next.js 14 App Router)
  const memTechVersion = memoryRecord.context?.framework_version;
  const currentTechVersion = envContext.framework_version;
  if (memTechVersion && currentTechVersion && memTechVersion !== currentTechVersion) {
    return {
      isStale: true,
      ageDays,
      reason: `Runtime framework mismatch: Memory verified on v${memTechVersion}, current environment is v${currentTechVersion}`,
    };
  }

  return { isStale: false, ageDays, reason: null };
}

// ============================================================================
// 6. MEMORY AS A HYPOTHESIS & CONTRADICTORY EVIDENCE (SECTIONS 8, 9, 24 & BENCHMARK 4)
// ============================================================================

/**
 * Compares a memory hypothesis against current empirical execution evidence.
 * If evidence contradicts the memory, the memory is marked CONTRADICTED, never silently overwritten.
 *
 * @param {Object} memoryRecord
 * @param {Object} currentEvidence
 * @param {Object} currentContext
 * @returns {Object} Evaluation outcome
 */
function evaluateMemoryHypothesisWithCurrentEvidence(
  memoryRecord,
  currentEvidence = {},
  currentContext = {},
) {
  if (!memoryRecord) throw new Error('Memory record required');

  const now = new Date().toISOString();
  const evaluation = {
    memory_id: memoryRecord.id,
    hypothesis: memoryRecord.title,
    current_evidence_strength: currentEvidence.strength || 'STRONG',
    verified: false,
    contradicted: false,
    decision: 'PROCEED',
    rationale: '',
  };

  // Check if current test or benchmark failed
  const testResults = currentEvidence.test_results || [];
  const benchmarkResults = currentEvidence.benchmark_results || {};
  const hasFailedTest = testResults.some(t => t.status === 'FAIL' || t.passed === false);
  const hasRegression =
    benchmarkResults.has_regression || benchmarkResults.latency_regression === true;

  if (hasFailedTest || hasRegression || currentEvidence.contradiction_detected) {
    // Current evidence refutes historical memory!
    memoryRecord.status = TRUST_STATES.CONTRADICTED;
    memoryRecord.failed_usage_count = (memoryRecord.failed_usage_count || 0) + 1;
    memoryRecord.usage_count = (memoryRecord.usage_count || 0) + 1;
    memoryRecord.last_verified_at = now;

    if (!Array.isArray(memoryRecord.evidence)) memoryRecord.evidence = [];
    memoryRecord.evidence.push({
      type: PROVENANCE_TYPES.BENCHMARK,
      source: `Current empirical execution refuted hypothesis: ${currentEvidence.failure_reason || 'Benchmark regression detected'}`,
      recorded_at: now,
    });

    evaluation.contradicted = true;
    evaluation.verified = false;
    evaluation.decision = 'REJECT_MEMORY_ADOPT_CURRENT_EVIDENCE';
    evaluation.rationale = `Current empirical evidence contradicts memory '${memoryRecord.title}'. Prioritizing current evidence over historical assumption.`;
    return evaluation;
  }

  // Current evidence confirms memory!
  memoryRecord.successful_usage_count = (memoryRecord.successful_usage_count || 0) + 1;
  memoryRecord.usage_count = (memoryRecord.usage_count || 0) + 1;
  memoryRecord.last_verified_at = now;

  if (memoryRecord.successful_usage_count >= 3 && memoryRecord.status === TRUST_STATES.VERIFIED) {
    memoryRecord.status = TRUST_STATES.REPEATEDLY_VERIFIED;
  } else if (
    memoryRecord.status === TRUST_STATES.OBSERVED ||
    memoryRecord.status === TRUST_STATES.UNVERIFIED
  ) {
    memoryRecord.status = TRUST_STATES.VERIFIED;
  }

  evaluation.verified = true;
  evaluation.contradicted = false;
  evaluation.decision = 'PROMOTE_MEMORY_TO_DECISION';
  evaluation.rationale = `Current empirical evidence corroborated memory '${memoryRecord.title}'. Promoted to active decision.`;
  return evaluation;
}

/**
 * Resolves architectural conflicts by maintaining contextual variants rather than overwriting.
 * (Section 9)
 *
 * @param {EngineeringMemoryStore} store
 * @param {Object} memoryA
 * @param {Object} memoryB
 * @param {string} resolutionExplanation
 * @returns {void}
 */
function recordConflictResolution(store, memoryA, memoryB, resolutionExplanation) {
  if (!memoryA || !memoryB) return;

  const conflictRecordA = {
    conflicting_memory_id: memoryB.id,
    conflicting_title: memoryB.title,
    differentiator: resolutionExplanation || 'Contrasting workload or infrastructure requirements',
    recorded_at: new Date().toISOString(),
  };

  const conflictRecordB = {
    conflicting_memory_id: memoryA.id,
    conflicting_title: memoryA.title,
    differentiator: resolutionExplanation || 'Contrasting workload or infrastructure requirements',
    recorded_at: new Date().toISOString(),
  };

  memoryA.conflicts = memoryA.conflicts || [];
  memoryA.conflicts.push(conflictRecordA);

  memoryB.conflicts = memoryB.conflicts || [];
  memoryB.conflicts.push(conflictRecordB);

  store.update(memoryA);
  store.update(memoryB);
}

// ============================================================================
// 7. MEMORY GRAPH (SECTION 19)
// ============================================================================

/**
 * Relational engineering graph connecting:
 * CONCEPT → CONSIDERATION → FAILURE → SKILL → VERIFICATION → DECISION → OUTCOME
 */
class MemoryGraph {
  constructor() {
    this.nodes = new Map(); // id -> { id, type, label, data }
    this.edges = []; // { from, to, relation, weight }
  }

  addNode(id, type, label, data = {}) {
    this.nodes.set(id, { id, type, label, data });
  }

  addEdge(from, to, relation, weight = 1.0) {
    this.edges.push({ from, to, relation, weight });
  }

  getNeighbors(nodeId, relation = null) {
    return this.edges
      .filter(e => e.from === nodeId && (!relation || e.relation === relation))
      .map(e => ({ node: this.nodes.get(e.to), edge: e }));
  }

  /**
   * Explores the engineering graph starting from active concepts to surface
   * linked failures, required considerations, skills, and verification plans.
   *
   * @param {string[]} conceptIds
   * @returns {Object} Graph traversal results
   */
  traverseFromConcepts(conceptIds = []) {
    const visitedNodes = new Set();
    const failures = [];
    const skills = [];
    const verifications = [];
    const decisions = [];

    for (const cId of conceptIds) {
      visitedNodes.add(cId);
      const outgoing = this.edges.filter(e => e.from === cId || e.to === cId);
      for (const edge of outgoing) {
        const targetId = edge.from === cId ? edge.to : edge.from;
        if (!visitedNodes.has(targetId)) {
          visitedNodes.add(targetId);
          const node = this.nodes.get(targetId);
          if (node) {
            if (node.type === MEMORY_TYPES.FAILURE || node.type === MEMORY_TYPES.ANTI_PATTERN)
              failures.push(node);
            else if (node.type === 'skill') skills.push(node);
            else if (node.type === MEMORY_TYPES.VERIFICATION) verifications.push(node);
            else if (node.type === MEMORY_TYPES.DECISION) decisions.push(node);
          }
        }
      }
    }

    return { failures, skills, verifications, decisions };
  }
}

// ============================================================================
// 8. VERIFICATION STRATEGY SEED & RETRIEVAL (SECTION 12)
// ============================================================================

const SEED_VERIFICATION_STRATEGIES = [
  {
    id: 'ver_idempotency_storm',
    type: MEMORY_TYPES.VERIFICATION,
    title: 'Concurrent Duplicate Request Storm (Idempotency Proof)',
    content:
      'Dispatches 100 parallel identical requests with identical idempotency keys against target endpoint.',
    concepts: ['idempotency', 'financial-transaction', 'concurrency-control'],
    domains: ['api', 'database'],
    verification: {
      strategy: 'Parallel HTTP storm with identical Idempotency-Key header',
      assertion:
        'count(database_mutations) === 1 && duplicate_http_responses.every(r => [200, 201, 409].includes(r.status))',
      expected_outcome: 'Exactly one state-changing record committed, zero double charges.',
    },
    provenance: PROVENANCE_TYPES.AUTOMATED_TEST,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
  },
  {
    id: 'ver_rate_limit_burst',
    type: MEMORY_TYPES.VERIFICATION,
    title: 'Burst Exceeding Threshold Test (Rate Limiting Proof)',
    content: 'Dispatches N+50 requests within 1-second window against bucket capacity N.',
    concepts: ['rate-limiting', 'ddos-defense', 'traffic-shaping'],
    domains: ['api', 'security'],
    verification: {
      strategy: 'Token bucket exhaustion burst generator',
      assertion:
        'rejected_requests.status === 429 && rejected_requests.headers["retry-after"] !== undefined',
      expected_outcome:
        'Deterministic 429 Too Many Requests response with RFC compliant Retry-After.',
    },
    provenance: PROVENANCE_TYPES.AUTOMATED_TEST,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
  },
  {
    id: 'ver_failover_fault_injection',
    type: MEMORY_TYPES.VERIFICATION,
    title: 'Dependency Fault Injection (Failover & Resilience Proof)',
    content:
      'Simulates network partition / timeout on downstream dependency; verifies circuit breaker opens.',
    concepts: ['retry-and-backoff', 'circuit-breaker', 'high-availability'],
    domains: ['distributed-systems', 'backend'],
    verification: {
      strategy: 'Downstream latency & 500 error injection mock',
      assertion:
        'circuit_state === "OPEN" && fallback_invoked === true && cascade_failure === false',
      expected_outcome:
        'Graceful fallback response returned within 50ms without exhausting connection threads.',
    },
    provenance: PROVENANCE_TYPES.AUTOMATED_TEST,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
  },
  {
    id: 'ver_acid_rollback_mid_operation',
    type: MEMORY_TYPES.VERIFICATION,
    title: 'Atomic Rollback on Error Test (ACID Integrity Proof)',
    content:
      'Injects unhandled failure immediately before transaction commit after ledger mutation.',
    concepts: ['transaction-integrity', 'database-design'],
    domains: ['database', 'backend'],
    verification: {
      strategy: 'Mid-transaction chaos injection',
      assertion: 'select count(*) from ledger_entries where tx_id = injected_id === 0',
      expected_outcome: 'Zero partial rows committed to database on error.',
    },
    provenance: PROVENANCE_TYPES.AUTOMATED_TEST,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
  },
  {
    id: 'ver_ssrf_magic_bytes',
    type: MEMORY_TYPES.VERIFICATION,
    title: 'SSRF & Magic-Byte Boundary Verification',
    content:
      'Probes file upload endpoint with AWS metadata (169.254.169.254) and spoofed MIME headers.',
    concepts: ['file-upload-and-storage', 'api-security-auditor'],
    domains: ['security', 'api'],
    verification: {
      strategy: 'Blacklist/whitelist metadata probe and binary stream validation',
      assertion: 'private_ip_requests_blocked === true && mime_spoof_rejected === true',
      expected_outcome: 'Immediate 400/403 rejection before disk buffering.',
    },
    provenance: PROVENANCE_TYPES.SECURITY_FINDING,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
  },
];

// ============================================================================
// 9. NEGATIVE KNOWLEDGE & FAILURE SEEDS (SECTIONS 10 & 11)
// ============================================================================

const SEED_FAILURE_MEMORIES = [
  {
    id: 'fail_process_local_mutex',
    type: MEMORY_TYPES.ANTI_PATTERN,
    title: 'Process-Local Mutex in Multi-Instance Deployment',
    content:
      'Using in-memory locks (like async-lock or local mutex) fails completely when multiple application replicas run behind a load balancer.',
    concepts: ['concurrency-control', 'distributed-systems'],
    domains: ['backend', 'distributed-systems'],
    context: { architecture: 'multi-instance', scale: 'distributed' },
    evidence: [
      {
        type: PROVENANCE_TYPES.PRODUCTION_INCIDENT,
        source:
          'Concurrent payment duplicate charges occurred across Pod A and Pod B despite in-memory mutex.',
      },
    ],
    failure: {
      cause:
        'Process-local memory is isolated across horizontal containers; requests hitting different nodes bypass lock.',
      detection_method: 'Multi-node concurrent integration test',
      impact: 'CRITICAL: Double financial charges, race condition data corruption',
      affected_concepts: ['concurrency-control', 'financial-transaction'],
      fix: 'Use PostgreSQL advisory locks, Redis Redlock, or atomic database uniqueness constraints.',
      verification:
        'Concurrent requests routed to separate server processes produce exactly one mutation.',
      regression_risk:
        'High if distributed locking introduces single point of failure or latency overhead.',
    },
    provenance: PROVENANCE_TYPES.PRODUCTION_INCIDENT,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
    applicability: {
      applicable_when: [
        'Multi-node, clustered, or containerized deployments with horizontal scaling',
      ],
      not_applicable_when: ['Strictly single-process standalone CLI applications running locally'],
    },
  },
  {
    id: 'fail_naive_retry_side_effects',
    type: MEMORY_TYPES.FAILURE,
    title: 'Naive HTTP Retry Without Idempotency (Amplification & Duplication)',
    content:
      'Retrying non-idempotent POST/PATCH mutations on network timeouts multiplies downstream side-effects.',
    concepts: ['retry-and-backoff', 'idempotency', 'financial-transaction'],
    domains: ['api', 'network'],
    failure: {
      cause:
        'Network timeouts frequently occur on response delivery after server has already processed mutation.',
      detection_method: 'Simulated 504 Gateway Timeout during charge execution',
      impact: 'CRITICAL: Duplicate customer charges and webhook storm',
      affected_concepts: ['retry-and-backoff', 'idempotency'],
      fix: 'Require client-provided Idempotency-Key and enforce unique database constraint.',
      verification: '10 simulated timeout retries yield identical response and single transaction.',
      regression_risk: 'Storage growth of cached idempotency keys.',
    },
    provenance: PROVENANCE_TYPES.AUTOMATED_TEST,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
    applicability: {
      applicable_when: ['Network calls invoking state-changing operations'],
      not_applicable_when: ['Idempotent read operations (GET)'],
    },
  },
  {
    id: 'fail_unbounded_cache_staleness',
    type: MEMORY_TYPES.ANTI_PATTERN,
    title: 'Aggressive Shared Caching on Real-Time Critical State',
    content:
      'Applying Redis cache without explicit invalidation or TTL to rapidly mutating data causes severe staleness violations.',
    concepts: ['caching', 'data-freshness'],
    domains: ['database', 'api'],
    failure: {
      cause: 'Cached reads serve stale price or inventory balance after concurrent update.',
      detection_method: 'Read-after-write consistency audit',
      impact: 'HIGH: Overselling inventory or stale authorization token acceptance',
      affected_concepts: ['caching', 'data-freshness'],
      fix: 'Cache only expensive immutable data, or use transactional write-through with explicit pub/sub invalidation.',
      verification: 'Read immediately following write returns updated entity.',
      regression_risk: 'Cache stampede if invalidation is too aggressive.',
    },
    provenance: PROVENANCE_TYPES.BENCHMARK,
    status: TRUST_STATES.VERIFIED,
    confidence: 'HIGH',
    applicability: {
      applicable_when: ['Shared caching layer (Redis/Memcached) applied to database models'],
      not_applicable_when: ['Static assets, CDN edge caching of versioned files'],
    },
  },
];

// ============================================================================
// 10. REUSABLE PATTERN & DECISION SEEDS (SECTIONS 2 & 9)
// ============================================================================

const SEED_PATTERN_MEMORIES = [
  {
    id: 'pat_idempotent_mutation',
    type: MEMORY_TYPES.PATTERN,
    title: 'Idempotency Key & Transactional Boundary Pattern',
    content:
      'Client-provided unique token stored with status in database transaction ensures at-most-once execution under retry storms.',
    concepts: [
      'idempotency',
      'financial-transaction',
      'transaction-integrity',
      'concurrency-control',
    ],
    domains: ['api', 'database', 'finance'],
    provenance: PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
    context: {
      architecture: 'distributed-services',
      technologies: ['postgresql', 'redis', 'node', 'express'],
      scope: MEMORY_SCOPES.GLOBAL,
    },
    applicability: {
      applicable_when: [
        'State-changing financial mutation or order creation',
        'External clients experiencing potential network retries',
      ],
      not_applicable_when: [
        'Read-only queries',
        'Simple in-memory CLI scripts without shared database',
        'Tiny workload where duplicate requests are impossible',
      ],
      technologies: ['postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb'],
    },
  },
  {
    id: 'pat_redis_read_cache',
    type: MEMORY_TYPES.PATTERN,
    title: 'Redis Shared Caching for Expensive Read Computations',
    content:
      'Caches query results with fixed TTL and key hashing to relieve database read pressure.',
    concepts: ['caching', 'query-optimization', 'latency-budget'],
    domains: ['database', 'performance'],
    provenance: PROVENANCE_TYPES.BENCHMARK,
    status: TRUST_STATES.VERIFIED,
    confidence: 'HIGH',
    context: {
      architecture: 'distributed-cache',
      technologies: ['redis', 'postgresql'],
      scale: 'high-read-volume',
      scope: MEMORY_SCOPES.GLOBAL,
    },
    applicability: {
      applicable_when: [
        'High read frequency exceeding 1000 QPS',
        'Repeated expensive computation or complex SQL joins',
        'Acceptable staleness window (e.g. 5 to 60 seconds)',
      ],
      not_applicable_when: [
        'Tiny workload or single-instance application',
        'Strong zero-staleness requirement (financial balances)',
        'Embedded standalone CLI with no external Redis infrastructure',
      ],
      technologies: ['redis', 'memcached'],
    },
  },
  {
    id: 'dec_postgres_advisory_lock',
    type: MEMORY_TYPES.DECISION,
    title: 'PostgreSQL Advisory Lock for Multi-Instance Entity Serialization',
    content:
      'PostgreSQL transaction-level advisory lock (pg_advisory_xact_lock) selected because horizontal container replicas rendered local mutexes insufficient.',
    concepts: ['concurrency-control', 'database-design'],
    domains: ['database', 'backend'],
    provenance: PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
    context: {
      architecture: 'multi-instance',
      workload: 'high-write-collision',
      technologies: ['postgresql'],
      scope: MEMORY_SCOPES.GLOBAL,
    },
    applicability: {
      applicable_when: [
        'PostgreSQL database is primary datastore',
        'High collision probability on entity mutation across horizontal instances',
      ],
      not_applicable_when: [
        'High-read low-contention workload where optimistic locking is superior',
        'Non-relational databases (MongoDB, DynamoDB)',
      ],
      technologies: ['postgresql'],
    },
  },
  {
    id: 'dec_optimistic_concurrency_versioning',
    type: MEMORY_TYPES.DECISION,
    title: 'Optimistic Concurrency Control via Version Column',
    content:
      'Version-based optimistic locking (WHERE id = ? AND version = ?) selected for high-read low-contention workloads to avoid database lock contention.',
    concepts: ['concurrency-control', 'database-design'],
    domains: ['database', 'performance'],
    provenance: PROVENANCE_TYPES.BENCHMARK,
    status: TRUST_STATES.REPEATEDLY_VERIFIED,
    confidence: 'HIGH',
    context: {
      architecture: 'distributed',
      workload: 'high-read-low-contention',
      technologies: ['postgresql', 'mysql'],
      scope: MEMORY_SCOPES.GLOBAL,
    },
    applicability: {
      applicable_when: [
        'Read-heavy workloads with infrequent concurrent collisions',
        'Minimizing database row-level lock hold time',
      ],
      not_applicable_when: [
        'High burst collision rates where retry storm degrades throughput',
        'Multi-entity cross-table atomic transactions',
      ],
    },
  },
];

// ============================================================================
// 11. ENGINEERING MEMORY STORE (SECTION 22: ISOLATION & PERSISTENCE)
// ============================================================================

class EngineeringMemoryStore {
  constructor(options = {}) {
    this.storagePath = options.storagePath || null;
    this.memories = new Map(); // id -> record
    this.graph = new MemoryGraph();
    this.initSeeds();
  }

  initSeeds() {
    const allSeeds = [
      ...SEED_PATTERN_MEMORIES,
      ...SEED_FAILURE_MEMORIES,
      ...SEED_VERIFICATION_STRATEGIES,
    ];

    for (const s of allSeeds) {
      const rec = createMemoryRecord(s);
      this.memories.set(rec.id, rec);
      this.graph.addNode(rec.id, rec.type, rec.title, rec);

      // Connect concepts to memory in graph
      for (const c of rec.concepts || []) {
        this.graph.addNode(c, 'concept', c);
        this.graph.addEdge(c, rec.id, 'informed_by');
      }
    }
  }

  add(record) {
    const canonical = createMemoryRecord(record);
    this.memories.set(canonical.id, canonical);
    this.graph.addNode(canonical.id, canonical.type, canonical.title, canonical);

    for (const c of canonical.concepts || []) {
      this.graph.addNode(c, 'concept', c);
      this.graph.addEdge(c, canonical.id, 'informed_by');
    }
    return canonical;
  }

  update(record) {
    if (!record || !record.id) return;
    this.memories.set(record.id, record);
    this.graph.addNode(record.id, record.type, record.title, record);
  }

  get(id) {
    return this.memories.get(id) || null;
  }

  getAll() {
    return Array.from(this.memories.values());
  }

  getByType(type) {
    return this.getAll().filter(m => m.type === type);
  }

  clear() {
    this.memories.clear();
    this.graph = new MemoryGraph();
    this.initSeeds();
  }
}

// Global singleton instance
let _globalStoreInstance = null;

function getEngineeringMemoryStore(options = {}) {
  if (!_globalStoreInstance) {
    _globalStoreInstance = new EngineeringMemoryStore(options);
  }
  return _globalStoreInstance;
}

// ============================================================================
// 12. MULTI-DIMENSIONAL RETRIEVAL & RANKING (SECTION 20)
// ============================================================================

/**
 * Retrieves relevant engineering memories ranked across 10 dimensions:
 * Semantic relevance, concept overlap, tech match, architecture match,
 * constraint match, evidence strength, trust rank, recency, successful reuse,
 * and contradiction penalty.
 *
 * @param {string} taskQuery
 * @param {Object} context
 * @param {EngineeringMemoryStore} store
 * @param {Object} options
 * @returns {Array<Object>} Ranked retrieved memories
 */
function retrieveRelevantMemories(taskQuery, context = {}, store = null, options = {}) {
  const memStore = store || getEngineeringMemoryStore();
  const allMemories = memStore.getAll();
  const queryTokens = (taskQuery || '')
    .toLowerCase()
    .split(/[\s,._\-:;]+/)
    .filter(w => w.length > 2);
  const targetConcepts = (context.concepts || []).map(c =>
    (typeof c === 'string' ? c : c.id || c.name).toLowerCase(),
  );
  const targetTechs = (context.technologies || []).map(t => t.toLowerCase());

  const ranked = [];

  for (const mem of allMemories) {
    // 1. Contextual Applicability Check (Section 6 & Benchmark 2 & Benchmark 8)
    const applicability = validateApplicability(mem, {
      task: taskQuery,
      technologies: targetTechs,
      project_id: context.project_id || context.projectId,
      scale: context.scale,
      strict_freshness: context.strict_freshness,
    });

    if (!applicability.applicable) {
      continue; // Strict rejection of non-applicable memories
    }

    // 2. Staleness Evaluation (Section 16 & Benchmark 5)
    const staleness = evaluateMemoryStaleness(mem, context);
    if (staleness.isStale && mem.status !== TRUST_STATES.STALE) {
      mem.status = TRUST_STATES.STALE;
    }

    // 3. Multi-Dimensional Score Calculation
    let score = 0;

    // A. Concept Overlap (weight: 0.30)
    const memConcepts = (mem.concepts || []).map(c => c.toLowerCase());
    let conceptMatches = 0;
    for (const mc of memConcepts) {
      if (targetConcepts.some(tc => tc.includes(mc) || mc.includes(tc))) {
        conceptMatches++;
      }
    }
    const conceptScore = memConcepts.length > 0 ? conceptMatches / memConcepts.length : 0;
    score += conceptScore * 35;

    // B. Semantic Keyword Overlap (weight: 0.25)
    const memText = `${mem.title} ${mem.content} ${(mem.domains || []).join(' ')}`.toLowerCase();
    let tokenMatches = 0;
    for (const qt of queryTokens) {
      if (memText.includes(qt)) {
        tokenMatches++;
      }
    }
    const tokenScore = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0;
    score += tokenScore * 25;

    // C. Applicability Multiplier (weight: 0.15)
    score += applicability.score * 15;

    // D. Trust Rank (weight: 0.15)
    const trustRank = TRUST_RANKS[mem.status] || 1;
    score += (trustRank / 6.0) * 15;

    // E. Evidence Strength & Successful Reuse (weight: 0.15)
    const empiricalCount = (mem.evidence || []).filter(e =>
      [
        PROVENANCE_TYPES.AUTOMATED_TEST,
        PROVENANCE_TYPES.BENCHMARK,
        PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION,
      ].includes(e.type),
    ).length;
    score += Math.min(empiricalCount * 3, 10);
    score += Math.min((mem.successful_usage_count || 0) * 2, 10);

    // F. Penalties
    if (mem.status === TRUST_STATES.CONTRADICTED) {
      score -= 50; // Heavy penalty for contradicted memory
    }
    if (mem.status === TRUST_STATES.STALE) {
      score -= 20; // Staleness penalty
    }

    if (score >= (options.minScore || 15)) {
      ranked.push({
        memory: mem,
        score: Math.round(score * 10) / 10,
        applicability_reasons: applicability.reasons,
        is_stale: staleness.isStale,
        staleness_reason: staleness.reason,
      });
    }
  }

  // Sort descending by score
  ranked.sort((a, b) => b.score - a.score);
  return ranked.map(r => ({
    ...r.memory,
    retrieval_score: r.score,
    applicability_reasons: r.applicability_reasons,
    is_stale: r.is_stale,
    staleness_reason: r.staleness_reason,
  }));
}

// ============================================================================
// 13. MEMORY EXTRACTION POST OUTCOME AUDIT (SECTION 5.3)
// ============================================================================

/**
 * Extracts reusable engineering memory items from completed verified task outcomes.
 *
 * @param {string} taskQuery
 * @param {Object} outcomeContract
 * @param {Object} outcomeAudit
 * @param {Object} options
 * @returns {Array<Object>} Extracted and registered memory items
 */
function extractEngineeringMemory(
  taskQuery,
  outcomeContract = {},
  outcomeAudit = {},
  options = {},
) {
  const store = options.store || getEngineeringMemoryStore();
  const extracted = [];
  const now = new Date().toISOString();

  // If outcome was verified and complete
  if (outcomeAudit.complete || outcomeAudit.verified) {
    for (const mc of outcomeContract.material_considerations || []) {
      if (
        mc.category === 'financial-mutation' ||
        mc.category === 'concurrency' ||
        mc.title.toLowerCase().includes('idempotenc')
      ) {
        const item = store.add({
          type: MEMORY_TYPES.PATTERN,
          title: `Verified Pattern: ${mc.title}`,
          content: `${mc.rationale} Verified under task: ${taskQuery}`,
          concepts: [mc.category, 'verification-verified'],
          domains: outcomeContract.quality_dimensions
            ? Object.keys(outcomeContract.quality_dimensions)
            : ['backend'],
          context: {
            scope: options.scope || MEMORY_SCOPES.GLOBAL,
            project_id: options.project_id || null,
          },
          evidence: [
            {
              type: PROVENANCE_TYPES.AUTOMATED_TEST,
              source: `Outcome audit confirmed 100% material consideration coverage and passing verification.`,
              recorded_at: now,
            },
          ],
          source_task: taskQuery,
          status: TRUST_STATES.VERIFIED,
          confidence: 'HIGH',
        });
        extracted.push(item);
      }
    }
  }

  // Extract observed failure mode if tests failed or regressions occurred
  if (outcomeAudit.failures && outcomeAudit.failures.length > 0) {
    for (const f of outcomeAudit.failures) {
      const failItem = store.add({
        type: MEMORY_TYPES.FAILURE,
        title: `Observed Failure: ${f.title || f.name || 'Task Failure'}`,
        content: f.detail || f.error || 'Execution failure detected',
        concepts: f.concepts || ['execution-failure'],
        domains: ['reliability'],
        failure: {
          cause: f.cause || 'Unknown race or schema violation',
          detection_method: f.detection_method || 'Unit / Integration test',
          impact: f.impact || 'Task incompletion',
          affected_concepts: f.concepts || [],
          fix: f.fix || 'Apply atomic constraints and error bounds',
          verification: f.verification || 'Passing test verification',
          regression_risk: 'Medium',
        },
        evidence: [
          {
            type: PROVENANCE_TYPES.AUTOMATED_TEST,
            source: f.error || 'Test suite reported failure',
            recorded_at: now,
          },
        ],
        source_task: taskQuery,
        status: TRUST_STATES.VERIFIED,
        confidence: 'HIGH',
      });
      extracted.push(failItem);
    }
  }

  return extracted;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MEMORY_TYPES,
  PROVENANCE_TYPES,
  TRUST_STATES,
  TRUST_RANKS,
  MEMORY_SCOPES,
  sanitizeContentAndEvidence,
  validateMemoryAdmission,
  createMemoryRecord,
  validateApplicability,
  evaluateMemoryStaleness,
  evaluateMemoryHypothesisWithCurrentEvidence,
  recordConflictResolution,
  MemoryGraph,
  SEED_VERIFICATION_STRATEGIES,
  SEED_FAILURE_MEMORIES,
  SEED_PATTERN_MEMORIES,
  EngineeringMemoryStore,
  getEngineeringMemoryStore,
  retrieveRelevantMemories,
  extractEngineeringMemory,
};
