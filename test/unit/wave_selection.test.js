'use strict';

const orch = require('../../.agent/scripts/corpus_certification_orchestrator');

describe('Phase 25 — Wave Selection Unit Tests', () => {
  test('selectWave enforces wave capacity cap of 25 skills maximum', () => {
    const inventory = orch.buildCorpusInventory();
    const wave = orch.selectWave(1, inventory, { maxWaveSize: 25 });

    expect(wave.wave).toBe(1);
    expect(wave.selected_skills.length).toBeLessThanOrEqual(25);
    expect(wave.selected_skills.length).toBe(25);
    expect(wave.selection_hash).toBeDefined();
    expect(wave.selection_method).toBe('DETERMINISTIC_CORPUS_PRIORITY');
  });

  test('selectWave never includes already certified pilot skills in Wave 1', () => {
    const inventory = orch.buildCorpusInventory();
    const wave = orch.selectWave(1, inventory);

    for (const pilot of orch.PILOT_SKILLS) {
      expect(wave.selected_skills).not.toContain(pilot);
    }
  });

  test('selectWave produces identical selection hash across multiple executions', () => {
    const inventory = orch.buildCorpusInventory();
    const waveA = orch.selectWave(1, inventory);
    const waveB = orch.selectWave(1, inventory);

    expect(waveA.selection_hash).toBe(waveB.selection_hash);
    expect(waveA.selected_skills).toEqual(waveB.selected_skills);
  });
});
