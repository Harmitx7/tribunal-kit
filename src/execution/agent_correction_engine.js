class AgentCorrectionEngine {
  constructor() {}

  /**
   * Generates a machine-actionable correction payload from a rejected verdict or denied policy.
   * @param {Object} request - The original write request containing files and diffs.
   * @param {Object} verdict - The AggregatedVerdictPayload from the VerdictAggregator.
   * @param {Object} policy - The Policy evaluation result.
   */
  generateCorrection(request, verdict, policy) {
    if (verdict.verdict !== 'REJECTED' && policy.action !== 'DENY') {
      return null;
    }

    const failed_constraints = [];
    const suggested_actions = [];

    if (policy.action === 'DENY') {
      failed_constraints.push(`Policy Engine: ${policy.reason}`);
      suggested_actions.push(
        'Do not modify protected boundaries or sensitive files without explicit authorization.',
      );
    }

    if (verdict.findings && verdict.findings.length > 0) {
      for (const finding of verdict.findings) {
        if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
          failed_constraints.push(`[${finding.category}] ${finding.issue}`);
          if (finding.file && finding.recommendation) {
            suggested_actions.push(`Fix in ${finding.file}: ${finding.recommendation}`);
          } else if (finding.recommendation) {
            suggested_actions.push(finding.recommendation);
          }
        }
      }
    }

    // Deduplicate
    const uniqueConstraints = [...new Set(failed_constraints)];
    const uniqueActions = [...new Set(suggested_actions)];

    return {
      status: 'REJECTED',
      reason:
        verdict.reason ||
        policy.reason ||
        'Transaction rejected due to policy or reviewer findings.',
      findings: verdict.findings || [],
      failed_constraints: uniqueConstraints,
      suggested_actions: uniqueActions,
    };
  }
  /**
   * Phase 5E: Generates an enhanced correction plan for a specific finding.
   * Provides bounded objectives and verification criteria.
   */
  generateEnhancedPlan(finding, proposalContext) {
    if (!finding) throw new Error('Missing finding to generate enhanced plan');

    // Abstracted plan generation logic
    return {
      findingId: finding.id || `fnd_${Date.now()}`,
      objective: `Remediate ${finding.severity} finding in ${finding.category}: ${finding.issue}`,
      affectedFiles: finding.file ? [finding.file] : [],
      expectedOutcome: finding.recommendation || 'Issue is resolved without creating regressions.',
      validationCriteria: [
        `Deterministic checks pass for ${finding.category}`,
        `Re-review confirms remediation of: ${finding.issue}`,
      ],
      risk: finding.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
    };
  }
}

module.exports = { AgentCorrectionEngine };
