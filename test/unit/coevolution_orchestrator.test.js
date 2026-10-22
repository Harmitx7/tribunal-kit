'use strict';

/**
 * coevolution_orchestrator.test.js
 * ================================
 * Unit tests for Phase 4 Co-Evolution Orchestration Engine.
 * Probes:
 * 1. Multi-round alternating wave execution (Wave A -> Wave B -> Wave C).
 * 2. Automatic ingestion of red-team findings into Negative CBR Memory.
 * 3. Regression rollback when candidate code causes baseline test failure.
 * 4. Circuit breaker tripwire halting on consecutive rollbacks.
 * 5. Evolution proposal generation and staging in .agent/evolution/proposals/.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CoEvolutionOrchestrator } = require('../../src/evolution/coevolution_orchestrator');
const { loadRejections } = require('../../src/evolution/negative_memory');
const { loadEvolutionProposals } = require('../../src/evolution/engine');

describe('CoEvolutionOrchestrator — Dual-Loop Continuous Auto-Tuning', () => {
  let tmpRoot;
  let tmpAgentDir;
  let tmpTribunalDir;
  let tmpSkillDir;
  let skillPath;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-coevo-orch-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    tmpTribunalDir = path.join(tmpRoot, '.tribunal');
    tmpSkillDir = path.join(tmpAgentDir, 'skills', 'project-idioms');
    fs.mkdirSync(tmpSkillDir, { recursive: true });
    fs.mkdirSync(tmpTribunalDir, { recursive: true });

    skillPath = path.join(tmpSkillDir, 'SKILL.md');
    fs.writeFileSync(
      skillPath,
      '---\nname: project-idioms\nversion: 1.0.0\n---\n\n# Project Idioms\n- Use parameterized queries\n',
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('Rejects co-evolution targeting protected security boundaries', async () => {
    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: tmpRoot,
      targetSkill: 'security-boundaries',
      sandbox: false,
    });

    await expect(orchestrator.run()).rejects.toThrow(
      'Target "security-boundaries" is a protected security boundary',
    );
  });

  test('Executes multi-round co-evolution and produces telemetry report', async () => {
    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: tmpRoot,
      targetSkill: 'project-idioms',
      maxRounds: 2,
      fuzzDepth: 1,
      sandbox: false, // Run direct in unit test
      harnessCmd: 'node -e "process.exit(0)"',
    });

    const telemetry = await orchestrator.run();
    expect(telemetry).toBeDefined();
    expect(telemetry.targetSkill).toBe('project-idioms');
    expect(telemetry.roundsExecuted).toBeGreaterThanOrEqual(1);
    expect(telemetry.finalResilience).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(telemetry.roundTelemetry)).toBe(true);
  });

  test('Ingests red-team breaking vulnerabilities into Negative CBR Memory', async () => {
    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: tmpRoot,
      targetSkill: 'project-idioms',
      maxRounds: 1,
      fuzzDepth: 1,
      sandbox: false,
      harnessCmd: 'node -e "process.exit(0)"',
    });

    // Injects a simulated red-team finding during Wave A
    orchestrator._executeRedTeamWave = jest.fn().mockResolvedValue({
      totalTested: 4,
      certifiedCount: 3,
      vulnerabilities: [
        {
          payload: "' OR 1=1 --",
          category: 'SECURITY_INJECTIONS',
          reason: 'Vulnerability discovered by red-team wave',
        },
      ],
      resilienceRate: 75.0,
    });

    await orchestrator.run();

    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    expect(rejections.length).toBeGreaterThanOrEqual(1);
    expect(rejections[0].edits[0].content).toContain("' OR 1=1 --");
  });

  test('Rolls back candidate and trips circuit breaker on consecutive regressions', async () => {
    const initialContent = fs.readFileSync(skillPath, 'utf8');

    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: tmpRoot,
      targetSkill: 'project-idioms',
      maxRounds: 4,
      sandbox: false,
      harnessCmd: 'node -e "process.exit(1)"', // Always fails baseline
    });

    // Mock hardening wave that applies a bad edit
    orchestrator._executeHardeningWave = jest.fn().mockImplementation(() => {
      fs.writeFileSync(skillPath, 'BROKEN MUTATION CONTENT', 'utf8');
      return { appliedCount: 1, currentSkillText: 'BROKEN MUTATION CONTENT' };
    });

    const telemetry = await orchestrator.run();
    expect(telemetry.circuitBreakerTripped).toBe(true);
    expect(telemetry.rollbacks).toBe(2);

    // Verify workspace skill was restored to initial content
    const restoredContent = fs.readFileSync(skillPath, 'utf8');
    expect(restoredContent).toBe(initialContent);
  });

  test('Stages certified EvolutionProposal awaiting Human Gate approval upon positive gain', async () => {
    const orchestrator = new CoEvolutionOrchestrator({
      repoRoot: tmpRoot,
      targetSkill: 'project-idioms',
      maxRounds: 1,
      sandbox: false,
      harnessCmd: 'node -e "process.exit(0)"',
    });

    // Mock successful hardening wave
    orchestrator._executeHardeningWave = jest.fn().mockImplementation(() => {
      const improved =
        '---\nname: project-idioms\nversion: 1.1.0\n---\n\n# Project Idioms\n- Parameterized SQL\n- Type safe bounds\n';
      fs.writeFileSync(skillPath, improved, 'utf8');
      return { appliedCount: 2, currentSkillText: improved };
    });

    // Mock resilience improvement from 70% to 100%
    orchestrator._executeRedTeamWave = jest
      .fn()
      .mockResolvedValueOnce({
        totalTested: 5,
        certifiedCount: 3,
        vulnerabilities: [],
        resilienceRate: 60.0,
      })
      .mockResolvedValueOnce({
        totalTested: 5,
        certifiedCount: 5,
        vulnerabilities: [],
        resilienceRate: 100.0,
      });

    const telemetry = await orchestrator.run();
    expect(telemetry.stagedProposals.length).toBeGreaterThanOrEqual(1);

    const proposals = loadEvolutionProposals(tmpAgentDir);
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals[0].status).toBe('PROPOSED');
  });
});
