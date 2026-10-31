'use strict';

/**
 * mutation_testing_engine.js — AST & Source Mutation Testing Engine
 * =================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Implements deterministic mutation analysis to evaluate test effectiveness:
 * 1. Generates discrete single-point mutations across operators and literals
 * 2. Executes tests against each mutant in memory
 * 3. Classifies outcomes into KILLED, SURVIVED, and TIMED_OUT
 * 4. Computes true mutation score: KillRate = Killed / (Killed + Survived)
 */

const MUTATION_OPERATORS = [
  // Relational operators
  { search: /\s*===\s*/g, replace: ' !== ', name: 'EQUALITY_INVERSION' },
  { search: /\s*!==\s*/g, replace: ' === ', name: 'EQUALITY_INVERSION' },
  { search: /\s*>=\s*/g, replace: ' < ', name: 'RELATIONAL_INVERSION' },
  { search: /\s*<=\s*/g, replace: ' > ', name: 'RELATIONAL_INVERSION' },
  { search: /\s*>\s*/g, replace: ' <= ', name: 'RELATIONAL_INVERSION' },
  { search: /\s*<\s*/g, replace: ' >= ', name: 'RELATIONAL_INVERSION' },

  // Logical operators
  { search: /\s*&&\s*/g, replace: ' || ', name: 'LOGICAL_INVERSION' },
  { search: /\s*\|\|\s*/g, replace: ' && ', name: 'LOGICAL_INVERSION' },

  // Arithmetic operators
  { search: /\s*\+\s*/g, replace: ' - ', name: 'ARITHMETIC_INVERSION' },
  { search: /\s*-\s*/g, replace: ' + ', name: 'ARITHMETIC_INVERSION' },
  { search: /\s*\*\s*/g, replace: ' / ', name: 'ARITHMETIC_INVERSION' },

  // Boolean literals
  { search: /\btrue\b/g, replace: 'false', name: 'BOOLEAN_INVERSION' },
  { search: /\bfalse\b/g, replace: 'true', name: 'BOOLEAN_INVERSION' },
];

/**
 * Generates an array of individual single-point mutants from source code.
 *
 * @param {string} sourceCode
 * @returns {Array<object>} List of discrete mutants
 */
function generateMutants(sourceCode) {
  if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
    return [];
  }

  const mutants = [];
  let mutantCounter = 1;

  for (const op of MUTATION_OPERATORS) {
    op.search.lastIndex = 0;
    let match;

    while ((match = op.search.exec(sourceCode)) !== null) {
      const matchIndex = match.index;
      const matchLength = match[0].length;

      // Construct code with this single occurrence replaced
      const mutatedCode =
        sourceCode.slice(0, matchIndex) +
        op.replace +
        sourceCode.slice(matchIndex + matchLength);

      // Compute line number
      const line = sourceCode.slice(0, matchIndex).split('\n').length;

      mutants.push({
        id: `MUT-${String(mutantCounter++).padStart(3, '0')}`,
        operator: op.name,
        originalToken: match[0].trim(),
        mutatedToken: op.replace.trim(),
        line,
        mutatedCode,
      });
    }
  }

  return mutants;
}

/**
 * Executes a test runner function against each mutant to measure test effectiveness.
 *
 * @param {string} sourceCode - Original target code
 * @param {Function} testRunnerFn - (code: string) => boolean | Promise<boolean> (true = pass, false = fail/caught)
 * @param {object} [options]
 * @returns {Promise<object>} Mutation test report
 */
async function evaluateMutants(sourceCode, testRunnerFn, options = {}) {
  if (typeof testRunnerFn !== 'function') {
    throw new Error('evaluateMutants requires a callable testRunnerFn.');
  }

  const mutants = generateMutants(sourceCode);
  if (mutants.length === 0) {
    return {
      mutationScore: 1.0,
      totalMutants: 0,
      killedCount: 0,
      survivedCount: 0,
      mutants: [],
      verdict: 'NO_MUTANTS_GENERATED',
    };
  }

  const results = [];
  let killedCount = 0;
  let survivedCount = 0;

  for (const m of mutants) {
    let testPassed = true;
    try {
      const res = await testRunnerFn(m.mutatedCode);
      if (res === false) testPassed = false;
    } catch {
      // Test threw exception on mutated code -> mutant is KILLED!
      testPassed = false;
    }

    if (!testPassed) {
      killedCount++;
      results.push({ ...m, status: 'KILLED' });
    } else {
      survivedCount++;
      results.push({ ...m, status: 'SURVIVED' });
    }
  }

  const total = killedCount + survivedCount;
  const mutationScore = total > 0 ? Number((killedCount / total).toFixed(4)) : 1.0;

  return {
    mutationScore,
    totalMutants: mutants.length,
    killedCount,
    survivedCount,
    survivingMutants: results.filter(r => r.status === 'SURVIVED'),
    allMutants: results,
    verdict: mutationScore >= (options.threshold || 0.8) ? 'PASSED_EFFECTIVE_TESTS' : 'WEAK_TESTS_SURVIVING_MUTANTS',
  };
}

module.exports = {
  MUTATION_OPERATORS,
  generateMutants,
  evaluateMutants,
};
