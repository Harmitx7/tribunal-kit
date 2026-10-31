'use strict';

const vm = require('node:vm');

const {
  generateMutants,
  evaluateMutants,
} = require('../../src/verification');

describe('Mutation Testing & Test Effectiveness Engine', () => {
  const targetFunctionCode = `
function isEligible(age, isVip) {
  if (age >= 18 && isVip === true) {
    return true;
  }
  return false;
}
`;

  test('generateMutants produces discrete single-point mutations across operators', () => {
    const mutants = generateMutants(targetFunctionCode);
    expect(mutants.length).toBeGreaterThanOrEqual(3);

    const operators = mutants.map(m => m.operator);
    expect(operators).toContain('RELATIONAL_INVERSION');
    expect(operators).toContain('LOGICAL_INVERSION');
    expect(operators).toContain('EQUALITY_INVERSION');
    expect(operators).toContain('BOOLEAN_INVERSION');

    // Ensure line numbers are populated
    expect(mutants.every(m => m.line > 0)).toBe(true);
  });

  test('evaluateMutants detects SURVIVING mutants when test suite is weak', async () => {
    // Weak test: Only calls function without asserting return values!
    const weakTestRunner = (mutatedCode) => {
      // Execute the function in an isolated context but assert nothing about edge cases
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(mutatedCode, sandbox, { timeout: 1000 });
      if (typeof sandbox.isEligible === 'function') {
        sandbox.isEligible(25, true); // Executes without throwing
      }
      return true; // Blindly claims pass!
    };

    const report = await evaluateMutants(targetFunctionCode, weakTestRunner);
    expect(report.survivedCount).toBeGreaterThan(0);
    expect(report.mutationScore).toBeLessThan(1.0);
    expect(report.verdict).toBe('WEAK_TESTS_SURVIVING_MUTANTS');
    expect(report.survivingMutants.length).toBe(report.survivedCount);
  });

  test('evaluateMutants confirms all mutants KILLED when test suite has thorough assertions', async () => {
    // Strict test: Tests all edge cases and boundary conditions
    const strictTestRunner = (mutatedCode) => {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(mutatedCode, sandbox, { timeout: 1000 });
      const fn = sandbox.isEligible;
      if (typeof fn !== 'function') return false;

      // Test boundary 18
      if (fn(18, true) !== true) return false;
      // Test below boundary 17
      if (fn(17, true) !== false) return false;
      // Test false VIP
      if (fn(20, false) !== false) return false;
      // Test underage false VIP
      if (fn(16, false) !== false) return false;

      return true;
    };

    const report = await evaluateMutants(targetFunctionCode, strictTestRunner);
    expect(report.survivedCount).toBe(0);
    expect(report.killedCount).toBe(report.totalMutants);
    expect(report.mutationScore).toBe(1.0);
    expect(report.verdict).toBe('PASSED_EFFECTIVE_TESTS');
  });
});
