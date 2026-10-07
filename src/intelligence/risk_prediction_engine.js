'use strict';

/**
 * risk_prediction_engine.js — Tribunal Intelligence: Predictive Risk
 * ============================================================================
 * Phase 7J implementation.
 *
 * Models probability of rejection, regression, and correction failure.
 * Predictions are explicitly ADVISORY.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class RiskPredictionEngine {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Generates a structural risk prediction report based on similar cases.
   *
   * @param {Array} similarCases Output from CaseSimilarity.findSimilar
   * @returns {Object} Prediction report containing probabilities and historical basis
   */
  predictRisk(similarCases) {
    if (!similarCases || similarCases.length === 0) {
      return {
        probabilityOfRejection: 'UNKNOWN',
        probabilityOfRegression: 'UNKNOWN',
        probabilityOfCorrectionFailure: 'UNKNOWN',
        expectedVerificationCost: 'UNKNOWN',
        advisoryMessage: 'Insufficient historical data to generate predictions.',
        basis: { similarCaseCount: 0 },
      };
    }

    let rejectionCount = 0;
    let regressionCount = 0;
    let correctionFailureCount = 0;
    let totalTokens = 0;

    const analyzedCount = similarCases.length;

    for (const simCase of similarCases) {
      const caseRecord = this.memory.getCase(simCase.caseId);
      if (!caseRecord) continue;

      if (caseRecord.finalVerdict === 'REJECTED') rejectionCount++;
      if (caseRecord.regressions && caseRecord.regressions.length > 0) regressionCount++;

      const corrections = caseRecord.correctionAttempts || [];
      if (corrections.length > 0) {
        const lastCorrection = corrections[corrections.length - 1];
        if (lastCorrection.status === 'FAILED') {
          correctionFailureCount++;
        }
      }

      const input = (caseRecord.tokenUsage || {}).input || 0;
      const output = (caseRecord.tokenUsage || {}).output || 0;
      totalTokens += input + output;
    }

    const rejectionProb = analyzedCount > 0 ? rejectionCount / analyzedCount : 0;
    const regressionProb = analyzedCount > 0 ? regressionCount / analyzedCount : 0;
    const correctionFailureProb = analyzedCount > 0 ? correctionFailureCount / analyzedCount : 0;
    const avgCost = analyzedCount > 0 ? Math.round(totalTokens / analyzedCount) : 0;

    return {
      probabilityOfRejection: (rejectionProb * 100).toFixed(1) + '%',
      probabilityOfRegression: (regressionProb * 100).toFixed(1) + '%',
      probabilityOfCorrectionFailure: (correctionFailureProb * 100).toFixed(1) + '%',
      expectedVerificationCost: avgCost > 0 ? `${avgCost} tokens` : 'UNKNOWN',
      prediction: {
        correctionDifficulty:
          correctionFailureProb > 0.4 ? 'HIGH' : correctionFailureProb > 0.1 ? 'MEDIUM' : 'LOW',
        regressionRisk: regressionProb > 0.3 ? 'HIGH' : regressionProb > 0.1 ? 'MEDIUM' : 'LOW',
      },
      advisoryMessage: `Based on ${analyzedCount} historical cases. This prediction must never directly approve a transaction.`,
      basis: {
        similarCaseCount: analyzedCount,
        rejections: rejectionCount,
        regressions: regressionCount,
        correctionFailures: correctionFailureCount,
      },
    };
  }
}

module.exports = { RiskPredictionEngine };
