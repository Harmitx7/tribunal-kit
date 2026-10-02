'use strict';

/**
 * adaptive_execution.js — Tribunal Kit Phase 4: Adaptive Execution Engine
 * =======================================================================
 * Manages mutable capability graphs, dynamic skill activation on runtime signals,
 * change impact analysis, institutional memory, and final multi-gate engineering review.
 *
 * Invariants:
 * - EXECUTION SHOULD BE ADAPTIVE, NOT PREDETERMINED.
 * - NEW EVIDENCE MAY CHANGE THE PLAN.
 * - NO UNDERENGINEERING. NO OVERENGINEERING.
 */

// ============================================================================
// 1. DYNAMIC CAPABILITY GRAPH (SECTION 8)
// ============================================================================

/**
 * Mutable execution graph supporting dynamic adaptation.
 * Every graph mutation requires an explicit engineering reason.
 */
class DynamicCapabilityGraph {
  constructor(initialNodes = []) {
    this.nodes = Array.isArray(initialNodes) ? [...initialNodes] : [];
    this.mutationHistory = [];
  }

  getNodes() {
    return [...this.nodes];
  }

  addNode(node, positionIndex = -1, reason = 'Additional capability required.') {
    if (!node) return this;
    if (this.nodes.includes(node)) return this;

    if (positionIndex >= 0 && positionIndex < this.nodes.length) {
      this.nodes.splice(positionIndex, 0, node);
    } else {
      this.nodes.push(node);
    }

    this.mutationHistory.push({
      action: 'ADD',
      node,
      position: positionIndex >= 0 ? positionIndex : this.nodes.length - 1,
      reason,
      timestamp: new Date().toISOString(),
    });

    return this;
  }

  removeNode(node, reason = 'Capability deemed redundant or invalid.') {
    const idx = this.nodes.indexOf(node);
    if (idx !== -1) {
      this.nodes.splice(idx, 1);
      this.mutationHistory.push({
        action: 'REMOVE',
        node,
        previous_position: idx,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
    return this;
  }

  reorderNodes(fromIndex, toIndex, reason = 'Dependency priority inversion required.') {
    if (
      fromIndex >= 0 &&
      fromIndex < this.nodes.length &&
      toIndex >= 0 &&
      toIndex < this.nodes.length
    ) {
      const [item] = this.nodes.splice(fromIndex, 1);
      this.nodes.splice(toIndex, 0, item);
      this.mutationHistory.push({
        action: 'REORDER',
        node: item,
        from: fromIndex,
        to: toIndex,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
    return this;
  }

  retryNode(
    node,
    reason = 'Verification failure encountered; re-running node with hardened parameters.',
  ) {
    this.mutationHistory.push({
      action: 'RETRY',
      node,
      reason,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  skipNode(node, reason = 'Node preconditions already satisfied or non-material.') {
    const idx = this.nodes.indexOf(node);
    if (idx !== -1) {
      this.nodes.splice(idx, 1);
      this.mutationHistory.push({
        action: 'SKIP',
        node,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
    return this;
  }

  branch(
    condition,
    trueNodes = [],
    falseNodes = [],
    reason = 'Conditional execution path based on runtime signal.',
  ) {
    const chosen = condition ? trueNodes : falseNodes;
    for (const node of chosen) {
      if (!this.nodes.includes(node)) {
        this.nodes.push(node);
      }
    }
    this.mutationHistory.push({
      action: 'BRANCH',
      condition_met: !!condition,
      nodes_added: chosen,
      reason,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  merge(otherGraph, reason = 'Merging complementary capability subgraphs.') {
    if (!otherGraph || !Array.isArray(otherGraph.nodes)) return this;
    for (const node of otherGraph.nodes) {
      if (!this.nodes.includes(node)) {
        this.nodes.push(node);
      }
    }
    this.mutationHistory.push({
      action: 'MERGE',
      merged_nodes: otherGraph.nodes,
      reason,
      timestamp: new Date().toISOString(),
    });
    return this;
  }
}

// ============================================================================
// 2. ADAPTIVE SKILL ROUTING (SECTION 7 & BENCHMARK 7)
// ============================================================================

/**
 * Dynamically re-evaluates and mutates the capability pipeline upon receiving new runtime signals.
 *
 * Example:
 * File processing API -> User-controlled URL discovered -> SSRF risk ->
 * Dynamically insert `agentshield-security` / `api-security-auditor` before final verification.
 *
 * @param {Array<string>} currentPipeline
 * @param {Object} signal
 * @returns {Object} Adaptive routing result with mutated graph and justification
 */
function adaptPipelineOnSignal(currentPipeline, signal = {}) {
  const graph = new DynamicCapabilityGraph(currentPipeline);
  const signalText = (signal.description || signal.error || signal.diff || '').toLowerCase();
  const additions = [];
  const removals = [];

  // Signal 1: SSRF / User-controlled URL discovered in file upload / processing API
  if (
    /(?:user[-_ ]controlled url|fetch\s*\(|axios\s*\(|http request to url|ssrf|remote file download)/i.test(
      signalText,
    )
  ) {
    if (!graph.getNodes().includes('agentshield-security')) {
      graph.addNode(
        'agentshield-security',
        0,
        'SIGNAL: User-controlled URL detected in request path. Inserted SSRF defense and IP address blacklist validation.',
      );
      additions.push('agentshield-security');
    }
    if (!graph.getNodes().includes('api-security-auditor')) {
      graph.addNode(
        'api-security-auditor',
        1,
        'SIGNAL: External network boundary introduced. Inserted API security audit capability.',
      );
      additions.push('api-security-auditor');
    }
  }

  // Signal 2: Concurrency Race Condition discovered during testing
  if (
    /(?:race condition|concurrent duplicate|parallel mutation|lost update|deadlock)/i.test(
      signalText,
    )
  ) {
    if (!graph.getNodes().includes('error-resilience')) {
      graph.addNode(
        'error-resilience',
        -1,
        'SIGNAL: Concurrent race condition or deadlock detected under load. Inserted concurrency control capability.',
      );
      additions.push('error-resilience');
    }
  }

  // Signal 3: Redis / External cache proved unnecessary via benchmark evidence
  if (
    /(?:database handles throughput|latency < \d+ms without cache|cache unnecessary)/i.test(
      signalText,
    )
  ) {
    if (graph.getNodes().includes('backend-redis')) {
      graph.removeNode(
        'backend-redis',
        'SIGNAL: Benchmark evidence proved baseline DB handles required throughput without cache complexity.',
      );
      removals.push('backend-redis');
    }
  }

  return {
    original_pipeline: currentPipeline,
    adapted_pipeline: graph.getNodes(),
    mutations: graph.mutationHistory,
    additions,
    removals,
    has_changed: additions.length > 0 || removals.length > 0,
  };
}

// ============================================================================
// 3. CHANGE IMPACT ANALYSIS (SECTION 15)
// ============================================================================

/**
 * Maps a proposed architectural change to its blast radius:
 * Affected Components -> Affected Contracts -> Affected Tests -> Operations -> Regression Risk.
 *
 * @param {string} proposedChange
 * @param {Object} [repoContext]
 * @returns {Object} Comprehensive change impact dossier
 */
function analyzeChangeImpact(proposedChange, repoContext = {}) {
  const text = (proposedChange || '').toLowerCase();

  const affectedComponents = [];
  const affectedContracts = [];
  const affectedTests = [];
  const affectedOperations = [];
  let regressionRisk = 'LOW';

  if (/(?:async job|queue|worker|background job)/i.test(text)) {
    affectedComponents.push('API Request Handler', 'Background Job Consumer', 'Queue Broker');
    affectedContracts.push(
      'Synchronous HTTP 200 -> HTTP 202 Accepted with Polling/Webhook Contract',
    );
    affectedTests.push(
      'End-to-End Async Job Completion Test',
      'Dead-Letter Queue Poison Pill Test',
    );
    affectedOperations.push('Worker Scaling', 'Queue Lag Monitoring', 'Retry Storm Backpressure');
    regressionRisk = 'HIGH';
  } else if (/(?:schema|migration|column|table|alter)/i.test(text)) {
    affectedComponents.push('Database Models', 'ORM Client', 'Data Access Layer');
    affectedContracts.push('Database Schema Model Contract');
    affectedTests.push('Migration Rollback Test', 'Model Validation Tests');
    affectedOperations.push('Zero-Downtime Deployment Window', 'Read/Write Replica Lag');
    regressionRisk = 'HIGH';
  } else if (/(?:caching|redis|cache-aside)/i.test(text)) {
    affectedComponents.push('Service Layer', 'Cache Store');
    affectedContracts.push('Cache Invalidation Event Interface');
    affectedTests.push('Cache Miss/Hit Test', 'Stale Data Invalidation Test');
    affectedOperations.push('Cache Eviction Policy Monitoring', 'Memory Sizing');
    regressionRisk = 'MEDIUM';
  } else {
    affectedComponents.push('Application Component Logic');
    affectedContracts.push('Internal Function Signatures');
    affectedTests.push('Unit Tests');
    affectedOperations.push('Standard Process Restart');
    regressionRisk = 'LOW';
  }

  return {
    proposed_change: proposedChange,
    regression_risk: regressionRisk,
    affected_components: affectedComponents,
    affected_contracts: affectedContracts,
    affected_tests: affectedTests,
    affected_operations: affectedOperations,
    blast_radius: affectedComponents.length > 2 ? 'WIDE' : 'LOCAL',
  };
}

// ============================================================================
// 4. INSTITUTIONAL LEARNING & SKILL QUALITY FEEDBACK (SECTION 20 & 21)
// ============================================================================

/**
 * In-memory registry of validated engineering lessons and skill contribution telemetry.
 */
const INSTITUTIONAL_MEMORY = [
  {
    pattern: 'Payment Mutation & Financial Charging',
    observation:
      'Network timeouts cause client retries that produce duplicate charges unless bounded by unique idempotency keys.',
    lesson:
      'Financial mutations strictly require idempotency key unique constraints and atomic transaction boundaries.',
  },
  {
    pattern: 'File Upload & Processing Services',
    observation:
      'Accepting arbitrary user URLs or files without magic-number checks opens SSRF and memory exhaustion vectors.',
    lesson:
      'File processors must strictly validate magic bytes, enforce hard streaming quotas, and isolate remote URL fetching.',
  },
  {
    pattern: 'Distributed Job Processing',
    observation:
      'Uncaught poison pills cause infinite worker retry loops that starve legitimate queue tasks.',
    lesson:
      'Queue workers require exponential backoff with randomized jitter and automated dead-letter queue routing.',
  },
];

/**
 * Records a validated engineering lesson derived from execution & verification failure.
 *
 * @param {string} pattern
 * @param {string} observation
 * @param {string} lesson
 * @returns {Object} Recorded lesson
 */
function recordEngineeringLesson(pattern, observation, lesson) {
  const item = {
    pattern,
    observation,
    lesson,
    recorded_at: new Date().toISOString(),
  };
  INSTITUTIONAL_MEMORY.push(item);
  try {
    const {
      getEngineeringMemoryStore,
      MEMORY_TYPES,
      PROVENANCE_TYPES,
      TRUST_STATES,
    } = require('./engineering_memory');
    getEngineeringMemoryStore().add({
      type: MEMORY_TYPES.PATTERN,
      title: pattern,
      content: lesson,
      concepts: pattern
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3),
      evidence: [{ type: PROVENANCE_TYPES.VERIFIED_IMPLEMENTATION, source: observation }],
      status: TRUST_STATES.VERIFIED,
    });
  } catch (e) {}
  return item;
}

/**
 * Returns relevant institutional lessons matching task intent.
 *
 * @param {string} task
 * @returns {Array<Object>} Relevant institutional lessons
 */
function recallRelevantLessons(task) {
  const t = (task || '').toLowerCase();
  return INSTITUTIONAL_MEMORY.filter(mem => {
    const pat = mem.pattern.toLowerCase();
    const words = pat.split(/\s+/).filter(w => w.length > 3);
    return words.some(w => t.includes(w));
  });
}

/**
 * Evaluates skill effectiveness telemetry to prevent redundant or false activations (Section 21).
 *
 * @param {string} skillName
 * @param {Object} outcomeEvidence
 * @returns {Object} Skill contribution report
 */
function evaluateSkillEffectiveness(skillName, outcomeEvidence = {}) {
  const diff = (outcomeEvidence.code_diff || '').toLowerCase();
  const tests = outcomeEvidence.tests_executed || [];
  const tokens = skillName.toLowerCase().split('-');

  const contributedInCode = tokens.some(tok => tok.length > 3 && diff.includes(tok));
  const contributedInTests = tests.some(t =>
    tokens.some(tok => tok.length > 3 && (t.name || '').toLowerCase().includes(tok)),
  );

  const contributed = contributedInCode || contributedInTests;

  try {
    const { getSkillTelemetryRegistry } = require('./capability_evolution');
    getSkillTelemetryRegistry().recordSkillExecution(skillName, {
      is_material: contributed,
      task: outcomeEvidence.task || 'evaluated_task',
    });
  } catch (e) {}

  return {
    skill: skillName,
    contributed,
    contribution_type: contributedInTests
      ? 'VERIFICATION'
      : contributedInCode
        ? 'IMPLEMENTATION'
        : 'NONE',
    recommendation: contributed ? 'RETAIN' : 'REVIEW_FOR_REDUNDANCY',
  };
}

// ============================================================================
// 5. FINAL ENGINEERING REVIEW (SECTION 24)
// ============================================================================

/**
 * Multi-gate engineering review executed before completion:
 * Requirements -> Considerations -> Security -> Reliability -> Performance -> Maintainability -> Change Impact -> Verification -> Outcome.
 *
 * @param {Object} outcomeContract
 * @param {Object} outcomeReport
 * @param {Object} [options]
 * @returns {Object} Comprehensive engineering review dossier
 */
function runFinalEngineeringReview(outcomeContract, outcomeReport, options = {}) {
  const contract = outcomeContract || {};
  const report = outcomeReport || {};

  const reviews = {
    requirements_review: {
      status: report.is_task_complete ? 'PASS' : 'FAIL',
      detail: report.is_task_complete
        ? 'Requested requirements satisfied.'
        : 'Primary functional task incomplete.',
    },
    consideration_review: {
      status:
        (report.satisfied || []).length >= (contract.material_considerations || []).length
          ? 'PASS'
          : 'WARN',
      detail: `${(report.satisfied || []).length} of ${(contract.material_considerations || []).length} material considerations satisfied.`,
    },
    security_review: {
      status: (report.new_risks || []).length === 0 ? 'PASS' : 'FAIL',
      detail:
        (report.new_risks || []).length === 0
          ? 'Zero security vulnerabilities detected.'
          : `Security vulnerabilities detected: ${(report.new_risks || []).map(r => r.risk).join(', ')}`,
    },
    reliability_review: {
      status: (report.partially_satisfied || []).length === 0 ? 'PASS' : 'WARN',
      detail:
        (report.partially_satisfied || []).length === 0
          ? 'Fault tolerance & resilience invariants verified.'
          : 'Unverified resilience or recovery properties.',
    },
    maintainability_review: {
      status: (report.unnecessary_complexity || []).length === 0 ? 'PASS' : 'WARN',
      detail:
        (report.unnecessary_complexity || []).length === 0
          ? 'Clean code; zero unnecessary architectural complexity.'
          : 'Overengineering detected; consider simplifying.',
    },
    verification_review: {
      status: report.is_outcome_complete ? 'PASS' : 'FAIL',
      detail: report.is_outcome_complete
        ? 'All automated assertions passed with concrete execution evidence.'
        : 'Verification incomplete or failing.',
    },
    outcome_review: {
      status: report.is_outcome_complete ? 'APPROVED' : 'ACTION_REQUIRED',
      outcome_score: report.outcome_score || 0,
    },
  };

  const isApproved = Object.values(reviews).every(
    r => r.status === 'PASS' || r.status === 'APPROVED',
  );

  return {
    is_approved: isApproved,
    reviews,
    verdict: isApproved ? 'PRODUCTION_READY' : 'ENGINEERING_GAPS_EXIST',
  };
}

module.exports = {
  DynamicCapabilityGraph,
  adaptPipelineOnSignal,
  analyzeChangeImpact,
  recordEngineeringLesson,
  recallRelevantLessons,
  evaluateSkillEffectiveness,
  runFinalEngineeringReview,
};
