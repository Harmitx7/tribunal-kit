'use strict';

/**
 * adversarial_mutator_expanded.test.js
 * =====================================
 * Unit tests for expanded AdversarialMutator across the 4 benchmark categories.
 */

const { AdversarialMutator, ATTACK_CATEGORIES } = require('../../src/evaluation/adversarial_mutator');
const { getCorpusScenarios } = require('../../benchmarks/corpus/index');

describe('AdversarialMutator — Expanded 4-Category Mutation Engine', () => {
  let mutator;
  let corpus;

  beforeAll(() => {
    mutator = new AdversarialMutator();
    corpus = getCorpusScenarios();
  });

  test('ATTACK_CATEGORIES contains all 5 attack vectors including ANTI_HALLUCINATION', () => {
    expect(ATTACK_CATEGORIES.ANTI_HALLUCINATION).toBe('ANTI_HALLUCINATION');
    expect(ATTACK_CATEGORIES.SECURITY_INJECTIONS).toBe('SECURITY_INJECTIONS');
    expect(ATTACK_CATEGORIES.BOUNDARY_EXTREMA).toBe('BOUNDARY_EXTREMA');
    expect(ATTACK_CATEGORIES.TYPE_CONFUSION).toBe('TYPE_CONFUSION');
    expect(ATTACK_CATEGORIES.RESOURCE_DOS).toBe('RESOURCE_DOS');
  });

  test('generateMutations produces valid mutated scenarios for Anti-Hallucination benchmark', () => {
    const ahScenario = corpus.find(s => s.scenarioId === 'SCENARIO_AH01_GHOST_NPM_IMPORT');
    expect(ahScenario).toBeDefined();

    const mutations = mutator.generateMutations(ahScenario, {
      categories: [ATTACK_CATEGORIES.ANTI_HALLUCINATION],
      depth: 2,
    });

    expect(mutations).toHaveLength(2);
    for (const m of mutations) {
      expect(m.parentScenarioId).toBe(ahScenario.scenarioId);
      expect(m.scenarioId).toContain('_MUT_ANTI_HALLUCINATION_');
      expect(m.verificationCommand).toBeDefined();
      expect(m.verificationCommand.args[1].length).toBeGreaterThanOrEqual(
        ahScenario.verificationCommand.args[1].length,
      );
    }
  });

  test('generateMutations produces valid mutated scenarios for Security benchmark', () => {
    const secScenario = corpus.find(s => s.scenarioId === 'SCENARIO_SEC01_COMMAND_INJECTION');
    expect(secScenario).toBeDefined();

    const mutations = mutator.generateMutations(secScenario, {
      categories: [ATTACK_CATEGORIES.SECURITY_INJECTIONS],
      depth: 3,
    });

    expect(mutations).toHaveLength(3);
    for (const m of mutations) {
      expect(m.category).toBe(ATTACK_CATEGORIES.SECURITY_INJECTIONS);
      expect(m.mutationPayload).toBeDefined();
    }
  });

  test('generateMutations produces valid mutated scenarios for Functional benchmark', () => {
    const fcScenario = corpus.find(s => s.scenarioId === 'SCENARIO_FC01_DEEP_EQUALITY');
    expect(fcScenario).toBeDefined();

    const mutations = mutator.generateMutations(fcScenario, {
      categories: [ATTACK_CATEGORIES.TYPE_CONFUSION, ATTACK_CATEGORIES.BOUNDARY_EXTREMA],
      depth: 2,
    });

    expect(mutations).toHaveLength(4);
  });
});
