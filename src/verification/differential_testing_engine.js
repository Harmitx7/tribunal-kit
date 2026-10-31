'use strict';

/**
 * differential_testing_engine.js — Differential & Metamorphic Testing Engine
 * ===========================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Implements dual-path and property relation verification:
 * 1. Differential Execution: Compares candidate implementation against reference oracle
 * 2. Metamorphic Relations: Tests mathematical invariants across related input pairs
 *    without requiring an absolute oracle (e.g. Idempotence, Commutativity, Monotonicity)
 */

/**
 * Performs deep structural comparison between two values, supporting floating-point tolerance.
 */
function areEquivalent(a, b, epsilon = 1e-7) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (isNaN(a) && isNaN(b)) return true;
    return Math.abs(a - b) <= epsilon;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areEquivalent(a[i], b[i], epsilon)) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const k of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!areEquivalent(a[k], b[k], epsilon)) return false;
  }

  return true;
}

/**
 * Compares candidate function execution against an independent reference function.
 *
 * @param {Function} candidateFn - The implementation under test
 * @param {Function} referenceFn - The trusted reference oracle implementation
 * @param {Array<Array<any>>} inputsList - List of input parameter tuples
 * @param {object} [options]
 * @returns {object} Differential testing report
 */
function runDifferentialTest(candidateFn, referenceFn, inputsList, options = {}) {
  if (typeof candidateFn !== 'function' || typeof referenceFn !== 'function') {
    throw new Error('runDifferentialTest requires callable candidateFn and referenceFn.');
  }
  if (!Array.isArray(inputsList)) {
    throw new Error('runDifferentialTest requires an array of input argument tuples.');
  }

  const mismatches = [];
  const epsilon = options.epsilon || 1e-7;

  inputsList.forEach((args, idx) => {
    let candRes, refRes;
    let candErr = null;
    let refErr = null;

    try {
      candRes = candidateFn(...args);
    } catch (err) {
      candErr = err.message;
    }

    try {
      refRes = referenceFn(...args);
    } catch (err) {
      refErr = err.message;
    }

    if (candErr !== refErr || (!candErr && !areEquivalent(candRes, refRes, epsilon))) {
      mismatches.push({
        inputIndex: idx,
        inputArgs: args,
        candidateOutput: candErr ? `Error: ${candErr}` : candRes,
        referenceOutput: refErr ? `Error: ${refErr}` : refRes,
      });
    }
  });

  return {
    isEquivalent: mismatches.length === 0,
    totalCases: inputsList.length,
    matchCount: inputsList.length - mismatches.length,
    mismatchesCount: mismatches.length,
    mismatches,
  };
}

/**
 * Verifies a metamorphic relation across related inputs without requiring an absolute oracle.
 *
 * @param {Function} targetFn - The function under test
 * @param {Function} inputGenerator - Generates a single input argument tuple
 * @param {object} metamorphicRelation - Relation definition
 * @param {string} metamorphicRelation.name - e.g. "Idempotence", "Commutativity", "Additivity"
 * @param {Function} metamorphicRelation.transformInput - (args) => transformedArgs
 * @param {Function} metamorphicRelation.relationCheck - (yOriginal, yTransformed, originalArgs, transformedArgs) => boolean
 * @param {object} [options]
 * @param {number} [options.runs=50]
 * @returns {object} Metamorphic verification report
 */
function verifyMetamorphicRelation(targetFn, inputGenerator, metamorphicRelation, options = {}) {
  if (typeof targetFn !== 'function' || typeof inputGenerator !== 'function') {
    throw new Error('verifyMetamorphicRelation requires callable targetFn and inputGenerator.');
  }
  if (!metamorphicRelation || typeof metamorphicRelation.transformInput !== 'function' || typeof metamorphicRelation.relationCheck !== 'function') {
    throw new Error('metamorphicRelation must provide transformInput and relationCheck functions.');
  }

  const runs = options.runs || 50;
  const violations = [];

  for (let i = 0; i < runs; i++) {
    const originalArgs = inputGenerator(i);
    const transformedArgs = metamorphicRelation.transformInput(originalArgs);

    let yOriginal, yTransformed;
    try {
      yOriginal = targetFn(...originalArgs);
      yTransformed = targetFn(...transformedArgs);
    } catch (err) {
      violations.push({
        run: i,
        error: `Execution failed: ${err.message}`,
        originalArgs,
        transformedArgs,
      });
      continue;
    }

    const holds = metamorphicRelation.relationCheck(yOriginal, yTransformed, originalArgs, transformedArgs);
    if (!holds) {
      violations.push({
        run: i,
        originalArgs,
        transformedArgs,
        yOriginal,
        yTransformed,
        relation: metamorphicRelation.name || 'MetamorphicRelation',
      });
    }
  }

  return {
    relationHeld: violations.length === 0,
    relationName: metamorphicRelation.name || 'MetamorphicRelation',
    totalRuns: runs,
    violationCount: violations.length,
    violations,
  };
}

module.exports = {
  areEquivalent,
  runDifferentialTest,
  verifyMetamorphicRelation,
};
