'use strict';

/**
 * cbr_engine.js — Tribunal Intelligence: Case-Based Reasoning Engine
 * ============================================================================
 * Phase 7L implementation.
 *
 * Orchestrates the full lifecycle before a review begins:
 * Current Change -> Similarity -> Failures -> Reviewers -> Evidence -> Plan.
 * Limits historical context length to avoid overwhelming the reviewer prompt.
 */

const { CaseSimilarity } = require('./case_similarity');
const { FailureIntelligence } = require('./failure_intelligence');
const { AdaptiveReviewerOrchestrator } = require('./adaptive_reviewer_orchestrator');
const { EvidenceOptimization } = require('./evidence_optimization');
const { RiskPredictionEngine } = require('./risk_prediction_engine');

class CaseBasedReasoningEngine {
  constructor(options = {}) {
    this.similarity = new CaseSimilarity(options);
    this.failureIntel = new FailureIntelligence(options);
    this.adaptiveOrchestrator = new AdaptiveReviewerOrchestrator(options);
    this.evidenceOptimizer = new EvidenceOptimization(options);
    this.riskEngine = new RiskPredictionEngine(options);
  }

  /**
   * Generates a structural Review Plan by flowing through intelligence layers.
   *
   * @param {Object} changeContext { diff, files, task, previousFindings }
   */
  generateReviewPlan(changeContext) {
    // 1. Initial baseline deterministic signals (mocked classification proxy for the pipeline)
    // In the real flow, resolveMonotonicImpactTier would have given us the tier. Let's assume passed in for now.
    const query = {
      files: changeContext.files || [],
      impactTier: changeContext.impactTier || 1,
      categories: (changeContext.previousFindings || []).map(f => f.category),
    };

    // 2. Historical Case Retrieval
    const similarCases = this.similarity.findSimilar(query);

    // 3. Known Failure Patterns
    const failures = [];
    for (const file of query.files) {
      const pattern = this.failureIntel.detectFailurePattern('FILE', file);
      if (pattern) failures.push(pattern);
    }

    // 4. Relevant Reviewers
    // Pass baseline options through the adaptive wrapper
    const reviewerPayload = this.adaptiveOrchestrator.adaptReviewers(changeContext, {
      ...query,
      similarCases,
    });

    // 5. Relevant Evidence
    const evidencePlan = this.evidenceOptimizer.generateEvidencePlan(changeContext, {
      ...query,
      similarCases,
    });

    // 6. Risk Prediction
    const predictedRisk = this.riskEngine.predictRisk(similarCases);

    // 7. Context Compression
    // The reviewer context should contain ONLY useful historical info.
    // Do NOT dump the entire database into the prompt.
    const topHistoricalContext = similarCases.slice(0, 2).map(sc => {
      return {
        caseId: sc.caseId,
        reasonForRetrieval: `Matched ${sc.matchedSignals.length} signals including ${sc.matchedSignals.join(', ')}`,
        similarityScore: sc.similarityScore,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      predictedRisk,
      reviewerOrchestration: reviewerPayload,
      evidencePlan,
      knownFailurePatterns: failures,
      historicalContext: topHistoricalContext,
    };
  }
}

module.exports = { CaseBasedReasoningEngine };
