'use strict';

/**
 * data_leakage_engine.js — Canary Token Injection & Sensitive Data Leakage Auditor
 * =================================================================================
 * Domain: AI Agent Security & Governance (ai-agent-security-governance)
 *
 * Implements deterministic credential leakage defense:
 * 1. Generates and tracks synthetic high-entropy canary tokens
 * 2. Scans prompts, tool outputs, retrieval contexts, error logs, and report objects
 * 3. Integrates with secret_redactor.js to enforce zero raw secret exposure
 * 4. Deep sanitization for multi-agent traces and audit telemetry
 */

const crypto = require('crypto');
const { redactSecrets } = require('../../.agent/scripts/secret_redactor');

// Active in-memory canary registry for tracking
const activeCanaries = new Set();

/**
 * Generates a synthetic, high-entropy canary token.
 *
 * @param {string} [prefix='CANARY_SECRET']
 * @returns {string} Unique canary token
 */
function generateCanary(prefix = 'CANARY_SECRET') {
  const entropy = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const canary = `${prefix}_${entropy}`;
  activeCanaries.add(canary);
  return canary;
}

/**
 * Registers an existing canary token into the tracking registry.
 *
 * @param {string} canary
 */
function registerCanary(canary) {
  if (typeof canary === 'string' && canary.trim().length > 0) {
    activeCanaries.add(canary.trim());
  }
}

/**
 * Clears the active canary registry.
 */
function clearCanaries() {
  activeCanaries.clear();
}

/**
 * Returns an array of all currently registered canaries.
 *
 * @returns {Array<string>}
 */
function getActiveCanaries() {
  return Array.from(activeCanaries);
}

/**
 * Scans content (string, object, or array) for canary leaks and secret patterns.
 *
 * @param {any} content - Target content to audit
 * @param {object} [options]
 * @param {Array<string>} [options.canaries] - Explicit canaries to check in addition to activeCanaries
 * @returns {object} Audit report with leak indicators and sanitized content
 */
function scanForDataLeakage(content, options = {}) {
  const targetsToCheck = new Set(activeCanaries);
  if (Array.isArray(options.canaries)) {
    options.canaries.forEach(c => {
      if (typeof c === 'string' && c.length > 0) targetsToCheck.add(c);
    });
  }

  const serialized = typeof content === 'string' ? content : JSON.stringify(content, null, 2) || '';
  const leakedCanaries = [];
  const findings = [];

  // 1. Check for Canary Leaks
  for (const canary of targetsToCheck) {
    if (serialized.includes(canary)) {
      leakedCanaries.push(canary);
      findings.push({
        id: `LEAK-${crypto.randomUUID().slice(0, 8)}`,
        category: 'CANARY_TOKEN_LEAK',
        severity: 'CRITICAL',
        title: 'Synthetic Canary Secret Leaked to Output',
        description: `Canary token "${canary}" was found in audited content.`,
        evidence: [
          {
            type: 'TOKEN_MATCH',
            source: 'data_leakage_engine',
            description: `Canary token match: ${canary.slice(0, 18)}...`,
          },
        ],
        remediation: 'Do not echo raw context tokens or prompt variables in generated output.',
      });
    }
  }

  // 2. Check for Credential & API Key Patterns
  const redactionResult = redactSecrets(serialized);
  if (redactionResult.redactions > 0) {
    findings.push({
      id: `LEAK-${crypto.randomUUID().slice(0, 8)}`,
      category: 'CREDENTIAL_EXPOSURE',
      severity: 'CRITICAL',
      title: 'Unredacted Credential Pattern Detected',
      description: `Identified ${redactionResult.redactions} unredacted secret or key patterns.`,
      evidence: [
        {
          type: 'REGEX_SECRET_MATCH',
          source: 'secret_redactor',
          description: `Redaction count: ${redactionResult.redactions}`,
        },
      ],
      remediation: 'Apply secret_redactor.js before writing evidence or reports to disk.',
    });
  }

  // 3. Create fully sanitized version
  let sanitizedText = redactionResult.text;
  for (const canary of leakedCanaries) {
    sanitizedText = sanitizedText.split(canary).join('[REDACTED_CANARY]');
  }

  let sanitizedContent = sanitizedText;
  if (typeof content !== 'string') {
    try {
      sanitizedContent = JSON.parse(sanitizedText);
    } catch {
      sanitizedContent = sanitizedText;
    }
  }

  const leaksDetected = leakedCanaries.length > 0 || redactionResult.redactions > 0;

  return {
    leaksDetected,
    totalFindings: findings.length,
    leakedCanaries,
    secretRedactionsCount: redactionResult.redactions,
    findings,
    sanitizedContent,
  };
}

/**
 * Deep-sanitizes an object or array in place or returns a safe copy.
 *
 * @param {any} target
 * @param {Array<string>} [canaries]
 * @returns {any} Sanitized clone
 */
function sanitizeTrace(target, canaries = []) {
  if (target === null || target === undefined) return target;

  if (typeof target === 'string') {
    const scan = scanForDataLeakage(target, { canaries });
    return scan.sanitizedContent;
  }

  if (Array.isArray(target)) {
    return target.map(item => sanitizeTrace(item, canaries));
  }

  if (typeof target === 'object') {
    const cleanObj = {};
    for (const [key, value] of Object.entries(target)) {
      cleanObj[key] = sanitizeTrace(value, canaries);
    }
    return cleanObj;
  }

  return target;
}

module.exports = {
  generateCanary,
  registerCanary,
  clearCanaries,
  getActiveCanaries,
  scanForDataLeakage,
  sanitizeTrace,
};

