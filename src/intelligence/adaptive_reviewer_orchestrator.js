'use strict';

/**
 * adaptive_reviewer_orchestrator.js — Tribunal Intelligence
 * ============================================================================
 * Phase 7F implementation.
 *
 * Upgrades the static ReviewerOrchestrator decision layer with historical Case Intelligence.
 *
 * Contract:
 * - Adaptive selection may optimize (add/reorder) optional reviewer choice.
 * - Adaptive selection may NOT remove mandatory safety reviewers selected by the deterministic engine.
 */

const { orchestrateReviewers } = require('../system1/reviewer_orchestrator');
const { ReviewerPerformance } = require('./reviewer_performance');

class AdaptiveReviewerOrchestrator {
  constructor(options = {}) {
    this.performanceStore = options.performanceStore || new ReviewerPerformance(options);
  }

  /**
   * Orchestrates reviewers using both deterministic safety and historical intelligence.
   *
   * @param {Object} options Standard orchestrator options (tier, files, diff, task, evidence, previousFindings, forcedReviewers)
   * @param {Object} query Context for historical analysis
   * @returns {Object} Upgraded orchestration payload
   */
  adaptReviewers(options, query = {}) {
    // 1. Run Baseline Deterministic Engine
    // This establishes the absolute minimum safety floor.
    const baseline = orchestrateReviewers(options);

    // Short circuit if Tier 0 limits reviewers absolutely
    if (baseline.total_selected === 0) {
      return baseline;
    }

    const { selected, rejected, coverage } = baseline;
    const { impactTier, files, categories } = query;

    // 2. Fetch Performance Intelligence
    // Retrieve historical effectiveness of selected reviewers
    const adaptiveSelected = [];
    const safetyRequiredNames = new Set(selected.map(r => r.reviewer));

    for (const reviewer of selected) {
      const stats = this.performanceStore.getReviewerStats(reviewer.reviewer);
      let boostedScore = reviewer.score;
      let reasoning = reviewer.reason;

      if (stats.reliabilityScore !== null) {
        if (stats.reliabilityScore > 0.8) {
          boostedScore += 0.2;
          reasoning += ` | Historical performance indicates high reliability (${(stats.reliabilityScore * 100).toFixed(0)}%).`;
        } else if (stats.reliabilityScore < 0.4) {
          boostedScore -= 0.2;
          reasoning += ` | Historical performance is poor; retained due to mandatory safety policy.`;
        }
      }

      adaptiveSelected.push({
        ...reviewer,
        score: parseFloat(boostedScore.toFixed(2)),
        reason: reasoning,
        _isMandatorySafety: true, // Tagged to ensure it can never be removed
      });
    }

    // 3. Optional additions based on historical Similar Cases
    // If we have similarity insights, we might pull in a rejected reviewer.
    // E.g., a Database reviewer on an API tier change because previously similar API changes masked DB risks.
    if (query.similarCases && query.similarCases.length > 0) {
      // Collect reviewers that were historically present in successful similarity matches
      const historicalUsefulSet = new Set();
      for (const simCase of query.similarCases) {
        if (simCase.confidence === 'HIGH' || simCase.similarityScore >= 0.7) {
          const histRecord = this.performanceStore.memory.getCase(simCase.caseId);
          if (histRecord && histRecord.finalVerdict === 'RESOLVED') {
            // If they caught things in the past successfully
            (histRecord.selectedReviewers || []).forEach(r => historicalUsefulSet.add(r));
          }
        }
      }

      const tierCapacityMap = { 0: 0, 1: 1, 2: 3, 3: 8 };
      let availableCapacity = (tierCapacityMap[options.tier] || 1) - adaptiveSelected.length;

      // Sort rejected by their historical usefulness
      const adaptiveRejected = [];
      for (const rejectedReq of rejected) {
        if (historicalUsefulSet.has(rejectedReq.reviewer) && availableCapacity > 0) {
          // Elevate this reviewer
          adaptiveSelected.push({
            reviewer: rejectedReq.reviewer,
            reason: `${rejectedReq.reason} | ADAPTIVE OVERRIDE: Historically necessary for highly similar cases.`,
            risk_covered: 'adaptive_historical',
            evidence_supplied: [],
            expected_contribution:
              'Historical precedent indicates hidden risks in this change profile.',
            score: 0.5,
            _isMandatorySafety: false,
          });
          availableCapacity--;
        } else {
          adaptiveRejected.push(rejectedReq);
        }
      }
      baseline.rejected = adaptiveRejected;
    }

    // 4. Re-sort by intelligence boosted scores
    adaptiveSelected.sort((a, b) => b.score - a.score);

    baseline.selected = adaptiveSelected;
    baseline.total_selected = adaptiveSelected.length;

    return baseline;
  }
}

module.exports = { AdaptiveReviewerOrchestrator };
