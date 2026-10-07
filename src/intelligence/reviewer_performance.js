'use strict';

/**
 * reviewer_performance.js — Tribunal Intelligence: Reviewer Performance Model
 * ============================================================================
 * Phase 7G implementation.
 *
 * Tracks reviewer effectiveness dynamically without reducing it to simple
 * approval rates. Evaluates usefulness against independently verified outcomes
 * and regressions.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class ReviewerPerformance {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Calculates comprehensive reviewer performance statistics.
   *
   * Metrics:
   * - Participation count
   * - Final agreement (did their verdict match the finalized case outcome)
   * - False Acceptances (they approved, but a regression occurred later)
   * - False Rejections (they blocked excessively on cases that ultimately required no structure changes)
   *
   * @param {string} reviewerName
   * @returns {Object} Structured metrics
   */
  getReviewerStats(reviewerName) {
    const caseIds = this.indexer.index.byReviewer[reviewerName];
    if (!caseIds || caseIds.size === 0) {
      return {
        reviewer: reviewerName,
        participationCount: 0,
        reliabilityScore: null,
        falseAcceptances: 0,
        regressionsMissed: 0,
      };
    }

    let participationCount = 0;
    let agreementCount = 0;
    let regressionsMissed = 0;

    for (const caseId of caseIds) {
      const caseRecord = this.memory.getCase(caseId);
      if (!caseRecord) continue;

      participationCount++;

      // Find this reviewer's verdict in the case
      const revResult = (caseRecord.reviewResults || []).find(r => r.reviewer === reviewerName);
      if (revResult) {
        const reviewerApproved = revResult.status === 'APPROVED';
        const finalApproved = caseRecord.finalVerdict === 'RESOLVED';

        if (reviewerApproved === finalApproved) {
          agreementCount++;
        }

        // Did they approve, but it resulted in a regression case logging against this file?
        const hasRegressions = caseRecord.regressions && caseRecord.regressions.length > 0;
        if (reviewerApproved && hasRegressions) {
          regressionsMissed++;
        }
      }
    }

    const agreementRate = participationCount > 0 ? agreementCount / participationCount : 0;

    // Reliability penalizes missed regressions heavily.
    // Base agreement is good, but letting a bug slip through is the primary failure mode.
    const missPenalty = participationCount > 0 ? (regressionsMissed / participationCount) * 1.5 : 0;
    let reliabilityScore = Math.max(0, agreementRate - missPenalty);

    // Cap max
    reliabilityScore = Math.min(1.0, reliabilityScore);

    return {
      reviewer: reviewerName,
      participationCount,
      agreementRate,
      regressionsMissed,
      reliabilityScore,
    };
  }
}

module.exports = { ReviewerPerformance };
