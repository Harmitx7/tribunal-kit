'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  createEvolutionProposal,
  validateEvolutionProposal,
  saveEvolutionProposal,
  loadEvolutionProposals,
  approveEvolutionProposal,
  rejectEvolutionProposal,
  FORBIDDEN_TARGETS,
  EVIDENCE_HIERARCHY,
} = require('../../src/evolution/engine');

describe('Capability 4: Controlled Self-Evolution Engine', () => {
  let tmpAgentDir;

  beforeEach(() => {
    tmpAgentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-evo-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpAgentDir)) {
      fs.rmSync(tmpAgentDir, { recursive: true, force: true });
    }
  });

  test('Valid evolution proposal complies with contract schema', () => {
    const proposal = createEvolutionProposal({
      target: 'context-weights',
      currentBehavior: 'Documentation files receive weight 0.25',
      observedEvidence:
        'Telemetry showed 45% of agent prompts exceeded token budget on pure code refactors due to loading README files.',
      proposedChange:
        'Lower documentation weight from 0.25 to 0.10 when refactor task keyword is active.',
      expectedEffect: 'Reduces prompt token overhead by ~15% on code refactors.',
      risk: 'LOW',
      testsRequired: ['test/unit/context_ranking.test.js'],
      regressionRequirements: ['Ensure SECURITY.md mandatory inclusion is never affected'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    expect(proposal.proposal_id).toMatch(/^EVO-/);
    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.evidence_type).toBe('DETERMINISTIC_TELEMETRY');
    expect(proposal.evidence_weight).toBe(3);

    const validation = validateEvolutionProposal(proposal);
    expect(validation.valid).toBe(true);
  });

  test('Anti-Self-Poisoning: Rejects proposals backed solely by unverified reviewer claims', () => {
    const proposal = createEvolutionProposal({
      target: 'skill-instructions',
      currentBehavior: 'Reviewer checks SQL queries',
      observedEvidence:
        'An AI reviewer mentioned that it felt the guidelines should mention SQLite',
      proposedChange: 'Add SQLite guidelines to skill',
      expectedEffect: 'Subjective style preference',
      risk: 'LOW',
      testsRequired: ['test/unit/learn.test.js'],
      regressionRequirements: ['None'],
      evidenceType: 'REVIEWER_CLAIM', // Level 1 evidence (unverified claim)
    });

    const validation = validateEvolutionProposal(proposal);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Anti-Self-Poisoning violation');
    expect(validation.reason).toContain('relies solely on "REVIEWER_CLAIM"');
  });

  test('Trust Boundary: Strictly forbids automatic evolution of security boundaries', () => {
    const forbiddenTarget = Array.from(FORBIDDEN_TARGETS)[0]; // e.g. 'security-boundaries'

    const proposal = createEvolutionProposal({
      target: forbiddenTarget,
      currentBehavior: 'Security boundary blocks unauthorized shell calls',
      observedEvidence: 'Verified test results from 10 automated test suites',
      proposedChange: 'Relax shell policy for convenience',
      expectedEffect: 'Faster execution',
      risk: 'HIGH',
      testsRequired: ['test/unit/security_regression.test.js'],
      regressionRequirements: ['None'],
      evidenceType: 'VERIFIED_TEST_RESULT',
    });

    const validation = validateEvolutionProposal(proposal);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('protected security boundary');
  });

  test('Missing required fields or vacuous evidence is rejected', () => {
    const proposal = createEvolutionProposal({
      target: 'reviewer-routing',
      currentBehavior: 'A',
      observedEvidence: 'too short', // < 10 chars
      proposedChange: 'B',
      expectedEffect: 'C',
      testsRequired: [], // Empty tests
      regressionRequirements: [],
    });

    const validation = validateEvolutionProposal(proposal);
    expect(validation.valid).toBe(false);
  });

  test('Proposal persistence and Human Gate approval lifecycle', () => {
    const proposal = createEvolutionProposal({
      target: 'reviewer-routing',
      currentBehavior: '7 reviewers dispatched for backend tasks',
      observedEvidence:
        'Measured benchmark run showing 0 unique findings from type-safety-reviewer on pure Python diffs.',
      proposedChange: 'Route Python tasks to python-pro and skip type-safety-reviewer',
      expectedEffect: 'Saves 2,400 tokens per review cycle with 100% finding recall',
      risk: 'MEDIUM',
      testsRequired: ['test/integration/backend_intelligence.test.js'],
      regressionRequirements: ['Recall on Python security test fixtures must remain 100%'],
      evidenceType: 'VERIFIED_TEST_RESULT',
    });

    // 1. Save proposal
    const filePath = saveEvolutionProposal(proposal, tmpAgentDir);
    expect(fs.existsSync(filePath)).toBe(true);

    // 2. Load proposals
    const loaded = loadEvolutionProposals(tmpAgentDir);
    expect(loaded.length).toBe(1);
    expect(loaded[0].proposal_id).toBe(proposal.proposal_id);
    expect(loaded[0].status).toBe('PROPOSED');

    // 3. Human Gate approval
    const approved = approveEvolutionProposal(
      proposal.proposal_id,
      'Harmit (Lead Architect)',
      tmpAgentDir,
    );
    expect(approved.status).toBe('APPROVED');
    expect(approved.approval.approved_by).toBe('Harmit (Lead Architect)');
    expect(approved.approval.human_gate_cleared).toBe(true);

    // Verify persisted state reflects approval
    const reloaded = loadEvolutionProposals(tmpAgentDir);
    expect(reloaded[0].status).toBe('APPROVED');
  });

  test('Rejection workflow with recorded rationale', () => {
    const proposal = createEvolutionProposal({
      target: 'regression-fixtures',
      currentBehavior: '14 regression fixtures',
      observedEvidence: 'Telemetry shows test suite duration increased by 30 seconds',
      proposedChange: 'Remove 4 fixtures to speed up testing',
      expectedEffect: 'Faster CI runs',
      risk: 'HIGH',
      testsRequired: ['test/unit/native.test.js'],
      regressionRequirements: ['Check coverage'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    saveEvolutionProposal(proposal, tmpAgentDir);

    const rejected = rejectEvolutionProposal(
      proposal.proposal_id,
      'Rejecting removal of test fixtures: safety and coverage take priority over speed.',
      tmpAgentDir,
    );

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejection.reason).toContain('safety and coverage take priority');
  });

  test('Evidence hierarchy verification', () => {
    expect(EVIDENCE_HIERARCHY.VERIFIED_TEST_RESULT).toBeGreaterThan(
      EVIDENCE_HIERARCHY.DETERMINISTIC_TELEMETRY,
    );
    expect(EVIDENCE_HIERARCHY.DETERMINISTIC_TELEMETRY).toBeGreaterThan(
      EVIDENCE_HIERARCHY.REPRODUCIBLE_PATTERN,
    );
    expect(EVIDENCE_HIERARCHY.REPRODUCIBLE_PATTERN).toBeGreaterThan(
      EVIDENCE_HIERARCHY.REVIEWER_CLAIM,
    );
  });

  test('Case D — Duplicate proposal detection references existing proposal without duplicating', () => {
    const proposal1 = createEvolutionProposal({
      target: 'reviewer-routing',
      currentBehavior: 'Dispatch 7 reviewers on all tasks',
      observedEvidence:
        'Telemetry showed 0 findings from accessibility reviewer on pure SQL migrations across 50 runs.',
      proposedChange: 'Skip accessibility reviewer on pure SQL migrations',
      expectedEffect: 'Reduces latency by 1,200ms on SQL tasks',
      risk: 'LOW',
      testsRequired: ['test/unit/native.test.js'],
      regressionRequirements: ['SQL reviewers still run'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    const filePath1 = saveEvolutionProposal(proposal1, tmpAgentDir);
    expect(fs.existsSync(filePath1)).toBe(true);

    const proposal2 = createEvolutionProposal({
      target: 'reviewer-routing',
      currentBehavior: 'Dispatch 7 reviewers on all tasks',
      observedEvidence:
        'Another run confirmed 0 findings from accessibility reviewer on pure SQL migrations.',
      proposedChange: 'Skip accessibility reviewer on pure SQL migrations',
      expectedEffect: 'Reduces latency by 1,200ms on SQL tasks',
      risk: 'LOW',
      testsRequired: ['test/unit/native.test.js'],
      regressionRequirements: ['SQL reviewers still run'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    // 1. Throws DUPLICATE_PROPOSAL by default with existing proposal referenced
    expect(() => {
      saveEvolutionProposal(proposal2, tmpAgentDir);
    }).toThrow(/Duplicate evolution proposal detected/);

    try {
      saveEvolutionProposal(proposal2, tmpAgentDir);
    } catch (err) {
      expect(err.code).toBe('DUPLICATE_PROPOSAL');
      expect(err.duplicate).toBe(true);
      expect(err.existing_proposal_id).toBe(proposal1.proposal_id);
    }

    // 2. Non-throwing mode returns duplicate reference payload
    const nonThrowingResult = saveEvolutionProposal(proposal2, tmpAgentDir, {
      throwOnDuplicate: false,
    });
    expect(nonThrowingResult.saved).toBe(false);
    expect(nonThrowingResult.duplicate).toBe(true);
    expect(nonThrowingResult.existing_proposal_id).toBe(proposal1.proposal_id);

    // 3. Proves no duplicate evolution proposal is saved to disk
    const loaded = loadEvolutionProposals(tmpAgentDir);
    expect(loaded.length).toBe(1);
    expect(loaded[0].proposal_id).toBe(proposal1.proposal_id);
  });
});
