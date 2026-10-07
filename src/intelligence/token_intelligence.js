'use strict';

/**
 * token_intelligence.js — Tribunal Intelligence: Token Economics
 * ============================================================================
 * Phase 7I implementation.
 *
 * Tracks input/output tokens, cost per verified resolution, and identifies
 * where context can be compressed safely.
 */

const { CaseMemory } = require('./case_memory');

class TokenIntelligence {
  constructor(options = {}) {
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Generates economics metadata for a completed case to be indexed.
   */
  calculateCaseEconomics(caseRecord) {
    if (!caseRecord || !caseRecord.tokenUsage) return null;

    const input = caseRecord.tokenUsage.input || 0;
    const output = caseRecord.tokenUsage.output || 0;
    const total = input + output;

    const reviewerCount = (caseRecord.selectedReviewers || []).length;
    const avgTokensPerReviewer = reviewerCount > 0 ? total / reviewerCount : 0;
    const findingsCount = (caseRecord.reviewResults || []).reduce(
      (acc, r) => acc + (r.findings ? r.findings.length : 0),
      0,
    );

    const tokensPerFinding = findingsCount > 0 ? total / findingsCount : total;

    return {
      totalTokens: total,
      avgTokensPerReviewer: Math.round(avgTokensPerReviewer),
      tokensPerFinding: Math.round(tokensPerFinding),
      correctionCount: (caseRecord.correctionAttempts || []).length,
      efficiencyRating: total < 10000 ? 'EXCELLENT' : total < 30000 ? 'GOOD' : 'HEAVY',
    };
  }

  /**
   * Proposes a token budget given historical performance.
   * "Optimization objective is: MINIMIZE TOKEN COST SUBJECT TO SAFETY >= CURRENT BASELINE"
   */
  proposeContextLimits(impactTier, reviewerCount, similarityConfidence) {
    let maxTokens = 4000;

    // High tier needs more context
    if (impactTier === 3) maxTokens = 15000;
    else if (impactTier === 2) maxTokens = 8000;

    // If we are highly confident in our similarity match, we know exactly what evidence matters.
    // We can compress the context boundary aggressively.
    if (similarityConfidence === 'HIGH') {
      maxTokens = Math.floor(maxTokens * 0.6); // 40% reduction
    } else if (similarityConfidence === 'MEDIUM') {
      maxTokens = Math.floor(maxTokens * 0.85); // 15% reduction
    }

    return {
      recommendedTokenLimit: maxTokens,
      projectedCostSavings: 4000 - maxTokens > 0 ? 4000 - maxTokens : 0,
    };
  }
}

module.exports = { TokenIntelligence };
