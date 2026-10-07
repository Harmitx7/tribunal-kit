'use strict';

const {
  detectCircularity,
  validateTestIndependence,
  executeApprovedTest,
  REVIEW_STATES,
} = require('../../.agent/scripts/skill_test_authoring_engine');

describe('Test Independence & Anti-Circularity Unit Tests', () => {
  it('1. Rejects test when expected output is derived from implementation output', () => {
    const circularTest = {
      id: 'TEST-circ-1',
      skill_id: 'api-patterns',
      independence: {
        expectation_source: 'skill.runtime_execution_observed_output',
        implementation_source: 'skill.runtime_execution',
        verified: false,
      },
    };

    const result = detectCircularity(circularTest);
    expect(result.circular).toBe(true);
    expect(result.reason).toContain('CIRCULAR_TEST');
  });

  it('2. Rejects test when test source and implementation source are identical', () => {
    const identicalSourceTest = {
      id: 'TEST-circ-2',
      skill_id: 'api-patterns',
      independence: {
        expectation_source: 'skill.runtime_execution',
        implementation_source: 'skill.runtime_execution',
        verified: false,
      },
    };

    const result = detectCircularity(identicalSourceTest);
    expect(result.circular).toBe(true);
    expect(result.reason).toContain('identical');
  });

  it('3. Rejects test when expectation was dynamically copied from runtime output', () => {
    const dynamicCopyTest = {
      id: 'TEST-circ-3',
      skill_id: 'api-patterns',
      independence: {
        expectation_source: 'contract.outputs',
        implementation_source: 'skill.runtime_execution',
        verified: true,
      },
      expected: {
        dynamically_copied: true,
        outputs: [],
      },
    };

    const result = detectCircularity(dynamicCopyTest);
    expect(result.circular).toBe(true);
    expect(result.reason).toContain('mutates its own expectation');
  });

  it('4. Rejects test when fixture was derived from observed output', () => {
    const fixtureDerivedTest = {
      id: 'TEST-circ-4',
      skill_id: 'api-patterns',
      independence: {
        expectation_source: 'contract.inputs',
        implementation_source: 'skill.runtime_execution',
        verified: true,
      },
      inputs: {
        derived_from_observed_output: true,
      },
    };

    const result = detectCircularity(fixtureDerivedTest);
    expect(result.circular).toBe(true);
    expect(result.reason).toContain('fixture was generated from observed implementation output');
  });

  it('5. validateTestIndependence passes for contract-derived expectations preceding execution', () => {
    const validTest = {
      id: 'TEST-valid-indep',
      skill_id: 'api-patterns',
      independence: {
        expectation_source: 'contract.outputs',
        implementation_source: 'skill.runtime_execution',
        verified: false,
      },
    };

    const validation = validateTestIndependence(validTest);
    expect(validation.valid).toBe(true);
    expect(validTest.independence.verified).toBe(true);
  });

  it('6. Circular test cannot be executed even if approved', () => {
    const approvedCircularTest = {
      id: 'TEST-circ-blocked',
      skill_id: 'api-patterns',
      review: { status: REVIEW_STATES.APPROVED },
      independence: {
        expectation_source: 'observed_output',
        implementation_source: 'skill.runtime_execution',
        verified: false,
      },
    };

    expect(() => {
      executeApprovedTest(approvedCircularTest);
    }).toThrow(/Cannot execute test without verified independence/);
  });
});
