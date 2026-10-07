'use strict';

const path = require('path');

const DEFAULT_SENSITIVE_PATTERNS = [
  /\.env.*/i,
  /credentials/i,
  /secrets/i,
  /\.pem$/i,
  /\.key$/i,
  /\.github[\\/]workflows[\\/]/i,
  /package(?:-lock)?\.json$/i,
  /auth/i,
  /security/i,
];

const CRITICAL_GOVERNANCE_PATTERNS = [
  /tribunal-kit[\\/]src[\\/]execution[\\/]/i, // core execution engine
  /\.agent[\\/]rules[\\/]/i, // core rules
];

class WritePolicyEngine {
  constructor(options = {}) {
    this.sensitivePatterns = options.sensitivePatterns || DEFAULT_SENSITIVE_PATTERNS;
    this.criticalPatterns = options.criticalPatterns || CRITICAL_GOVERNANCE_PATTERNS;
  }

  evaluate(request, decision = null) {
    let hasSensitive = false;
    let hasCritical = false;
    const reasons = [];

    // Identity checks
    if (!request.agentId || request.agentId === 'UNKNOWN_AGENT') {
      hasSensitive = true;
      reasons.push('Unverified agent identity requires review.');
    }

    // File patterns
    for (const file of request.files) {
      const normalizedPath = file.path.replace(/\\/g, '/');

      // Check critical
      if (this.criticalPatterns.some(p => p.test(normalizedPath))) {
        hasCritical = true;
        reasons.push(`Critical governance file touched: ${file.path}`);
      }

      // Check sensitive
      if (this.sensitivePatterns.some(p => p.test(normalizedPath))) {
        hasSensitive = true;
        reasons.push(`Sensitive file pattern matched: ${file.path}`);
      }
    }

    // Determine baseline policy from files
    let policy = 'ALLOW';
    if (hasCritical) {
      policy = 'DENY'; // Must be human explicitly, or heavily gated
    } else if (hasSensitive) {
      policy = 'REVIEW_REQUIRED';
    }

    // Override with decision engine tier
    if (decision) {
      if (decision.tier > 0 && policy === 'ALLOW') {
        policy = 'REVIEW_REQUIRED';
        reasons.push(`Impact tier ${decision.tier} requires review.`);
      }
      if (decision.tier >= 3) {
        // high tier changes might also trigger human approval
        if (policy !== 'DENY') {
          policy = 'REVIEW_REQUIRED';
        }
      }
      if (decision.escalated) {
        policy = 'DENY'; // Or requires human approval
        reasons.push(`Decision engine escalated: ${decision.escalation_reason}`);
      }
    }

    // Always require human approval for DENY or high risk? The prompt says DENY means no LLM alone can ALLOW.
    return {
      action: policy,
      reasons,
      requiresHumanApproval: policy === 'DENY' || hasCritical || (decision && decision.tier >= 3),
    };
  }
}

module.exports = {
  WritePolicyEngine,
  DEFAULT_SENSITIVE_PATTERNS,
  CRITICAL_GOVERNANCE_PATTERNS,
};
