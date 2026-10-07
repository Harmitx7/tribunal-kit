'use strict';

const orch = require('../../.agent/scripts/corpus_certification_orchestrator');

describe('Phase 25 — Corpus Eligibility Classification Unit Tests', () => {
  test('classifyCorpusEligibility accurately identifies REFERENCE_ONLY skills', () => {
    const res = orch.classifyCorpusEligibility('swiss-design', { content: 'Typography and design principles.' });
    expect(res.behavior_class).toBe(orch.ELIGIBILITY_CLASSES.REFERENCE_ONLY);
    expect(res.human_boundary).toBe(false);
  });

  test('classifyCorpusEligibility accurately identifies HUMAN_REQUIRED boundary skills', () => {
    const res = orch.classifyCorpusEligibility('taste-skill', { content: 'Aesthetic balance and visual taste evaluation.' });
    expect(res.behavior_class).toBe(orch.ELIGIBILITY_CLASSES.HUMAN_REQUIRED);
    expect(res.human_boundary).toBe(true);
  });

  test('classifyCorpusEligibility accurately identifies EXECUTABLE skills', () => {
    const res = orch.classifyCorpusEligibility('bash-linux', { content: 'Execute bash scripts and node test runner.' });
    expect(res.behavior_class).toBe(orch.ELIGIBILITY_CLASSES.EXECUTABLE);
  });

  test('classifyCorpusEligibility accurately identifies ROUTING skills', () => {
    const res = orch.classifyCorpusEligibility('smart-router', { content: 'Dispatch requests to destination agents.' });
    expect(res.behavior_class).toBe(orch.ELIGIBILITY_CLASSES.ROUTING);
  });
});
