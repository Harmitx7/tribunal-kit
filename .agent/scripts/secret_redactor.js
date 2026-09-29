#!/usr/bin/env node
/**
 * secret_redactor.js — Redacts recognizable secrets from evidence and report content.
 *
 * Patterns covered:
 *   - API keys (common prefixes: sk_, pk_, api_, key_)
 *   - Bearer tokens
 *   - JWTs (eyJ...)
 *   - Private keys (-----BEGIN)
 *   - Database URLs (postgres://, mysql://, mongodb://)
 *   - .env key=value pairs with sensitive names
 *   - AWS access keys (AKIA...)
 *   - Generic long hex/base64 strings in value positions
 */

'use strict';

const SECRET_PATTERNS = [
  // API keys with common prefixes
  {
    pattern: /\b(sk_live_|sk_test_|pk_live_|pk_test_|api_key_|key_)[A-Za-z0-9_\-]{8,}\b/g,
    label: '[REDACTED_API_KEY]',
  },
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-_.~+/]{20,}/gi, label: 'Bearer [REDACTED_TOKEN]' },
  // JWTs
  {
    pattern: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
    label: '[REDACTED_JWT]',
  },
  // Private keys
  {
    pattern:
      /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    label: '[REDACTED_PRIVATE_KEY]',
  },
  // Database connection strings
  {
    pattern: /(postgres|postgresql|mysql|mongodb|redis|amqp):\/\/[^\s"'`]+/gi,
    label: '[REDACTED_DB_URL]',
  },
  // AWS access keys
  { pattern: /\bAKIA[A-Z0-9]{16}\b/g, label: '[REDACTED_AWS_KEY]' },
  // Generic password/secret assignments
  {
    pattern:
      /(password|passwd|secret|token|api_key|apikey|auth_token|access_token|private_key)\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
    label: '$1=[REDACTED]',
  },
  // Hex strings that look like secrets (32+ chars in value-like positions)
  { pattern: /(?<==["']?)[0-9a-f]{32,}(?=["']?\s|$)/gi, label: '[REDACTED_HEX]' },
];

/**
 * Redact secrets from a string.
 * Returns the redacted string and a count of redactions performed.
 */
function redactSecrets(text) {
  if (!text || typeof text !== 'string') return { text, redactions: 0 };
  let redactions = 0;
  let result = text;
  for (const { pattern, label } of SECRET_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, (...args) => {
      redactions++;
      // Handle capture groups in replacement
      if (label.includes('$1') && args.length > 2) {
        return label.replace('$1', args[1]);
      }
      return label;
    });
    // Reset again after use
    pattern.lastIndex = 0;
  }
  return { text: result, redactions };
}

/**
 * Redact secrets from a finding's evidence, impact, remediation, and title.
 */
function redactFinding(finding) {
  const redacted = { ...finding };
  let totalRedactions = 0;

  if (redacted.title) {
    const r = redactSecrets(redacted.title);
    redacted.title = r.text;
    totalRedactions += r.redactions;
  }

  if (redacted.impact) {
    const r = redactSecrets(redacted.impact);
    redacted.impact = r.text;
    totalRedactions += r.redactions;
  }

  if (redacted.remediation) {
    const r = redactSecrets(redacted.remediation);
    redacted.remediation = r.text;
    totalRedactions += r.redactions;
  }

  if (redacted.evidence && Array.isArray(redacted.evidence)) {
    redacted.evidence = redacted.evidence.map(e => {
      const desc = redactSecrets(e.description || '');
      totalRedactions += desc.redactions;
      return { ...e, description: desc.text };
    });
  }

  if (totalRedactions > 0) {
    redacted._redactions = totalRedactions;
  }

  return redacted;
}

module.exports = { redactSecrets, redactFinding, SECRET_PATTERNS };
