'use strict';

/**
 * property_testing_engine.js — Deterministic Property-Based Testing & Shrinking Engine
 * ====================================================================================
 * Domain: Software Verification & Formal Methods (software-verification-formal-methods)
 *
 * Implements deterministic QuickCheck-style invariant testing:
 * 1. PRNG with deterministic seeding (100% reproducible test generation)
 * 2. Composable Arbitrary Generators (integers, floats, booleans, strings, arrays, boundaries)
 * 3. Systematic counterexample shrinking to produce minimal failing test cases
 */

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 */
function createPRNG(seed = 1337) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Composable Arbitrary Generators
 */
const arb = {
  integer(options = {}) {
    const min = options.min !== undefined ? options.min : -1000;
    const max = options.max !== undefined ? options.max : 1000;
    return {
      generate(rand, step = 0) {
        // Explicitly inject boundary conditions on initial runs
        if (step === 0 && min <= 0 && max >= 0) return 0;
        if (step === 1 && min <= 1 && max >= 1) return 1;
        if (step === 2 && min <= -1 && max >= -1) return -1;
        if (step === 3) return min;
        if (step === 4) return max;
        return Math.floor(rand() * (max - min + 1)) + min;
      },
      shrink(val) {
        if (val === 0) return [];
        const candidates = [];
        if (val > 0) {
          candidates.push(0);
          if (val > 1) candidates.push(Math.floor(val / 2));
          candidates.push(val - 1);
        } else {
          candidates.push(0);
          if (val < -1) candidates.push(Math.ceil(val / 2));
          candidates.push(val + 1);
        }
        return candidates;
      },
    };
  },

  boolean() {
    return {
      generate(rand) {
        return rand() > 0.5;
      },
      shrink(val) {
        return val === true ? [false] : [];
      },
    };
  },

  string(options = {}) {
    const minLen = options.minLength !== undefined ? options.minLength : 0;
    const maxLen = options.maxLength !== undefined ? options.maxLength : 20;
    const chars = options.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_- ';
    return {
      generate(rand, step = 0) {
        if (step === 0 && minLen === 0) return '';
        const len = Math.floor(rand() * (maxLen - minLen + 1)) + minLen;
        let res = '';
        for (let i = 0; i < len; i++) {
          res += chars[Math.floor(rand() * chars.length)];
        }
        return res;
      },
      shrink(val) {
        if (val.length === 0) return [];
        const candidates = [];
        if (minLen === 0) candidates.push('');
        if (val.length > minLen) {
          candidates.push(val.slice(0, Math.floor(val.length / 2)));
          candidates.push(val.slice(0, -1));
        }
        return candidates;
      },
    };
  },

  array(elementArb, options = {}) {
    const minLen = options.minLength !== undefined ? options.minLength : 0;
    const maxLen = options.maxLength !== undefined ? options.maxLength : 10;
    return {
      generate(rand, step = 0) {
        if (step === 0 && minLen === 0) return [];
        const len = Math.floor(rand() * (maxLen - minLen + 1)) + minLen;
        const arr = [];
        for (let i = 0; i < len; i++) {
          arr.push(elementArb.generate(rand, step));
        }
        return arr;
      },
      shrink(arr) {
        if (arr.length <= minLen) return [];
        const candidates = [];
        if (minLen === 0) candidates.push([]);
        if (arr.length > 1) {
          candidates.push(arr.slice(0, Math.floor(arr.length / 2)));
          candidates.push(arr.slice(1));
        }
        // Shrink individual elements
        for (let i = 0; i < arr.length; i++) {
          const elementShrinks = elementArb.shrink ? elementArb.shrink(arr[i]) : [];
          for (const sh of elementShrinks) {
            const copy = [...arr];
            copy[i] = sh;
            candidates.push(copy);
          }
        }
        return candidates;
      },
    };
  },
};

/**
 * Systematically minimizes a counterexample by applying shrink candidates.
 */
function shrinkCounterexample(propertyFn, generatorArgs, arbs) {
  let current = [...generatorArgs];
  let steps = 0;
  const maxSteps = 100;

  let improved = true;
  while (improved && steps < maxSteps) {
    improved = false;
    for (let i = 0; i < current.length; i++) {
      const arbInstance = arbs[i];
      if (!arbInstance || typeof arbInstance.shrink !== 'function') continue;

      const shrinks = arbInstance.shrink(current[i]);
      for (const candidate of shrinks) {
        steps++;
        const testArgs = [...current];
        testArgs[i] = candidate;

        let failed = false;
        try {
          const res = propertyFn(...testArgs);
          if (res === false) failed = true;
        } catch {
          failed = true;
        }

        if (failed) {
          current = testArgs;
          improved = true;
          break; // Greedily adopt simpler counterexample
        }
      }
      if (improved) break;
    }
  }

  return {
    shrunkArgs: current,
    shrinkSteps: steps,
  };
}

/**
 * Checks an invariant property over N generated test cases.
 *
 * @param {Array<object>} arbsList - List of arbitrary generators for property parameters
 * @param {Function} propertyFn - Invariant function returning boolean (true = holds, false = fails)
 * @param {object} [options]
 * @param {number} [options.runs=100] - Number of inputs to generate
 * @param {number} [options.seed=1337] - Deterministic PRNG seed
 * @returns {object} Property test execution report
 */
function assertProperty(arbsList, propertyFn, options = {}) {
  if (!Array.isArray(arbsList) || typeof propertyFn !== 'function') {
    throw new Error('assertProperty requires an array of generators and a property function.');
  }

  const runs = options.runs || 100;
  const seed = options.seed !== undefined ? options.seed : 1337;
  const rand = createPRNG(seed);

  for (let run = 0; run < runs; run++) {
    const generatedArgs = arbsList.map(a => a.generate(rand, run));
    let passed = true;
    let failureError = null;

    try {
      const outcome = propertyFn(...generatedArgs);
      if (outcome === false) passed = false;
    } catch (err) {
      passed = false;
      failureError = err.message;
    }

    if (!passed) {
      // Counterexample found! Shrink to minimal reproducible case
      const shrinkResult = shrinkCounterexample(propertyFn, generatedArgs, arbsList);

      return {
        passed: false,
        runsCompleted: run + 1,
        totalRunsRequested: runs,
        seed,
        counterexample: generatedArgs,
        shrunkCounterexample: shrinkResult.shrunkArgs,
        shrinkSteps: shrinkResult.shrinkSteps,
        failureReason: failureError || 'Property assertion returned false.',
      };
    }
  }

  return {
    passed: true,
    runsCompleted: runs,
    totalRunsRequested: runs,
    seed,
  };
}

module.exports = {
  createPRNG,
  arb,
  assertProperty,
  shrinkCounterexample,
};
