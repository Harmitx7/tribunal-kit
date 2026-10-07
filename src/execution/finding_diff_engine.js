'use strict';

const crypto = require('crypto');

/**
 * Phase 5J: Finding Differential Engine
 * Compares BEFORE and AFTER finding lists to classify resolutions, regressions, and duplicates.
 */
class FindingDiffEngine {
  _fingerprint(finding) {
    // Stable fingerprint ignores LLM wording variations
    return crypto
      .createHash('sha256')
      .update(
        `${finding.category}:${finding.severity}:${finding.file || ''}:${finding.issue || ''}`,
      )
      .digest('hex');
  }

  /**
   * Compares baseline findings against new findings after a correction run.
   */
  compare(baselineFindings = [], newFindings = []) {
    const baseMap = new Map(baselineFindings.map(f => [this._fingerprint(f), f]));
    const newMap = new Map(newFindings.map(f => [this._fingerprint(f), f]));

    const resolved = [];
    const newRegressions = [];
    const unchanged = [];
    const unresolved = [];

    // Check what was in baseline
    for (const [fp, bFinding] of baseMap.entries()) {
      if (!newMap.has(fp)) {
        resolved.push(bFinding);
      } else {
        unchanged.push(bFinding);
        unresolved.push(bFinding);
      }
    }

    // Check what is new
    for (const [fp, nFinding] of newMap.entries()) {
      if (!baseMap.has(fp)) {
        newRegressions.push(nFinding);
      }
    }

    return {
      resolved,
      new: newRegressions,
      unchanged,
      regressed: newRegressions.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH'),
      unresolved,
    };
  }
}

module.exports = { FindingDiffEngine };
