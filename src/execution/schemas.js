'use strict';

/**
 * schemas.js — Strict Schemas and Parsers for Review Execution
 * =============================================================
 * Phase 1C: Strict Result Schema
 *
 * Guarantees:
 * 1. Valid verdicts: APPROVED, WARNING, REJECTED, ERROR
 * 2. Valid severities: INFO, LOW, MEDIUM, HIGH, CRITICAL
 * 3. Reject malformed model output — never silently parse prose as approval.
 * 4. Malformed output becomes ERROR.
 */

const VALID_VERDICTS = Object.freeze(new Set(['APPROVED', 'WARNING', 'REJECTED', 'ERROR']));
const VALID_SEVERITIES = Object.freeze(new Set(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']));

/**
 * Normalizes severity string to valid uppercase enum.
 * @param {string} sev
 * @returns {'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
 */
function normalizeSeverity(sev) {
  if (typeof sev !== 'string') return 'MEDIUM';
  const upper = sev.trim().toUpperCase();
  if (VALID_SEVERITIES.has(upper)) return upper;
  if (upper === 'MINOR') return 'LOW';
  if (upper === 'IMPORTANT') return 'HIGH';
  if (upper === 'WARN' || upper === 'WARNING') return 'MEDIUM';
  return 'MEDIUM';
}

/**
 * Validates a single review finding against strict schema.
 * @param {any} item
 * @param {number} index
 * @returns {{ valid: boolean, finding?: Object, error?: string }}
 */
function validateFinding(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { valid: false, error: `Finding at index ${index} must be an object.` };
  }

  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `F-${index + 1}`;
  const severity = normalizeSeverity(item.severity);
  const title =
    typeof item.title === 'string' && item.title.trim()
      ? item.title.trim()
      : typeof item.issue === 'string' && item.issue.trim()
        ? item.issue.trim()
        : typeof item.description === 'string' && item.description.trim()
          ? item.description.trim().slice(0, 80)
          : `Issue ${index + 1}`;

  const description =
    typeof item.description === 'string' && item.description.trim()
      ? item.description.trim()
      : typeof item.issue === 'string' && item.issue.trim()
        ? item.issue.trim()
        : title;

  const evidence = typeof item.evidence === 'string' ? item.evidence.trim() : '';
  const location =
    typeof item.location === 'string'
      ? item.location.trim()
      : typeof item.file === 'string'
        ? `${item.file}${item.line ? ':' + item.line : ''}`
        : 'unspecified';

  const recommendation =
    typeof item.recommendation === 'string' && item.recommendation.trim()
      ? item.recommendation.trim()
      : typeof item.fix === 'string' && item.fix.trim()
        ? item.fix.trim()
        : 'Review and address identified issue';

  return {
    valid: true,
    finding: {
      id,
      severity,
      title,
      description,
      evidence,
      location,
      recommendation,
    },
  };
}

/**
 * Strips markdown code fences from raw LLM output before parsing.
 * @param {string} raw
 * @returns {string}
 */
function extractJsonPayload(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();

  // If wrapped in ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // If output has extra leading text, attempt to find first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  return cleaned;
}

/**
 * Parses and strictly validates raw model output against the ReviewerResult schema.
 * If output is malformed, returns a fail-closed ERROR result.
 *
 * @param {string|Object} rawOutput
 * @param {string} [reviewerId='reviewer']
 * @returns {{
 *   isValid: boolean,
 *   verdict: 'APPROVED'|'WARNING'|'REJECTED'|'ERROR',
 *   confidence: number,
 *   findings: Array<Object>,
 *   recommendations: Array<string>,
 *   error?: string,
 *   rawParsed?: Object
 * }}
 */
function parseAndValidateReviewerOutput(rawOutput, reviewerId = 'reviewer') {
  if (rawOutput === null || rawOutput === undefined) {
    return {
      isValid: false,
      verdict: 'ERROR',
      confidence: 0.0,
      findings: [],
      recommendations: [],
      evidence_requests: [],
      error: 'EMPTY_OUTPUT: Model returned null or undefined.',
    };
  }

  let parsed = null;
  if (typeof rawOutput === 'object' && !Array.isArray(rawOutput)) {
    parsed = rawOutput;
  } else if (typeof rawOutput === 'string') {
    const jsonStr = extractJsonPayload(rawOutput);
    if (!jsonStr) {
      return {
        isValid: false,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [],
        recommendations: [],
        evidence_requests: [],
        error: 'EMPTY_PAYLOAD: No valid JSON block detected in model response.',
      };
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      return {
        isValid: false,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [],
        recommendations: [],
        error: `JSON_PARSE_ERROR: Failed to parse model output as JSON (${parseErr.message}).`,
      };
    }
  } else {
    return {
      isValid: false,
      verdict: 'ERROR',
      confidence: 0.0,
      findings: [],
      recommendations: [],
      error: `INVALID_TYPE: Expected string or object, got ${typeof rawOutput}.`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      verdict: 'ERROR',
      confidence: 0.0,
      findings: [],
      recommendations: [],
      error: 'INVALID_ROOT: Root of model output must be a JSON object.',
    };
  }

  // 1. Validate verdict
  const rawVerdict =
    typeof parsed.verdict === 'string' ? parsed.verdict.trim().toUpperCase() : null;
  if (!rawVerdict || !VALID_VERDICTS.has(rawVerdict)) {
    return {
      isValid: false,
      verdict: 'ERROR',
      confidence: 0.0,
      findings: [],
      recommendations: [],
      error: `INVALID_VERDICT: Verdict must be one of [APPROVED, WARNING, REJECTED, ERROR], got "${parsed.verdict}".`,
      rawParsed: parsed,
    };
  }

  // 2. Validate confidence
  let confidence = 0.0;
  if (typeof parsed.confidence === 'number' && !isNaN(parsed.confidence)) {
    confidence = Math.max(0.0, Math.min(1.0, parseFloat(parsed.confidence.toFixed(2))));
  } else if (typeof parsed.confidence === 'string') {
    const num = parseFloat(parsed.confidence);
    if (!isNaN(num)) {
      confidence = Math.max(0.0, Math.min(1.0, parseFloat(num.toFixed(2))));
    }
  }

  // 3. Validate findings
  const findings = [];
  if (parsed.findings !== undefined && parsed.findings !== null) {
    if (!Array.isArray(parsed.findings)) {
      return {
        isValid: false,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [],
        recommendations: [],
        error: 'INVALID_FINDINGS: "findings" must be an array.',
        rawParsed: parsed,
      };
    }
    for (let i = 0; i < parsed.findings.length; i++) {
      const res = validateFinding(parsed.findings[i], i);
      if (!res.valid) {
        return {
          isValid: false,
          verdict: 'ERROR',
          confidence: 0.0,
          findings: [],
          recommendations: [],
          error: `INVALID_FINDING: ${res.error}`,
          rawParsed: parsed,
        };
      }
      findings.push(res.finding);
    }
  }

  // 4. Validate recommendations
  const recommendations = [];
  if (parsed.recommendations !== undefined && parsed.recommendations !== null) {
    if (!Array.isArray(parsed.recommendations)) {
      return {
        isValid: false,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [],
        recommendations: [],
        error: 'INVALID_RECOMMENDATIONS: "recommendations" must be an array.',
        rawParsed: parsed,
      };
    }
    for (const rec of parsed.recommendations) {
      if (typeof rec === 'string' && rec.trim()) {
        recommendations.push(rec.trim());
      }
    }
  }

  // 4a. Validate evidence_requests
  const evidence_requests = [];
  if (parsed.evidence_requests !== undefined && parsed.evidence_requests !== null) {
    if (!Array.isArray(parsed.evidence_requests)) {
      return {
        isValid: false,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [],
        recommendations: [],
        evidence_requests: [],
        error: 'INVALID_EVIDENCE_REQUESTS: "evidence_requests" must be an array.',
        rawParsed: parsed,
      };
    }
    for (let i = 0; i < parsed.evidence_requests.length; i++) {
      const req = parsed.evidence_requests[i];
      if (!req || typeof req !== 'object' || Array.isArray(req)) {
        return {
          isValid: false,
          verdict: 'ERROR',
          confidence: 0.0,
          findings: [],
          recommendations: [],
          evidence_requests: [],
          error: `INVALID_EVIDENCE_REQUEST: Request at index ${i} must be an object.`,
          rawParsed: parsed,
        };
      }

      const reason = typeof req.reason === 'string' ? req.reason.trim() : '';
      const evidence_type =
        typeof req.evidence_type === 'string' ? req.evidence_type.trim().toLowerCase() : '';
      const target = typeof req.target === 'string' ? req.target.trim() : '';
      const scope = typeof req.scope === 'string' ? req.scope.trim() : '';
      const priority =
        typeof req.priority === 'string' ? req.priority.trim().toUpperCase() : 'NORMAL';

      if (!reason || !evidence_type || !target) {
        return {
          isValid: false,
          verdict: 'ERROR',
          confidence: 0.0,
          findings: [],
          recommendations: [],
          evidence_requests: [],
          error: `INVALID_EVIDENCE_REQUEST: Request at index ${i} is missing reason, evidence_type, or target.`,
          rawParsed: parsed,
        };
      }

      // Basic evidence_type validation (more robust validation happens in resolution phase)
      const validTypes = new Set([
        'file',
        'directory',
        'symbol',
        'test',
        'configuration',
        'dependency',
        'package metadata',
        'diff',
        'call site',
        'reference',
        'documentation',
      ]);
      if (!validTypes.has(evidence_type)) {
        return {
          isValid: false,
          verdict: 'ERROR',
          confidence: 0.0,
          findings: [],
          recommendations: [],
          evidence_requests: [],
          error: `INVALID_EVIDENCE_REQUEST: Unsupported evidence_type "${evidence_type}".`,
          rawParsed: parsed,
        };
      }

      // Basic target validation (no absolute paths or shell commands)
      if (
        target.startsWith('/') ||
        target.includes('..') ||
        target.includes(';') ||
        target.includes('&') ||
        target.includes('|')
      ) {
        return {
          isValid: false,
          verdict: 'ERROR',
          confidence: 0.0,
          findings: [],
          recommendations: [],
          evidence_requests: [],
          error: `INVALID_EVIDENCE_REQUEST: Invalid or potentially unsafe target path: "${target}".`,
          rawParsed: parsed,
        };
      }

      evidence_requests.push({
        reviewer_id: reviewerId,
        reason,
        evidence_type,
        target,
        scope,
        priority,
        required: true,
        status: 'pending',
      });
    }
  }

  // 5. Invariant check: If reviewer claims APPROVED but includes CRITICAL or HIGH findings,
  // that is a contradictory malformed response. Coerce to REJECTED.
  const hasCritical = findings.some(f => f.severity === 'CRITICAL');
  const hasHigh = findings.some(f => f.severity === 'HIGH');
  let finalVerdict = rawVerdict;

  if (rawVerdict === 'APPROVED' && (hasCritical || hasHigh)) {
    finalVerdict = 'REJECTED';
  }

  return {
    isValid: true,
    verdict: finalVerdict,
    confidence,
    findings,
    recommendations,
    evidence_requests,
    rawParsed: parsed,
  };
}

module.exports = {
  VALID_VERDICTS,
  VALID_SEVERITIES,
  normalizeSeverity,
  validateFinding,
  extractJsonPayload,
  parseAndValidateReviewerOutput,
};
