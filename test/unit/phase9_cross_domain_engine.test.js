'use strict';

/**
 * phase9_cross_domain_engine.test.js
 *
 * Integrated Jest test suite executing the Phase 9 Cross-Domain Engine Test Suite
 * (tests/test_cross_domain_engine.js) covering 94 domain interaction assertions
 * with individual assertion-level reporting and full code-coverage attribution,
 * plus standalone CLI runner contract certification.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { runSuites } = require('../../tests/test_cross_domain_engine.js');

describe('Phase 9 Cross-Domain Engine Test Suite (Native Jest Execution)', () => {
  runSuites({
    suite: (name, fn) => {
      describe(name, fn);
    },
    assert: (condition, name) => {
      it(name, () => {
        expect(condition).toBe(true);
      });
    },
  });
});

describe('Phase 9 Cross-Domain Engine CLI Runner Contract', () => {
  it('executes standalone CLI runner cleanly with exit code 0 and exact banner', () => {
    const scriptPath = path.resolve(__dirname, '../../tests/test_cross_domain_engine.js');
    const output = execFileSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../..'),
    });
    expect(output).toContain('PHASE 9 TEST RESULTS: 94/94 passed, 0 failed');
  }, 30000);
});
