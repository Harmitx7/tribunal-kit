'use strict';

/**
 * claim_check_separator.js — Strict Separation of Implementation Checks vs Evidence Claims
 * =========================================================================================
 * System-1 Capability 3:
 * Separates what Tribunal Kit actually verified by deterministic execution from what
 * an AI reviewer merely claimed.
 *
 * Directives:
 * 1. Never represent an evidence claim as a verified implementation fact.
 * 2. Synthesis distinguishes VERIFIED from CLAIMED.
 * 3. Preserve provenance for every check and claim.
 * 4. Do not fabricate confidence scores (if unavailable, mark as 'UNAVAILABLE').
 * 5. Resolve conflicts deterministically (verified execution > AI claims).
 */

const crypto = require('crypto');

/**
 * Creates a verified implementation check record.
 * Must be produced by deterministic executable verification.
 */
function createImplementationCheck({
  check,
  command = null,
  result,
  details = null,
  timestamp = null,
  runId = null,
}) {
  if (!check || typeof check !== 'string') {
    throw new Error('Implementation check must specify a valid check name.');
  }

  const normalizedResult = String(result).toUpperCase();
  if (!['PASSED', 'FAILED', 'ERROR'].includes(normalizedResult)) {
    throw new Error(`Invalid check result: ${result}. Must be PASSED, FAILED, or ERROR.`);
  }

  const ts = timestamp || new Date().toISOString();
  const id = runId || `chk_${crypto.randomBytes(6).toString('hex')}`;

  return {
    check,
    command: command || null,
    result: normalizedResult,
    details: details || null,
    timestamp: ts,
    run_id: id,
    provenance: {
      type: 'IMPLEMENTATION_CHECK',
      command: command || null,
      timestamp: ts,
      run_id: id,
      verified_by: 'executable_runner',
    },
  };
}

/**
 * Creates an evidence claim record.
 * Produced by LLM or inferred from non-executable review.
 */
function createEvidenceClaim({
  claimId = null,
  reviewer,
  source = null,
  file = null,
  line = null,
  evidence = null,
  assertion,
  category = 'general',
  confidence = 'UNAVAILABLE',
}) {
  if (!reviewer || typeof reviewer !== 'string') {
    throw new Error('Evidence claim must specify a reviewer name.');
  }
  if (!assertion || typeof assertion !== 'string') {
    throw new Error('Evidence claim must specify an assertion statement.');
  }

  const id = claimId || `clm_${crypto.randomBytes(6).toString('hex')}`;

  let normConfidence = 'UNAVAILABLE';
  if (confidence !== 'UNAVAILABLE' && confidence !== null && confidence !== undefined) {
    if (
      typeof confidence === 'number' &&
      !isNaN(confidence) &&
      confidence >= 0 &&
      confidence <= 1
    ) {
      normConfidence = parseFloat(confidence.toFixed(2));
    } else if (
      typeof confidence === 'string' &&
      ['L1', 'L2', 'L3', 'L4', 'L5'].includes(confidence.toUpperCase())
    ) {
      normConfidence = confidence.toUpperCase();
    }
  }

  return {
    claim_id: id,
    reviewer,
    source: source || reviewer,
    assertion,
    category,
    status: 'CLAIMED', // Claims can never initialize as VERIFIED
    confidence: normConfidence,
    provenance: {
      reviewer,
      source: source || reviewer,
      file: file || null,
      line: typeof line === 'number' ? line : null,
      evidence: evidence || null,
    },
  };
}

/**
 * Correlates and synthesizes implementation checks with reviewer claims.
 */
function synthesizeReviewResults({ checks = [], claims = [], runId = null, timestamp = null }) {
  const ts = timestamp || new Date().toISOString();
  const synthesisId = runId || `syn_${crypto.randomBytes(6).toString('hex')}`;

  const validChecks = checks.map(c => (c.provenance ? c : createImplementationCheck(c)));
  const validClaims = claims.map(c => (c.provenance ? c : createEvidenceClaim(c)));

  const conflicts = [];
  const verifiedItems = [];
  const claimedItems = [];

  // Categorize checks
  const passedChecks = validChecks.filter(c => c.result === 'PASSED');
  const failedChecks = validChecks.filter(c => c.result === 'FAILED' || c.result === 'ERROR');

  for (const check of passedChecks) {
    verifiedItems.push({
      item: check.check,
      status: 'VERIFIED',
      provenance: check.provenance,
    });
  }

  // Detect conflicts between checks and claims
  for (const claim of validClaims) {
    const claimText = (claim.assertion + ' ' + (claim.provenance?.evidence || '')).toLowerCase();

    // Conflict Scenario 1: Check passed but reviewer claims failure/vulnerability in that area
    if (
      claim.category === 'test' &&
      claimText.includes('fail') &&
      passedChecks.some(c => c.check === 'tests_passed')
    ) {
      conflicts.push({
        type: 'CHECK_PASSED_CLAIM_FAILED',
        description: `Reviewer ${claim.reviewer} claimed tests failed, but tests_passed check PASSED deterministically.`,
        check: 'tests_passed',
        claim_id: claim.claim_id,
        resolution: 'DETERMINISTIC_CHECK_PRESERVED',
      });
      claim.status = 'CLAIM_OVERRULED_BY_CHECK';
    } else if (
      claim.category === 'lint' &&
      claimText.includes('fail') &&
      passedChecks.some(c => c.check === 'lint_passed')
    ) {
      conflicts.push({
        type: 'CHECK_PASSED_CLAIM_FAILED',
        description: `Reviewer ${claim.reviewer} claimed lint failed, but lint_passed check PASSED deterministically.`,
        check: 'lint_passed',
        claim_id: claim.claim_id,
        resolution: 'DETERMINISTIC_CHECK_PRESERVED',
      });
      claim.status = 'CLAIM_OVERRULED_BY_CHECK';
    }

    // Conflict Scenario 2: Check failed but reviewer claims success or approves
    if (
      claimText.includes('passed') ||
      claimText.includes('success') ||
      claimText.includes('approved')
    ) {
      const relatedFailedCheck = failedChecks.find(fc => {
        const checkBase = fc.check.replace('_passed', '').toLowerCase();
        const checkSpace = checkBase.replace(/_/g, ' ');
        return (
          claimText.includes(checkBase) ||
          claimText.includes(checkSpace) ||
          (claim.category && claim.category.toLowerCase().includes(checkBase.split('_')[0]))
        );
      });
      if (relatedFailedCheck) {
        conflicts.push({
          type: 'CHECK_FAILED_CLAIM_PASSED',
          description: `Reviewer ${claim.reviewer} claimed success, but ${relatedFailedCheck.check} FAILED. Reviewer claim cannot override failing check.`,
          check: relatedFailedCheck.check,
          claim_id: claim.claim_id,
          resolution: 'CHECK_FAILURE_ENFORCED',
        });
        claim.status = 'CLAIM_REJECTED_CHECK_FAILED';
      }
    }

    // Add to claimedItems preserving claim status and provenance
    claimedItems.push({
      claim_id: claim.claim_id,
      reviewer: claim.reviewer,
      assertion: claim.assertion,
      status: claim.status,
      confidence: claim.confidence,
      provenance: claim.provenance,
    });
  }

  // Detect reviewer vs reviewer conflicts on same file:line
  const claimMap = new Map();
  for (const claim of validClaims) {
    const loc = claim.provenance?.file
      ? `${claim.provenance.file}:${claim.provenance.line || 0}`
      : null;
    if (loc) {
      if (!claimMap.has(loc)) claimMap.set(loc, []);
      claimMap.get(loc).push(claim);
    }
  }

  for (const [loc, locClaims] of claimMap.entries()) {
    if (locClaims.length >= 2) {
      const revA = locClaims[0];
      const revB = locClaims[1];
      const textA = revA.assertion.toLowerCase();
      const textB = revB.assertion.toLowerCase();

      const aSaysIssue =
        textA.includes('vulnerab') ||
        textA.includes('insecure') ||
        textA.includes('bug') ||
        textA.includes('error');
      const bSaysSafe =
        textB.includes('safe') ||
        textB.includes('correct') ||
        textB.includes('approved') ||
        textB.includes('clean');

      if ((aSaysIssue && bSaysSafe) || (textA.includes('safe') && textB.includes('bug'))) {
        conflicts.push({
          type: 'REVIEWER_OPPOSITE_CLAIMS',
          description: `Reviewer ${revA.reviewer} and ${revB.reviewer} make opposite claims regarding ${loc}.`,
          location: loc,
          claim_ids: [revA.claim_id, revB.claim_id],
          resolution: 'UNVERIFIED_CONFLICT_PRESERVED',
        });
        revA.status = 'CLAIM_CONFLICT';
        revB.status = 'CLAIM_CONFLICT';
      }
    }
  }

  // Compute final verdict
  let verdict = 'VERIFIED';
  if (failedChecks.length > 0) {
    verdict = 'FAILED_CHECKS';
  } else if (conflicts.length > 0) {
    verdict = 'CONFLICT';
  } else if (verifiedItems.length === 0 && claimedItems.length > 0) {
    verdict = 'CLAIMED';
  }

  return {
    synthesis_id: synthesisId,
    timestamp: ts,
    checks: validChecks,
    claims: validClaims,
    summary: {
      total_checks: validChecks.length,
      passed_checks: passedChecks.length,
      failed_checks: failedChecks.length,
      total_claims: validClaims.length,
      conflict_count: conflicts.length,
      verdict,
    },
    verified_items: verifiedItems,
    claimed_items: claimedItems,
    conflicts,
  };
}

module.exports = {
  createImplementationCheck,
  createEvidenceClaim,
  synthesizeReviewResults,
};
