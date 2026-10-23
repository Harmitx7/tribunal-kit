'use strict';

/**
 * benchmark_loader.test.js
 * ========================
 * Unit tests for Benchmark Corpus Loader (benchmarks/corpus/index.js).
 * Validates contract compliance, scenario discovery, error handling, and stats.
 */

const {
  getCorpusScenarios,
  getCorpusWithValidation,
  validateScenario,
  REQUIRED_FIELDS,
} = require('../../benchmarks/corpus/index');

describe('Benchmark Corpus Loader', () => {
  test('Loads exactly 50 validated scenarios from corpus modules', () => {
    const scenarios = getCorpusScenarios();
    expect(scenarios).toBeDefined();
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBe(50);
  });

  test('getCorpusWithValidation returns valid stats with zero errors', () => {
    const report = getCorpusWithValidation();
    expect(report.errors).toEqual([]);
    expect(report.stats.valid).toBe(true);
    expect(report.stats.total).toBe(50);
    expect(report.stats.categories['Anti-Hallucination']).toBe(15);
    expect(report.stats.categories['Security']).toBe(15);
    expect(report.stats.categories['Functional']).toBe(10);
    expect(report.stats.categories['Resilience']).toBe(10);
  });

  test('Every scenario strictly conforms to the required contract', () => {
    const scenarios = getCorpusScenarios();
    for (const scenario of scenarios) {
      const validation = validateScenario(scenario);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify all required fields exist
      for (const field of REQUIRED_FIELDS) {
        expect(scenario[field]).toBeDefined();
      }

      // Verify field types
      expect(typeof scenario.scenarioId).toBe('string');
      expect(scenario.scenarioId.length).toBeGreaterThan(0);
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(scenario.difficulty);
      expect([1, 2, 3]).toContain(scenario.impactTier);
      expect(typeof scenario.taskDescription).toBe('string');
      expect(typeof scenario.targetFile).toBe('string');
      expect(typeof scenario.safeProposal).toBe('string');
      expect(typeof scenario.unsafeProposal).toBe('string');
      expect(typeof scenario.verificationCommand.cmd).toBe('string');
      expect(Array.isArray(scenario.verificationCommand.args)).toBe(true);
      expect(scenario.timeoutMs).toBeGreaterThan(0);
    }
  });

  test('All scenarioIds are unique', () => {
    const scenarios = getCorpusScenarios();
    const ids = scenarios.map(s => s.scenarioId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('validateScenario detects missing required fields', () => {
    const invalid = { scenarioId: 'TEST_01' };
    const res = validateScenario(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  test('validateScenario rejects invalid difficulty or impactTier', () => {
    const bad = {
      scenarioId: 'BAD_DIFF',
      category: 'Security',
      difficulty: 'SuperHard',
      impactTier: 99,
      taskDescription: 'desc',
      targetFile: 'scratch/t.js',
      initialState: '',
      safeProposal: '',
      unsafeProposal: '',
      verificationCommand: { cmd: 'node', args: [] },
      timeoutMs: 1000,
    };
    const res = validateScenario(bad);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('Invalid difficulty'))).toBe(true);
    expect(res.errors.some(e => e.includes('Invalid impactTier'))).toBe(true);
  });
});
