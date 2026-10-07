'use strict';

/**
 * evidence_optimization.js — Tribunal Intelligence: Evidence System Upgrade
 * ============================================================================
 * Phase 7H implementation.
 *
 * Upgrades the static Evidence Engine to determine which evidence is actually
 * useful for a given change type based on historical success, creating an
 * optimized EvidencePlan.
 */

const { collectAndRankEvidence } = require('../system1/evidence_engine');
const { ReviewerPerformance } = require('./reviewer_performance');

class EvidenceOptimization {
  constructor(options = {}) {
    this.performance = options.performanceStore || new ReviewerPerformance(options);
  }

  /**
   * Generates an optimized Execution Plan for a review, dictating what
   * evidence must be fetched and what can be skipped.
   *
   * @param {Object} options Options passed to collectAndRankEvidence
   * @param {Object} query Intelligence query containing similarity metadata
   * @returns {Object} EvidencePlan payload
   */
  generateEvidencePlan(options, query = {}) {
    // 1. Fetch baseline deterministic evidence
    // We do NOT weaken mandatory checks.
    const baseline = collectAndRankEvidence({
      ...options,
      maxItems: 50, // Temporarily expand to see everything
      maxTokens: 10000,
    });

    const plan = {
      required: [],
      optional: [],
      avoid: [],
      tokenEstimate: 0,
    };

    // 2. Classify costs and historical value
    const cheapTypes = new Set(['changed_symbol', 'previous_finding']);
    const expensiveTypes = new Set(['configuration', 'historical_memory', 'relevant_test']);

    // 3. Scan the raw items and re-classify based on intelligence
    for (const item of baseline.evidence) {
      // Is it statically mandatory? It MUST be required.
      if (item.is_mandatory) {
        plan.required.push(item);
        plan.tokenEstimate += item.estimated_tokens;
        continue;
      }

      // Intelligence overlay: Has this evidence type actually caught things for this category?
      // (Simplified heuristic for the architectural scaffolding: usually tests and symbols matter most for logic)
      let historicallyUseful = false;
      if (query.categories && query.categories.includes('logic') && item.type === 'relevant_test') {
        historicallyUseful = true;
      }
      if (
        query.categories &&
        query.categories.includes('dependency') &&
        item.type === 'configuration'
      ) {
        historicallyUseful = true;
      }

      if (historicallyUseful) {
        // Upgrade to required
        plan.required.push({ ...item, is_mandatory: true, _intelligence_upgraded: true });
        plan.tokenEstimate += item.estimated_tokens;
        continue;
      }

      // If expensive and not historically useful for this specific type of change, skip it to save tokens
      if (expensiveTypes.has(item.type) && plan.tokenEstimate > 4000) {
        plan.avoid.push({
          id: item.id,
          reason: `Expensive evidence type (${item.type}) not historically critical for this scope. Token optimization active.`,
        });
        continue;
      }

      // Default to optional
      plan.optional.push(item);
    }

    // Sort to keep deterministic execution order
    plan.required.sort((a, b) => b.score - a.score);
    plan.optional.sort((a, b) => b.score - a.score);

    return {
      evidencePlanId: `EP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mandatoryCount: plan.required.length,
      optimizedTokenEstimate: plan.tokenEstimate,
      plan,
    };
  }
}

module.exports = { EvidenceOptimization };
