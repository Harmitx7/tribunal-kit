'use strict';

/**
 * Phase 6K, 6L: Resolution Policy
 * Determines if the collected evidence meets the strict criteria for resolution.
 * Detects evidence conflicts and fails closed.
 */
class ResolutionPolicy {
  static evaluate(findingCategory, aggregator, userAnchors = []) {
    // 1. Conflict Check (Phase 6L)
    // If ANY execution evidence failed, we cannot be RESOLVED, regardless of review.
    if (aggregator.hasFailingEvidence('EXECUTION') || aggregator.hasFailingEvidence('STATIC')) {
      return {
        status: 'UNRESOLVED',
        reason: 'Failing deterministic evidence overrides model claims.',
      };
    }

    if (aggregator.hasFailingEvidence('REVIEW')) {
      return { status: 'UNRESOLVED', reason: 'Reviewer rejected the correction.' };
    }

    if (userAnchors && userAnchors.length > 0) {
      const missingAnchors = userAnchors.filter(anchor => {
        const anchorId = typeof anchor === 'string' ? anchor : anchor.id || anchor.name;
        return !aggregator.hasPassingEvidence(`ANCHOR:${anchorId}`);
      });
      if (missingAnchors.length > 0) {
        return {
          status: 'UNRESOLVED',
          reason: `Violated explicit user anchor constraints: ${missingAnchors.map(a => (typeof a === 'string' ? a : a.id || a.name)).join(', ')}`,
        };
      }
    }

    // 2. Policy Table (Phase 6K)
    const requiredEvidence = this._getRequiredEvidence(findingCategory);

    const missing = requiredEvidence.filter(type => !aggregator.hasPassingEvidence(type));

    if (missing.length > 0) {
      return {
        status: 'ESCALATED',
        reason: `Missing mandatory evidence for ${findingCategory}: ${missing.join(', ')}`,
      };
    }

    return { status: 'RESOLVED', reason: 'All mandatory evidence verified and passing.' };
  }

  static _getRequiredEvidence(category) {
    switch (category) {
      case 'Security':
        return ['STATIC', 'REPRODUCTION', 'REVIEW'];
      case 'Correctness':
      case 'Logic':
        return ['EXECUTION', 'REVIEW'];
      case 'Performance':
        return ['EXECUTION'];
      case 'Style':
      case 'Lint':
        return ['STATIC'];
      default:
        // Default strict fallback
        return ['EXECUTION', 'REVIEW'];
    }
  }
}

module.exports = { ResolutionPolicy };
