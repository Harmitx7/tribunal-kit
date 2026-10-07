'use strict';

/**
 * human_intelligence.js — Tribunal Intelligence: Human-in-the-Loop
 * ============================================================================
 * Phase 7N implementation.
 *
 * Tracks human overrides of Tribunal decisions. Ensures that human override
 * DOES NOT equate to an automatic policy rewrite.
 */

const { CaseMemory } = require('./case_memory');

class HumanIntelligence {
  constructor(options = {}) {
    this.memory = options.memory || new CaseMemory(options);
    this.overrides = [];
  }

  /**
   * Records a human overriding a deterministic tribunal decision.
   */
  recordOverride(caseId, originalVerdict, finalVerdict, reason) {
    if (!caseId || !originalVerdict || !finalVerdict || !reason) {
      throw new Error('Missing require params for human override.');
    }

    const overrideRecord = {
      overrideId: `OVR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      caseId,
      originalTribunalVerdict: originalVerdict,
      humanDecision: finalVerdict,
      reason,
      status: 'PENDING_POLICY_ANALYSIS',
    };

    this.overrides.push(overrideRecord);

    // In a real system, this would write to `.agent/intelligence/overrides/`
    // For this step, we'll keep it simple or hook into a write function.
    return overrideRecord;
  }
}

module.exports = { HumanIntelligence };
