'use strict';

/**
 * evolve_command.test.js
 * =======================
 * Unit tests for `tk evolve` / `tk auto-tune` CLI command.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdEvolve } = require('../../src/commands/evolve');
const {
  createEvolutionProposal,
  saveEvolutionProposal,
  loadEvolutionProposals,
} = require('../../src/evolution/engine');

describe('cmdEvolve — Continuous Auto-Tuning CLI Command', () => {
  let tmpRoot;
  let tmpAgentDir;
  let tmpSkillsDir;
  let testSkillDir;
  let testSkillFile;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-evolve-cmd-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    tmpSkillsDir = path.join(tmpAgentDir, 'skills');
    testSkillDir = path.join(tmpSkillsDir, 'project-idioms');
    testSkillFile = path.join(testSkillDir, 'SKILL.md');

    fs.mkdirSync(testSkillDir, { recursive: true });
    fs.writeFileSync(
      testSkillFile,
      '# Project Idioms Skill\n\nRule 1: Always validate user input.\nRule 2: Never use eval.\n',
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('Fails immediately if .agent directory is missing', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit called with: ${code}`);
    });

    await expect(cmdEvolve({ path: emptyDir }, [], true)).rejects.toThrow(
      'process.exit called with: 1',
    );
    mockExit.mockRestore();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  test('Rejects co-evolution targeting protected security boundaries', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit called with: ${code}`);
    });

    await expect(
      cmdEvolve({ path: tmpRoot, target: 'src/security/boundary.js' }, [], true),
    ).rejects.toThrow('process.exit called with: 1');

    mockExit.mockRestore();
  });

  test('--status displays staged evolution proposals without error', async () => {
    const proposal = createEvolutionProposal({
      target: 'skill-instructions',
      currentBehavior: 'Basic idioms',
      observedEvidence: 'Verified deterministic telemetry passing 100% test criteria',
      proposedChange: 'Hardened idioms',
      expectedEffect: 'Prevent eval regressions',
      risk: 'LOW',
      testsRequired: ['npm test'],
      regressionRequirements: ['All tests pass'],
      evidenceType: 'DETERMINISTIC_TELEMETRY',
      targetFile: 'skills/project-idioms/SKILL.md',
    });

    saveEvolutionProposal(proposal, tmpAgentDir);

    const res = await cmdEvolve({ path: tmpRoot, status: true }, [], true);
    expect(res).toBeDefined();
    expect(res.status).toBe(true);
    expect(res.total).toBeGreaterThanOrEqual(1);
  });

  test('Executes co-evolution run in direct sandbox mode and stages proposal awaiting approval', async () => {
    const telemetry = await cmdEvolve(
      {
        path: tmpRoot,
        target: 'project-idioms',
        rounds: 1,
        'fuzz-depth': 1,
        sandbox: false,
        'auto-promote': false,
        'harness-cmd': 'node -e "process.exit(0)"',
      },
      [],
      true,
    );

    expect(telemetry).toBeDefined();
    expect(telemetry.roundsExecuted).toBe(1);
    expect(telemetry.stagedProposals.length).toBeGreaterThanOrEqual(1);

    const proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals[0].status).toBe('PROPOSED');
  });

  test('--auto-promote updates target file directly when flag is enabled', async () => {
    const telemetry = await cmdEvolve(
      {
        path: tmpRoot,
        target: 'project-idioms',
        rounds: 1,
        'fuzz-depth': 1,
        sandbox: false,
        'auto-promote': true,
        'harness-cmd': 'node -e "process.exit(0)"',
      },
      [],
      true,
    );

    expect(telemetry).toBeDefined();
    expect(telemetry.stagedProposals.length).toBeGreaterThanOrEqual(1);

    const proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals[0].status).toBe('APPROVED');

    // Verify the target skill file was updated with procedural hardening
    const updatedContent = fs.readFileSync(testSkillFile, 'utf8');
    expect(updatedContent).toContain('- [Co-Evolution Round 1]:');
  });
});
