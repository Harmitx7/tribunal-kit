'use strict';

const engine = require('../../.agent/scripts/skill_coverage_expansion_engine');
const { extractTestableClaims } = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Phase 24 — Skill Coverage Expansion Engine Unit Tests', () => {
  test('authorExpansionTest creates independent test for secondary claim with quality >= 80', () => {
    const claims = extractTestableClaims('api-patterns');
    const targetClaim = claims.find(c => c.id === 'CLM-api-patterns-INP-target_file');
    expect(targetClaim).toBeDefined();

    const testSpec = engine.authorExpansionTest('api-patterns', targetClaim, 'POSITIVE');
    expect(testSpec.id).toMatch(/^TEST-api-patterns-positive-/);
    expect(testSpec.independence.verified).toBe(true);
    expect(testSpec.expected.exit_status).toBe(0);
    expect(testSpec.execution.repetitions).toBe(3);
  });

  test('reviewExpansionTest enforces human reviewer for security skills', () => {
    const claims = extractTestableClaims('api-security-auditor');
    const secClaim = claims.find(c => c.type === 'SAFETY_INVARIANT');
    expect(secClaim).toBeDefined();

    const testSpec = engine.authorExpansionTest('api-security-auditor', secClaim, 'SAFETY');
    expect(testSpec.risk).toBe('CRITICAL');
    expect(testSpec.execution.repetitions).toBe(5);

    // Auto bot review must throw
    expect(() => {
      engine.reviewExpansionTest(testSpec, 'Automated-Bot');
    }).toThrow(/SECURITY_GATE_VIOLATION/);

    // Human certified officer succeeds
    const reviewPkg = engine.reviewExpansionTest(
      testSpec,
      'Tribunal Certified Security Officer (STD-100)'
    );
    expect(reviewPkg.review_decision).toBe('APPROVED');
    expect(testSpec.review.status).toBe('APPROVED');
  });

  test('executeExpansionTest produces deterministic multi-run sandboxed results', () => {
    const claims = extractTestableClaims('lint-and-validate');
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE');
    const testSpec = engine.authorExpansionTest('lint-and-validate', claim, 'POSITIVE');
    engine.reviewExpansionTest(testSpec, 'Tribunal Senior QA Reviewer');

    const execResult = engine.executeExpansionTest(testSpec);
    expect(execResult.status).toBe('PASS');
    expect(execResult.repeatability.classification).toBe('DETERMINISTIC');
    expect(execResult.repeatability.runs).toBe(3);
    expect(execResult.assertions.failed.length).toBe(0);
  });
});
