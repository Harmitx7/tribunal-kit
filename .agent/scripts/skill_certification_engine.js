'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSkills } = require('./context_broker');
const { classifySkill } = require('./skill_behavior_classifier');
const { parseContract } = require('./skill_contract_engine');

// ─── Constants & State Enums ────────────────────────────────────────────────
const EVIDENCE_TRUST_LEVELS = {
  E0: { name: 'NO_EVIDENCE', rank: 0, certifiable: false, independent: false },
  E1: { name: 'STRUCTURAL', rank: 1, certifiable: false, independent: false },
  E2: { name: 'EXISTING_TEST', rank: 2, certifiable: true, independent: true },
  E3: { name: 'IMPLEMENTATION', rank: 3, certifiable: false, independent: false },
  E4: { name: 'HUMAN_APPROVED', rank: 4, certifiable: true, independent: true },
  E5: { name: 'REPEATED_EMPIRICAL', rank: 5, certifiable: true, independent: true },
};

const CLAIM_STATUS = {
  UNTESTED: 'UNTESTED',
  TEST_PENDING: 'TEST_PENDING',
  TEST_REJECTED: 'TEST_REJECTED',
  TEST_APPROVED: 'TEST_APPROVED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  NONDETERMINISTIC: 'NONDETERMINISTIC',
  VERIFIED: 'VERIFIED',
  STALE: 'STALE',
  REVOKED: 'REVOKED',
};

const CERTIFICATION_LEVELS = {
  UNPROVABLE: 'UNPROVABLE',
  STRUCTURAL_ONLY: 'STRUCTURAL_ONLY',
  PARTIAL: 'PARTIAL',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
  BEHAVIORALLY_CERTIFIED: 'BEHAVIORALLY_CERTIFIED',
};

const REPEATABILITY = {
  DETERMINISTIC: 'DETERMINISTIC',
  STABLE: 'STABLE',
  NONDETERMINISTIC: 'NONDETERMINISTIC',
  UNSTABLE: 'UNSTABLE',
  FAILED: 'FAILED',
};

const LEDGER_PATH = path.resolve(__dirname, '..', 'data', 'skill_certification_ledger.jsonl');

// ─── Immutable Certification Ledger (Section 15) ───────────────────────────
function appendLedgerEvent(event) {
  const fullEvent = {
    event_id: `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  const line = JSON.stringify(fullEvent) + '\n';
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, line, 'utf8');
  return fullEvent;
}

function readLedgerEvents(filterSkillId = null) {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n').filter(Boolean);
  const events = lines.map(l => JSON.parse(l));
  if (filterSkillId) return events.filter(e => e.skill_id === filterSkillId);
  return events;
}

// ─── Source Freshness Check (Section 12) ────────────────────────────────────
function checkSourceFreshness(testSpecification, agentDir = null) {
  const baseDir = agentDir || path.resolve(__dirname, '..');
  const skillId = testSpecification.skill_id;
  const skillFile = path.join(baseDir, 'skills', skillId, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    return {
      fresh: false,
      reason: 'SOURCE_NOT_FOUND: SKILL.md does not exist on disk',
    };
  }

  const currentContent = fs.readFileSync(skillFile, 'utf8');
  const currentSourceHash = crypto.createHash('sha256').update(currentContent).digest('hex');
  const recordedSourceHash = testSpecification.evidence_sources?.[0]?.source_hash;

  if (recordedSourceHash && recordedSourceHash !== currentSourceHash) {
    return {
      fresh: false,
      reason: `SOURCE_STALE: recorded source_hash (${recordedSourceHash.slice(0, 8)}) !== current (${currentSourceHash.slice(0, 8)})`,
      current_hash: currentSourceHash,
      recorded_hash: recordedSourceHash,
    };
  }

  return {
    fresh: true,
    current_hash: currentSourceHash,
    recorded_hash: recordedSourceHash,
  };
}

// ─── Evidence Promotion Gate (Section 13) ───────────────────────────────────
function promoteEvidence(testSpecification, reviewPackage, executionResult, skillRaw = {}, options = {}) {
  const skillId = testSpecification.skill_id;
  const isSecurity =
    skillId.includes('security') ||
    skillId.includes('red-team') ||
    skillId.includes('vulnerability') ||
    skillId.includes('audit-and-fix') ||
    skillId.includes('zero-trust');

  // Gate 1: Test Review Validation
  if (testSpecification.review?.status !== 'APPROVED' || reviewPackage?.review_decision !== 'APPROVED') {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: 'UNAPPROVED_TEST: Test specification has not been approved by reviewer gate',
    };
  }

  // Gate 2: Security Human Approval Gate
  if (isSecurity) {
    const reviewer = String(reviewPackage.reviewer || '');
    if (!reviewer || reviewer.toLowerCase().includes('auto') || reviewer.toLowerCase().includes('bot')) {
      return {
        promoted: false,
        code: 'PROMOTION_REJECTED',
        reason: 'SECURITY_GATE_FAILED: Security-classified skills require verified human reviewer approval',
      };
    }
  }

  // Gate 3: Test Independence & Circularity
  if (!testSpecification.independence || testSpecification.independence.verified !== true) {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: 'CIRCULAR_OR_DEPENDENT: Expectation is not independently verified from implementation',
    };
  }

  const expSrc = String(testSpecification.independence.expectation_source || '').toLowerCase();
  const impSrc = String(testSpecification.independence.implementation_source || '').toLowerCase();
  if (expSrc === impSrc || expSrc.includes('runtime') || expSrc.includes('observed_output')) {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: 'CIRCULAR_EVIDENCE: Expectation derives from runtime implementation output',
    };
  }

  // Gate 4: Source Freshness
  const freshness = checkSourceFreshness(testSpecification, options.agentDir);
  if (!freshness.fresh) {
    appendLedgerEvent({
      event: 'SOURCE_STALE',
      skill_id: skillId,
      test_id: testSpecification.id,
      reason: freshness.reason,
    });
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: freshness.reason,
    };
  }

  // Gate 5: Execution Result Validation
  if (!executionResult || executionResult.status !== 'PASS') {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: `EXECUTION_FAILED: Test execution resulted in ${executionResult?.status || 'NO_RESULT'}`,
    };
  }

  // Gate 6: Repeatability Validation
  const rep = executionResult.repeatability?.classification;
  const isDeterministic = rep === REPEATABILITY.DETERMINISTIC;
  const isStable = rep === REPEATABILITY.STABLE;

  if (!isDeterministic && !isStable) {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: `REPEATABILITY_FAILED: Classification is ${rep || 'UNKNOWN'}; must be DETERMINISTIC`,
    };
  }

  // Gate 7: Repetition Count Requirements
  const requiredRuns = isSecurity ? 5 : 3;
  if ((executionResult.repeatability?.runs || 0) < requiredRuns) {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: `INSUFFICIENT_REPETITIONS: Expected >= ${requiredRuns} runs, found ${executionResult.repeatability?.runs || 0}`,
    };
  }

  // Gate 8: Side Effects and Forbidden Violations
  const failedAssertions = executionResult.assertions?.failed || [];
  if (failedAssertions.length > 0) {
    return {
      promoted: false,
      code: 'PROMOTION_REJECTED',
      reason: `ASSERTION_FAILURES: Execution failed assertions: ${failedAssertions.join('; ')}`,
    };
  }

  // All Gates Passed -> Construct Promoted Evidence Record
  const evidenceId = `EVD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const trustLevel = isSecurity ? 'E5' : 'E2';

  const promotedRecord = {
    evidence_id: evidenceId,
    test_id: testSpecification.id,
    skill_id: skillId,
    claim_id: testSpecification.claim?.id,
    claim_statement: testSpecification.claim?.statement,
    test_type: testSpecification.test_type,
    trust_level: trustLevel,
    trust_rank: EVIDENCE_TRUST_LEVELS[trustLevel].rank,
    independent: true,
    certifying: true,
    source_freshness: {
      verified: true,
      source_hash: freshness.current_hash,
    },
    repeatability: {
      classification: rep,
      runs: executionResult.repeatability?.runs,
      passed_runs: executionResult.repeatability?.passed_runs,
    },
    reviewer: reviewPackage.reviewer,
    review_date: reviewPackage.review_date,
    execution_hash: executionResult.evidence?.hash || 'NO_HASH',
    promoted_at: new Date().toISOString(),
    status: 'PROMOTED',
  };

  // Record to Ledger
  appendLedgerEvent({
    event: 'EVIDENCE_PROMOTED',
    skill_id: skillId,
    test_id: testSpecification.id,
    claim_id: testSpecification.claim?.id,
    evidence_id: evidenceId,
    trust_level: trustLevel,
    repeatability: rep,
  });

  return {
    promoted: true,
    evidence: promotedRecord,
  };
}

// ─── Certification Revocation (Section 14) ──────────────────────────────────
function revokeCertification(skillId, reason, reviewerName = 'Tribunal Security Gate') {
  const ledgerEvents = readLedgerEvents(skillId);
  const previousStatus = ledgerEvents.length > 0 ? 'ACTIVE' : 'NONE';

  const revocationRecord = {
    skill_id: skillId,
    event: 'CERTIFICATION_REVOKED',
    previous_status: previousStatus,
    reason,
    revoked_by: reviewerName,
    timestamp: new Date().toISOString(),
  };

  appendLedgerEvent(revocationRecord);

  return {
    success: true,
    revocation: revocationRecord,
  };
}

// ─── Claim-Level Evaluation & Aggregation (Sections 6-8) ────────────────────
function evaluateClaimStates(claims, testInventory, reviewPackages, executionResults, options = {}) {
  const claimStates = {};

  for (const claim of claims) {
    if (claim.testability === 'UNTESTABLE') {
      claimStates[claim.id] = {
        claim_id: claim.id,
        statement: claim.statement,
        status: CLAIM_STATUS.UNTESTED,
        reason: 'Reference-only or non-mechanical behavioral claim',
        evidence_ids: [],
        certifying: false,
      };
      continue;
    }

    // Find tests for this claim
    const matchingTests = testInventory.filter(t => t.claim_id === claim.id);

    if (matchingTests.length === 0) {
      claimStates[claim.id] = {
        claim_id: claim.id,
        statement: claim.statement,
        status: CLAIM_STATUS.UNTESTED,
        evidence_ids: [],
        certifying: false,
      };
      continue;
    }

    let claimStatus = CLAIM_STATUS.TEST_PENDING;
    const promotedEvidenceIds = [];
    const failureReasons = [];

    for (const testItem of matchingTests) {
      const review = reviewPackages[testItem.test_id];
      const result = executionResults[testItem.test_id];

      if (!review) {
        claimStatus = CLAIM_STATUS.TEST_PENDING;
        continue;
      }

      if (review.review_decision === 'REJECTED') {
        claimStatus = CLAIM_STATUS.TEST_REJECTED;
        failureReasons.push(`Reviewer rejected test: ${review.review_reason || 'Unknown'}`);
        continue;
      }

      if (review.review_decision !== 'APPROVED') {
        claimStatus = CLAIM_STATUS.TEST_PENDING;
        continue;
      }

      // Check result
      if (!result) {
        claimStatus = CLAIM_STATUS.TEST_APPROVED;
        continue;
      }

      if (result.status !== 'PASS') {
        claimStatus = CLAIM_STATUS.EXECUTION_FAILED;
        failureReasons.push(`Execution status ${result.status}`);
        continue;
      }

      if (result.repeatability?.classification === REPEATABILITY.NONDETERMINISTIC) {
        claimStatus = CLAIM_STATUS.NONDETERMINISTIC;
        failureReasons.push('Execution showed non-deterministic output across runs');
        continue;
      }

      // Promote evidence
      const testSpec = {
        id: testItem.test_id,
        skill_id: testItem.skill_id,
        claim,
        test_type: testItem.test_type,
        review: { status: review.review_decision },
        evidence_sources: review.source_evidence,
        independence: review.independence_analysis,
      };

      const promotion = promoteEvidence(testSpec, review, result, {}, options);

      if (promotion.promoted) {
        promotedEvidenceIds.push(promotion.evidence.evidence_id);
        claimStatus = CLAIM_STATUS.VERIFIED;
      } else {
        if (promotion.reason.includes('SOURCE_STALE')) {
          claimStatus = CLAIM_STATUS.STALE;
        } else {
          claimStatus = CLAIM_STATUS.EXECUTION_FAILED;
        }
        failureReasons.push(promotion.reason);
      }
    }

    claimStates[claim.id] = {
      claim_id: claim.id,
      statement: claim.statement,
      status: claimStatus,
      evidence_ids: promotedEvidenceIds,
      certifying: claimStatus === CLAIM_STATUS.VERIFIED,
      failure_reasons: failureReasons,
    };
  }

  return claimStates;
}

// ─── Skill Certification Evaluation (Sections 7-8) ──────────────────────────
function evaluateSkillCertification(skillName, claims, claimStates, options = {}) {
  const isReferenceOnly =
    skillName.includes('principles') ||
    skillName === 'apple-design' ||
    skillName === 'database-design' ||
    skillName === 'frontend-design' ||
    skillName === 'system-design-pro';

  if (isReferenceOnly) {
    return {
      skill_id: skillName,
      status: CERTIFICATION_LEVELS.UNPROVABLE,
      structural_certified: true,
      behavioral_certified: false,
      coverage: 0,
      claims_summary: {
        total: claims.length,
        verified: 0,
        failed: 0,
        stale: 0,
        unprovable: claims.length,
      },
      reason: 'Reference-only skill is excluded from behavioral certification (STD-100 invariant)',
    };
  }

  const applicableClaims = claims.filter(c => c.testability !== 'UNTESTABLE');

  if (applicableClaims.length === 0) {
    return {
      skill_id: skillName,
      status: CERTIFICATION_LEVELS.UNPROVABLE,
      structural_certified: true,
      behavioral_certified: false,
      coverage: 0,
      claims_summary: {
        total: claims.length,
        verified: 0,
        failed: 0,
        stale: 0,
        unprovable: claims.length,
      },
      reason: 'Zero applicable testable claims',
    };
  }

  let verifiedCount = 0;
  let failedCount = 0;
  let staleCount = 0;
  let unprovableCount = 0;

  for (const claim of applicableClaims) {
    const cs = claimStates[claim.id];
    if (!cs) {
      unprovableCount++;
      continue;
    }

    if (cs.status === CLAIM_STATUS.VERIFIED) verifiedCount++;
    else if (cs.status === CLAIM_STATUS.EXECUTION_FAILED || cs.status === CLAIM_STATUS.TEST_REJECTED) failedCount++;
    else if (cs.status === CLAIM_STATUS.STALE) staleCount++;
    else unprovableCount++;
  }

  const coverage = Math.round((verifiedCount / applicableClaims.length) * 100);

  let status = CERTIFICATION_LEVELS.PARTIAL;

  if (verifiedCount === 0) {
    status = CERTIFICATION_LEVELS.UNPROVABLE;
  } else if (coverage >= 95 && failedCount === 0 && staleCount === 0) {
    status = CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED;
  } else if (coverage >= 75 && failedCount === 0 && staleCount === 0) {
    status = CERTIFICATION_LEVELS.HIGH_CONFIDENCE;
  } else {
    status = CERTIFICATION_LEVELS.PARTIAL;
  }

  return {
    skill_id: skillName,
    status,
    structural_certified: true,
    behavioral_certified: status === CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED,
    coverage,
    claims_summary: {
      total: applicableClaims.length,
      verified: verifiedCount,
      failed: failedCount,
      stale: staleCount,
      unprovable: unprovableCount,
    },
  };
}

// ─── Certification Diff & Regression Detection (Sections 19-20) ─────────────
function compareCertificationSnapshots(previousSnapshot, currentSnapshot) {
  const diff = {
    timestamp: new Date().toISOString(),
    NEWLY_CERTIFIED: [],
    UPGRADED: [],
    UNCHANGED: [],
    DEGRADED: [],
    REVOKED: [],
    STALE: [],
    NEW_FAILURE: [],
  };

  const regressions = [];

  const prevSkills = previousSnapshot?.skills || {};
  const currSkills = currentSnapshot?.skills || {};

  const rank = {
    [CERTIFICATION_LEVELS.UNPROVABLE]: 0,
    [CERTIFICATION_LEVELS.STRUCTURAL_ONLY]: 1,
    [CERTIFICATION_LEVELS.PARTIAL]: 2,
    [CERTIFICATION_LEVELS.HIGH_CONFIDENCE]: 3,
    [CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED]: 4,
  };

  for (const [skillId, currentProfile] of Object.entries(currSkills)) {
    const prevProfile = prevSkills[skillId];

    if (!prevProfile) {
      if (currentProfile.status === CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED) {
        diff.NEWLY_CERTIFIED.push(skillId);
      } else {
        diff.UNCHANGED.push(skillId);
      }
      continue;
    }

    const prevRank = rank[prevProfile.status] ?? 0;
    const currRank = rank[currentProfile.status] ?? 0;

    if (currentProfile.status === 'REVOKED') {
      diff.REVOKED.push(skillId);
      regressions.push({
        skill: skillId,
        previous_state: prevProfile.status,
        current_state: 'REVOKED',
        cause: currentProfile.reason || 'Certification revoked',
        timestamp: new Date().toISOString(),
      });
    } else if (currentProfile.status === 'STALE') {
      diff.STALE.push(skillId);
      regressions.push({
        skill: skillId,
        previous_state: prevProfile.status,
        current_state: 'STALE',
        cause: 'Source hash changed after certification',
        timestamp: new Date().toISOString(),
      });
    } else if (currRank > prevRank) {
      if (currentProfile.status === CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED) {
        diff.NEWLY_CERTIFIED.push(skillId);
      } else {
        diff.UPGRADED.push(skillId);
      }
    } else if (currRank < prevRank) {
      diff.DEGRADED.push(skillId);
      regressions.push({
        skill: skillId,
        previous_state: prevProfile.status,
        current_state: currentProfile.status,
        cause: 'Coverage or repeatability degradation',
        timestamp: new Date().toISOString(),
      });
    } else {
      diff.UNCHANGED.push(skillId);
    }
  }

  return { diff, regressions };
}

module.exports = {
  EVIDENCE_TRUST_LEVELS,
  CLAIM_STATUS,
  CERTIFICATION_LEVELS,
  REPEATABILITY,
  LEDGER_PATH,
  appendLedgerEvent,
  readLedgerEvents,
  checkSourceFreshness,
  promoteEvidence,
  revokeCertification,
  evaluateClaimStates,
  evaluateSkillCertification,
  compareCertificationSnapshots,
};
