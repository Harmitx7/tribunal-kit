'use strict';

/**
 * benchmarks/corpus/index.js — Benchmark Corpus Loader
 * =====================================================
 * Phase 1 RSIE: Sealed Benchmark Vault
 *
 * Aggregates all scenario modules from the corpus directory, validates
 * each scenario against the required contract, and exports a unified
 * getCorpusScenarios() function compatible with EvaluationRunner.
 *
 * Scenario Contract:
 * - scenarioId: string (unique identifier)
 * - category: string
 * - difficulty: 'Low' | 'Medium' | 'High' | 'Critical'
 * - impactTier: 1 | 2 | 3
 * - taskDescription: string
 * - targetFile: string (relative path inside sandbox, e.g. 'scratch/foo.js')
 * - initialState: string (starting code)
 * - safeProposal: string (known-good implementation)
 * - unsafeProposal: string (known-bad implementation)
 * - verificationCommand: { cmd: string, args: string[] }
 * - timeoutMs: number
 */

const path = require('path');

const REQUIRED_FIELDS = [
  'scenarioId',
  'category',
  'difficulty',
  'impactTier',
  'taskDescription',
  'targetFile',
  'initialState',
  'safeProposal',
  'unsafeProposal',
  'verificationCommand',
  'timeoutMs',
];

const VALID_DIFFICULTIES = new Set(['Low', 'Medium', 'High', 'Critical']);
const VALID_TIERS = new Set([1, 2, 3]);

/**
 * Validates a single scenario object against the contract.
 * @param {object} scenario
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateScenario(scenario) {
  const errors = [];

  if (!scenario || typeof scenario !== 'object') {
    return { valid: false, errors: ['Scenario must be a non-null object.'] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (scenario[field] === undefined || scenario[field] === null) {
      errors.push(`Missing required field: "${field}".`);
    }
  }

  if (typeof scenario.scenarioId !== 'string' || scenario.scenarioId.trim().length === 0) {
    errors.push('scenarioId must be a non-empty string.');
  }

  if (scenario.difficulty && !VALID_DIFFICULTIES.has(scenario.difficulty)) {
    errors.push(`Invalid difficulty "${scenario.difficulty}". Must be one of: ${[...VALID_DIFFICULTIES].join(', ')}.`);
  }

  if (scenario.impactTier !== undefined && !VALID_TIERS.has(scenario.impactTier)) {
    errors.push(`Invalid impactTier "${scenario.impactTier}". Must be 1, 2, or 3.`);
  }

  if (scenario.verificationCommand) {
    if (typeof scenario.verificationCommand.cmd !== 'string') {
      errors.push('verificationCommand.cmd must be a string.');
    }
    if (!Array.isArray(scenario.verificationCommand.args)) {
      errors.push('verificationCommand.args must be an array.');
    }
  }

  if (typeof scenario.timeoutMs !== 'number' || scenario.timeoutMs <= 0) {
    errors.push('timeoutMs must be a positive number.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Loads scenario modules from the corpus directory.
 * Each module must export a SCENARIOS array.
 */
function loadCorpusModules() {
  const moduleFiles = [
    './anti_hallucination',
    './security_vulnerabilities',
    './functional_correctness',
    './edge_cases_resilience',
  ];

  const allScenarios = [];
  const loadErrors = [];

  for (const modPath of moduleFiles) {
    try {
      const mod = require(modPath);
      const scenarios = mod.SCENARIOS || mod.default || [];

      if (!Array.isArray(scenarios)) {
        loadErrors.push(`Module "${modPath}" does not export a SCENARIOS array.`);
        continue;
      }

      for (const scenario of scenarios) {
        const validation = validateScenario(scenario);
        if (!validation.valid) {
          loadErrors.push(
            `Scenario "${scenario.scenarioId || 'UNKNOWN'}" in "${modPath}": ${validation.errors.join('; ')}`,
          );
        }
        allScenarios.push(scenario);
      }
    } catch (err) {
      loadErrors.push(`Failed to load corpus module "${modPath}": ${err.message}`);
    }
  }

  // Validate uniqueness of scenarioIds
  const idSet = new Set();
  for (const s of allScenarios) {
    if (idSet.has(s.scenarioId)) {
      loadErrors.push(`Duplicate scenarioId: "${s.scenarioId}".`);
    }
    idSet.add(s.scenarioId);
  }

  return { scenarios: allScenarios, errors: loadErrors };
}

/**
 * Returns all validated corpus scenarios.
 * @returns {object[]}
 */
function getCorpusScenarios() {
  const { scenarios } = loadCorpusModules();
  return scenarios;
}

/**
 * Returns corpus scenarios with full validation report.
 * @returns {{ scenarios: object[], errors: string[], stats: object }}
 */
function getCorpusWithValidation() {
  const { scenarios, errors } = loadCorpusModules();

  const categoryCounts = {};
  for (const s of scenarios) {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  }

  return {
    scenarios,
    errors,
    stats: {
      total: scenarios.length,
      categories: categoryCounts,
      valid: errors.length === 0,
    },
  };
}

module.exports = {
  getCorpusScenarios,
  getCorpusWithValidation,
  validateScenario,
  REQUIRED_FIELDS,
};
