'use strict';

const {
  classifyRepeatability,
  executeSandboxed,
  MIN_REPETITIONS,
} = require('../../.agent/scripts/skill_evidence_acquisition_engine');

describe('Skill Certification Repeatability', () => {
  it('1. Deterministic skills produce consistent results', () => {
    const results = [
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'aaa' },
    ];
    expect(classifyRepeatability(results)).toBe('DETERMINISTIC');
  });

  it('2. Nondeterministic skills are flagged', () => {
    const results = [
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'bbb' },
      { status: 'PASS', stdout_hash: 'ccc' },
    ];
    expect(classifyRepeatability(results)).toBe('NONDETERMINISTIC');
  });

  it('3. Unstable skills (mixed pass/fail) are flagged', () => {
    const results = [
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'FAIL', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'aaa' },
    ];
    expect(classifyRepeatability(results)).toBe('UNSTABLE');
  });

  it('4. Minimum repetitions is enforced at 3', () => {
    expect(MIN_REPETITIONS).toBe(3);
  });

  it('5. Stable (2 unique hashes) is classified correctly', () => {
    const results = [
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'aaa' },
      { status: 'PASS', stdout_hash: 'bbb' },
    ];
    expect(classifyRepeatability(results)).toBe('STABLE');
  });
});
