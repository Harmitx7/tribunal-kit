'use strict';

/**
 * phase10_outcome_optimization_engine.test.js
 *
 * Jest test suite wrapper executing the Phase 10 Outcome Optimization Engine Test Suite
 * (tests/test_outcome_optimization_engine.js) covering 30 outcome optimization assertions.
 */

const path = require('path');
const { execFileSync } = require('child_process');

describe('Phase 10 Outcome Optimization Engine Test Suite', () => {
  it('executes all 30 Phase 10 outcome optimization assertions cleanly', () => {
    const scriptPath = path.resolve(__dirname, '../../tests/test_outcome_optimization_engine.js');
    const output = execFileSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
    });
    expect(output).toContain('PHASE 10 TEST RESULTS: 30/30 passed, 0 failed');
  }, 30000);
});
