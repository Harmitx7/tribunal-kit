'use strict';

/**
 * evalopt_command.test.js
 * =======================
 * Unit tests for `tk evalopt` / `tk redteam` CLI command.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdEvalOpt } = require('../../src/commands/evalopt');
const { loadCandidateScenarios } = require('../../src/evaluation/coevolution_bridge');

describe('cmdEvalOpt — EvalOpt Red-Team CLI Command', () => {
  let tmpRoot;
  let tmpAgentDir;
  let tmpTribunalDir;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-evalopt-cmd-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    tmpTribunalDir = path.join(tmpRoot, '.tribunal');
    fs.mkdirSync(tmpAgentDir, { recursive: true });
    fs.mkdirSync(tmpTribunalDir, { recursive: true });
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

    await expect(cmdEvalOpt({ path: emptyDir }, [], true)).rejects.toThrow(
      'process.exit called with: 1',
    );
    mockExit.mockRestore();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  test('--status displays staged candidate scenarios cleanly', async () => {
    const { stageCandidateScenario } = require('../../src/evaluation/coevolution_bridge');
    stageCandidateScenario(
      tmpTribunalDir,
      {
        scenarioId: 'TEST_SCENARIO',
        parentScenarioId: 'PARENT',
        category: 'SECURITY_INJECTIONS',
      },
      { provenanceHash: 'hash123' },
    );

    // Run status mode without crashing
    await cmdEvalOpt({ path: tmpRoot, status: true }, [], true);
    const loaded = loadCandidateScenarios(tmpTribunalDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].scenarioId).toBe('TEST_SCENARIO');
  });

  test('--promote successfully promotes staged candidate scenario', async () => {
    const { stageCandidateScenario } = require('../../src/evaluation/coevolution_bridge');
    const staged = stageCandidateScenario(
      tmpTribunalDir,
      {
        scenarioId: 'TEST_PROMOTABLE',
        parentScenarioId: 'PARENT',
        category: 'BOUNDARY_EXTREMA',
      },
      { provenanceHash: 'hash456' },
    );

    await cmdEvalOpt({ path: tmpRoot, promote: staged.candidateId }, [], true);
    const loaded = loadCandidateScenarios(tmpTribunalDir);
    expect(loaded[0].status).toBe('PROMOTED');
  });

  test('Executes adversarial red-team run against targeted scenario in sandboxed mode', async () => {
    // Red-team SCENARIO_TIER1_MATH_FEATURE with depth 1
    const result = await cmdEvalOpt(
      {
        path: tmpRoot,
        target: 'SCENARIO_TIER1_MATH_FEATURE',
        'fuzz-depth': 1,
        sandbox: false, // Run without git worktree in unit test mock
        bridge: true,
      },
      [],
      true,
    );

    expect(result).toBeDefined();
    expect(result.totalTested).toBeGreaterThanOrEqual(1);
    expect(result.resilienceRate).toBeDefined();
  });
});
