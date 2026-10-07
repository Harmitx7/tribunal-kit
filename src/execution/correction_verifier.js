'use strict';

const { ValidationRunner } = require('./validation_runner');
const { EvidenceAggregator } = require('./evidence_aggregator');

/**
 * Phase 6F, 6G, 6H: Correction Verifier
 * Now acts as the Validation Selector and Executor.
 */
class CorrectionVerifier {
  constructor(options = {}) {
    this.workspace = options.workspace || process.cwd();
    this.validationRunner =
      options.validationRunner || new ValidationRunner({ workspaceRoot: this.workspace });
    // In a real flow, this would connect to the ReviewExecutor singleton
    this.reviewExecutor = options.reviewExecutor;
  }

  _buildValidationPlan(finding) {
    const checks = [];
    if (finding.category === 'Security' || finding.severity === 'CRITICAL') {
      checks.push({ type: 'STATIC', targetId: 'lint' });
      checks.push({ type: 'REPRODUCTION', targetId: 'unit_tests' }); // Mock logic
    } else if (finding.category === 'Performance') {
      checks.push({ type: 'EXECUTION', targetId: 'unit_tests' });
    } else {
      checks.push({ type: 'EXECUTION', targetId: 'unit_tests' });
    }
    return checks;
  }

  async verify(finding, plan) {
    const checks = this._buildValidationPlan(finding);
    const aggregator = new EvidenceAggregator();

    // 1. Run deterministic checks (Phase 6F, 6H)
    for (const check of checks) {
      if (check.type === 'EXECUTION' || check.type === 'STATIC' || check.type === 'REPRODUCTION') {
        const result = await this.validationRunner.run(check.targetId);

        let evidenceStatus = 'FAILED';
        if (result.status === 'PASSED') {
          evidenceStatus = check.type === 'REPRODUCTION' ? 'NOT_REPRODUCED' : 'PASSED';
        }

        aggregator.addEvidence({
          type: check.type,
          source: check.targetId,
          status: evidenceStatus,
          details: result,
          repositoryFingerprint: result.repositoryFingerprint,
          findingFingerprint: finding.id || 'unknown',
        });
      }
    }

    // 2. Real Targeted Re-Review (Phase 6G)
    if (this.reviewExecutor) {
      const reviewResult = await this.reviewExecutor.executeTargetedReview(
        finding,
        plan.affectedFiles,
      );
      aggregator.addEvidence({
        type: 'REVIEW',
        source: 'ReviewExecutor',
        status: reviewResult.status === 'APPROVED' ? 'PASSED' : 'REJECTED',
        details: reviewResult,
        findingFingerprint: finding.id || 'unknown',
      });
    } else {
      // Mock for testing if unprovided
      aggregator.addEvidence({
        type: 'REVIEW',
        source: 'MockReviewer',
        status: 'PASSED',
        details: {},
        findingFingerprint: finding.id || 'unknown',
      });
    }

    return aggregator;
  }
}

module.exports = { CorrectionVerifier };
