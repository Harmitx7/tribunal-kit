'use strict';

/**
 * adaptive_correction.js — Tribunal Intelligence: Adaptive Correction Strategies
 * ============================================================================
 * Phase 7K implementation.
 *
 * Uses historical evidence to recommend correction approaches for blocked cases.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class AdaptiveCorrection {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Recommends a correction strategy based on historical successes for similar findings.
   *
   * @param {Object} finding The finding object that blocked the transaction
   * @param {Array} similarCases Historical similar cases
   * @returns {Object|null} Recommended strategy overlay for the correction engine
   */
  recommendCorrection(finding, similarCases) {
    if (!finding || !finding.category || !similarCases || similarCases.length === 0) return null;

    const strategySuccesses = new Map();

    for (const sim of similarCases) {
      const caseRecord = this.memory.getCase(sim.caseId);
      if (!caseRecord || caseRecord.finalVerdict !== 'RESOLVED') continue;

      // Did they encounter a similar finding and successfully correct it?
      const corrections = caseRecord.correctionAttempts || [];
      for (const corr of corrections) {
        if (
          corr.targetFindingCategory === finding.category &&
          corr.status === 'SUCCESS' &&
          corr.strategyApplied
        ) {
          const stratId = corr.strategyApplied;
          strategySuccesses.set(stratId, (strategySuccesses.get(stratId) || 0) + 1);
        }
      }
    }

    if (strategySuccesses.size === 0) return null;

    // Find the most successful strategy
    let bestStrategy = null;
    let bestCount = 0;
    for (const [strat, count] of strategySuccesses.entries()) {
      if (count > bestCount) {
        bestStrategy = strat;
        bestCount = count;
      }
    }

    if (!bestStrategy) return null;

    return {
      recommendedStrategy: bestStrategy,
      historicalSuccessCount: bestCount,
      advisory: `This is a recommendation based on ${bestCount} historical successes. The agent still proposes the actual change, and Tribunal still governs it.`,
    };
  }
}

module.exports = { AdaptiveCorrection };
