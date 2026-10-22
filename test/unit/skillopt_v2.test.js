'use strict';

/**
 * skillopt_v2.test.js
 * ===================
 * Unit and integration tests for SkillOpt v2:
 * 1. Multi-objective validation gate (empirical test score + fitness).
 * 2. Evolution proposal creation and certification.
 * 3. Human Gate staging vs auto-promote execution.
 * 4. Negative CBR rejection persistence and oscillation suppression.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createEvolutionProposal,
  validateEvolutionProposal,
  loadEvolutionProposals,
  approveEvolutionProposal,
} = require('../../src/evolution/engine');
const {
  recordRejection,
  loadRejections,
  isPreviouslyRejected,
} = require('../../src/evolution/negative_memory');

describe('SkillOpt v2 — Closed-Loop Evidence-Certified Skill Optimization', () => {
  let tmpWorkspace;
  let tmpAgentDir;
  let tmpSkillDir;
  let skillPath;

  beforeEach(() => {
    tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-skillopt-test-'));
    tmpAgentDir = path.join(tmpWorkspace, '.agent');
    tmpSkillDir = path.join(tmpAgentDir, 'skills', 'project-idioms');
    fs.mkdirSync(tmpSkillDir, { recursive: true });

    skillPath = path.join(tmpSkillDir, 'SKILL.md');
    fs.writeFileSync(
      skillPath,
      '---\nname: project-idioms\nversion: 1.0.0\n---\n\n# Project Idioms\n- Use TypeScript\n',
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpWorkspace)) {
      fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    }
  });

  test('Valid optimization generates schema-compliant EvolutionProposal', () => {
    const updatedContent =
      '---\nname: project-idioms\nversion: 1.0.0\n---\n\n# Project Idioms\n- Use TypeScript\n- Prefer parameterized queries\n';

    const proposal = createEvolutionProposal({
      target: 'skill-instructions',
      currentBehavior: 'Initial project idioms with TypeScript only',
      observedEvidence: 'Empirical rollout test passed with score 1.0 on test_db.js',
      proposedChange: updatedContent,
      expectedEffect: 'Prevents SQL injection vulnerabilities in project queries',
      risk: 'LOW',
      testsRequired: ['test_db.js'],
      regressionRequirements: ['Existing unit tests continue to pass'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    const validation = validateEvolutionProposal(proposal);
    expect(validation.valid).toBe(true);
    expect(proposal.status).toBe('PROPOSED');
    expect(proposal.evidence_weight).toBeGreaterThanOrEqual(3);
  });

  test('Oscillation protection suppresses candidate edits present in Negative Memory', () => {
    // Record past failure
    recordRejection(
      tmpAgentDir,
      'project-idioms',
      1,
      [{ op: 'replace', content: 'Disable all linters to make build faster' }],
      'Regression in CI build',
    );

    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    expect(rejections).toHaveLength(1);

    const badCandidate = {
      op: 'replace',
      content: 'Disable all linters to make build faster',
    };
    const check = isPreviouslyRejected(badCandidate, rejections);
    expect(check.rejected).toBe(true);
    expect(check.reason).toContain('Regression in CI build');
  });

  test('Human Gate workflow: Proposal remains PROPOSED until explicit approval', () => {
    const proposal = createEvolutionProposal({
      target: 'skill-instructions',
      currentBehavior: 'Behavior A',
      observedEvidence: 'Telemetry showed 100% pass on rollout suite',
      proposedChange: 'Behavior B',
      expectedEffect: 'Improved clarity',
      risk: 'LOW',
      testsRequired: ['test.js'],
      regressionRequirements: ['None'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
    });

    const { saveEvolutionProposal } = require('../../src/evolution/engine');
    saveEvolutionProposal(proposal, tmpAgentDir);

    let proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].status).toBe('PROPOSED');
    expect(proposals[0].approval).toBeNull();

    // Human approves proposal
    const approved = approveEvolutionProposal(proposal.proposal_id, 'Human Reviewer', tmpAgentDir);
    expect(approved.status).toBe('APPROVED');
    expect(approved.approval.human_gate_cleared).toBe(true);

    proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals[0].status).toBe('APPROVED');
  });

  test('cmdLearn --approve applies approved skill-instructions changes to disk', async () => {
    const targetRelPath = path.join('skills', 'project-idioms', 'SKILL.md');
    const updatedContent =
      '---\nname: project-idioms\nversion: 1.1.0\n---\n\n# Certified Idioms\n- Strictly typed\n';

    const proposal = createEvolutionProposal({
      target: 'skill-instructions',
      currentBehavior: 'Old idioms',
      observedEvidence: 'Verified in benchmark harness with 1.0 pass rate',
      proposedChange: updatedContent,
      expectedEffect: 'Updated idioms',
      risk: 'LOW',
      testsRequired: ['harness.js'],
      regressionRequirements: ['All tests pass'],
      evidenceType: 'VERIFIED_TEST_RESULT',
      targetFile: targetRelPath,
    });

    const { saveEvolutionProposal } = require('../../src/evolution/engine');
    saveEvolutionProposal(proposal, tmpAgentDir);

    const { cmdLearn } = require('../../src/commands/learn');
    // Run learn with --approve and explicit target path
    await cmdLearn(
      {
        approve: proposal.proposal_id,
        path: tmpWorkspace,
      },
      true,
    );

    // Verify skill file on disk was updated
    const written = fs.readFileSync(skillPath, 'utf8');
    expect(written).toBe(updatedContent);
  });

  test('Validation gate rejection records in negative memory buffer', () => {
    const failedEdits = [
      {
        op: 'replace',
        target: 'Use TypeScript',
        content: 'Use raw any types everywhere',
      },
    ];

    recordRejection(
      tmpAgentDir,
      'project-idioms',
      2,
      failedEdits,
      'Validation harness test suite failed with exit code 1',
    );

    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    expect(rejections).toHaveLength(1);
    expect(rejections[0].epoch).toBe(2);
    expect(rejections[0].reason).toContain('Validation harness test suite failed');

    // Confirm that negative prompt formatting warns about this failed attempt
    const formatted = require('../../src/evolution/negative_memory').formatNegativeConstraints(rejections);
    expect(formatted).toContain('Epoch 2 Failure');
    expect(formatted).toContain('Use raw any types everywhere');
  });
});

