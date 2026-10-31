'use strict';

const {
  areEquivalent,
  runDifferentialTest,
  verifyMetamorphicRelation,
} = require('../../src/verification');

describe('Differential & Metamorphic Testing Engine', () => {
  test('areEquivalent compares numbers with floating-point tolerance and deep objects', () => {
    expect(areEquivalent(0.1 + 0.2, 0.3)).toBe(true);
    expect(areEquivalent({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(areEquivalent({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('runDifferentialTest validates candidate against reference implementation', () => {
    // Reference: standard Math.pow
    const referencePow = (base, exp) => Math.pow(base, exp);

    // Candidate: loop-based pow
    const candidatePow = (base, exp) => {
      let res = 1;
      for (let i = 0; i < exp; i++) res *= base;
      return res;
    };

    const inputs = [
      [2, 0],
      [2, 1],
      [2, 3],
      [5, 2],
      [10, 4],
    ];

    const report = runDifferentialTest(candidatePow, referencePow, inputs);
    expect(report.isEquivalent).toBe(true);
    expect(report.matchCount).toBe(5);
    expect(report.mismatchesCount).toBe(0);
  });

  test('runDifferentialTest flags discrepancies when candidate deviates', () => {
    const reference = (x) => x * 2;
    const buggyCandidate = (x) => (x === 5 ? 11 : x * 2); // Bug on x = 5

    const inputs = [[1], [2], [5], [10]];
    const report = runDifferentialTest(buggyCandidate, reference, inputs);

    expect(report.isEquivalent).toBe(false);
    expect(report.mismatchesCount).toBe(1);
    expect(report.mismatches[0].inputArgs).toEqual([5]);
    expect(report.mismatches[0].candidateOutput).toBe(11);
    expect(report.mismatches[0].referenceOutput).toBe(10);
  });

  test('verifyMetamorphicRelation verifies mathematical idempotence relation', () => {
    // Invariant: Math.abs(Math.abs(x)) === Math.abs(x)
    const idempotenceRelation = {
      name: 'Idempotence',
      transformInput: ([x]) => [Math.abs(x)],
      relationCheck: (yOriginal, yTransformed) => yOriginal === yTransformed,
    };

    const inputGenerator = (run) => [(run - 25) * 4];

    const report = verifyMetamorphicRelation(Math.abs, inputGenerator, idempotenceRelation, { runs: 50 });
    expect(report.relationHeld).toBe(true);
    expect(report.violationCount).toBe(0);
  });

  test('verifyMetamorphicRelation catches broken metamorphic relations', () => {
    // Flawed function that increments each time: f(x) = x + 1 (NOT idempotent!)
    const nonIdempotent = (x) => x + 1;

    const idempotenceRelation = {
      name: 'Idempotence',
      transformInput: ([x]) => [nonIdempotent(x)],
      relationCheck: (yOriginal, yTransformed) => yOriginal === yTransformed,
    };

    const inputGenerator = (run) => [run];

    const report = verifyMetamorphicRelation(nonIdempotent, inputGenerator, idempotenceRelation, { runs: 10 });
    expect(report.relationHeld).toBe(false);
    expect(report.violationCount).toBe(10);
  });
});
