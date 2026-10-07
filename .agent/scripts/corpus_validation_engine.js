'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const certEngine = require('./skill_certification_engine');

// ─── Section 19: Evidence Lineage Validation ──────────────────────────────────
function validateEvidenceLineage(evidenceRecord, testSpec, reviewPkg = null, execResult = null) {
  if (!evidenceRecord || !testSpec) {
    return {
      valid: false,
      reason: 'BROKEN_LINEAGE: Missing required lineage artifacts (evidence, testSpec)',
    };
  }

  // 1. Identifier linkage
  if (evidenceRecord.test_id !== testSpec.id && evidenceRecord.test_id !== testSpec.test_id) {
    return {
      valid: false,
      reason: `BROKEN_LINEAGE: test_id mismatch (${evidenceRecord.test_id} !== ${testSpec.id || testSpec.test_id})`,
    };
  }

  const claimId = testSpec.claim?.id || testSpec.claim_id;
  if (evidenceRecord.claim_id !== claimId) {
    return {
      valid: false,
      reason: `BROKEN_LINEAGE: claim_id mismatch (${evidenceRecord.claim_id} !== ${claimId})`,
    };
  }

  if (evidenceRecord.skill_id !== testSpec.skill_id) {
    return {
      valid: false,
      reason: `BROKEN_LINEAGE: skill_id mismatch (${evidenceRecord.skill_id} !== ${testSpec.skill_id})`,
    };
  }

  // 2. Reviewer linkage
  if (reviewPkg && evidenceRecord.reviewer !== reviewPkg.reviewer) {
    return {
      valid: false,
      reason: `BROKEN_LINEAGE: reviewer mismatch (${evidenceRecord.reviewer} !== ${reviewPkg.reviewer})`,
    };
  }

  // 3. Execution hash linkage
  if (execResult && execResult.evidence?.hash && evidenceRecord.execution_hash !== execResult.evidence.hash) {
    return {
      valid: false,
      reason: `BROKEN_LINEAGE: execution_hash mismatch (${evidenceRecord.execution_hash} !== ${execResult.evidence.hash})`,
    };
  }

  // 4. Trust level conformance
  if (!['E2', 'E5'].includes(evidenceRecord.trust_level)) {
    return {
      valid: false,
      reason: `INVALID_TRUST_LEVEL: Unexpected trust level '${evidenceRecord.trust_level}'`,
    };
  }

  return { valid: true };
}

// ─── Section 18: Cross-Wave Duplicate Claim Detection ─────────────────────────
function detectDuplicateClaims(existingClaims = [], candidateClaim) {
  if (!candidateClaim) return { duplicate: false };

  for (const existing of existingClaims) {
    // 1. Identical skill + claim ID
    if (existing.skill_id === candidateClaim.skill_id && existing.id === candidateClaim.id) {
      return {
        duplicate: true,
        code: 'DUPLICATE_CLAIM_ID',
        reason: `Duplicate claim ID '${candidateClaim.id}' already exists in wave registry for ${candidateClaim.skill_id}`,
      };
    }

    // 2. Identical skill + identical statement
    if (
      existing.skill_id === candidateClaim.skill_id &&
      existing.statement?.trim().toLowerCase() === candidateClaim.statement?.trim().toLowerCase()
    ) {
      return {
        duplicate: true,
        code: 'DUPLICATE_CLAIM_STATEMENT',
        reason: `Equivalent claim statement '${candidateClaim.statement}' already tested for ${candidateClaim.skill_id}`,
      };
    }

    // 3. Duplicate source & field expectation
    if (
      existing.skill_id === candidateClaim.skill_id &&
      existing.source === candidateClaim.source &&
      existing.field &&
      existing.field === candidateClaim.field &&
      existing.type === candidateClaim.type
    ) {
      return {
        duplicate: true,
        code: 'DUPLICATE_SOURCE_EXPECTATION',
        reason: `Claim targeting source '${candidateClaim.source}' field '${candidateClaim.field}' already registered`,
      };
    }
  }

  return { duplicate: false };
}

// ─── Section 20: Cross-Wave Source Freshness Check ───────────────────────────
function checkCrossWaveSourceFreshness(evidenceList = [], agentDir) {
  const rootAgentDir = agentDir || path.resolve(__dirname, '..');
  const staleRecords = [];

  for (const ev of evidenceList) {
    const skillFile = path.join(rootAgentDir, 'skills', ev.skill_id, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      staleRecords.push({
        evidence_id: ev.evidence_id,
        skill_id: ev.skill_id,
        reason: 'SOURCE_NOT_FOUND',
      });
      continue;
    }

    const currentContent = fs.readFileSync(skillFile, 'utf8');
    const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
    const recordedHash = ev.source_freshness?.source_hash;

    if (recordedHash && recordedHash !== currentHash) {
      staleRecords.push({
        evidence_id: ev.evidence_id,
        skill_id: ev.skill_id,
        recorded_hash: recordedHash,
        current_hash: currentHash,
        reason: 'SOURCE_HASH_MUTATION',
      });
    }
  }

  return {
    fresh: staleRecords.length === 0,
    stale_count: staleRecords.length,
    stale_records: staleRecords,
  };
}

// ─── Section 21: Certification Consistency Check ─────────────────────────────
function validateCertificationConsistency(skillId, applicableClaims = [], claimStates = {}, skillCert = {}) {
  const verifiedCount = Object.values(claimStates).filter(
    cs => cs.status === certEngine.CLAIM_STATUS.VERIFIED
  ).length;

  const failedCount = Object.values(claimStates).filter(
    cs =>
      cs.status === certEngine.CLAIM_STATUS.EXECUTION_FAILED ||
      cs.status === certEngine.CLAIM_STATUS.TEST_REJECTED
  ).length;

  const staleCount = Object.values(claimStates).filter(
    cs => cs.status === certEngine.CLAIM_STATUS.STALE
  ).length;

  const expectedCoverage =
    applicableClaims.length > 0 ? Math.round((verifiedCount / applicableClaims.length) * 100) : 0;

  const actualCoverage = skillCert.coverage !== undefined ? skillCert.coverage : skillCert.coverage_percentage;

  // 1. Coverage consistency
  if (actualCoverage !== expectedCoverage) {
    return {
      consistent: false,
      code: 'COVERAGE_MISMATCH',
      reason: `Calculated coverage (${expectedCoverage}%) does not match recorded coverage (${actualCoverage}%) for ${skillId}`,
      inconsistencies: [
        {
          type: 'COVERAGE_PERCENTAGE_MISMATCH',
          expected: expectedCoverage,
          actual: actualCoverage,
        },
      ],
    };
  }

  // 2. Status mapping consistency
  let expectedStatus = certEngine.CERTIFICATION_LEVELS.PARTIAL;
  if (verifiedCount === 0) {
    expectedStatus = certEngine.CERTIFICATION_LEVELS.UNPROVABLE;
  } else if (expectedCoverage >= 95 && failedCount === 0 && staleCount === 0) {
    expectedStatus = certEngine.CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED;
  } else if (expectedCoverage >= 75 && failedCount === 0 && staleCount === 0) {
    expectedStatus = certEngine.CERTIFICATION_LEVELS.HIGH_CONFIDENCE;
  } else {
    expectedStatus = certEngine.CERTIFICATION_LEVELS.PARTIAL;
  }

  const actualStatus = skillCert.status || skillCert.certification_status;
  if (actualStatus !== expectedStatus) {
    return {
      consistent: false,
      code: 'STATUS_MISMATCH',
      reason: `Expected certification status '${expectedStatus}' but found '${actualStatus}' for ${skillId}`,
      inconsistencies: [
        {
          type: 'STATUS_MISMATCH',
          expected: expectedStatus,
          actual: actualStatus,
        },
      ],
    };
  }

  return { consistent: true, inconsistencies: [] };
}

// ─── Section 22: Cross-Wave Regression Detection ─────────────────────────────
function detectCrossWaveRegression(baselineSnapshot, currentSnapshot) {
  const normBase = { ...baselineSnapshot, skills: {} };
  const normCurr = { ...currentSnapshot, skills: {} };

  for (const [k, v] of Object.entries(baselineSnapshot?.skills || {})) {
    normBase.skills[k] = { ...v, status: v.status || v.certification_status };
  }
  for (const [k, v] of Object.entries(currentSnapshot?.skills || {})) {
    normCurr.skills[k] = { ...v, status: v.status || v.certification_status };
  }

  const result = certEngine.compareCertificationSnapshots(normBase, normCurr);

  const regressed =
    result.regressions.length > 0 ||
    result.diff.DEGRADED.length > 0 ||
    result.diff.REVOKED.length > 0;

  const regressions = result.regressions.map(r => ({
    ...r,
    skill_id: r.skill || r.skill_id,
    type: r.current_state === 'PARTIAL' ? 'DOWNGRADE_TO_PARTIAL' : (r.current_state === 'STALE' ? 'STALE' : 'DEGRADATION'),
  }));

  return {
    regressed,
    regressions,
    regressions_detected: regressions.length,
    degraded: result.diff.DEGRADED,
    revoked: result.diff.REVOKED,
    upgraded: result.diff.UPGRADED,
    newly_certified: result.diff.NEWLY_CERTIFIED,
  };
}

// ─── Section 5: Wave Gate Validator ──────────────────────────────────────────
function validateWave(waveData, previousSnapshot, options = {}) {
  const errors = [];
  const warnings = [];

  // 1. Lineage check
  if (waveData.lineageRecords) {
    for (const record of waveData.lineageRecords) {
      const lineage = validateEvidenceLineage(
        record.evidence,
        record.testSpec,
        record.reviewPkg,
        record.execResult
      );
      if (!lineage.valid) {
        errors.push(`LINEAGE_ERROR [${record.evidence?.evidence_id}]: ${lineage.reason}`);
      }
    }
  }

  // 2. Source freshness check
  if (waveData.promotedEvidence) {
    const freshness = checkCrossWaveSourceFreshness(waveData.promotedEvidence, options.agentDir);
    if (!freshness.fresh) {
      errors.push(`STALE_EVIDENCE_ERROR: ${freshness.stale_count} evidence records have stale source hashes`);
    }
  }

  // 3. Cross-wave regression check
  let regCheck = { regressed: false, regressions: [], regressions_detected: 0 };
  const currSnap = waveData.currentSnapshot || waveData.current_snapshot;
  if (previousSnapshot && currSnap) {
    regCheck = detectCrossWaveRegression(previousSnapshot, currSnap);
    if (regCheck.regressed) {
      errors.push(`REGRESSION_ERROR: Detected ${regCheck.regressions.length} regressions across wave boundary`);
    }
  }

  return {
    valid: errors.length === 0,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    wave_decision: errors.length === 0 ? 'ACCEPT' : 'REJECT',
    cross_wave_regression: regCheck,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  validateEvidenceLineage,
  detectDuplicateClaims,
  checkCrossWaveSourceFreshness,
  validateCertificationConsistency,
  detectCrossWaveRegression,
  validateWave,
};
