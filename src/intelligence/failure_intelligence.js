'use strict';

/**
 * failure_intelligence.js — Tribunal Intelligence: Failure Patterns
 * ============================================================================
 * Phase 7E implementation.
 *
 * Scans case history and generates structural FailurePatterns.
 * Ensures weak observations are marked as THIN.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');
const crypto = require('crypto');

class FailureIntelligence {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  _generatePatternId(category, context) {
    return crypto
      .createHash('sha256')
      .update(`${category}:${context}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Analyzes history to detect repeated failures on a specific file, reviewer, etc.
   *
   * @param {string} entityType 'FILE', 'REVIEWER', 'STRATEGY'
   * @param {string} entityValue The file path or reviewer name
   * @returns {Object|null} A structured FailurePattern or null if none detected.
   */
  detectFailurePattern(entityType, entityValue) {
    let caseIds = [];
    if (entityType === 'FILE') {
      caseIds = this.indexer.getCasesByFile(entityValue);
    } else if (entityType === 'REVIEWER') {
      caseIds = this.indexer.getCasesByReviewer(entityValue) || [];
    }

    if (!caseIds || caseIds.length === 0) return null;

    let failureCount = 0;
    let regressionCount = 0;
    const affectedCases = [];
    let firstSeen = null;
    let lastSeen = null;

    for (const caseId of caseIds) {
      const caseRecord = this.memory.getCase(caseId);
      if (!caseRecord) continue;

      const time = new Date(caseRecord.timestamp).getTime();
      if (!firstSeen || time < firstSeen) firstSeen = time;
      if (!lastSeen || time > lastSeen) lastSeen = time;

      const hasFailures =
        (caseRecord.failureModes && caseRecord.failureModes.length > 0) ||
        caseRecord.finalVerdict === 'REJECTED';
      const hasRegressions = caseRecord.regressions && caseRecord.regressions.length > 0;

      if (hasFailures || hasRegressions) {
        failureCount++;
        affectedCases.push(caseId);
        if (hasRegressions) regressionCount++;
      }
    }

    if (failureCount === 0) return null;

    // Pattern strength logic
    let confidence = 'ROBUST';
    if (failureCount < 3) confidence = 'THIN';
    else if (failureCount < 5) confidence = 'MODERATE';

    return {
      patternId: this._generatePatternId(entityType, entityValue),
      category: `${entityType}_FAILURE`,
      frequency: failureCount,
      totalObservations: caseIds.length,
      regressionCount,
      affectedCases,
      firstSeen: firstSeen ? new Date(firstSeen).toISOString() : null,
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null,
      evidence: `Observed ${failureCount} failures out of ${caseIds.length} historical executions.`,
      confidence,
    };
  }
}

module.exports = { FailureIntelligence };
