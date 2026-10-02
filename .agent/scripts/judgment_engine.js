'use strict';

/**
 * judgment_engine.js — Tribunal Kit Phase 4: Engineering Judgment Engine
 * =====================================================================
 * Implements evidence-driven engineering judgment, explicit uncertainty tracking,
 * reversibility analysis, requirement conflict detection, counterfactual analysis,
 * decision invalidation upon contradiction, and architectural anti-slop auditing.
 *
 * Invariants:
 * - EXECUTION SHOULD BE ADAPTIVE, NOT PREDETERMINED.
 * - EVIDENCE > ASSUMPTION.
 * - HIGH-IMPACT DECISIONS REQUIRE HIGHER VERIFICATION.
 * - A FIX IS ONLY AN IMPROVEMENT IF THE OVERALL OUTCOME IMPROVES.
 * - TRIBUNAL MUST BE WILLING TO REJECT ITS OWN PREVIOUS DECISION WHEN EVIDENCE CONTRADICTS IT.
 */

// ============================================================================
// 1. EVIDENCE HIERARCHY (SECTION 4)
// ============================================================================

/**
 * 8-tier evidence hierarchy.
 * Runtime evidence is king; model inference is speculative until verified.
 */
const EVIDENCE_LEVELS = {
  RUNTIME: { tier: 1, name: 'Runtime Evidence', weight: 1.0, reliable: true },
  TESTS: { tier: 2, name: 'Automated Tests', weight: 0.9, reliable: true },
  STATIC_ANALYSIS: { tier: 3, name: 'Static Analysis & AST', weight: 0.8, reliable: true },
  BENCHMARKS: { tier: 4, name: 'Benchmarks & Profiling', weight: 0.75, reliable: true },
  REPOSITORY: { tier: 5, name: 'Repository Artifacts', weight: 0.65, reliable: true },
  CONFIGURATION: { tier: 6, name: 'Environment & Config', weight: 0.55, reliable: true },
  DOCUMENTATION: { tier: 7, name: 'Documentation & ADRs', weight: 0.4, reliable: false },
  MODEL_INFERENCE: { tier: 8, name: 'Model Inference (Unverified)', weight: 0.2, reliable: false },
};

/**
 * Classify a piece of evidence into the engineering evidence hierarchy.
 * Distinguishes KNOWN from INFERRED from ASSUMED from CONTRADICTED.
 *
 * @param {Object|string} evidenceItem
 * @returns {Object} Classified evidence
 */
function classifyEvidence(evidenceItem) {
  if (!evidenceItem) {
    return {
      type: 'MODEL_INFERENCE',
      tier: 8,
      status: 'ASSUMED',
      name: EVIDENCE_LEVELS.MODEL_INFERENCE.name,
      weight: EVIDENCE_LEVELS.MODEL_INFERENCE.weight,
      detail: 'No verifiable source provided.',
    };
  }

  const text =
    typeof evidenceItem === 'string'
      ? evidenceItem
      : evidenceItem.detail || evidenceItem.source || evidenceItem.type || '';
  const t = text.toLowerCase();

  if (/(?:runtime|execution output|trace log|live error|production log|profile log)/i.test(t)) {
    return {
      type: 'RUNTIME',
      tier: 1,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.RUNTIME.name,
      weight: EVIDENCE_LEVELS.RUNTIME.weight,
      detail: text,
    };
  }
  if (/(?:test|spec|jest|vitest|assert|passed|failed|testsuite)/i.test(t)) {
    return {
      type: 'TESTS',
      tier: 2,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.TESTS.name,
      weight: EVIDENCE_LEVELS.TESTS.weight,
      detail: text,
    };
  }
  if (/(?:\bast\b|eslint|tsc|typecheck|syntax tree|static check|linter)/i.test(t)) {
    return {
      type: 'STATIC_ANALYSIS',
      tier: 3,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.STATIC_ANALYSIS.name,
      weight: EVIDENCE_LEVELS.STATIC_ANALYSIS.weight,
      detail: text,
    };
  }
  if (/(?:benchmark|latency measurement|throughput|p99|flamegraph|profil)/i.test(t)) {
    return {
      type: 'BENCHMARKS',
      tier: 4,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.BENCHMARKS.name,
      weight: EVIDENCE_LEVELS.BENCHMARKS.weight,
      detail: text,
    };
  }
  if (/(?:package\.json|schema\.prisma|cargo\.toml|dockerfile|git commit|repo file)/i.test(t)) {
    return {
      type: 'REPOSITORY',
      tier: 5,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.REPOSITORY.name,
      weight: EVIDENCE_LEVELS.REPOSITORY.weight,
      detail: text,
    };
  }
  if (/(?:env|process\.env|k8s config|helm|nginx\.conf|yaml config)/i.test(t)) {
    return {
      type: 'CONFIGURATION',
      tier: 6,
      status: 'KNOWN',
      name: EVIDENCE_LEVELS.CONFIGURATION.name,
      weight: EVIDENCE_LEVELS.CONFIGURATION.weight,
      detail: text,
    };
  }
  if (/(?:readme|adr|comment|docstring|confluence|wiki)/i.test(t)) {
    return {
      type: 'DOCUMENTATION',
      tier: 7,
      status: 'INFERRED',
      name: EVIDENCE_LEVELS.DOCUMENTATION.name,
      weight: EVIDENCE_LEVELS.DOCUMENTATION.weight,
      detail: text,
    };
  }

  return {
    type: 'MODEL_INFERENCE',
    tier: 8,
    status: 'ASSUMED',
    name: EVIDENCE_LEVELS.MODEL_INFERENCE.name,
    weight: EVIDENCE_LEVELS.MODEL_INFERENCE.weight,
    detail: text,
  };
}

// ============================================================================
// 2. UNCERTAINTY MODEL (SECTION 3 & 10)
// ============================================================================

/**
 * Creates an uncertainty tracking record.
 * Prevents assumptions from silently becoming facts.
 *
 * @param {string} claim
 * @param {Object} [options]
 * @returns {Object} Uncertainty record
 */
function createUncertaintyRecord(claim, options = {}) {
  const evidenceList = (options.evidence || []).map(classifyEvidence);
  const highestEvidence =
    evidenceList.length > 0
      ? evidenceList.reduce((prev, curr) => (curr.tier < prev.tier ? curr : prev), evidenceList[0])
      : null;

  let status = options.status || 'unknown';
  if (!options.status) {
    if (evidenceList.length === 0) {
      status = 'unknown';
    } else if (evidenceList.some(e => e.status === 'CONTRADICTED')) {
      status = 'contradicted';
    } else if (highestEvidence && highestEvidence.tier <= 4) {
      status = 'verified';
    } else if (highestEvidence && highestEvidence.tier <= 7) {
      status = 'inferred';
    } else {
      status = 'assumed';
    }
  }

  const confidence =
    options.confidence ||
    (status === 'verified' ? 'HIGH' : status === 'inferred' ? 'MEDIUM' : 'LOW');

  return {
    claim,
    status, // 'verified' | 'assumed' | 'inferred' | 'unknown' | 'contradicted'
    confidence, // 'HIGH' | 'MEDIUM' | 'LOW'
    evidence: evidenceList,
    highest_evidence_tier: highestEvidence ? highestEvidence.tier : 8,
    impact_if_wrong:
      options.impact_if_wrong || 'Moderate operational, performance, or correctness divergence.',
    next_action:
      options.next_action ||
      (status === 'verified'
        ? 'Proceed with verified claim.'
        : `Execute verification to corroborate claim '${claim}'.`),
  };
}

/**
 * Calculates Expected Information Value for an investigation (Section 10).
 * Expected Reduction in Uncertainty / Investigation Cost.
 *
 * @param {Object} uncertaintyRecord
 * @param {number} investigationCostSec (or relative cost index 1-10)
 * @returns {Object} Evaluation with recommendation
 */
function calculateInformationValue(uncertaintyRecord, investigationCostSec = 5) {
  const impactWeights = {
    CRITICAL: 1.0,
    HIGH: 0.8,
    MEDIUM: 0.5,
    LOW: 0.2,
  };

  const impactKey = (uncertaintyRecord.impact_level || 'MEDIUM').toUpperCase();
  const impactWeight = impactWeights[impactKey] || 0.5;

  const uncertaintyFactor =
    uncertaintyRecord.status === 'verified'
      ? 0.05
      : uncertaintyRecord.status === 'unknown'
        ? 1.0
        : uncertaintyRecord.status === 'contradicted'
          ? 1.0
          : 0.6;

  const rawValue = (impactWeight * uncertaintyFactor * 100) / Math.max(1, investigationCostSec);
  const normalizedScore = Number(rawValue.toFixed(2));

  const shouldInvestigate = normalizedScore >= 5.0 && uncertaintyRecord.status !== 'verified';

  return {
    claim: uncertaintyRecord.claim,
    expected_information_value: normalizedScore,
    investigation_cost: investigationCostSec,
    should_investigate: shouldInvestigate,
    rationale: shouldInvestigate
      ? `High information payoff (${normalizedScore}): Investigating reduces high-impact uncertainty before irreversible work.`
      : `Low information payoff (${normalizedScore}): Cost outweighs expected reduction in uncertainty; proceed with bounded defaults.`,
  };
}

// ============================================================================
// 3. REVERSIBILITY ANALYSIS (SECTION 6)
// ============================================================================

const REVERSIBILITY_LEVELS = {
  REVERSIBLE: {
    tier: 1,
    name: 'REVERSIBLE',
    description:
      'Can be rolled back trivially with git checkout or simple code reversion (e.g. CSS, formatting, comments).',
  },
  PARTIALLY_REVERSIBLE: {
    tier: 2,
    name: 'PARTIALLY_REVERSIBLE',
    description:
      'Requires minor migration rollback or cache clearing (e.g. additive schema column, internal caching layer).',
  },
  HARD_TO_REVERSE: {
    tier: 3,
    name: 'HARD_TO_REVERSE',
    description:
      'Modifies public API contracts, shared library signatures, or alters complex database tables.',
  },
  IRREVERSIBLE: {
    tier: 4,
    name: 'IRREVERSIBLE',
    description:
      'Destructive database operations (DROP TABLE, DELETE records), production secret rotation, or distributed data loss.',
  },
};

/**
 * Classifies the reversibility of an architectural or code decision.
 *
 * @param {string} decisionDescription
 * @param {Object} [context]
 * @returns {Object} Reversibility report
 */
function classifyReversibility(decisionDescription, context = {}) {
  const text = (decisionDescription || '').toLowerCase();

  if (/(?:delete|drop table|truncate|destroy|purge|wipe|remove customer|permanent)/i.test(text)) {
    return {
      classification: REVERSIBILITY_LEVELS.IRREVERSIBLE.name,
      tier: 4,
      is_irreversible: true,
      requires_pre_verification: true,
      warning:
        'DESTRUCTIVE / IRREVERSIBLE OPERATION: Requires backup verification, dry-run simulation, and explicit confirmation.',
    };
  }
  if (
    /(?:public api|breaking change|contract change|v1 to v2|rename column|alter type|migration)/i.test(
      text,
    )
  ) {
    return {
      classification: REVERSIBILITY_LEVELS.HARD_TO_REVERSE.name,
      tier: 3,
      is_irreversible: false,
      requires_pre_verification: true,
      warning:
        'HARD TO REVERSE: Affects external consumers or persistent schema; requires backward-compatibility gating.',
    };
  }
  if (/(?:cache|redis|new table|add column|internal function|queue)/i.test(text)) {
    return {
      classification: REVERSIBILITY_LEVELS.PARTIALLY_REVERSIBLE.name,
      tier: 2,
      is_irreversible: false,
      requires_pre_verification: false,
      warning:
        'PARTIALLY REVERSIBLE: Additive change; rollbacks require teardown or data invalidation.',
    };
  }

  return {
    classification: REVERSIBILITY_LEVELS.REVERSIBLE.name,
    tier: 1,
    is_irreversible: false,
    requires_pre_verification: false,
    warning: 'REVERSIBLE: Code or style change; easily reverted via standard VCS.',
  };
}

// ============================================================================
// 4. DECISION RECORDING & REVISION (SECTION 5 & 19)
// ============================================================================

/**
 * Creates an Architectural Decision Record (ADR-style) for an engineering decision.
 *
 * @param {Object} decisionSpec
 * @returns {Object} Structured decision record
 */
function recordDecision(decisionSpec) {
  const reversibility = classifyReversibility(decisionSpec.decision, decisionSpec.context);

  return {
    id: `ADR-${Date.now().toString(36).toUpperCase()}`,
    decision: decisionSpec.decision,
    context: decisionSpec.context || 'Standard engineering task execution.',
    alternatives: decisionSpec.alternatives || [],
    selected_approach: decisionSpec.selected_approach || decisionSpec.decision,
    evidence: (decisionSpec.evidence || []).map(classifyEvidence),
    tradeoffs: decisionSpec.tradeoffs || [],
    rejected_options: decisionSpec.rejected_options || [],
    confidence: decisionSpec.confidence || 'HIGH',
    reversibility: reversibility.classification,
    is_irreversible: reversibility.is_irreversible,
    verification_plan:
      decisionSpec.verification_plan ||
      'Automated integration test verifying invariant properties.',
    status: 'ACTIVE',
    invalidation_reason: null,
  };
}

/**
 * Invalidates a previous decision when new contradictory evidence emerges (Section 19).
 * Tribunal must not defend prior architecture simply because it was already chosen.
 *
 * @param {Object} decisionRecord
 * @param {Object|string} contradictoryEvidence
 * @param {string} reason
 * @returns {Object} Updated decision record
 */
function invalidateDecision(decisionRecord, contradictoryEvidence, reason) {
  const evidence = classifyEvidence(contradictoryEvidence);

  return {
    ...decisionRecord,
    status: 'INVALIDATED',
    invalidation_reason: reason,
    contradictory_evidence: evidence,
    invalidation_timestamp: new Date().toISOString(),
    next_action: `REPLAN: Previous decision '${decisionRecord.decision}' invalidated due to: ${reason}`,
  };
}

// ============================================================================
// 5. REQUIREMENT CONFLICT DETECTION (SECTION 12)
// ============================================================================

/**
 * Detects conflicts among competing requirements (e.g. Latency vs Consistency vs Cost).
 * Tribunal surfaces conflicts explicitly rather than silently choosing a compromise.
 *
 * @param {Array<string>|string} requirements
 * @returns {Array<Object>} Identified conflicts
 */
function detectRequirementConflicts(requirements) {
  const text = (
    Array.isArray(requirements) ? requirements.join(' ') : String(requirements)
  ).toLowerCase();
  const conflicts = [];

  // Conflict 1: Low Latency vs Strong Cross-Region Consistency
  const hasLowLatency = /(?:< ?50ms|< ?100ms|sub-second|real-time|ultra low latency)/i.test(text);
  const hasGlobalCrossRegion =
    /(?:multi-region|cross-region|global|active-active|geo-distributed)/i.test(text);
  const hasStrongConsistency =
    /(?:strong\s+(?:[a-z-]+\s+)?consistency|serializable|acid across regions|two-phase commit|2pc)/i.test(
      text,
    );

  if (hasLowLatency && hasGlobalCrossRegion && hasStrongConsistency) {
    conflicts.push({
      conflict: 'Latency vs. Cross-Region Strong Consistency (CAP / PACELC Bound)',
      dimensions: ['Latency', 'Consistency', 'Availability'],
      explanation:
        'Speed of light and network round-trips make cross-region synchronous coordination (>150ms RTT) mathematically incompatible with sub-50ms latency.',
      action_required:
        'User must decide: Prioritize sub-50ms local reads with eventual consistency, OR enforce global serializable consistency at the expense of higher latency.',
    });
  }

  // Conflict 2: High Performance / Low Latency vs Zero Infrastructure Cost
  const hasLowCost =
    /(?:(?:low|zero|minimal)\s+(?:[a-z-]+\s+)?cost|no infrastructure|cheap|free tier)/i.test(text);
  if (hasLowLatency && hasGlobalCrossRegion && hasLowCost) {
    conflicts.push({
      conflict: 'Global Low-Latency Infrastructure vs. Low-Cost Constraint',
      dimensions: ['Performance', 'Cost', 'Infrastructure'],
      explanation:
        'Active-active multi-region edge deployment with automated DNS failover incurs significant minimum infrastructure and egress commitments.',
      action_required:
        'User must reconcile: Accept multi-region deployment costs OR deploy to a single primary region with CDN caching.',
    });
  }

  // Conflict 3: Maximum Security / Sandboxing vs Maximum Execution Convenience
  const hasArbitraryExecution =
    /(?:arbitrary shell|unrestricted tool|execute any command|unfiltered script)/i.test(text);
  const hasHighSecurity = /(?:maximum security|zero trust|no data leak|isolated|untrusted)/i.test(
    text,
  );
  if (hasArbitraryExecution && hasHighSecurity) {
    conflicts.push({
      conflict: 'Unrestricted Shell Tool Execution vs. Zero-Trust Security Sandbox',
      dimensions: ['Security', 'Flexibility'],
      explanation:
        'Allowing agents unrestricted command-line access violates zero-trust isolation and introduces severe remote code execution risks.',
      action_required:
        'User must approve a strict command whitelist, dedicated containerized sandbox, or require human-in-the-loop gate before execution.',
    });
  }

  // Conflict 4: In-Memory / Distributed Caching vs Absolute Real-Time Data Freshness
  const hasCaching = /(?:cache|redis|caching)/i.test(text);
  const hasStrictFreshness =
    /(?:zero stale data|instant updates|no caching lag|strict freshness)/i.test(text);
  if (hasCaching && hasStrictFreshness) {
    conflicts.push({
      conflict: 'Caching Strategy vs. Absolute Data Freshness',
      dimensions: ['Performance', 'Data Freshness'],
      explanation:
        'Caching introduces cache invalidation lag and race conditions where clients may read stale data before invalidation events propagate.',
      action_required:
        'Determine acceptable stale-while-revalidate TTL or bypass cache on critical mutating queries.',
    });
  }

  return conflicts;
}

// ============================================================================
// 6. COUNTERFACTUAL & FAILURE-FIRST ANALYSIS (SECTION 16 & 17)
// ============================================================================

/**
 * Runs counterfactual analysis for high-materiality decisions.
 * "What happens if this assumption is wrong? What happens under 10x traffic or network partition?"
 *
 * @param {string} task
 * @param {Object} [context]
 * @returns {Array<Object>} Counterfactual stress findings
 */
function runCounterfactualAnalysis(task, context = {}) {
  const t = (task || '').toLowerCase();
  const counterfactuals = [];

  if (/(?:payment|checkout|charge|order|mutation|transfer)/i.test(t)) {
    counterfactuals.push({
      scenario: 'Concurrent Duplicate Requests',
      question:
        'What happens if the client or network drops and retries two identical payments simultaneously?',
      mitigation_required:
        'Database-level unique constraint or distributed lock on idempotency key.',
    });
    counterfactuals.push({
      scenario: 'Downstream Payment Provider Timeout',
      question:
        'What happens if the provider charges the card but network drops before sending the response back?',
      mitigation_required:
        'Explicit reconciliation worker or status enquiry query before blind retrying.',
    });
  }

  if (/(?:upload|file|media|asset)/i.test(t)) {
    counterfactuals.push({
      scenario: 'Exhaustion Attack via Oversized or Infinite Streams',
      question: 'What happens if an attacker uploads a multi-gigabyte payload or zip bomb?',
      mitigation_required:
        'Hard Content-Length validation, streaming byte counters, and magic-number MIME checks.',
    });
  }

  if (/(?:database|query|postgres|sql)/i.test(t)) {
    counterfactuals.push({
      scenario: '10x Traffic Spike / Table Growth',
      question: 'What happens when table rows grow from 10k to 10M?',
      mitigation_required: 'Verify index usage via EXPLAIN ANALYZE; avoid full table scans.',
    });
  }

  if (/(?:agent|tool|shell|execution)/i.test(t)) {
    counterfactuals.push({
      scenario: 'Malicious Prompt Injection into Tool Arguments',
      question: 'What happens if user-supplied content includes shell operators (; rm -rf /)?',
      mitigation_required:
        'Disallow raw shell spawning; use execFile with immutable array arguments.',
    });
  }

  return counterfactuals;
}

// ============================================================================
// 7. ARCHITECTURAL ANTI-SLOP ENGINE (SECTION 23)
// ============================================================================

/**
 * Detects both overengineering (premature complexity) and underengineering (missing essentials).
 *
 * @param {string} taskQuery
 * @param {Array<string>|string} proposedStackOrDiff
 * @returns {Object} Anti-slop assessment
 */
function detectEngineeringSmells(taskQuery, proposedStackOrDiff) {
  const task = (taskQuery || '').toLowerCase();
  const stack = (
    Array.isArray(proposedStackOrDiff) ? proposedStackOrDiff.join(' ') : String(proposedStackOrDiff)
  ).toLowerCase();

  const overengineeringSmells = [];
  const underengineeringSmells = [];

  const isSimpleTask =
    /(?:simple|static|readme|cli script|prototype|internal tool|single page|toy|basic)/i.test(task);
  const isFinancialOrCritical =
    /(?:payment|checkout|billing|transaction|auth|banking|medical|critical)/i.test(task);

  const combined = stack + ' ' + task;

  // Check Overengineering
  if (isSimpleTask) {
    if (/(?:kafka|event sourcing|cqrs|eventstore)/i.test(combined)) {
      overengineeringSmells.push({
        smell: 'Premature Event Streaming / CQRS',
        reason: 'Event streaming is vastly disproportionate for simple/static tasks.',
      });
    }
    if (/(?:kubernetes|k8s|service mesh|istio)/i.test(combined)) {
      overengineeringSmells.push({
        smell: 'Premature Kubernetes / Service Mesh',
        reason: 'Container orchestration adds excessive operational burden to a simple task.',
      });
    }
    if (/(?:redis|memcached|distributed cache)/i.test(combined)) {
      overengineeringSmells.push({
        smell: 'Unnecessary Distributed Caching',
        reason: 'Process-local or static serving eliminates need for external cache servers.',
      });
    }
    if (/(?:microservices|multi-service|grpc federation)/i.test(combined)) {
      overengineeringSmells.push({
        smell: 'Premature Microservices Federation',
        reason: 'Single modular monolith or CLI binary avoids distributed failure modes.',
      });
    }
  }

  // Check Underengineering
  if (isFinancialOrCritical) {
    if (!/(?:idempotency|idempotent|lock|mutex|unique constraint)/i.test(stack)) {
      underengineeringSmells.push({
        smell: 'Missing Idempotency & Duplicate Execution Defense',
        severity: 'CRITICAL',
        reason: 'Financial and mutating workflows must protect against duplicate client retries.',
      });
    }
    if (!/(?:transaction|begin|commit|rollback|atomic)/i.test(stack)) {
      underengineeringSmells.push({
        smell: 'Missing Atomic Transaction Boundaries',
        severity: 'CRITICAL',
        reason: 'Multi-step financial state mutations risk orphaned records upon partial failure.',
      });
    }
    if (!/(?:error handling|catch|try|failure recovery)/i.test(stack)) {
      underengineeringSmells.push({
        smell: 'Inadequate Error Handling & Resilience',
        severity: 'HIGH',
        reason: 'Critical workflows require deterministic error handling and cleanup.',
      });
    }
  }

  return {
    is_clean: overengineeringSmells.length === 0 && underengineeringSmells.length === 0,
    has_overengineering: overengineeringSmells.length > 0,
    has_underengineering: underengineeringSmells.length > 0,
    overengineering: overengineeringSmells,
    underengineering: underengineeringSmells,
    recommendation:
      overengineeringSmells.length > 0
        ? 'STRIP_COMPLEXITY: Remove speculative distributed infrastructure.'
        : underengineeringSmells.length > 0
          ? 'HARDEN_FOUNDATION: Add mandatory transaction boundaries and duplicate protection.'
          : 'APPROVED: Proportional engineering depth.',
  };
}

// ============================================================================
// 8. ESCALATION ENGINE (SECTION 11)
// ============================================================================

/**
 * Evaluates whether an execution must be ESCALATED / BLOCKED.
 *
 * @param {string} task
 * @param {Object} context
 * @returns {Object} Escalation assessment
 */
function evaluateEscalation(task, context = {}) {
  const reversibility = classifyReversibility(task, context);
  const conflicts = detectRequirementConflicts(task);
  const uncertainty = context.uncertainty || [];

  const highImpactUnresolved = uncertainty.filter(
    u =>
      (u.confidence === 'LOW' || u.status === 'unknown' || u.status === 'contradicted') &&
      /(?:critical|high|data loss|security)/i.test(u.impact_if_wrong || ''),
  );

  if (reversibility.is_irreversible) {
    return {
      tier: 'CRITICAL',
      is_blocked: true,
      reason: 'ACTION BLOCKED: Irreversible data mutation or deletion operation detected.',
      required_action:
        'Perform full database snapshot verification and require explicit human authorization.',
    };
  }

  if (conflicts.length > 0) {
    return {
      tier: 'HIGH',
      is_blocked: true,
      reason: `ACTION BLOCKED: Mutually conflicting engineering constraints detected (${conflicts[0].conflict}).`,
      required_action: conflicts[0].action_required,
    };
  }

  if (highImpactUnresolved.length > 0) {
    return {
      tier: 'HIGH',
      is_blocked: true,
      reason: `ACTION BLOCKED: Evidence insufficient for high-impact assumption '${highImpactUnresolved[0].claim}'.`,
      required_action: highImpactUnresolved[0].next_action,
    };
  }

  return {
    tier: 'LOW',
    is_blocked: false,
    reason: 'Operational risk within autonomous parameters.',
    required_action: 'Proceed with standard verification.',
  };
}

// ============================================================================
// 9. ENGINEERING JUDGMENT STATE MACHINE (SECTION 2 & 9)
// ============================================================================

/**
 * Evaluates the current state of execution and determines the next engineering judgment state:
 * PROCEED | INVESTIGATE | REPLAN | CORRECT | ESCALATE | DEFER | STOP | COMPLETE
 *
 * @param {Object} input
 * @returns {Object} Judgment verdict
 */
function evaluateJudgmentState(input = {}) {
  const {
    task,
    evidence = [],
    uncertainties = [],
    outcomeContract,
    auditReport,
    tradeoffs = [],
    contradictions = [],
  } = input;

  // 1. Check for Contradictions -> REPLAN
  if (contradictions.length > 0) {
    return {
      state: 'REPLAN',
      reason: `Contradictory evidence detected: ${contradictions[0].reason || 'Prior assumption was refuted.'}`,
      action:
        'Abandon refuted approach, discard invalid decisions, and formulate alternative plan.',
      details: contradictions,
    };
  }

  // 2. Check Escalations -> ESCALATE
  const escalation = evaluateEscalation(task || '', { uncertainty: uncertainties });
  if (escalation.is_blocked) {
    return {
      state: 'ESCALATE',
      reason: escalation.reason,
      action: escalation.required_action,
      details: escalation,
    };
  }

  // 3. Check High-Value Uncertainties -> INVESTIGATE
  const highValueInvestigate = uncertainties
    .map(u => calculateInformationValue(u))
    .find(v => v.should_investigate);

  if (highValueInvestigate) {
    return {
      state: 'INVESTIGATE',
      reason: `High information payoff: Investigating '${highValueInvestigate.claim}' prevents costly architectural mistakes.`,
      action: highValueInvestigate.rationale,
      details: highValueInvestigate,
    };
  }

  // 4. Check Post-Implementation Gaps -> CORRECT
  if (auditReport && !auditReport.is_outcome_complete) {
    if (
      auditReport.unsatisfied.length > 0 ||
      auditReport.partially_satisfied.length > 0 ||
      auditReport.new_risks.length > 0
    ) {
      return {
        state: 'CORRECT',
        reason:
          'Post-implementation outcome audit discovered gaps or unverified material considerations.',
        action: (auditReport.corrective_actions || [])[0] || 'Execute corrective cycle.',
        details: auditReport,
      };
    }
  }

  // 5. Check Completion Criteria -> COMPLETE (or STOP)
  if (auditReport && auditReport.is_outcome_complete) {
    return {
      state: 'COMPLETE',
      reason:
        'All material considerations verified with zero regressions and zero unnecessary complexity.',
      action: 'Declare engineering outcome complete with evidence.',
      details: auditReport,
    };
  }

  // 6. Default to PROCEED with bounded verification
  return {
    state: 'PROCEED',
    reason: 'Requirements, evidence, and materiality align. Ready for execution.',
    action: 'Execute planned capability pipeline under active verification monitoring.',
  };
}

module.exports = {
  EVIDENCE_LEVELS,
  REVERSIBILITY_LEVELS,
  classifyEvidence,
  createUncertaintyRecord,
  calculateInformationValue,
  classifyReversibility,
  recordDecision,
  invalidateDecision,
  detectRequirementConflicts,
  runCounterfactualAnalysis,
  detectEngineeringSmells,
  evaluateEscalation,
  evaluateJudgmentState,
};
