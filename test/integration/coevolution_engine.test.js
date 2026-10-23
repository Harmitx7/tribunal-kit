'use strict';

/**
 * coevolution_engine.test.js
 * ==========================
 * End-to-end integration test for Phase 3:
 * Proves that CoEvolutionEngine coordinates paired EvalOpt attack fuzzing,
 * Negative CBR ingestion, SkillOpt bounded rule synthesis, and WAL commit.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { CoEvolutionEngine } = require('../../src/evolution/coevolution_engine');
const { getCorpusScenarios } = require('../../benchmarks/corpus/index');
const { loadRejections } = require('../../src/evolution/negative_memory');
const { loadEvolutionProposals } = require('../../src/evolution/engine');

describe('CoEvolutionEngine — Dual-Loop Co-Evolution Integration', () => {
  let tmpDir;
  let engine;
  let corpus;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-coevolution-test-'));
    corpus = getCorpusScenarios().slice(0, 3); // Use first 3 scenarios for fast execution
    engine = new CoEvolutionEngine({
      repoRoot: tmpDir,
      agentDir: tmpDir,
      maxRounds: 2,
      fuzzDepth: 1,
      runsPerScenario: 1,
    });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('Single round execution discovers vulnerabilities, ingests into Negative CBR, synthesizes rules, and commits WAL', async () => {
    const initialSkillText =
      '# Secure Coding Practices\n\n' +
      'Comprehensive architectural guidelines for secure software design and defense-in-depth.\n'.repeat(
        50,
      );

    const result = await engine.executeRound(
      1,
      'secure-coding',
      initialSkillText,
      corpus,
    );

    expect(result.verdict).toBe('SUCCESS');
    expect(result.adversarialFindings).toBeGreaterThan(0);
    expect(result.appliedRules.length).toBeGreaterThan(0);
    expect(result.walTxId).toBeDefined();
    expect(result.proposalId).toBeDefined();

    // Verify Negative CBR memory has ingested the findings
    const rejections = loadRejections(tmpDir, 'secure-coding');
    expect(rejections.length).toBeGreaterThan(0);

    // Verify Evolution Proposal was saved to disk
    const proposals = loadEvolutionProposals(tmpDir);
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0].proposal_id).toBe(result.proposalId);

    // Verify WAL transaction was committed
    const journal = engine.wal.getTransaction(result.walTxId);
    expect(journal.state).toBe('COMMIT');

    // Verify mutated skill has new rules
    expect(result.newSkillText).toContain('## Defensive Guardrails');
  });

  test('Multi-round campaign hardens skill iteratively across rounds without oscillation', async () => {
    const initialSkillText =
      '# Robust Microservices\n\n' +
      'Comprehensive architectural guidelines for resilient microservices and error boundaries.\n'.repeat(
        50,
      );

    const campaign = await engine.runCampaign(
      'robust-services',
      initialSkillText,
      corpus,
    );

    expect(campaign.roundsCompleted).toBe(2);
    expect(campaign.converged).toBe(true);
    expect(campaign.finalSkillText.length).toBeGreaterThan(initialSkillText.length);
    expect(campaign.rounds).toHaveLength(2);

    for (const r of campaign.rounds) {
      expect(r.verdict).toBe('SUCCESS');
      const tx = engine.wal.getTransaction(r.walTxId);
      expect(tx.state).toBe('COMMIT');
    }
  });

  test('Security boundary invariant prevents co-evolution of protected targets', async () => {
    const protectedSkill = 'security-boundaries';
    await expect(
      engine.executeRound(1, protectedSkill, '# Protected', corpus),
    ).rejects.toThrow(/protected security boundary/);
  });
});
