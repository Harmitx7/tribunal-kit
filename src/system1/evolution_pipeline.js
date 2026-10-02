'use strict';

/**
 * evolution_pipeline.js — System-1 Capability 4: Controlled Self-Evolution Pipeline
 * =================================================================================
 * Governs candidate generation, regression validation, adversarial testing,
 * candidate scoring, Human Gate approval, promotion, and clean rollback.
 *
 * CRITICAL RULE:
 * Self-evolution MUST NEVER directly modify production rules.
 * The system generates and evaluates candidate routing / heuristic improvements only.
 *
 * Pipeline Lifecycle:
 * Observed Outcome -> Learning Signal -> Candidate Rule ->
 * Validation Against Regression Corpus -> Adversarial Tests ->
 * Candidate Score -> Human Approval -> Promotion -> (Optional Rollback)
 *
 * Candidate States:
 * - PROPOSED
 * - VALIDATING
 * - REJECTED
 * - APPROVED
 * - PROMOTED
 * - ROLLED_BACK
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  validateEvolutionProposal,
  ALLOWED_TARGETS,
  FORBIDDEN_TARGETS,
  EVIDENCE_HIERARCHY,
} = require('../evolution/engine');

const VALID_SOURCES = new Set([
  'SYSTEM1_CLASSIFICATION',
  'REVIEWER_FINDING',
  'INNER_LOOP',
  'HUMAN_GATE',
  'FP_CORRECTION',
  'FN_CORRECTION',
  'TEST_RUNNER',
]);

const CANDIDATE_STATES = new Set([
  'PROPOSED',
  'VALIDATING',
  'REJECTED',
  'APPROVED',
  'PROMOTED',
  'ROLLED_BACK',
]);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function validateCandidateId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      `Invalid candidate ID "${id}". ID must contain only alphanumeric characters, underscores, and dashes.`,
    );
  }
}

function writeFileSyncAtomic(filePath, data, encoding = 'utf8') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`,
  );
  fs.writeFileSync(tmpPath, data, encoding);
  fs.renameSync(tmpPath, filePath);
}

function getEvolutionDir(agentDir = path.join(process.cwd(), '.agent')) {
  return path.join(agentDir, 'evolution');
}

function acquireEvolutionLock(agentDir) {
  const lockPath = path.join(getEvolutionDir(agentDir), 'evolution.lock');
  const dir = path.dirname(lockPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      const waitBuf = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(waitBuf, 0, 0, 30);
    }
  }
  // Check for stale lock (> 15000ms old)
  try {
    const stats = fs.statSync(lockPath);
    if (Date.now() - stats.mtimeMs > 15000) {
      fs.unlinkSync(lockPath);
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return lockPath;
    }
  } catch (_) {}
  throw new Error('Could not acquire concurrency lock for evolution pipeline');
}

function releaseEvolutionLock(lockPath) {
  try {
    if (lockPath && fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (_) {}
}

function getCandidatesDir(agentDir) {
  return path.join(getEvolutionDir(agentDir), 'candidates');
}

function getRollbacksDir(agentDir) {
  return path.join(getEvolutionDir(agentDir), 'rollbacks');
}

function getActiveEvolutionsPath(agentDir) {
  return path.join(getEvolutionDir(agentDir), 'active_evolutions.json');
}

/**
 * Ingests a verified outcome and produces a candidate proposal
 * @param {Object} outcome
 * @param {string} outcome.source - Verified source origin
 * @param {string} outcome.target - Allowed evolution target
 * @param {string} outcome.current_behavior
 * @param {string} outcome.proposed_change
 * @param {string} outcome.evidence - Concrete supporting evidence
 * @param {string} [outcome.evidence_type] - Hierarchy level
 * @param {string} [outcome.risk]
 * @param {Object} [outcome.previous_state] - For rollback
 * @param {string} [candidateId] - Optional explicit ID
 * @returns {Object} Candidate object
 */
function createCandidateFromOutcome(outcome = {}, candidateId = null) {
  if (candidateId) {
    validateCandidateId(candidateId);
  }

  // 1. Verify Outcome Source (reject raw LLM speculation or arbitrary text)
  if (!outcome.source || !VALID_SOURCES.has(outcome.source)) {
    throw new Error(
      `Invalid learning source "${outcome.source}". Self-evolution strictly rejects unverified speculation. Allowed sources: ${Array.from(VALID_SOURCES).join(', ')}`,
    );
  }

  // 2. Reject forbidden targets immediately
  if (outcome.target && FORBIDDEN_TARGETS.has(outcome.target)) {
    throw new Error(
      `Target "${outcome.target}" is a protected security boundary. Automatic evolution is strictly prohibited.`,
    );
  }

  if (!outcome.target || !ALLOWED_TARGETS.has(outcome.target)) {
    throw new Error(
      `Target "${outcome.target}" is not an allowed evolution target. Allowed: ${Array.from(ALLOWED_TARGETS).join(', ')}`,
    );
  }

  // 3. Evidence quality check (Anti-Self-Poisoning)
  const evidenceType = outcome.evidence_type || 'DETERMINISTIC_TELEMETRY';
  const evidenceWeight = EVIDENCE_HIERARCHY[evidenceType] || 0;
  if (evidenceWeight <= EVIDENCE_HIERARCHY.REVIEWER_CLAIM) {
    throw new Error(
      `Anti-Self-Poisoning violation: Learning signal relies on "${evidenceType}". Only verified outcomes, telemetry, and reproducible patterns can generate candidates.`,
    );
  }

  const id = candidateId || `EVO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const candidate = {
    candidate_id: id,
    source: outcome.source,
    target: outcome.target,
    observed_behavior: outcome.current_behavior || outcome.observed_behavior || '',
    proposed_change: outcome.proposed_change,
    supporting_evidence: outcome.evidence || outcome.supporting_evidence || '',
    evidence_type: evidenceType,
    evidence_weight: evidenceWeight,
    risk: ['LOW', 'MEDIUM', 'HIGH'].includes(String(outcome.risk).toUpperCase())
      ? String(outcome.risk).toUpperCase()
      : 'MEDIUM',
    tests_passed: [],
    tests_failed: [],
    candidate_score: 0.0,
    confidence: evidenceType === 'VERIFIED_TEST_RESULT' ? 'L1' : 'L2',
    status: 'PROPOSED',
    created_at: new Date().toISOString(),
    approval: null,
    rollback_data: {
      previous_state: outcome.previous_state ?? null,
      target: outcome.target,
    },
  };

  const validation = validateEvolutionProposal({
    proposal_id: candidate.candidate_id,
    target: candidate.target,
    current_behavior: candidate.observed_behavior,
    observed_evidence: candidate.supporting_evidence,
    proposed_change:
      typeof candidate.proposed_change === 'string'
        ? candidate.proposed_change
        : JSON.stringify(candidate.proposed_change),
    expected_effect: 'Optimized routing / heuristic accuracy backed by verified outcome',
    risk: candidate.risk,
    tests_required: ['regression_suite'],
    regression_requirements: ['no_security_downgrades'],
    evidence_type: candidate.evidence_type,
  });

  if (!validation.valid) {
    throw new Error(`Candidate proposal failed contract validation: ${validation.reason}`);
  }

  return candidate;
}

/**
 * Validates candidate against regression corpus and adversarial test fixtures
 * @param {Object} candidate
 * @param {Array<{ name: string, run: Function, isAdversarial?: boolean }>} testSuite
 * @returns {Promise<Object>} Validation results with candidate score
 */
async function validateCandidateAgainstCorpus(candidate, testSuite = []) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Invalid candidate provided for validation');
  }

  if (candidate.status === 'PROMOTED' || candidate.status === 'ROLLED_BACK') {
    throw new Error(
      `Cannot validate candidate ${candidate.candidate_id} with status "${candidate.status}". Already promoted or rolled back candidates cannot be re-validated.`,
    );
  }

  candidate.status = 'VALIDATING';
  const passed = [];
  const failed = [];

  for (const testCase of testSuite) {
    const testName = testCase.name || 'unnamed-test';
    try {
      const result = await testCase.run(candidate);
      if (result === true || (result && result.passed)) {
        passed.push(testName);
      } else {
        failed.push({
          name: testName,
          reason: result?.reason || 'Test assertion failed',
          isAdversarial: !!testCase.isAdversarial,
        });
      }
    } catch (err) {
      failed.push({
        name: testName,
        reason: err.message,
        isAdversarial: !!testCase.isAdversarial,
      });
    }
  }

  candidate.tests_passed = passed;
  candidate.tests_failed = failed.map(f => f.name);

  const total = passed.length + failed.length;
  const passRatio = total > 0 ? passed.length / total : 0;
  candidate.candidate_score = parseFloat(passRatio.toFixed(3));

  // If any test failed, reject candidate
  if (failed.length > 0) {
    candidate.status = 'REJECTED';
    candidate.rejection = {
      reason: `Regression validation failed on ${failed.length} test(s): ${failed.map(f => f.name).join(', ')}`,
      rejected_at: new Date().toISOString(),
      failures: failed,
    };
  } else {
    // Passed all tests -> ready for Human Gate
    candidate.status = 'VALIDATING'; // Remains in validating until human approves
  }

  return {
    valid: failed.length === 0,
    candidate_score: candidate.candidate_score,
    passed_count: passed.length,
    failed_count: failed.length,
    candidate,
  };
}

/**
 * Human Gate: Explicitly approves a validated candidate
 * @param {Object} candidate
 * @param {string} approverName
 * @param {string} [agentDir]
 * @returns {Object} Approved candidate
 */
function approveCandidate(candidate, approverName, agentDir) {
  if (!approverName || typeof approverName !== 'string') {
    throw new Error('Human approval requires an explicit approver name/signature.');
  }

  if (candidate.status === 'REJECTED') {
    throw new Error(
      `Cannot approve candidate ${candidate.candidate_id}: candidate was rejected during validation.`,
    );
  }

  if (candidate.status !== 'VALIDATING' && candidate.status !== 'VALIDATED') {
    throw new Error(
      `Cannot approve candidate ${candidate.candidate_id} with status "${candidate.status}". Candidate must undergo regression corpus validation before Human Gate approval.`,
    );
  }

  if (candidate.tests_failed && candidate.tests_failed.length > 0) {
    throw new Error(
      `Cannot approve candidate ${candidate.candidate_id}: failing regression tests exist.`,
    );
  }

  if (
    !candidate.target ||
    !ALLOWED_TARGETS.has(candidate.target) ||
    FORBIDDEN_TARGETS.has(candidate.target)
  ) {
    throw new Error(
      `Target "${candidate.target}" is a protected or invalid evolution target. Human Gate approval rejected.`,
    );
  }

  candidate.status = 'APPROVED';
  candidate.approval = {
    approved_by: approverName,
    approved_at: new Date().toISOString(),
    human_gate_cleared: true,
  };

  if (agentDir) {
    saveCandidate(candidate, agentDir);
  }

  return candidate;
}

/**
 * Promotes an APPROVED candidate into active evolutions
 * @param {Object} candidate
 * @param {string} [agentDir]
 * @returns {Object} Promotion summary
 */
function promoteCandidate(candidate, agentDir = path.join(process.cwd(), '.agent')) {
  if (candidate.status !== 'APPROVED') {
    throw new Error(
      `Cannot promote candidate ${candidate.candidate_id} with status "${candidate.status}". Only APPROVED candidates that cleared the Human Gate can be promoted.`,
    );
  }

  validateCandidateId(candidate.candidate_id);
  if (FORBIDDEN_KEYS.has(candidate.target)) {
    throw new Error(`Dangerous target key "${candidate.target}" rejected.`);
  }
  if (
    !candidate.target ||
    !ALLOWED_TARGETS.has(candidate.target) ||
    FORBIDDEN_TARGETS.has(candidate.target)
  ) {
    throw new Error(
      `Target "${candidate.target}" is a protected or invalid evolution target. Promotion rejected.`,
    );
  }

  const rollbacksDir = getRollbacksDir(agentDir);
  const activePath = getActiveEvolutionsPath(agentDir);
  if (!fs.existsSync(rollbacksDir)) fs.mkdirSync(rollbacksDir, { recursive: true });

  const lock = acquireEvolutionLock(agentDir);
  try {
    // 1. Read existing active evolutions
    let active = {};
    if (fs.existsSync(activePath)) {
      try {
        active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      } catch (_) {
        active = {};
      }
    }

    // 2. Save rollback snapshot
    const rollbackSnapshot = {
      candidate_id: candidate.candidate_id,
      target: candidate.target,
      previous_state: active[candidate.target] ?? candidate.rollback_data?.previous_state ?? null,
      promoted_at: new Date().toISOString(),
    };
    writeFileSyncAtomic(
      path.join(rollbacksDir, `${candidate.candidate_id}.rollback.json`),
      JSON.stringify(rollbackSnapshot, null, 2),
      'utf8',
    );

    // 3. Promote candidate
    active[candidate.target] = {
      candidate_id: candidate.candidate_id,
      proposed_change: candidate.proposed_change,
      promoted_at: new Date().toISOString(),
      approved_by: candidate.approval?.approved_by || 'Human Gate',
    };
    writeFileSyncAtomic(activePath, JSON.stringify(active, null, 2), 'utf8');

    candidate.status = 'PROMOTED';
    candidate.promoted_at = new Date().toISOString();
    saveCandidate(candidate, agentDir);
  } finally {
    releaseEvolutionLock(lock);
  }

  return {
    promoted: true,
    candidate_id: candidate.candidate_id,
    target: candidate.target,
    rollback_available: true,
  };
}

/**
 * Rolls back a PROMOTED candidate cleanly
 * @param {string} candidateId
 * @param {string} [agentDir]
 * @returns {Object} Rollback summary
 */
function rollbackCandidate(candidateId, agentDir = path.join(process.cwd(), '.agent')) {
  validateCandidateId(candidateId);
  const rollbacksDir = getRollbacksDir(agentDir);
  const activePath = getActiveEvolutionsPath(agentDir);
  const rollbackPath = path.join(rollbacksDir, `${candidateId}.rollback.json`);

  if (!fs.existsSync(rollbackPath)) {
    throw new Error(`No rollback snapshot found for candidate "${candidateId}".`);
  }

  const snapshot = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
  if (FORBIDDEN_KEYS.has(snapshot.target)) {
    throw new Error(`Dangerous snapshot target key "${snapshot.target}" rejected.`);
  }
  if (
    !snapshot.target ||
    !ALLOWED_TARGETS.has(snapshot.target) ||
    FORBIDDEN_TARGETS.has(snapshot.target)
  ) {
    throw new Error(`Dangerous snapshot target "${snapshot.target}" rejected.`);
  }

  const lock = acquireEvolutionLock(agentDir);
  try {
    let active = {};
    if (fs.existsSync(activePath)) {
      try {
        active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      } catch (_) {
        active = {};
      }
    }

    // Verify candidate is not already rolled back and is in PROMOTED status
    const candidate = loadCandidate(candidateId, agentDir);
    if (candidate && candidate.status === 'ROLLED_BACK') {
      throw new Error(`Candidate "${candidateId}" has already been rolled back.`);
    }
    if (candidate && candidate.status !== 'PROMOTED') {
      throw new Error(
        `Cannot rollback candidate "${candidateId}" with status "${candidate.status}". Only PROMOTED candidates can be rolled back.`,
      );
    }

    // Enforce LIFO / Active Candidate check:
    // Only the candidate currently active for the target can be rolled back.
    // Rolling back an inactive or superseded candidate would corrupt newer active evolutions.
    const currentActive = active[snapshot.target];
    if (!currentActive || currentActive.candidate_id !== candidateId) {
      throw new Error(
        `Cannot rollback candidate "${candidateId}" on target "${snapshot.target}": candidate is not currently active (active candidate: "${currentActive?.candidate_id || 'none'}"). Rollback the active candidate first.`,
      );
    }

    // Restore previous state or remove if none existed
    if (snapshot.previous_state !== null && snapshot.previous_state !== undefined) {
      active[snapshot.target] = snapshot.previous_state;
    } else {
      delete active[snapshot.target];
    }
    writeFileSyncAtomic(activePath, JSON.stringify(active, null, 2), 'utf8');

    // Update candidate status to ROLLED_BACK
    if (candidate) {
      candidate.status = 'ROLLED_BACK';
      candidate.rolled_back_at = new Date().toISOString();
      saveCandidate(candidate, agentDir);
    }

    // Remove single-use snapshot to prevent replay rollback
    try {
      if (fs.existsSync(rollbackPath)) {
        fs.unlinkSync(rollbackPath);
      }
    } catch (_) {}

    return {
      rolled_back: true,
      candidate_id: candidateId,
      target: snapshot.target,
      restored_state: snapshot.previous_state,
    };
  } finally {
    releaseEvolutionLock(lock);
  }
}

/**
 * Persistence helpers
 */
function saveCandidate(candidate, agentDir = path.join(process.cwd(), '.agent')) {
  validateCandidateId(candidate.candidate_id);
  const dir = getCandidatesDir(agentDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${candidate.candidate_id}.json`);
  writeFileSyncAtomic(filePath, JSON.stringify(candidate, null, 2), 'utf8');
  return filePath;
}

function loadCandidate(candidateId, agentDir = path.join(process.cwd(), '.agent')) {
  validateCandidateId(candidateId);
  const filePath = path.join(getCandidatesDir(agentDir), `${candidateId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function loadAllCandidates(agentDir = path.join(process.cwd(), '.agent')) {
  const dir = getCandidatesDir(agentDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  saveCandidate,
  loadCandidate,
  loadAllCandidates,
  getActiveEvolutionsPath,
  acquireEvolutionLock,
  releaseEvolutionLock,
  writeFileSyncAtomic,
  VALID_SOURCES,
  CANDIDATE_STATES,
};
