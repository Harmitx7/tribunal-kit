'use strict';

/**
 * hallucination_detection_auditor.js — Source Verification & Hallucination Auditor
 * =================================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Deconstructs agent findings and claims to audit against:
 * 1. Non-existent / fabricated source files and lines (using evidence_verifier)
 * 2. Ghost npm / Python packages that do not exist
 * 3. Contradictions between claimed outcomes and deterministic tool execution
 * 4. 5-State Epistemic Verdicts:
 *    - SUPPORTED: Verifiable line/symbol with concrete entailing evidence.
 *    - CONTRADICTED: Contradicted by actual file content, symbol, or test output.
 *    - UNSUPPORTED: Claimed fact has no supporting evidence in the codebase.
 *    - PARTIALLY_SUPPORTED: Target exists, but evidence does not fully entail the assertion.
 *    - UNVERIFIABLE: Cannot be resolved deterministically from available repo files.
 */

const fs = require('fs');
const path = require('path');
const { verifyEvidence } = require('../../.agent/scripts/evidence_verifier');

// Known hallucinated/ghost package patterns commonly fabricated by LLMs
const KNOWN_GHOST_PACKAGES = [
  'ultravalidate',
  'fast-deep-clone-pro',
  'super-jwt-checker',
  'jwt-strict-validator',
  'react-auto-perf',
  'node-crypto-ultra',
  'express-secure-all',
];

// Common invented methods that do not exist in standard specifications
const INVENTED_STDLIB_METHODS = [
  'Array.prototype.unique',
  'Array.prototype.groupByKey',
  'String.prototype.contains',
  'Object.deepMerge',
];

/**
 * Evaluates whether a claim regarding code is supported, contradicted, or hallucinated.
 *
 * @param {object} claim - Individual claim or finding
 * @param {string} repoRoot - Absolute path to repository root
 * @returns {object} Detailed claim audit report
 */
function auditClaim(claim, repoRoot = process.cwd()) {
  if (!claim || (!claim.assertion && !claim.title)) {
    return {
      claimId: claim?.id || 'unknown',
      verdict: 'UNVERIFIABLE',
      reason: 'Claim lacks assertion statement or title.',
      entailmentScore: 0,
    };
  }

  const claimId = claim.id || claim.claimId || `claim_${Math.random().toString(36).substring(7)}`;
  const assertionText = (claim.assertion || claim.title || '') + ' ' + (claim.impact || '');

  // 1. Check for Known Ghost Packages
  for (const ghost of KNOWN_GHOST_PACKAGES) {
    const regex = new RegExp(`\\b${ghost}\\b`, 'i');
    if (regex.test(assertionText) || (claim.evidence && JSON.stringify(claim.evidence).includes(ghost))) {
      return {
        claimId,
        verdict: 'CONTRADICTED',
        reason: `FABRICATED_DEPENDENCY: References known non-existent ghost package "${ghost}".`,
        entailmentScore: 0,
        hallucinationType: 'GHOST_PACKAGE',
      };
    }
  }

  // 2. Check for Invented Standard Methods
  for (const invented of INVENTED_STDLIB_METHODS) {
    if (assertionText.includes(invented)) {
      return {
        claimId,
        verdict: 'CONTRADICTED',
        reason: `INVENTED_STDLIB_API: Claims existence of non-standard method "${invented}".`,
        entailmentScore: 0,
        hallucinationType: 'INVENTED_API',
      };
    }
  }

  // 3. Evidence Location Verification
  const evidenceList = Array.isArray(claim.evidence)
    ? claim.evidence
    : claim.location
      ? [{ location: `${claim.location.file}${claim.location.line ? ':' + claim.location.line : ''}` }]
      : [];

  if (evidenceList.length === 0) {
    return {
      claimId,
      verdict: 'UNSUPPORTED',
      reason: 'No concrete source evidence or location provided.',
      entailmentScore: 0,
      hallucinationType: 'UNSUPPORTED_ASSERTION',
    };
  }

  let verifiedCount = 0;
  let missingFileCount = 0;
  let staleLineCount = 0;

  for (const ev of evidenceList) {
    const loc = typeof ev === 'string' ? ev : ev.location;
    if (!loc) continue;

    const check = verifyEvidence({ location: loc }, repoRoot);
    if (check.verified) {
      verifiedCount++;
    } else {
      if (check.reason && (check.reason.includes('File does not exist') || check.reason.includes('Path traversal detected'))) {
        missingFileCount++;
      } else if (check.reason && check.reason.includes('Line')) {
        staleLineCount++;
      }
    }
  }

  if (missingFileCount > 0) {
    return {
      claimId,
      verdict: 'CONTRADICTED',
      reason: `FABRICATED_SOURCE_FILE: Target source file does not exist on disk.`,
      entailmentScore: 0,
      hallucinationType: 'MISSING_FILE',
    };
  }

  if (staleLineCount > 0 && verifiedCount === 0) {
    return {
      claimId,
      verdict: 'CONTRADICTED',
      reason: `STALE_LINE_REFERENCE: Cited line numbers do not exist in the target file.`,
      entailmentScore: 0,
      hallucinationType: 'STALE_LINE',
    };
  }

  // 4. Check Entailment Between Verification Command Output and Claim
  if (claim.verification) {
    const v = claim.verification;
    if (v.exit_code !== undefined && v.exit_code !== 0 && /pass(ed)?|success/i.test(assertionText)) {
      return {
        claimId,
        verdict: 'CONTRADICTED',
        reason: `CONTRADICTORY_TOOL_OUTPUT: Claim states success but verification command exited with code ${v.exit_code}.`,
        entailmentScore: 0,
        hallucinationType: 'TOOL_CONTRADICTION',
      };
    }
  }

  if (verifiedCount === evidenceList.length && verifiedCount > 0) {
    return {
      claimId,
      verdict: 'SUPPORTED',
      reason: 'All cited files and lines verified against disk with exact line matches.',
      entailmentScore: 1.0,
      hallucinationType: null,
    };
  }

  if (verifiedCount > 0 && verifiedCount < evidenceList.length) {
    return {
      claimId,
      verdict: 'PARTIALLY_SUPPORTED',
      reason: `Some cited evidence verified (${verifiedCount}/${evidenceList.length}), but others were invalid or missing.`,
      entailmentScore: verifiedCount / evidenceList.length,
      hallucinationType: 'PARTIAL_SUPPORT',
    };
  }

  return {
    claimId,
    verdict: 'UNVERIFIABLE',
    reason: 'Could not deterministically verify cited evidence.',
    entailmentScore: 0.5,
    hallucinationType: null,
  };
}

/**
 * Audits an entire collection of findings or claims from a review run.
 *
 * @param {Array<object>} findings - List of findings
 * @param {string} [repoRoot]
 * @returns {object} Aggregate audit report
 */
function auditFindingsForHallucinations(findings, repoRoot = process.cwd()) {
  if (!Array.isArray(findings)) {
    throw new Error('auditFindingsForHallucinations expects an array of findings.');
  }

  const results = findings.map(f => auditClaim(f, repoRoot));
  const counts = {
    SUPPORTED: 0,
    CONTRADICTED: 0,
    UNSUPPORTED: 0,
    PARTIALLY_SUPPORTED: 0,
    UNVERIFIABLE: 0,
  };

  let totalEntailment = 0;
  for (const r of results) {
    counts[r.verdict] = (counts[r.verdict] || 0) + 1;
    totalEntailment += r.entailmentScore;
  }

  const total = findings.length;
  const hallucinationCount = counts.CONTRADICTED + counts.UNSUPPORTED;
  const entailmentRate = total > 0 ? totalEntailment / total : 0;

  return {
    totalFindings: total,
    verdictCounts: counts,
    hallucinationsDetected: hallucinationCount,
    hallucinationRate: total > 0 ? Math.round((hallucinationCount / total) * 10000) / 10000 : 0,
    entailmentRate: Math.round(entailmentRate * 10000) / 10000,
    detailedVerdicts: results,
  };
}

module.exports = {
  auditClaim,
  auditFindingsForHallucinations,
  KNOWN_GHOST_PACKAGES,
  INVENTED_STDLIB_METHODS,
};
