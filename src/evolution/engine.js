'use strict';

/**
 * evolution/engine.js — Controlled Self-Evolution Engine for Tribunal Kit
 * =======================================================================
 * System-1 Capability 4:
 * Governs the proposal-driven evolution of reviewer routing, context weights,
 * heuristics, skill idioms, and regression fixtures while strictly enforcing:
 *
 * 1. The Human Gate: No evolution can silently deploy without human approval.
 * 2. Trust Boundaries: Protected security boundaries, execution policies, and
 *    package integrity validation can NEVER automatically evolve.
 * 3. Anti-Self-Poisoning: Follows strict evidence hierarchy:
 *    VERIFIED_TEST_RESULT > DETERMINISTIC_TELEMETRY > REPRODUCIBLE_PATTERN > REVIEWER_CLAIM
 *    Proposals based solely on unverified LLM claims are rejected.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_TARGETS = new Set([
  'reviewer-routing',
  'context-weights',
  'skill-instructions',
  'reviewer-selection',
  'deterministic-heuristics',
  'known-failure-patterns',
  'workflow-guidance',
  'regression-fixtures',
]);

const FORBIDDEN_TARGETS = new Set([
  'security-boundaries',
  'shell-execution-policy',
  'package-integrity',
  'dependency-pinning',
  'human-gate',
  'system1-trust-boundary',
  'production-security',
  'arbitrary-executable-code',
]);

const EVIDENCE_HIERARCHY = {
  VERIFIED_TEST_RESULT: 4,
  DETERMINISTIC_TELEMETRY: 3,
  REPRODUCIBLE_PATTERN: 2,
  REVIEWER_CLAIM: 1,
};

/**
 * Creates and formats a new Evolution Proposal.
 */
function createEvolutionProposal({
  target,
  currentBehavior,
  observedEvidence,
  proposedChange,
  expectedEffect,
  risk = 'MEDIUM',
  testsRequired = [],
  regressionRequirements = [],
  evidenceType = 'DETERMINISTIC_TELEMETRY',
  proposalId = null,
}) {
  const id = proposalId || `EVO-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const proposal = {
    proposal_id: id,
    target,
    current_behavior: currentBehavior,
    observed_evidence: observedEvidence,
    proposed_change: proposedChange,
    expected_effect: expectedEffect,
    risk: ['LOW', 'MEDIUM', 'HIGH'].includes(String(risk).toUpperCase())
      ? String(risk).toUpperCase()
      : 'MEDIUM',
    tests_required: Array.isArray(testsRequired) ? testsRequired : [testsRequired],
    regression_requirements: Array.isArray(regressionRequirements)
      ? regressionRequirements
      : [regressionRequirements],
    evidence_type: EVIDENCE_HIERARCHY[evidenceType] ? evidenceType : 'REVIEWER_CLAIM',
    evidence_weight: EVIDENCE_HIERARCHY[evidenceType] || 1,
    status: 'PROPOSED',
    created_at: new Date().toISOString(),
    approval: null,
  };

  return proposal;
}

/**
 * Validates an evolution proposal against Anti-Self-Poisoning & Security Rules.
 */
function validateEvolutionProposal(proposal) {
  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, reason: 'Proposal must be an object.' };
  }

  // 1. Check required fields
  const requiredFields = [
    'proposal_id',
    'target',
    'current_behavior',
    'observed_evidence',
    'proposed_change',
    'expected_effect',
    'risk',
    'tests_required',
    'regression_requirements',
  ];

  for (const field of requiredFields) {
    if (!proposal[field] || (Array.isArray(proposal[field]) && proposal[field].length === 0)) {
      return {
        valid: false,
        reason: `Missing required proposal field: "${field}". Every proposal must be backed by evidence.`,
      };
    }
  }

  // 2. Security boundary enforcement: Forbidden targets cannot evolve automatically
  if (FORBIDDEN_TARGETS.has(proposal.target)) {
    return {
      valid: false,
      reason: `Target "${proposal.target}" is a protected security boundary. Automatic evolution of security boundaries, shell policies, and package integrity is strictly forbidden.`,
    };
  }

  // 3. Allowed target check
  if (!ALLOWED_TARGETS.has(proposal.target)) {
    return {
      valid: false,
      reason: `Target "${proposal.target}" is not an allowed evolution target. Allowed: ${Array.from(ALLOWED_TARGETS).join(', ')}`,
    };
  }

  // 4. Anti-Self-Poisoning Rule: Reject proposals backed solely by unverified claims
  const evidenceType = proposal.evidence_type || 'REVIEWER_CLAIM';
  const evidenceWeight = EVIDENCE_HIERARCHY[evidenceType] || 0;

  if (evidenceWeight <= EVIDENCE_HIERARCHY.REVIEWER_CLAIM) {
    return {
      valid: false,
      reason: `Anti-Self-Poisoning violation: Proposal relies solely on "${evidenceType}". Proposals must be backed by reproducible execution patterns, deterministic telemetry, or verified test results.`,
    };
  }

  // 5. Evidence content check
  if (
    typeof proposal.observed_evidence !== 'string' ||
    proposal.observed_evidence.trim().length < 10
  ) {
    return {
      valid: false,
      reason:
        'Observed evidence is too short or vacuous. Measurable, concrete evidence is required.',
    };
  }

  return { valid: true, reason: 'Proposal meets all verification and safety criteria.' };
}

/**
 * Storage helpers for proposal persistence.
 */
function getProposalsDir(agentDir = path.join(process.cwd(), '.agent')) {
  return path.join(agentDir, 'evolution', 'proposals');
}

function findDuplicateProposal(proposal, agentDir) {
  const existingProposals = loadEvolutionProposals(agentDir);
  return (
    existingProposals.find(
      p =>
        p.target === proposal.target &&
        (p.proposed_change === proposal.proposed_change ||
          JSON.stringify(p.proposed_change) === JSON.stringify(proposal.proposed_change)) &&
        p.status !== 'REJECTED',
    ) || null
  );
}

function saveEvolutionProposal(proposal, agentDir, options = {}) {
  const validation = validateEvolutionProposal(proposal);
  if (!validation.valid) {
    throw new Error(`Cannot save invalid evolution proposal: ${validation.reason}`);
  }

  const dir = getProposalsDir(agentDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Phase 5 Case D: Duplicate proposal detection
  const duplicate = findDuplicateProposal(proposal, agentDir);
  if (duplicate) {
    if (options.throwOnDuplicate !== false) {
      const err = new Error(
        `Duplicate evolution proposal detected: matches existing proposal ${duplicate.proposal_id}`,
      );
      err.code = 'DUPLICATE_PROPOSAL';
      err.duplicate = true;
      err.existing_proposal_id = duplicate.proposal_id;
      throw err;
    }
    return {
      saved: false,
      duplicate: true,
      existing_proposal_id: duplicate.proposal_id,
      filePath: path.join(dir, `${duplicate.proposal_id}.json`),
      message: `Duplicate proposal detected: matches existing proposal ${duplicate.proposal_id}`,
    };
  }

  const filePath = path.join(dir, `${proposal.proposal_id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf8');
  return filePath;
}

function loadEvolutionProposals(agentDir) {
  const dir = getProposalsDir(agentDir);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const proposals = [];

  for (const f of files) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      proposals.push(p);
    } catch (_) {}
  }

  return proposals;
}

/**
 * Human Gate: Explicitly approve an evolution proposal.
 */
function approveEvolutionProposal(proposalId, approverName, agentDir) {
  if (!approverName || typeof approverName !== 'string') {
    throw new Error('Human approval requires an explicit approver name/signature.');
  }

  const dir = getProposalsDir(agentDir);
  const filePath = path.join(dir, `${proposalId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Evolution proposal not found: ${proposalId}`);
  }

  const proposal = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  proposal.status = 'APPROVED';
  proposal.approval = {
    approved_by: approverName,
    approved_at: new Date().toISOString(),
    human_gate_cleared: true,
  };

  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf8');
  return proposal;
}

/**
 * Reject an evolution proposal.
 */
function rejectEvolutionProposal(proposalId, reason, agentDir) {
  const dir = getProposalsDir(agentDir);
  const filePath = path.join(dir, `${proposalId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Evolution proposal not found: ${proposalId}`);
  }

  const proposal = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  proposal.status = 'REJECTED';
  proposal.rejection = {
    reason: reason || 'Rejected by developer',
    rejected_at: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(proposal, null, 2), 'utf8');
  return proposal;
}

module.exports = {
  createEvolutionProposal,
  validateEvolutionProposal,
  saveEvolutionProposal,
  findDuplicateProposal,
  loadEvolutionProposals,
  approveEvolutionProposal,
  rejectEvolutionProposal,
  ALLOWED_TARGETS,
  FORBIDDEN_TARGETS,
  EVIDENCE_HIERARCHY,
};
