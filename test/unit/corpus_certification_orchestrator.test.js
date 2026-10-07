'use strict';

const orch = require('../../.agent/scripts/corpus_certification_orchestrator');

describe('Phase 25 — Corpus Certification Orchestrator Unit Tests', () => {
  test('buildCorpusInventory returns complete corpus of 234 skills with accurate metadata', () => {
    const inventory = orch.buildCorpusInventory();
    expect(inventory.length).toBe(234);

    const pilotCount = inventory.filter(s => s.is_pilot).length;
    expect(pilotCount).toBe(25);

    const nonPilotCount = inventory.filter(s => !s.is_pilot).length;
    expect(nonPilotCount).toBe(209);
  });

  test('createWaveSnapshot creates immutable snapshot hash of certification state', () => {
    const state = {
      skills: { 'test-skill': { status: 'BEHAVIORALLY_CERTIFIED', coverage: 100 } },
      summary: { total: 1 },
    };

    const snapshot = orch.createWaveSnapshot(state);
    expect(snapshot.snapshot_hash).toBeDefined();
    expect(snapshot.skills['test-skill'].status).toBe('BEHAVIORALLY_CERTIFIED');
    expect(snapshot.timestamp).toBeDefined();
  });

  test('computeWaveDiff detects upgraded skills without false regressions', () => {
    const pre = {
      skills: { 'skill-a': { status: 'PARTIAL', coverage: 43 } },
    };
    const post = {
      skills: { 'skill-a': { status: 'BEHAVIORALLY_CERTIFIED', coverage: 100 } },
    };

    const diff = orch.computeWaveDiff(pre, post);
    expect(diff.diff.NEWLY_CERTIFIED).toContain('skill-a');
    expect(diff.regressions.length).toBe(0);
  });
});
