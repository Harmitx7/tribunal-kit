'use strict';

/**
 * adversarial_mutator.test.js
 * ============================
 * Unit tests for Phase 3 Adversarial Scenario Mutator.
 * Probes mutation generation across all 4 attack vectors:
 * 1. Boundary Extrema (null, undefined, empty, NaN, MaxInt)
 * 2. Security Injections (SQLi, path traversal, command chars, prompt injections)
 * 3. Type Confusion (arrays vs objects, booleans, symbols, prototype pollution)
 * 4. Resource DoS & Edge Constraints (long inputs, deep recursion)
 */

const {
  ATTACK_CATEGORIES,
  AdversarialMutator,
} = require('../../src/evaluation/adversarial_mutator');
const { SCENARIOS } = require('../../src/evaluation/scenario_registry');

describe('Adversarial Scenario Mutator — EvalOpt Loop 2', () => {
  let mutator;
  let mathScenario;
  let sqlScenario;

  beforeEach(() => {
    mutator = new AdversarialMutator();
    mathScenario = SCENARIOS.find(s => s.scenarioId === 'SCENARIO_TIER1_MATH_FEATURE');
    sqlScenario = SCENARIOS.find(s => s.scenarioId === 'SCENARIO_TIER3_SQL_INJECTION');
  });

  test('Exports all 4 standard attack categories', () => {
    expect(ATTACK_CATEGORIES.BOUNDARY_EXTREMA).toBe('BOUNDARY_EXTREMA');
    expect(ATTACK_CATEGORIES.SECURITY_INJECTIONS).toBe('SECURITY_INJECTIONS');
    expect(ATTACK_CATEGORIES.TYPE_CONFUSION).toBe('TYPE_CONFUSION');
    expect(ATTACK_CATEGORIES.RESOURCE_DOS).toBe('RESOURCE_DOS');
  });

  test('Generates mutated scenarios for a base functional scenario', () => {
    const mutations = mutator.generateMutations(mathScenario, {
      categories: [ATTACK_CATEGORIES.BOUNDARY_EXTREMA, ATTACK_CATEGORIES.TYPE_CONFUSION],
      depth: 2,
    });

    expect(mutations.length).toBeGreaterThanOrEqual(2);
    for (const m of mutations) {
      expect(m.parentScenarioId).toBe('SCENARIO_TIER1_MATH_FEATURE');
      expect(m.scenarioId).toContain('SCENARIO_TIER1_MATH_FEATURE_MUT_');
      expect(m.targetFile).toBe(mathScenario.targetFile);
      expect(m.safeProposal).toBe(mathScenario.safeProposal);
      expect(m.unsafeProposal).toBe(mathScenario.unsafeProposal);
      expect(m.verificationCommand).toBeDefined();
      expect(m.verificationCommand.cmd).toBe('node');
      expect(m).toHaveProperty('mutationPayload');
    }
  });

  test('Generates security injection mutations for SQL injection scenario', () => {
    const mutations = mutator.generateMutations(sqlScenario, {
      categories: [ATTACK_CATEGORIES.SECURITY_INJECTIONS],
      depth: 3,
    });

    expect(mutations.length).toBeGreaterThanOrEqual(1);
    const hasSqli = mutations.some(m =>
      String(m.mutationPayload).includes("' OR '1'='1") ||
      String(m.mutationPayload).includes('DROP TABLE') ||
      m.category === ATTACK_CATEGORIES.SECURITY_INJECTIONS
    );
    expect(hasSqli).toBe(true);

    // Verify mutated verification command checks the injected payload
    const firstMutation = mutations[0];
    const script = firstMutation.verificationCommand.args[1];
    expect(script).toContain(firstMutation.targetFile);
  });

  test('Mutated verification command retains parent assertions (non-destructive extension)', () => {
    const mutations = mutator.generateMutations(mathScenario, { depth: 1 });
    expect(mutations.length).toBeGreaterThan(0);

    const baseScript = mathScenario.verificationCommand.args[1];
    const mutatedScript = mutations[0].verificationCommand.args[1];

    // Mutated script must be equal or longer (monotonic expansion)
    expect(mutatedScript.length).toBeGreaterThanOrEqual(baseScript.length);
  });
});
