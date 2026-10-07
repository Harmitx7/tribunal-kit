'use strict';

/**
 * governance_simulator.js — Tribunal Intelligence: Simulator
 * ============================================================================
 * Phase 7P / 7Q / 7R implementation.
 *
 * Runs candidate policies against the historical dataset to verify they do not
 * reduce safety parameters, generating structural PolicyProposals.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class GovernanceSimulator {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Simulates a candidate policy against historical data.
   *
   * @param {Object} candidatePolicy Contains rule overrides (e.g., maxReviewers: 2)
   * @returns {Object} Simulation metrics comparing baseline vs candidate
   */
  simulatePolicy(candidatePolicy) {
    const allCases = Object.keys(this.indexer.index.cases || {}).map(id => this.memory.getCase(id));
    if (allCases.length === 0) {
      throw new Error('No historical cases available for simulation.');
    }

    const baseline = {
      tokenCost: 0,
      rejections: 0,
      approvals: 0,
    };

    const candidate = {
      tokenCost: 0,
      rejections: 0, // In a full implementation, we'd replay the exact conditions
      approvals: 0,
      safetyDegradation: false,
    };

    for (const c of allCases) {
      if (!c) continue;

      // Baseline
      if (c.finalVerdict === 'RESOLVED') baseline.approvals++;
      else if (c.finalVerdict === 'REJECTED') baseline.rejections++;
      const trCost = (c.tokenUsage || {}).input + (c.tokenUsage || {}).output || 0;
      baseline.tokenCost += trCost;

      // Simulation proxy logic - e.g. capping reviewers
      let candidateCaseCost = trCost;
      if (candidatePolicy.maxReviewers) {
        const actualRCount = (c.selectedReviewers || []).length;
        if (actualRCount > candidatePolicy.maxReviewers) {
          candidateCaseCost = Math.floor(trCost * (candidatePolicy.maxReviewers / actualRCount));

          // Did pruning this reviewer prune someone who found a critical issue?
          const rejectedByPruned = (c.reviewResults || []).some((res, idx) => {
            return idx >= candidatePolicy.maxReviewers && res.status === 'REJECTED';
          });

          if (rejectedByPruned && c.finalVerdict === 'REJECTED') {
            // Optimization would have caused a false approval!
            candidate.safetyDegradation = true;
            candidate.approvals++;
          } else if (c.finalVerdict === 'REJECTED') {
            candidate.rejections++;
          } else {
            candidate.approvals++;
          }
        } else {
          if (c.finalVerdict === 'RESOLVED') candidate.approvals++;
          else if (c.finalVerdict === 'REJECTED') candidate.rejections++;
        }
      }

      candidate.tokenCost += candidateCaseCost;
    }

    return {
      casesSimulated: allCases.length,
      baseline,
      candidate,
    };
  }

  /**
   * Generates a structural policy proposal based on a successful simulation
   */
  proposePolicy(policyObj, simulationResult) {
    if (simulationResult.candidate.safetyDegradation) {
      throw new Error(
        'Will not generate proposal: Simulation indicates safety degradation (e.g. false approvals).',
      );
    }

    const tokensSaved = simulationResult.baseline.tokenCost - simulationResult.candidate.tokenCost;

    return {
      proposalId: `PROP-${Date.now()}`,
      policy: policyObj,
      evidence: `Simulated across ${simulationResult.casesSimulated} cases.`,
      projectedSavings: `${tokensSaved} tokens`,
      safetyRisk: 'No mandatory safety reduction detected in historical replay.',
      status: 'PENDING_HUMAN_APPROVAL',
    };
  }
}

module.exports = { GovernanceSimulator };
