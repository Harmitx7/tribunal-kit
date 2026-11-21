'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { cmdEvolve } = require('../../src/commands/evolve');
const logger = require('../../src/utils/logger');
const { loadEvolutionProposals } = require('../../src/evolution/engine');

describe('Phase 2 (#15) — tk evolve verification harness enforcement', () => {
  let tmpRoot;
  let tmpAgentDir;
  let testSkillDir;
  let testSkillFile;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-evolve-harness-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    testSkillDir = path.join(tmpAgentDir, 'skills', 'project-idioms');
    testSkillFile = path.join(testSkillDir, 'SKILL.md');

    fs.mkdirSync(testSkillDir, { recursive: true });
    fs.writeFileSync(
      testSkillFile,
      '# Project Idioms Skill\n\nRule 1: Always validate user input.\n',
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      try {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      } catch (_) {}
    }
    jest.restoreAllMocks();
  });

  test('Fails fast with exit code 1 when --harness-cmd is omitted and --dry-run is not set', async () => {
    const errSpy = jest.spyOn(logger, 'err').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit: ${code}`);
    });

    await expect(
      cmdEvolve(
        { path: tmpRoot, target: 'project-idioms', sandbox: false },
        ['node', 'tk', 'evolve', 'project-idioms'],
        true,
      ),
    ).rejects.toThrow('process.exit: 1');

    expect(errSpy).toHaveBeenCalled();
    const errCall = errSpy.mock.calls.find(call =>
      call[0].includes('Missing required test verification harness (--harness-cmd)'),
    );
    expect(errCall).toBeDefined();

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test('Allows --dry-run without --harness-cmd and performs simulated execution without certifying proposals', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    const telemetry = await cmdEvolve(
      {
        path: tmpRoot,
        target: 'project-idioms',
        sandbox: false,
        rounds: 1,
        'dry-run': true,
      },
      ['node', 'tk', 'evolve', 'project-idioms', '--dry-run'],
      true,
    );

    expect(telemetry).toBeDefined();
    // In simulated dry-run mode, no proposals should be certified
    const proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals.length).toBe(0);

    warnSpy.mockRestore();
  });
});
