'use strict';

/**
 * materiality_engine.js — Tribunal Kit Materiality & Proportionality Engine
 * =========================================================================
 * Implements Phase 3.2 & Section 5 / 11 of Outcome Optimization:
 *   - Materiality Classification (MATERIAL / NON_MATERIAL / OPTIONAL)
 *   - Materiality Rationale Generation
 *   - Minimum Sufficient Engineering Enforcement
 *   - Outcome Budget & Proportionality Checks
 */

const LOW_COMPLEXITY_TRIGGERS = [
  /(?:static|landing page|read-?only|documentation|readme|format|css|typo|rename|mock|demo|poc|prototype|internal tool|cli)/i,
];

const HIGH_SCALE_OVERENGINEERING_FLAGS = [
  {
    match: /(?:kafka|rabbitmq|event-sourcing|cqrs)/i,
    name: 'Event Streaming / CQRS',
    threshold: 'Requires high-throughput async decoupling',
  },
  {
    match: /(?:kubernetes|k8s|service-mesh|istio)/i,
    name: 'Service Mesh / Container Orchestration',
    threshold: 'Requires multi-container fleet governance',
  },
  {
    match: /(?:multi-region|distributed-tracing|opentelemetry)/i,
    name: 'Multi-Region Replication / APM Tracing',
    threshold: 'Requires distributed enterprise architecture',
  },
  {
    match: /(?:redis|memcached)/i,
    name: 'Distributed In-Memory Caching',
    threshold: 'Requires high-frequency query caching',
  },
];

/**
 * Evaluate materiality for each engineering consideration.
 *
 * @param {Array<Object>} considerations - List of considerations from consideration_engine
 * @param {string} taskQuery - User task query
 * @param {Object} [conceptData] - Extracted concept metadata
 * @returns {Object} Materiality evaluation summary and categorized lists
 */
function evaluateMateriality(considerations = [], taskQuery = '', conceptData = {}) {
  const q = (taskQuery || '').toLowerCase();
  const isSimpleTask =
    LOW_COMPLEXITY_TRIGGERS.some(r => r.test(q)) &&
    !/(?:payment|auth|database|distributed|crypto|checkout)/i.test(q);
  const risks = conceptData.risk_signals || [];

  const evaluated = [];
  const material = [];
  const nonMaterial = [];
  const optional = [];

  for (const c of considerations) {
    let status = 'MATERIAL';
    let rationale = '';
    const sev = (c.severity || 'MEDIUM').toUpperCase();
    const title = c.title || '';
    const cat = c.category || '';

    // 1. Critical safety, financial, or auth issues are always MATERIAL
    if (sev === 'CRITICAL') {
      status = 'MATERIAL';
      rationale = `Critical severity: failure directly compromises ${cat.toLowerCase()} (${title}).`;
    }
    // 2. High severity considerations mapped to active risk signals are MATERIAL
    else if (sev === 'HIGH') {
      const hasMatchingRisk = risks.some(
        r =>
          r.toLowerCase().includes(cat.toLowerCase()) ||
          r.toLowerCase().includes(title.toLowerCase()),
      );
      if (hasMatchingRisk || !isSimpleTask) {
        status = 'MATERIAL';
        rationale = `High operational/integrity impact: unhandled condition causes ${title.toLowerCase()} failure under concurrent or fault conditions.`;
      } else {
        status = 'OPTIONAL';
        rationale = `Task context indicates a lightweight/simple scope where ${title.toLowerCase()} provides hygiene but is not strictly blocking for MVP.`;
      }
    }
    // 3. Medium severity considerations evaluated against scope
    else if (sev === 'MEDIUM') {
      if (isSimpleTask) {
        status = 'NON_MATERIAL';
        rationale = `Non-material for simple/lightweight task: implementing ${title.toLowerCase()} introduces unnecessary architectural complexity without commensurate risk reduction.`;
      } else {
        status = 'OPTIONAL';
        rationale = `Recommended enhancement: ${title.toLowerCase()} improves observability/maintainability but does not block functional core.`;
      }
    }
    // 4. Low severity is generally non-material or optional
    else {
      status = isSimpleTask ? 'NON_MATERIAL' : 'OPTIONAL';
      rationale = `Discretionary consideration with minor risk impact.`;
    }

    const item = {
      ...c,
      materiality: status,
      materiality_rationale: rationale,
    };

    evaluated.push(item);
    if (status === 'MATERIAL') material.push(item);
    else if (status === 'NON_MATERIAL') nonMaterial.push(item);
    else optional.push(item);
  }

  return {
    total_considerations: considerations.length,
    material_count: material.length,
    non_material_count: nonMaterial.length,
    optional_count: optional.length,
    material,
    non_material: nonMaterial,
    optional,
    all_evaluated: evaluated,
  };
}

/**
 * Enforce the Minimum Sufficient Engineering principle.
 * Detects both overengineering (introducing heavy infrastructure unnecessarily)
 * and underengineering (omitting mandatory safeguards).
 *
 * @param {string} taskQuery - User task query
 * @param {Array<string>} proposedSkillsOrComponents - Skills or components selected
 * @param {Object} [context]
 * @returns {Object} Proportionality evaluation
 */
function checkMinimumSufficientEngineering(
  taskQuery = '',
  proposedSkillsOrComponents = [],
  context = {},
) {
  const q = (taskQuery || '').toLowerCase();
  const isSimpleTask =
    LOW_COMPLEXITY_TRIGGERS.some(r => r.test(q)) &&
    !/(?:payment|auth|database|distributed|crypto|checkout)/i.test(q);
  const isFinancialOrCritical = /(?:payment|charge|checkout|billing|order|token|jwt)/i.test(q);

  const proposed = proposedSkillsOrComponents.map(s => s.toLowerCase());
  const unnecessaryComponents = [];
  const missingEssentials = [];

  // Overengineering check for simple tasks
  if (isSimpleTask) {
    for (const flag of HIGH_SCALE_OVERENGINEERING_FLAGS) {
      if (proposed.some(p => flag.match.test(p))) {
        unnecessaryComponents.push({
          component: flag.name,
          reason: `Violates minimum sufficient engineering: Task is a simple/lightweight request; ${flag.threshold}.`,
        });
      }
    }
  }

  // Underengineering check for critical/financial tasks
  if (isFinancialOrCritical) {
    const hasIdempotencyOrResilience = proposed.some(
      p => p.includes('idempotenc') || p.includes('resilience') || p.includes('error-resilience'),
    );
    const hasDataIntegrityOrDB = proposed.some(
      p => p.includes('database') || p.includes('transaction') || p.includes('sql'),
    );

    if (!hasIdempotencyOrResilience) {
      missingEssentials.push({
        capability: 'Idempotency & Duplicate Request Protection',
        reason: 'Financial operations require duplicate charge defense during retries.',
      });
    }
    if (!hasDataIntegrityOrDB) {
      missingEssentials.push({
        capability: 'Transaction Integrity & Atomic Rollback',
        reason:
          'Multi-step financial mutations must be scoped to atomic database transaction boundaries.',
      });
    }
  }

  const isOverengineered = unnecessaryComponents.length > 0;
  const isUnderengineered = missingEssentials.length > 0;

  let verdict = 'MINIMUM_SUFFICIENT';
  if (isOverengineered && isUnderengineered) verdict = 'MISALIGNED';
  else if (isOverengineered) verdict = 'OVERENGINEERED';
  else if (isUnderengineered) verdict = 'UNDERENGINEERED';

  return {
    verdict,
    is_proportional: !isOverengineered && !isUnderengineered,
    unnecessary_components: unnecessaryComponents,
    missing_essentials: missingEssentials,
    rationale:
      verdict === 'MINIMUM_SUFFICIENT'
        ? 'Proposed engineering depth is proportional to task scope, risks, and outcome requirements.'
        : verdict === 'OVERENGINEERED'
          ? `Overengineering detected: ${unnecessaryComponents.map(u => u.component).join(', ')} exceed task requirements.`
          : `Underengineering detected: Missing mandatory capabilities for ${missingEssentials.map(m => m.capability).join(', ')}.`,
  };
}

/**
 * Determine the outcome budget constraints for a given task.
 *
 * @param {string} taskQuery
 * @param {Object} [conceptData]
 * @returns {Object} Outcome budget
 */
function determineOutcomeBudget(taskQuery = '', conceptData = {}) {
  const q = (taskQuery || '').toLowerCase();
  const isSimple =
    LOW_COMPLEXITY_TRIGGERS.some(r => r.test(q)) &&
    !/(?:payment|auth|database|distributed)/i.test(q);
  const isDistributed =
    /(?:distributed|microservice|cluster|multi-region|consensus|raft|paxos|partition)/i.test(q);

  let complexityBudget = 'MEDIUM';
  let dependencyBudget = 'STANDARD';
  let operationalBurden = 'LOW';

  if (isSimple) {
    complexityBudget = 'LOW';
    dependencyBudget = 'MINIMAL (Zero external infrastructure)';
    operationalBurden = 'MINIMAL';
  } else if (isDistributed) {
    complexityBudget = 'HIGH';
    dependencyBudget = 'MODULAR (Cloud/Infrastructure supported)';
    operationalBurden = 'HIGH';
  }

  return {
    complexity_budget: complexityBudget,
    dependency_budget: dependencyBudget,
    operational_burden: operationalBurden,
    proportionality_principle: 'MINIMUM_SUFFICIENT_ENGINEERING',
  };
}

module.exports = {
  evaluateMateriality,
  checkMinimumSufficientEngineering,
  determineOutcomeBudget,
};
