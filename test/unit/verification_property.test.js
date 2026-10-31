'use strict';

const {
  createPRNG,
  arb,
  assertProperty,
} = require('../../src/verification');

describe('Property-Based Testing & Shrinking Engine', () => {
  test('createPRNG produces 100% deterministic sequence from same seed', () => {
    const prng1 = createPRNG(42);
    const prng2 = createPRNG(42);

    const seq1 = [prng1(), prng1(), prng1(), prng1()];
    const seq2 = [prng2(), prng2(), prng2(), prng2()];

    expect(seq1).toEqual(seq2);
  });

  test('arb.integer generates within bounds and includes boundaries', () => {
    const intGen = arb.integer({ min: -50, max: 50 });
    const rand = createPRNG(1234);

    const vals = [];
    for (let i = 0; i < 20; i++) {
      vals.push(intGen.generate(rand, i));
    }

    expect(vals).toContain(0);
    expect(vals).toContain(1);
    expect(vals).toContain(-1);
    expect(vals).toContain(-50);
    expect(vals).toContain(50);
    expect(vals.every(v => v >= -50 && v <= 50)).toBe(true);
  });

  test('assertProperty verifies universal invariant holding across 100 runs', () => {
    // Invariant: Addition commutativity: a + b === b + a
    const result = assertProperty(
      [arb.integer(), arb.integer()],
      (a, b) => a + b === b + a,
      { runs: 100, seed: 999 }
    );

    expect(result.passed).toBe(true);
    expect(result.runsCompleted).toBe(100);
  });

  test('assertProperty catches counterexample and automatically shrinks to minimal input', () => {
    // Flawed property: All integers are < 42
    const result = assertProperty(
      [arb.integer({ min: 0, max: 500 })],
      (x) => x < 42,
      { runs: 100, seed: 101 }
    );

    expect(result.passed).toBe(false);
    expect(result.counterexample).toBeDefined();
    // Shrunk counterexample should be exactly 42 (the smallest integer violating x < 42)
    expect(result.shrunkCounterexample[0]).toBe(42);
    expect(result.shrinkSteps).toBeGreaterThan(0);
  });

  test('arb.array property testing: array concatenation length invariant', () => {
    const result = assertProperty(
      [arb.array(arb.integer()), arb.array(arb.integer())],
      (arr1, arr2) => arr1.concat(arr2).length === arr1.length + arr2.length,
      { runs: 50, seed: 777 }
    );

    expect(result.passed).toBe(true);
  });
});
