'use strict';

/**
 * phase10_outcome_optimization_engine.test.js
 *
 * Integrated Jest test suite executing the Phase 10 Outcome Optimization Engine Test Suite
 * (tests/test_outcome_optimization_engine.js) covering 30 outcome optimization tests
 * with individual test-level reporting, native assert evaluation, and full code-coverage
 * attribution, plus standalone CLI runner contract certification.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { runSuites } = require('../../tests/test_outcome_optimization_engine.js');

describe('Phase 10 Outcome Optimization Engine Test Suite (Native Jest Execution)', () => {
  runSuites({
    suite: (name, fn) => {
      describe(name, fn);
    },
    test: (name, fn) => {
      it(name, fn);
    },
  });
});

describe('Phase 10 Outcome Optimization Engine CLI Runner Contract', () => {
  it('executes standalone CLI runner cleanly with exit code 0 and exact banner', () => {
    const scriptPath = path.resolve(__dirname, '../../tests/test_outcome_optimization_engine.js');
    const output = execFileSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
    });
    expect(output).toContain('PHASE 10 TEST RESULTS: 30/30 passed, 0 failed');
  }, 30000);
});
