'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TERMINAL_STATES = {
  BEHAVIORALLY_CERTIFIED: 'BEHAVIORALLY_CERTIFIED',
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',
  HUMAN_REQUIRED: 'HUMAN_REQUIRED',
  REFERENCE_ONLY: 'REFERENCE_ONLY',
  UNPROVABLE: 'UNPROVABLE',
};

// ─── 1. Identity Uniqueness Validations ──────────────────────────────────────
function validateSkillUniqueness(skills = []) {
  const seen = new Set();
  const duplicates = [];

  for (const s of skills) {
    const id = typeof s === 'string' ? s : s.skill_id;
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);
  }

  return {
    valid: duplicates.length === 0,
    total_skills: skills.length,
    unique_skills: seen.size,
    duplicates,
  };
}

function validateClaimUniqueness(claimRegistry = []) {
  const seenIds = new Set();
  const seenStatements = new Map();
  const duplicateIds = [];
  const duplicateStatements = [];

  for (const claim of claimRegistry) {
    if (seenIds.has(claim.claim_id)) {
      duplicateIds.push(claim.claim_id);
    }
    seenIds.add(claim.claim_id);

    const normStatement = (claim.statement || claim.claim_statement || '').trim().toLowerCase();
    if (normStatement) {
      const key = `${claim.skill_id}::${normStatement}`;
      if (seenStatements.has(key)) {
        duplicateStatements.push({ skill_id: claim.skill_id, statement: normStatement, original: seenStatements.get(key) });
      } else {
        seenStatements.set(key, claim.claim_id);
      }
    }
  }

  return {
    valid: duplicateIds.length === 0 && duplicateStatements.length === 0,
    total_claims: claimRegistry.length,
    unique_claim_ids: seenIds.size,
    duplicate_ids: duplicateIds,
    duplicate_statements: duplicateStatements,
  };
}

function validateEvidenceUniqueness(evidenceRegistry = []) {
  const seenIds = new Set();
  const seenExecutionHashes = new Map();
  const duplicateIds = [];
  const duplicateExecutions = [];

  for (const ev of evidenceRegistry) {
    if (seenIds.has(ev.evidence_id)) {
      duplicateIds.push(ev.evidence_id);
    }
    seenIds.add(ev.evidence_id);

    // Multiple different claims should not share the exact same execution hash unless idempotent re-run
    if (ev.execution_hash && ev.execution_hash !== 'NO_HASH') {
      const key = `${ev.skill_id}::${ev.claim_id}::${ev.execution_hash}`;
      if (seenExecutionHashes.has(key)) {
        duplicateExecutions.push({ evidence_id: ev.evidence_id, key });
      } else {
        seenExecutionHashes.set(key, ev.evidence_id);
      }
    }
  }

  return {
    valid: duplicateIds.length === 0 && duplicateExecutions.length === 0,
    total_evidence: evidenceRegistry.length,
    unique_evidence_ids: seenIds.size,
    duplicate_ids: duplicateIds,
    duplicate_executions: duplicateExecutions,
  };
}

// ─── 2. Evidence Lineage Graph Validation ────────────────────────────────────
function validateEvidenceLineageGraph(evidenceRegistry = [], claimRegistry = [], testRegistry = []) {
  const claimMap = new Map();
  for (const c of claimRegistry) claimMap.set(c.claim_id, c);

  const testMap = new Map();
  for (const t of testRegistry) testMap.set(t.id || t.test_id, t);

  const brokenEdges = [];

  for (const ev of evidenceRegistry) {
    // 1. Claim edge
    if (ev.claim_id && !claimMap.has(ev.claim_id)) {
      brokenEdges.push({
        evidence_id: ev.evidence_id,
        type: 'MISSING_CLAIM',
        target_id: ev.claim_id,
      });
    }

    // 2. Test edge
    if (ev.test_id && !testMap.has(ev.test_id)) {
      brokenEdges.push({
        evidence_id: ev.evidence_id,
        type: 'MISSING_TEST',
        target_id: ev.test_id,
      });
    }

    // 3. Execution hash edge
    if (!ev.execution_hash || ev.execution_hash === 'NO_HASH') {
      brokenEdges.push({
        evidence_id: ev.evidence_id,
        type: 'MISSING_EXECUTION_HASH',
      });
    }

    // 4. Source hash edge
    const srcHash = ev.source_hash || ev.source_freshness?.source_hash;
    if (!srcHash) {
      brokenEdges.push({
        evidence_id: ev.evidence_id,
        type: 'MISSING_SOURCE_HASH',
      });
    }
  }

  return {
    valid: brokenEdges.length === 0,
    total_evidence_evaluated: evidenceRegistry.length,
    broken_edges_count: brokenEdges.length,
    broken_edges: brokenEdges,
  };
}

// ─── 3. Source Freshness Validation ──────────────────────────────────────────
function validateSourceFreshness(skills = [], evidenceRegistry = [], agentDir = null) {
  const baseDir = agentDir || path.resolve(__dirname, '..', 'skills');
  const staleRecords = [];

  const sourceCache = new Map();

  for (const ev of evidenceRegistry) {
    const recordedHash = ev.source_hash || ev.source_freshness?.source_hash;
    if (!recordedHash) continue;

    let currentHash = sourceCache.get(ev.skill_id);
    if (!currentHash) {
      const skillPath = path.join(baseDir, ev.skill_id, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        currentHash = crypto.createHash('sha256').update(fs.readFileSync(skillPath, 'utf8')).digest('hex');
        sourceCache.set(ev.skill_id, currentHash);
      }
    }

    if (currentHash && currentHash !== recordedHash) {
      staleRecords.push({
        evidence_id: ev.evidence_id,
        skill_id: ev.skill_id,
        recorded_hash: recordedHash,
        current_hash: currentHash,
      });
    }
  }

  return {
    valid: staleRecords.length === 0,
    total_evaluated: evidenceRegistry.length,
    stale_count: staleRecords.length,
    stale_records: staleRecords,
  };
}

// ─── 4. Reviewer Authority & Security Gate ───────────────────────────────────
function validateReviewerAuthority(evidenceRegistry = [], reviewPackages = []) {
  const invalidReviews = [];
  const reviewMap = new Map();
  for (const r of reviewPackages) {
    reviewMap.set(r.test_id, r);
  }

  for (const ev of evidenceRegistry) {
    const isSecurity =
      ev.skill_id.includes('security') ||
      ev.skill_id.includes('red-team') ||
      ev.skill_id.includes('vulnerability') ||
      ev.skill_id.includes('audit-and-fix') ||
      ev.skill_id.includes('zero-trust');

    const reviewer = ev.reviewer || (reviewMap.get(ev.test_id)?.reviewer);

    if (!reviewer) {
      invalidReviews.push({ evidence_id: ev.evidence_id, error: 'MISSING_REVIEWER' });
      continue;
    }

    if (isSecurity) {
      if (reviewer.toLowerCase().includes('auto') || reviewer.toLowerCase().includes('bot')) {
        invalidReviews.push({ evidence_id: ev.evidence_id, reviewer, error: 'AUTOMATED_SECURITY_REVIEW' });
      }
      if (ev.trust_level !== 'E5') {
        invalidReviews.push({ evidence_id: ev.evidence_id, trust_level: ev.trust_level, error: 'SECURITY_E5_REQUIRED' });
      }
    }
  }

  return {
    valid: invalidReviews.length === 0,
    total_evaluated: evidenceRegistry.length,
    invalid_count: invalidReviews.length,
    invalid_reviews: invalidReviews,
  };
}

// ─── 5. Terminal Classification Validation ───────────────────────────────────
function validateTerminalClassifications(terminalClassifications = [], totalCorpusCount = 234) {
  const seenSkills = new Set();
  const errors = [];
  const counts = {
    BEHAVIORALLY_CERTIFIED: 0,
    HIGH_CONFIDENCE: 0,
    HUMAN_REQUIRED: 0,
    REFERENCE_ONLY: 0,
    UNPROVABLE: 0,
    PARTIAL: 0,
    UNCLASSIFIED: 0,
  };

  for (const item of terminalClassifications) {
    const skillId = item.skill_id;
    if (seenSkills.has(skillId)) {
      errors.push(`DUPLICATE_SKILL_CLASSIFICATION: ${skillId}`);
    }
    seenSkills.add(skillId);

    const state = item.terminal_state;
    if (!Object.values(TERMINAL_STATES).includes(state)) {
      if (state === 'PARTIAL') {
        counts.PARTIAL++;
        errors.push(`FORBIDDEN_PARTIAL_STATE: ${skillId} has terminal state PARTIAL`);
      } else {
        counts.UNCLASSIFIED++;
        errors.push(`INVALID_TERMINAL_STATE: ${skillId} has unknown state '${state}'`);
      }
    } else {
      counts[state]++;
    }
  }

  if (seenSkills.size !== totalCorpusCount) {
    errors.push(`CORPUS_SIZE_MISMATCH: Expected ${totalCorpusCount} classified skills, found ${seenSkills.size}`);
  }

  const valid = errors.length === 0 && counts.PARTIAL === 0 && counts.UNCLASSIFIED === 0;

  return {
    valid,
    total_skills: seenSkills.size,
    expected_total: totalCorpusCount,
    counts,
    errors,
  };
}

// ─── 6. Cross-Phase Consistency Validation ───────────────────────────────────
function validateCrossPhaseConsistency(phaseSnapshots = []) {
  const regressions = [];
  const statusHistory = new Map();

  for (const snap of phaseSnapshots) {
    const phaseName = snap.phase;
    const skills = snap.skills || {};

    for (const [skillId, profile] of Object.entries(skills)) {
      const history = statusHistory.get(skillId) || [];
      const prevStatus = history.length > 0 ? history[history.length - 1].status : null;
      const currentStatus = profile.status || profile.certification_status;

      if (prevStatus === 'BEHAVIORALLY_CERTIFIED' && currentStatus !== 'BEHAVIORALLY_CERTIFIED') {
        regressions.push({
          skill_id: skillId,
          from_phase: history[history.length - 1].phase,
          to_phase: phaseName,
          previous: prevStatus,
          current: currentStatus,
          type: 'DOWNGRADE_FROM_CERTIFIED',
        });
      }

      if (prevStatus === 'HIGH_CONFIDENCE' && currentStatus === 'PARTIAL') {
        regressions.push({
          skill_id: skillId,
          from_phase: history[history.length - 1].phase,
          to_phase: phaseName,
          previous: prevStatus,
          current: currentStatus,
          type: 'DOWNGRADE_FROM_HIGH_CONFIDENCE',
        });
      }

      history.push({ phase: phaseName, status: currentStatus });
      statusHistory.set(skillId, history);
    }
  }

  return {
    valid: regressions.length === 0,
    regressions_count: regressions.length,
    regressions,
  };
}

// ─── 7. Full Corpus Validation Suite ──────────────────────────────────────────
function runFullCorpusValidation(corpusData = {}, options = {}) {
  const {
    skills = [],
    claimRegistry = [],
    evidenceRegistry = [],
    testRegistry = [],
    terminalClassifications = [],
    reviewPackages = [],
    phaseSnapshots = [],
    totalCorpusCount = 234,
  } = corpusData;

  const skillUnique = validateSkillUniqueness(skills);
  const claimUnique = validateClaimUniqueness(claimRegistry);
  const evidenceUnique = validateEvidenceUniqueness(evidenceRegistry);
  const lineage = validateEvidenceLineageGraph(evidenceRegistry, claimRegistry, testRegistry);
  const freshness = validateSourceFreshness(skills, evidenceRegistry, options.agentDir);
  const reviewerAuth = validateReviewerAuthority(evidenceRegistry, reviewPackages);
  const terminals = validateTerminalClassifications(terminalClassifications, totalCorpusCount);
  const crossPhase = validateCrossPhaseConsistency(phaseSnapshots);

  const allChecks = [
    skillUnique.valid,
    claimUnique.valid,
    evidenceUnique.valid,
    lineage.valid,
    freshness.valid,
    reviewerAuth.valid,
    terminals.valid,
    crossPhase.valid,
  ];

  const valid = allChecks.every(Boolean);

  return {
    valid,
    status: valid ? 'PASS' : 'FAIL',
    timestamp: new Date().toISOString(),
    metrics: {
      total_skills: skillUnique.total_skills,
      unique_skills: skillUnique.unique_skills,
      total_claims: claimUnique.total_claims,
      total_evidence: evidenceUnique.total_evidence,
      terminal_counts: terminals.counts,
      stale_evidence: freshness.stale_count,
      broken_lineage_edges: lineage.broken_edges_count,
      cross_phase_regressions: crossPhase.regressions_count,
    },
    results: {
      skill_uniqueness: skillUnique,
      claim_uniqueness: claimUnique,
      evidence_uniqueness: evidenceUnique,
      lineage_graph: lineage,
      source_freshness: freshness,
      reviewer_authority: reviewerAuth,
      terminal_classifications: terminals,
      cross_phase_consistency: crossPhase,
    },
  };
}

module.exports = {
  TERMINAL_STATES,
  validateSkillUniqueness,
  validateClaimUniqueness,
  validateEvidenceUniqueness,
  validateEvidenceLineageGraph,
  validateSourceFreshness,
  validateReviewerAuthority,
  validateTerminalClassifications,
  validateCrossPhaseConsistency,
  runFullCorpusValidation,
};
