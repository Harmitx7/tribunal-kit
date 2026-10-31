'use strict';

/**
 * quorum_and_aggregation_engine.js — Multi-Agent Consensus, Quorum & Partial Failure Evaluator
 * ===========================================================================================
 * Domain: Agent Runtime Reliability & Recovery (agent-runtime-reliability)
 *
 * Responsibilities:
 * 1. Enforce required-agent vs optional-agent completion policies.
 * 2. Prevent workflows with failed required reviewers from being falsely marked SUCCEEDED.
 * 3. Calculate quorum consensus and support explicit PARTIAL status reporting.
 * 4. Detect duplicate, conflicting, and missing agent submissions.
 */

const { QuorumPolicySchema, RuntimeFindingSchema } = require('./execution_state_schemas');

class QuorumAndAggregationEngine {
  constructor(policyData = {}) {
    this.policy = QuorumPolicySchema.parse(policyData);
  }

  /**
   * Evaluate a collection of parallel agent results against the configured quorum policy.
   *
   * @param {Array<Object>} agentResults - Array of { agentId, status, findings, error, durationMs }
   * @returns {Object} { status: 'SUCCEEDED'|'PARTIAL'|'FAILED', quorumSatisfied: boolean, findings: Array, summary: string }
   */
  evaluateResults(agentResults) {
    const findings = [];
    const resultMap = new Map();
    const duplicateAgents = new Set();

    // 1. Ingest and detect duplicate submissions
    for (const res of agentResults) {
      if (resultMap.has(res.agentId)) {
        duplicateAgents.add(res.agentId);
      }
      resultMap.set(res.agentId, res);
    }

    if (duplicateAgents.size > 0) {
      findings.push(
        RuntimeFindingSchema.parse({
          id: `quorum-dup-${Array.from(duplicateAgents).join('_')}`,
          category: 'QUORUM_FAILURE',
          severity: 'MEDIUM',
          component: 'QuorumEngine',
          title: 'Duplicate agent result submissions detected',
          description: `Agents submitted multiple conflicting or duplicate results: ${Array.from(duplicateAgents).join(', ')}`,
          evidence: `duplicate agents: [${Array.from(duplicateAgents).join(', ')}]`,
          remediation: 'Verify orchestration task scheduler does not double-dispatch reviewers.',
          verdict: 'FAIL',
        })
      );
    }

    // 2. Audit required agents
    const missingRequired = [];
    const failedRequired = [];
    const succeededRequired = [];

    for (const reqAgent of this.policy.requiredAgents) {
      if (!resultMap.has(reqAgent)) {
        missingRequired.push(reqAgent);
      } else {
        const entry = resultMap.get(reqAgent);
        if (entry.status === 'SUCCEEDED') {
          succeededRequired.push(reqAgent);
        } else {
          failedRequired.push({ agentId: reqAgent, status: entry.status, error: entry.error });
        }
      }
    }

    // 3. Audit optional agents
    const failedOptional = [];
    const succeededOptional = [];

    for (const optAgent of this.policy.optionalAgents) {
      if (resultMap.has(optAgent)) {
        const entry = resultMap.get(optAgent);
        if (entry.status === 'SUCCEEDED') {
          succeededOptional.push(optAgent);
        } else {
          failedOptional.push({ agentId: optAgent, status: entry.status, error: entry.error });
        }
      }
    }

    // Count all observed successes
    let totalObservedSuccesses = 0;
    for (const res of resultMap.values()) {
      if (res.status === 'SUCCEEDED') totalObservedSuccesses++;
    }

    const totalExpectedAgents =
      this.policy.requiredAgents.length + this.policy.optionalAgents.length || resultMap.size || 1;
    const successRatio = totalObservedSuccesses / totalExpectedAgents;

    // Check critical required agent failure
    const hasRequiredFailures = missingRequired.length > 0 || failedRequired.length > 0;

    if (hasRequiredFailures) {
      const details = [];
      if (missingRequired.length > 0) details.push(`missing: [${missingRequired.join(', ')}]`);
      if (failedRequired.length > 0)
        details.push(`failed: [${failedRequired.map((f) => `${f.agentId} (${f.status})`).join(', ')}]`);

      findings.push(
        RuntimeFindingSchema.parse({
          id: `quorum-required-failure-${Date.now()}`,
          category: 'QUORUM_FAILURE',
          severity: 'CRITICAL',
          component: 'QuorumEngine',
          title: 'Required reviewers failed or missing from review quorum',
          description: `Required reviewers failed to complete: ${details.join('; ')}.`,
          evidence: `required expected: [${this.policy.requiredAgents.join(', ')}], ${details.join('; ')}`,
          remediation: 'Investigate reviewer crashes or timeouts; required coverage cannot be waived.',
          verdict: 'FAIL',
        })
      );
    }

    // Determine final verdict
    let finalStatus = 'SUCCEEDED';
    let quorumSatisfied = false;

    if (hasRequiredFailures) {
      // Invariant: Never allow SUCCEEDED if required agents failed
      finalStatus = this.policy.allowPartialResults ? 'PARTIAL' : 'FAILED';
      quorumSatisfied = false;
    } else if (successRatio < this.policy.minSuccessThreshold) {
      finalStatus = this.policy.allowPartialResults ? 'PARTIAL' : 'FAILED';
      quorumSatisfied = false;
      findings.push(
        RuntimeFindingSchema.parse({
          id: `quorum-threshold-unmet-${Date.now()}`,
          category: 'QUORUM_FAILURE',
          severity: 'HIGH',
          component: 'QuorumEngine',
          title: 'Quorum threshold not satisfied',
          description: `Success ratio ${(successRatio * 100).toFixed(1)}% is below minimum required threshold ${(this.policy.minSuccessThreshold * 100).toFixed(1)}%.`,
          evidence: `successRatio: ${successRatio}, minThreshold: ${this.policy.minSuccessThreshold}`,
          remediation: 'Increase reviewer execution timeouts or reduce concurrency pressure.',
          verdict: 'FAIL',
        })
      );
    } else if (failedOptional.length > 0) {
      // Required passed, threshold met, but some optional failed
      finalStatus = this.policy.allowPartialResults ? 'PARTIAL' : 'SUCCEEDED';
      quorumSatisfied = true;
    } else {
      finalStatus = 'SUCCEEDED';
      quorumSatisfied = true;
    }

    const summary =
      finalStatus === 'SUCCEEDED'
        ? `Quorum satisfied: ${totalObservedSuccesses}/${totalExpectedAgents} agents succeeded (${(successRatio * 100).toFixed(1)}%).`
        : finalStatus === 'PARTIAL'
        ? `Partial quorum: ${totalObservedSuccesses}/${totalExpectedAgents} agents succeeded with allowable omissions.`
        : `Quorum FAILED: ${missingRequired.length + failedRequired.length} required reviewers failed or missing.`;

    return {
      status: finalStatus,
      quorumSatisfied,
      totalExpectedAgents,
      totalObservedSuccesses,
      successRatio,
      missingRequired,
      failedRequired,
      failedOptional,
      findings,
      summary,
    };
  }
}

module.exports = {
  QuorumAndAggregationEngine,
};
