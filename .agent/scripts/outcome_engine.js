'use strict';

/**
 * outcome_engine.js — Tribunal Kit Outcome Optimization Engine
 * =============================================================
 * Implements Phase 3 of the Skill Intelligence Engine:
 *   - Outcome Contract Generation (Section 4)
 *   - Outcome Quality Model (Section 6)
 *   - Post-Implementation Outcome Auditor (Section 7 & 8)
 *   - Cross-Domain Tradeoff Detection (Section 10)
 *   - Outcome Regression Analysis (Section 9)
 *   - Task Completion vs Outcome Completion Distinction
 */

const fs = require('fs');
const path = require('path');
const {
  evaluateMateriality,
  checkMinimumSufficientEngineering,
  determineOutcomeBudget,
} = require('./materiality_engine');

/**
 * Determine relevant quality dimensions for a task without bloat.
 *
 * @param {string} taskQuery
 * @param {Object} [conceptData]
 * @returns {Array<string>} Applicable quality dimensions
 */
function determineQualityDimensions(taskQuery = '', conceptData = {}) {
  const q = (taskQuery || '').toLowerCase();
  const domains = new Set(conceptData.domains || []);

  const dimensions = new Set(['Functional Correctness', 'Testability', 'Maintainability']);

  if (
    /(?:payment|checkout|order|charge|billing|money|wallet)/i.test(q) ||
    domains.has('database')
  ) {
    dimensions.add('Data Integrity');
    dimensions.add('Reliability');
    dimensions.add('Security');
    dimensions.add('Observability');
  }

  if (
    /(?:auth|jwt|password|token|permission|sandbox|shell|exec|security)/i.test(q) ||
    domains.has('security')
  ) {
    dimensions.add('Security');
  }

  if (/(?:performance|slow|query|optimize|latency|throughput|cache|index)/i.test(q)) {
    dimensions.add('Performance');
    dimensions.add('Scalability');
  }

  if (
    /(?:realtime|socket|websocket|collaborative|distributed|consensus)/i.test(q) ||
    domains.has('distributed-systems')
  ) {
    dimensions.add('Consistency');
    dimensions.add('Reliability');
    dimensions.add('Operability');
    dimensions.add('Observability');
  }

  if (
    /(?:ui|frontend|css|responsive|html|page|landing|component|a11y|accessibility)/i.test(q) ||
    domains.has('frontend')
  ) {
    dimensions.add('Accessibility & Usability');
    dimensions.add('Performance');
  }

  if (dimensions.size <= 3) {
    dimensions.add('Security');
    dimensions.add('Reliability');
  }

  return Array.from(dimensions);
}

/**
 * Generate an explicit Outcome Contract.
 *
 * @param {string} taskQuery
 * @param {Object} conceptData
 * @param {Object} considerationsData
 * @param {Object} [options]
 * @returns {Object} Formal Outcome Contract
 */
function generateOutcomeContract(
  taskQuery = '',
  conceptData = {},
  considerationsData = {},
  options = {},
) {
  const q = taskQuery || '';
  const materiality = evaluateMateriality(
    considerationsData.all_considerations || [],
    q,
    conceptData,
  );
  const qualityDims = determineQualityDimensions(q, conceptData);
  const budget = determineOutcomeBudget(q, conceptData);

  // Requirements formulation
  const requirements = [];
  requirements.push({ type: 'EXPLICIT', description: `Execute core functionality for: ${q}` });

  for (const c of conceptData.explicit_concepts || []) {
    requirements.push({
      type: 'EXPLICIT_CONCEPT',
      description: `Address explicit capability '${c.name}' (${c.domain})`,
    });
  }

  for (const c of conceptData.implicit_concepts || []) {
    requirements.push({
      type: 'IMPLICIT_REQUIREMENT',
      description: `Satisfy implicit requirement '${c.name}': ${c.reason || 'Required for production correctness'}`,
    });
  }

  // Verification requirements derived from material considerations
  const verificationReqs = [];
  const successConditions = [];

  for (const mc of materiality.material) {
    verificationReqs.push({
      target: mc.title,
      category: mc.category,
      assertion: `Verify that ${mc.title} is guarded under operational load and fault conditions.`,
      failure_mode: mc.rationale,
    });
  }

  // Concrete success conditions
  if (/(?:payment|checkout|order|charge)/i.test(q)) {
    successConditions.push(
      'Repeated requests with identical idempotency key produce exactly one financial charge.',
    );
    successConditions.push(
      'Mid-operation errors trigger atomic database rollback with zero orphaned writes.',
    );
    successConditions.push(
      'Concurrent duplicate submissions are safely serialized or rejected with Conflict (409).',
    );
  } else if (/(?:postgres|sql|query|database)/i.test(q)) {
    successConditions.push(
      'Slow query execution plans use composite/covering indexes instead of full table scans.',
    );
    successConditions.push(
      'Database connections are correctly pooled and released to prevent connection pool exhaustion.',
    );
  } else if (/(?:upload|file)/i.test(q)) {
    successConditions.push(
      'Uploads are validated for magic byte MIME integrity and enforce strict byte quotas.',
    );
    successConditions.push(
      'Malicious payloads (path traversal, zip bombs) are blocked before reaching storage.',
    );
  } else if (/(?:shell|exec|agent)/i.test(q)) {
    successConditions.push(
      'Tool execution is sandboxed with strict privilege boundaries and prompt sanitization.',
    );
    successConditions.push('Arbitrary code execution and shell escape vectors are prevented.');
  } else if (/(?:collaborative|realtime|socket)/i.test(q)) {
    successConditions.push(
      'Concurrent edits converge deterministically across clients without state corruption.',
    );
    successConditions.push(
      'Dropped socket reconnections cleanly replay missing state without duplicate mutations.',
    );
  } else {
    successConditions.push(
      'All core functional requirements pass contract validation and test assertions.',
    );
    successConditions.push(
      'No regressions or unhandled exceptions introduced in baseline workflows.',
    );
  }

  // Non-goals to prevent overengineering
  const nonGoals = [];
  if (budget.complexity_budget === 'LOW') {
    nonGoals.push('Do NOT introduce distributed messaging (Kafka/RabbitMQ) or service meshes.');
    nonGoals.push(
      'Do NOT introduce external cache clusters (Redis/Memcached) unless measured load warrants it.',
    );
    nonGoals.push('Do NOT introduce microservice decomposition for a monolithic/single-file task.');
  } else {
    nonGoals.push(
      'Do NOT implement speculative optimizations unsupported by profiling or requirements.',
    );
    nonGoals.push(
      'Do NOT introduce custom bespoke abstractions where standard library/established idioms suffice.',
    );
  }

  return {
    objective: `Deliver a production-appropriate, verified outcome for: "${q}"`,
    task_query: q,
    requirements,
    constraints: [
      `Complexity Budget: ${budget.complexity_budget}`,
      `Dependency Footprint: ${budget.dependency_budget}`,
      `Proportionality: ${budget.proportionality_principle}`,
    ],
    assumptions: [
      'Standard runtime environment and dependencies are available.',
      'Execution evidence will be provided for verification auditing.',
    ],
    material_considerations: materiality.material.map(m => ({
      title: m.title,
      category: m.category,
      severity: m.severity,
      rationale: m.materiality_rationale,
    })),
    quality_attributes: qualityDims,
    risk_targets: conceptData.risk_signals || [],
    verification_requirements: verificationReqs,
    success_conditions: successConditions,
    non_goals: nonGoals,
    outcome_budget: budget,
  };
}

/**
 * Detect cross-domain tradeoffs resulting from architectural or implementation choices.
 *
 * @param {Array<string>|string} decisionsOrSkills
 * @param {Object} [context]
 * @returns {Array<Object>} Detected tradeoffs with net assessments
 */
function detectTradeoffs(decisionsOrSkills, context = {}) {
  const inputs = Array.isArray(decisionsOrSkills)
    ? decisionsOrSkills.join(' ')
    : String(decisionsOrSkills);
  const text = inputs.toLowerCase();

  const tradeoffs = [];

  if (/(?:caching|cache|redis|lru)/i.test(text)) {
    tradeoffs.push({
      decision: 'Caching Strategy',
      tradeoffs: [
        {
          dimension: 'Performance',
          effect: 'INCREASED',
          detail: 'Sub-millisecond query read latency',
        },
        { dimension: 'Cost', effect: 'DECREASED', detail: 'Reduced database query compute load' },
        {
          dimension: 'Data Freshness',
          effect: 'DECREASED',
          detail: 'Risk of serving stale data prior to invalidation',
        },
        {
          dimension: 'System Complexity',
          effect: 'INCREASED',
          detail: 'Requires cache-invalidation and cache-aside lifecycle management',
        },
      ],
      net_assessment: 'FAVORABLE',
      mitigation: 'Use short TTLs and deterministic event-based invalidation upon record mutation.',
    });
  }

  if (/(?:lock|locking|mutex|serializ|concurrency)/i.test(text)) {
    tradeoffs.push({
      decision: 'Concurrency Locking & Serialization',
      tradeoffs: [
        {
          dimension: 'Data Integrity',
          effect: 'INCREASED',
          detail: 'Prevents race conditions and duplicate mutations',
        },
        {
          dimension: 'Throughput',
          effect: 'DECREASED',
          detail: 'Lock contention serializes throughput under high parallel load',
        },
        {
          dimension: 'Latency',
          effect: 'INCREASED',
          detail: 'Requests wait in lock acquisition queues',
        },
      ],
      net_assessment: 'FAVORABLE',
      mitigation:
        'Use fine-grained entity/key row-level locks with aggressive timeout deadlines rather than table locks.',
    });
  }

  if (/(?:retr(?:y|ies)|backoff|resilience)/i.test(text)) {
    tradeoffs.push({
      decision: 'Automatic Retry Policy',
      tradeoffs: [
        {
          dimension: 'Availability',
          effect: 'INCREASED',
          detail: 'Recovers transparently from transient network glitches',
        },
        {
          dimension: 'Duplicate Execution Risk',
          effect: 'INCREASED',
          detail: 'Replays request against potentially slow downstream',
        },
        {
          dimension: 'Downstream Load',
          effect: 'INCREASED',
          detail: 'Amplifies load during cascading service brownouts',
        },
      ],
      net_assessment: 'FAVORABLE',
      mitigation:
        'Pair retries strictly with exponential backoff, randomized jitter, and circuit breaker trip thresholds.',
    });
  }

  if (/(?:index|indexing|composite index)/i.test(text)) {
    tradeoffs.push({
      decision: 'Secondary / Composite Indexing',
      tradeoffs: [
        {
          dimension: 'Read Performance',
          effect: 'INCREASED',
          detail: 'Transforms full table scan into B-Tree index range lookups',
        },
        {
          dimension: 'Write Performance',
          effect: 'DECREASED',
          detail: 'Every INSERT/UPDATE must write to multiple index trees',
        },
        {
          dimension: 'Storage Cost',
          effect: 'INCREASED',
          detail: 'Index structures consume additional disk and buffer pool RAM',
        },
      ],
      net_assessment: 'FAVORABLE',
      mitigation:
        'Profile queries with EXPLAIN ANALYZE and only index columns with high selectivity in WHERE/JOIN clauses.',
    });
  }

  if (/(?:encryption|tls|crypto)/i.test(text)) {
    tradeoffs.push({
      decision: 'Data Encryption at Rest & Transit',
      tradeoffs: [
        {
          dimension: 'Security & Confidentiality',
          effect: 'INCREASED',
          detail: 'Defends data against sniffing and storage exfiltration',
        },
        {
          dimension: 'CPU Utilization',
          effect: 'INCREASED',
          detail: 'Cryptographic cipher processing overhead',
        },
        {
          dimension: 'Key Management Complexity',
          effect: 'INCREASED',
          detail: 'Requires secure key rotation and KMS secret governance',
        },
      ],
      net_assessment: 'FAVORABLE',
      mitigation: 'Use AES-GCM hardware-accelerated instructions and managed KMS solutions.',
    });
  }

  return tradeoffs;
}

/**
 * Post-Implementation Outcome Auditor.
 * Evaluates whether the actual outcome satisfies the Outcome Contract.
 * Distinguishes TASK COMPLETION from OUTCOME COMPLETION.
 *
 * @param {Object} outcomeContract
 * @param {Object} executionEvidence
 * @param {Object} [options]
 * @returns {Object} Comprehensive outcome audit report
 */
function auditOutcome(outcomeContract, executionEvidence = {}, options = {}) {
  const contract = outcomeContract || {};
  const evidence = executionEvidence || {};
  const codeDiff = (evidence.code_diff || '').toLowerCase();
  const tests = evidence.tests_executed || [];
  const files = (evidence.changed_files || []).map(f => f.toLowerCase());

  const satisfied = [];
  const partiallySatisfied = [];
  const unsatisfied = [];
  const unverified = [];
  const newRisks = [];
  const unnecessaryComplexity = [];
  const correctiveActions = [];

  // 1. Audit Material Considerations
  for (const mc of contract.material_considerations || []) {
    const title = (mc.title || '').toLowerCase();
    const tokens = title.split(/\s+/).filter(t => t.length > 3);

    const testMatch = tests.find(
      t =>
        (t.name &&
          (t.name.toLowerCase().includes(title) ||
            tokens.some(tok => t.name.toLowerCase().includes(tok)))) ||
        (t.target &&
          (t.target.toLowerCase().includes(title) ||
            tokens.some(tok => t.target.toLowerCase().includes(tok)))),
    );

    const codeMatch = tokens.some(
      tok => codeDiff.includes(tok) || files.some(f => f.includes(tok)),
    );

    if (testMatch) {
      if (testMatch.passed) {
        satisfied.push({
          consideration: mc.title,
          status: 'SATISFIED',
          evidence: `Verified via test '${testMatch.name}'`,
        });
      } else {
        partiallySatisfied.push({
          consideration: mc.title,
          status: 'PARTIALLY_SATISFIED',
          evidence: `Implementation attempted but verification failed: ${testMatch.error || 'Assertion failed'}`,
          reason: testMatch.error,
        });
        correctiveActions.push(
          `Fix failing verification test for '${mc.title}': ${testMatch.error || 'Assertion failed'}`,
        );
      }
    } else if (codeMatch) {
      partiallySatisfied.push({
        consideration: mc.title,
        status: 'PARTIALLY_SATISFIED',
        evidence: 'Code trace exists but no explicit verification test executed',
        reason: 'Missing verification evidence',
      });
      unverified.push(mc.title);
      correctiveActions.push(`Add targeted automated test to verify '${mc.title}'.`);
    } else {
      unsatisfied.push({
        consideration: mc.title,
        status: 'UNSATISFIED',
        reason: `Material consideration '${mc.title}' was completely omitted in implementation.`,
      });
      correctiveActions.push(
        `Implement missing capability for material consideration '${mc.title}'.`,
      );
    }
  }

  // 2. Audit Success Conditions
  for (const sc of contract.success_conditions || []) {
    const scTokens = sc
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 4);
    const hasTest = tests.some(
      t => t.passed && scTokens.some(tok => t.name.toLowerCase().includes(tok)),
    );
    if (!hasTest && tests.length > 0) {
      // Check if general tests passed
      const anyFailed = tests.some(t => !t.passed);
      if (anyFailed) {
        unverified.push(sc);
      }
    }
  }

  // 3. Check for Unnecessary Complexity / Overengineering in code diff
  const overengineeringChecks = checkMinimumSufficientEngineering(
    contract.task_query,
    files.concat([codeDiff]),
  );
  if (
    !overengineeringChecks.is_proportional &&
    overengineeringChecks.unnecessary_components.length > 0
  ) {
    for (const u of overengineeringChecks.unnecessary_components) {
      unnecessaryComplexity.push(u);
      correctiveActions.push(
        `Remove unnecessary architectural complexity: ${u.component}. (${u.reason})`,
      );
    }
  }

  // 4. Vulnerability & Risk checks
  if (/(?:SELECT\s+.*\s+WHERE\s+.*['"]\s*\+)|(?:\$\{[^}]*\}\s*WHERE)/i.test(codeDiff)) {
    newRisks.push({
      risk: 'SQL Injection Vulnerability',
      detail: 'Dynamic query string concatenation detected. Use parameterized queries.',
    });
    correctiveActions.push('Refactor dynamic SQL queries to use parameterized values.');
  }

  const totalMaterial = (contract.material_considerations || []).length;
  const satisfiedCount = satisfied.length;
  const hasBlockers =
    unsatisfied.length > 0 ||
    partiallySatisfied.length > 0 ||
    newRisks.length > 0 ||
    unnecessaryComplexity.length > 0;
  const isOutcomeComplete =
    !hasBlockers && (totalMaterial === 0 || satisfiedCount === totalMaterial);
  const isTaskComplete = tests.some(t => t.passed) || codeDiff.length > 20 || files.length > 0;

  const outcomeScore =
    totalMaterial > 0
      ? Number((satisfiedCount / totalMaterial).toFixed(2))
      : isOutcomeComplete
        ? 1.0
        : 0.5;

  return {
    status: isOutcomeComplete
      ? 'OUTCOME_COMPLETE'
      : isTaskComplete
        ? 'TASK_COMPLETE_OUTCOME_INCOMPLETE'
        : 'OUTCOME_UNSATISFIED',
    is_task_complete: isTaskComplete,
    is_outcome_complete: isOutcomeComplete,
    outcome_score: outcomeScore,
    satisfied,
    partially_satisfied: partiallySatisfied,
    unsatisfied,
    unverified,
    new_risks: newRisks,
    unnecessary_complexity: unnecessaryComplexity,
    corrective_actions: correctiveActions,
    audit_summary: {
      material_considerations_count: totalMaterial,
      satisfied_count: satisfiedCount,
      partially_satisfied_count: partiallySatisfied.length,
      unsatisfied_count: unsatisfied.length,
      unnecessary_complexity_count: unnecessaryComplexity.length,
      new_risks_count: newRisks.length,
    },
  };
}

/**
 * Evaluate Outcome Regression: A fix is only an improvement if the overall outcome improves.
 *
 * @param {Object} baselineAudit - Audit before fix
 * @param {Object} postFixAudit - Audit after fix
 * @param {Object} [performanceMetrics] - Optional latency/throughput deltas
 * @returns {Object} Regression report
 */
function evaluateOutcomeRegression(baselineAudit = {}, postFixAudit = {}, performanceMetrics = {}) {
  const regressions = [];
  const improvements = [];

  // Check satisfaction score delta
  const baseScore = baselineAudit.outcome_score || 0;
  const postScore = postFixAudit.outcome_score || 0;

  if (postScore > baseScore) {
    improvements.push(`Outcome score improved from ${baseScore} to ${postScore}.`);
  } else if (postScore < baseScore) {
    regressions.push(`Outcome score degraded from ${baseScore} to ${postScore}.`);
  }

  // Check newly unsatisfied or downgraded items
  const previouslySatisfied = new Set((baselineAudit.satisfied || []).map(s => s.consideration));
  for (const s of (postFixAudit.unsatisfied || []).concat(postFixAudit.partially_satisfied || [])) {
    if (previouslySatisfied.has(s.consideration)) {
      regressions.push(
        `Consideration '${s.consideration}' was previously satisfied but is now ${s.status}.`,
      );
    }
  }

  // Check newly introduced risks
  const baseRisks = new Set((baselineAudit.new_risks || []).map(r => r.risk));
  for (const nr of postFixAudit.new_risks || []) {
    if (!baseRisks.has(nr.risk)) {
      regressions.push(`Fix introduced new risk: ${nr.risk} (${nr.detail})`);
    }
  }

  // Check performance degradation (e.g. latency spike > 50% or throughput drop > 50%)
  if (performanceMetrics.latency_delta_pct && performanceMetrics.latency_delta_pct > 50) {
    regressions.push(`Latency increased by ${performanceMetrics.latency_delta_pct}% after change.`);
  }
  if (performanceMetrics.throughput_delta_pct && performanceMetrics.throughput_delta_pct < -50) {
    regressions.push(
      `Throughput degraded by ${Math.abs(performanceMetrics.throughput_delta_pct)}% under concurrency.`,
    );
  }

  const hasRegression = regressions.length > 0;
  const netOutcomeImproved = !hasRegression && postScore >= baseScore;

  return {
    has_regression: hasRegression,
    net_outcome_improved: netOutcomeImproved,
    regressions,
    improvements,
    verdict: netOutcomeImproved
      ? 'OUTCOME_IMPROVED'
      : hasRegression
        ? 'REGRESSION_DETECTED'
        : 'NEUTRAL',
    recommendation: netOutcomeImproved
      ? 'Fix approved: Overall outcome improved without collateral degradation.'
      : 'Fix rejected or requires refinement: Detected regressions must be mitigated before closing.',
  };
}

module.exports = {
  determineQualityDimensions,
  generateOutcomeContract,
  detectTradeoffs,
  auditOutcome,
  evaluateOutcomeRegression,
};
