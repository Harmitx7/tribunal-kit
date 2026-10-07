'use strict';

const engine = require('../../.agent/scripts/skill_coverage_expansion_engine');

describe('Phase 24 — Expansion Selection Unit Tests', () => {
  test('selectExpansionCorpus returns Wave 1 containing the 19 Phase 23 partial skills', () => {
    const selection = engine.selectExpansionCorpus();

    expect(selection.wave).toBe(1);
    expect(selection.skills.length).toBe(19);
    expect(selection.skills).toContain('api-patterns');
    expect(selection.skills).toContain('geo-fundamentals');
    expect(selection.skills).toContain('api-security-auditor');
    expect(selection.skills).toContain('backend-security-expert');
    expect(selection.skills).toContain('zero-trust-passkeys');
    expect(selection.selection_hash).toBeDefined();
    expect(selection.category_distribution).toBeDefined();
  });
});
