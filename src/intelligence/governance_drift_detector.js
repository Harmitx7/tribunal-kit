'use strict';

/**
 * governance_drift_detector.js — Tribunal Intelligence: Governance Drift
 * ============================================================================
 * Phase 7O implementation.
 *
 * Scans historical metadata to detect statistically meaningful deviation
 * from baseline governance policies.
 */

const { CaseIndexer } = require('./case_indexer');
const { CaseMemory } = require('./case_memory');

class GovernanceDriftDetector {
  constructor(options = {}) {
    this.indexer = options.indexer || new CaseIndexer(options);
    this.memory = options.memory || new CaseMemory(options);
  }

  /**
   * Scans the index for drift across defined windows.
   */
  detectDrift() {
    const allCases = Object.values(this.indexer.index.cases || {});
    if (allCases.length < 20) {
      return { status: 'INSUFFICIENT_DATA', message: 'Need at least 20 cases to detect drift.' };
    }

    // Sort chronological
    allCases.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Split into older half (baseline) and newer half (current)
    const halfway = Math.floor(allCases.length / 2);
    const baselineWindow = allCases.slice(0, halfway);
    const currentWindow = allCases.slice(halfway);

    // Metrics calculation helper
    const calcMetrics = win => {
      let approved = 0;
      let rejected = 0;
      for (const c of win) {
        if (c.finalVerdict === 'RESOLVED') approved++;
        else if (c.finalVerdict === 'REJECTED') rejected++;
      }
      return {
        approvalRate: win.length > 0 ? approved / win.length : 0,
        rejectionRate: win.length > 0 ? rejected / win.length : 0,
      };
    };

    const baseMetrics = calcMetrics(baselineWindow);
    const currMetrics = calcMetrics(currentWindow);

    const signals = [];

    // Detect approval rate explosions
    if (currMetrics.approvalRate - baseMetrics.approvalRate > 0.3) {
      signals.push('DRIFT_DETECTED: Approval rate suddenly increased > 30%');
    }

    if (currMetrics.rejectionRate - baseMetrics.rejectionRate > 0.3) {
      signals.push('DRIFT_DETECTED: Rejection rate suddenly increased > 30%');
    }

    return {
      status: signals.length > 0 ? 'DRIFT_DETECTED' : 'STABLE',
      signals,
      baselines: baseMetrics,
      current: currMetrics,
    };
  }
}

module.exports = { GovernanceDriftDetector };
