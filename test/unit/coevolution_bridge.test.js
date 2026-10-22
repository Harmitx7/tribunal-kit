'use strict';

/**
 * coevolution_bridge.test.js
 * ===========================
 * Unit tests for Phase 3 Co-Evolution Bridge.
 * Probes:
 * 1. Recording adversarial vulnerabilities directly into Phase 2 Negative CBR Memory.
 * 2. Staging certified adversarial scenarios in .tribunal/evals/candidate_scenarios.json.
 * 3. Human Gate promotion of candidate scenarios.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  recordAdversarialFinding,
  stageCandidateScenario,
  loadCandidateScenarios,
  promoteCandidateScenario,
} = require('../../src/evaluation/coevolution_bridge');
const { loadRejections } = require('../../src/evolution/negative_memory');

describe('Co-Evolution Bridge — Connecting EvalOpt to SkillOpt Negative Memory', () => {
  let tmpRoot;
  let tmpAgentDir;
  let tmpTribunalDir;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-coevo-test-'));
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

  test('Records adversarial finding into Negative CBR Memory', () => {
    const finding = {
      payload: "' OR '1'='1",
      reason: 'SQL query string interpolation vulnerability discovered during red-team sweep',
      category: 'SECURITY_INJECTIONS',
    };

    const record = recordAdversarialFinding(tmpAgentDir, 'project-idioms', finding);
    expect(record).toBeDefined();
    expect(record.id).toContain('REJ-');

    // Verify it is readable by loadRejections in negative_memory
    const rejections = loadRejections(tmpAgentDir, 'project-idioms');
    expect(rejections).toHaveLength(1);
    expect(rejections[0].reason).toContain('SQL query string interpolation');
    expect(rejections[0].edits[0].content).toContain("' OR '1'='1");
  });

  test('Stages certified candidate scenario in .tribunal/evals/candidate_scenarios.json', () => {
    const candidateScenario = {
      scenarioId: 'SCENARIO_MATH_MUT_BOUNDARY_1',
      parentScenarioId: 'SCENARIO_TIER1_MATH_FEATURE',
      category: 'BOUNDARY_EXTREMA',
      mutationPayload: null,
      verificationCommand: { cmd: 'node', args: ['-e', 'process.exit(0)'] },
    };

    const proof = {
      provenanceHash: 'abc123hash',
      status: 'CERTIFIED_HARDENED',
    };

    const staged = stageCandidateScenario(tmpTribunalDir, candidateScenario, proof);
    expect(staged.status).toBe('STAGED');
    expect(staged.proof.provenanceHash).toBe('abc123hash');

    const loaded = loadCandidateScenarios(tmpTribunalDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].scenarioId).toBe('SCENARIO_MATH_MUT_BOUNDARY_1');
  });

  test('Promotes staged candidate scenario to PROMOTED status upon Human Gate authorization', () => {
    const candidateScenario = {
      scenarioId: 'SCENARIO_SQL_HARDENED',
      parentScenarioId: 'SCENARIO_TIER3_SQL_INJECTION',
      category: 'SECURITY_INJECTIONS',
    };
    const proof = { provenanceHash: 'proof456' };

    const staged = stageCandidateScenario(tmpTribunalDir, candidateScenario, proof);
    expect(staged.status).toBe('STAGED');

    const promoted = promoteCandidateScenario(tmpTribunalDir, staged.candidateId);
    expect(promoted.status).toBe('PROMOTED');
    expect(promoted.promotedAt).toBeDefined();

    const loaded = loadCandidateScenarios(tmpTribunalDir);
    expect(loaded[0].status).toBe('PROMOTED');
  });
});
