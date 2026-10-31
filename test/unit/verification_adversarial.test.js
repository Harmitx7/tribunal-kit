'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const {
  withContract,
  ContractViolationError,
  assertProperty,
  arb,
  verifyFsmCompleteness,
  createFsmInstance,
  generateMutants,
  evaluateMutants,
  runDifferentialTest,
  verifyMetamorphicRelation,
} = require('../../src/verification');

describe('Software Verification Adversarial Dataset (12/12 Defect Classes)', () => {
  const fixturePath = path.resolve(__dirname, '../fixtures/software_verification/verification_cases_dataset_v1.json');
  const dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  test('dataset loads and contains all 12 canonical verification cases', () => {
    expect(dataset.cases.length).toBe(12);
  });

  // VERIF-CASE-01: Boundary condition
  test('VERIF-CASE-01: Boundary condition in binary search is verified', () => {
    const c = dataset.cases.find(x => x.id === 'VERIF-CASE-01');
    const binarySearch = (arr, target) => {
      let low = 0;
      let high = arr.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
      }
      return -1;
    };

    expect(binarySearch(c.inputFixture.arr, c.inputFixture.target)).toBe(4);
  });

  // VERIF-CASE-02: Precondition violation
  test('VERIF-CASE-02: Precondition violation on zero denominator is caught', () => {
    const safeDivide = withContract(
      (a, b) => a / b,
      { pre: [(a, b) => b !== 0] }
    );

    expect(() => safeDivide(10, 0)).toThrow(ContractViolationError);
  });

  // VERIF-CASE-03: Postcondition violation
  test('VERIF-CASE-03: Postcondition violation on balance overdraft is caught', () => {
    let balance = 50;
    const withdraw = withContract(
      (amt) => {
        balance -= amt;
        return balance;
      },
      { post: [(res) => res >= 0] }
    );

    expect(() => withdraw(100)).toThrow(ContractViolationError);
  });

  // VERIF-CASE-04: State invariant violation
  test('VERIF-CASE-04: State invariant violation in FSM is enforced', () => {
    const fsm = {
      states: ['UNAUTH', 'AUTHENTICATED'],
      initialState: 'UNAUTH',
      terminalStates: [],
      transitions: [
        { from: 'UNAUTH', event: 'LOGIN', to: 'AUTHENTICATED', action: (ctx, p) => ({ ...ctx, userId: p.userId }) },
      ],
      invariants: [
        { state: 'AUTHENTICATED', check: (ctx) => ctx.userId !== null && ctx.userId !== undefined },
      ],
    };

    const instance = createFsmInstance(fsm, {});
    // Login with null userId violates state invariant!
    expect(() => instance.transition('LOGIN', { userId: null })).toThrow(/State invariant violated/);
  });

  // VERIF-CASE-05: Property-based sorting
  test('VERIF-CASE-05: Universal property of sorting idempotence holds', () => {
    const sortFn = (arr) => [...arr].sort((a, b) => a - b);
    const result = assertProperty(
      [arb.array(arb.integer({ min: -100, max: 100 }))],
      (arr) => {
        const sorted = sortFn(arr);
        const doubleSorted = sortFn(sorted);
        return JSON.stringify(sorted) === JSON.stringify(doubleSorted);
      },
      { runs: 50, seed: 1234 }
    );

    expect(result.passed).toBe(true);
  });

  // VERIF-CASE-06: Surviving mutant
  test('VERIF-CASE-06: Surviving mutant is detected under weak test assertion', async () => {
    const code = 'function discount(total) { if (total > 100) return total * 0.1; return 0; }';
    const weakRunner = () => true; // Never asserts!

    const report = await evaluateMutants(code, weakRunner);
    expect(report.survivedCount).toBeGreaterThan(0);
    expect(report.verdict).toBe('WEAK_TESTS_SURVIVING_MUTANTS');
  });

  // VERIF-CASE-07: Killed mutant
  test('VERIF-CASE-07: All mutants KILLED under comprehensive test suite', async () => {
    const code = 'function isOver18(age) { if (age >= 18) return true; return false; }';
    const strictRunner = (mutatedCode) => {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(mutatedCode, sandbox, { timeout: 1000 });
      const fn = sandbox.isOver18;
      if (typeof fn !== 'function') return false;
      if (fn(18) !== true) return false;
      if (fn(17) !== false) return false;
      return true;
    };

    const report = await evaluateMutants(code, strictRunner);
    expect(report.survivedCount).toBe(0);
    expect(report.mutationScore).toBe(1.0);
    expect(report.verdict).toBe('PASSED_EFFECTIVE_TESTS');
  });

  // VERIF-CASE-08: FSM unreachable state
  test('VERIF-CASE-08: FSM unreachable state is detected statically', () => {
    const fsm = {
      states: ['DRAFT', 'PENDING', 'FULFILLED', 'ORPHAN'],
      initialState: 'DRAFT',
      terminalStates: ['FULFILLED'],
      transitions: [
        { from: 'DRAFT', event: 'SUBMIT', to: 'PENDING' },
        { from: 'PENDING', event: 'FULFILL', to: 'FULFILLED' },
      ],
    };

    const report = verifyFsmCompleteness(fsm);
    expect(report.isComplete).toBe(false);
    expect(report.unreachableStates).toContain('ORPHAN');
  });

  // VERIF-CASE-09: FSM unintended deadlock
  test('VERIF-CASE-09: FSM unintended deadlock is detected statically', () => {
    const fsm = {
      states: ['START', 'PROCESSING', 'DONE'],
      initialState: 'START',
      terminalStates: ['DONE'],
      transitions: [
        { from: 'START', event: 'BEGIN', to: 'PROCESSING' },
        // PROCESSING has zero outgoing transitions and is NOT terminal!
      ],
    };

    const report = verifyFsmCompleteness(fsm);
    expect(report.isComplete).toBe(false);
    expect(report.deadlocks).toContain('PROCESSING');
  });

  // VERIF-CASE-10: Differential equivalence
  test('VERIF-CASE-10: Differential equivalence verified across reference implementations', () => {
    const ref = (str) => JSON.parse(str);
    const cand = (str) => JSON.parse(str);

    const report = runDifferentialTest(cand, ref, [
      ['{}'],
      ['{"a":1}'],
      ['{"b":[1,2,3]}'],
    ]);

    expect(report.isEquivalent).toBe(true);
    expect(report.matchCount).toBe(3);
  });

  // VERIF-CASE-11: Metamorphic relation
  test('VERIF-CASE-11: Metamorphic idempotence relation holds for string trimming', () => {
    const relation = {
      name: 'TrimIdempotence',
      transformInput: ([s]) => [s.trim()],
      relationCheck: (y1, y2) => y1 === y2,
    };

    const gen = (i) => [`   test-${i}   `];
    const report = verifyMetamorphicRelation((s) => s.trim(), gen, relation, { runs: 20 });

    expect(report.relationHeld).toBe(true);
  });

  // VERIF-CASE-12: Breaking schema change
  test('VERIF-CASE-12: Breaking schema change is flagged during contract diff', () => {
    const baseline = { id: 'string', email: 'string' };
    const breakingCandidate = { id: 'string' }; // Removed email!

    const isBreaking = Object.keys(baseline).some(k => !Object.prototype.hasOwnProperty.call(breakingCandidate, k));
    expect(isBreaking).toBe(true);
  });
});
