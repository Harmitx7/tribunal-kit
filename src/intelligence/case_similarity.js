'use strict';

/**
 * case_similarity.js — Tribunal Intelligence: Similarity Engine
 * ============================================================================
 * Phase 7D implementation.
 *
 * Compares incoming/ongoing cases against historical index data using
 * deterministic signals first (files, categories, impact).
 * Embeddings could be plugged here later, but are NOT the sole governance mechanism.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class CaseSimilarity {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Find historical cases similar to a proposed change.
   *
   * @param {Object} query Signal query (e.g., impactTier, files array, categories)
   * @returns {Array} List of { caseId, similarityScore, matchedSignals, confidence }
   */
  findSimilar(query) {
    if (!query) return [];

    const hitScores = new Map(); // caseId -> score tracking object
    const { impactTier, files = [], categories = [] } = query;

    const trackHit = (caseId, signalName, weight) => {
      if (!hitScores.has(caseId)) {
        hitScores.set(caseId, { score: 0, matchedSignals: [] });
      }
      const data = hitScores.get(caseId);
      data.score += weight;
      if (!data.matchedSignals.includes(signalName)) {
        data.matchedSignals.push(signalName);
      }
    };

    // 1. Same Files (High Signal)
    for (const file of files) {
      const cases = this.indexer.getCasesByFile(file);
      for (const caseId of cases) {
        trackHit(caseId, `FILE_MATCH:${file}`, 0.4); // 40% weight per matched file
      }
    }

    // 2. Same Impact Tier (Medium Signal)
    if (impactTier) {
      const cases = this.indexer.getCasesByImpactTier(impactTier);
      for (const caseId of cases) {
        trackHit(caseId, `TIER_MATCH:${impactTier}`, 0.2); // 20% weight per tier match
      }
    }

    // Prepare Results
    const results = [];
    for (const [caseId, data] of hitScores.entries()) {
      // Cap score at 1.0 logically, though raw scoring might exceed 1
      const normalizedScore = Math.min(data.score, 1.0);
      let confidence = 'LOW';
      if (normalizedScore > 0.7) confidence = 'HIGH';
      else if (normalizedScore >= 0.4) confidence = 'MEDIUM';

      results.push({
        caseId,
        similarityScore: normalizedScore,
        rawScore: data.score,
        matchedSignals: data.matchedSignals,
        confidence,
      });
    }

    // Sort descending by score
    results.sort((a, b) => b.similarityScore - a.similarityScore);

    return results;
  }
}

module.exports = { CaseSimilarity };
