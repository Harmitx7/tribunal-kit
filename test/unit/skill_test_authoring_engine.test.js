'use strict';

const {
  discoverTestableSkills,
  extractTestableClaims,
  generateTestSpecification,
  validateSpecification,
  detectNoOp,
  materializeTest,
  TEST_TYPES,
  TESTABILITY,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('skill_test_authoring_engine unit tests', () => {
  it('1. discoverTestableSkills selects exactly 25 skills across 5 categories', () => {
    const discovery = discoverTestableSkills();
    expect(discovery.total_selected).toBe(25);
    expect(discovery.pilot.length).toBe(25);
    expect(Object.keys(discovery.categories).length).toBe(5);

    // Verify all 5 categories
    expect(discovery.categories.executable.skills.length).toBe(5);
    expect(discovery.categories['contract-executable'].skills.length).toBe(5);
    expect(discovery.categories['high-usage'].skills.length).toBe(5);
    expect(discovery.categories['security/critical'].skills.length).toBe(5);
    expect(discovery.categories['reference/composite/human-boundary'].skills.length).toBe(5);

    // Explicitly records CATEGORY_UNAVAILABLE for legacy assertions
    expect(discovery.categories['contract-executable'].status).toBe('CATEGORY_UNAVAILABLE');
    expect(discovery.categories['contract-executable'].note).toContain('CATEGORY_UNAVAILABLE');
  });

  it('2. extractTestableClaims extracts contract inputs, outputs, and invariants', () => {
    const claims = extractTestableClaims('api-patterns', { name: 'api-patterns', version: '6.0.0' });
    expect(claims.length).toBeGreaterThan(0);

    const inputClaim = claims.find(c => c.type === 'INPUT_VALIDATION');
    const outputClaim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE');
    const safetyClaim = claims.find(c => c.type === 'SAFETY_INVARIANT');

    expect(inputClaim).toBeDefined();
    expect(inputClaim.testability).toBe(TESTABILITY.DIRECT);
    expect(outputClaim).toBeDefined();
    expect(safetyClaim).toBeDefined();
    expect(safetyClaim.testability).toBe(TESTABILITY.DERIVABLE);
  });

  it('3. extractTestableClaims marks reference-only skills as UNTESTABLE', () => {
    const claims = extractTestableClaims('12-principles-of-animation', {
      name: '12-principles-of-animation',
      version: '6.0.0',
    });
    expect(claims.length).toBeGreaterThan(0);
    // Every claim for a reference-only skill must be UNTESTABLE
    const allUntestable = claims.every(c => c.testability === TESTABILITY.UNTESTABLE);
    expect(allUntestable).toBe(true);
  });

  it('4. generateTestSpecification answers 5 mandatory questions and populates expected/forbidden', () => {
    const claims = extractTestableClaims('lint-and-validate', { name: 'lint-and-validate' });
    const claim = claims.find(c => c.type === 'OUTPUT_CONFORMANCE') || claims[0];

    const testSpec = generateTestSpecification('lint-and-validate', { name: 'lint-and-validate' }, claim, TEST_TYPES.POSITIVE);

    expect(testSpec.id).toMatch(/^TEST-lint-and-validate-positive-/);
    expect(testSpec.questions.what).toBeDefined();
    expect(testSpec.questions.why).toBeDefined();
    expect(testSpec.questions.where).toBeDefined();
    expect(testSpec.questions.how).toBeDefined();
    expect(testSpec.questions.failure_definition).toBeDefined();

    expect(testSpec.expected.outputs.length).toBeGreaterThan(0);
    expect(testSpec.forbidden.side_effects).toContain('filesystem_escape');
    expect(testSpec.independence.verified).toBe(true);
  });

  it('5. detectNoOp detects tests without declared behavior or safety invariants', () => {
    const emptyTest = {
      claim: { statement: '' },
      expected: { outputs: [], invariants: [] },
      forbidden: { side_effects: [] },
    };
    const noOpCheck = detectNoOp(emptyTest);
    expect(noOpCheck.is_no_op).toBe(true);
    expect(noOpCheck.reason).toContain('NO_EFFECT_TEST');
  });

  it('6. validateSpecification flags invalid or circular specifications', () => {
    const invalidTest = {
      id: 'TEST-bad',
      skill_id: 'bad-skill',
      claim: { id: 'c1', statement: 'do something' },
      expected: { outputs: [] },
      forbidden: {},
      independence: {
        expectation_source: 'skill.runtime_execution', // circular!
        implementation_source: 'skill.runtime_execution',
        verified: false,
      },
    };

    const val = validateSpecification(invalidTest);
    expect(val.valid).toBe(false);
    expect(val.errors.some(e => e.includes('CIRCULAR_TEST'))).toBe(true);
  });

  it('7. materializeTest applies rollback when validation or quality fails', () => {
    const failingTest = {
      id: 'TEST-rollback-test',
      skill_id: 'api-patterns',
      claim: { id: 'c1', statement: 'short' }, // low quality score
      independence: { verified: false, expectation_source: 'none' },
    };

    const result = materializeTest(failingTest);
    expect(result.success).toBe(false);
    expect(result.rolled_back).toBe(true);
  });
});
