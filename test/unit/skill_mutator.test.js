'use strict';

/**
 * skill_mutator.test.js
 * =====================
 * Unit tests for SkillMutator (Loop 1 SkillOpt Procedural Rule Generator).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SkillMutator } = require('../../src/evolution/skill_mutator');
const { recordRejection } = require('../../src/evolution/negative_memory');

describe('SkillMutator — Loop 1 Bounded Procedural Rule Mutator', () => {
  let tmpDir;
  let mutator;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-skill-mutator-test-'));
    mutator = new SkillMutator({ agentDir: tmpDir });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('synthesizeRuleFromFinding generates domain-specific defensive rules', () => {
    const secRule = mutator.synthesizeRuleFromFinding({
      category: 'SECURITY_INJECTIONS',
      payload: "' OR '1'='1",
    });
    expect(secRule).toContain('Security Guard');
    expect(secRule).toContain('parameterized queries');

    const boundRule = mutator.synthesizeRuleFromFinding({
      category: 'BOUNDARY_EXTREMA',
      payload: null,
    });
    expect(boundRule).toContain('Boundary Guard');
    expect(boundRule).toContain('null, undefined');

    const ahRule = mutator.synthesizeRuleFromFinding({
      category: 'ANTI_HALLUCINATION',
      payload: 'ghost-pkg',
    });
    expect(ahRule).toContain('Anti-Hallucination Guard');
  });

  test('mutateSkill appends rules cleanly under Defensive Guardrails', () => {
    const initialText =
      '# My Skill\n\n' +
      'This is a sample skill guideline for robust engineering practices and defensive validation.\n'.repeat(
        25,
      );
    const findings = [
      { category: 'SECURITY_INJECTIONS', payload: '; rm -rf /' },
      { category: 'BOUNDARY_EXTREMA', payload: -1 },
    ];

    const result = mutator.mutateSkill(initialText, 'test-skill', findings);
    expect(result.appliedRules).toHaveLength(2);
    expect(result.mutatedText).toContain('## Defensive Guardrails');
    expect(result.mutatedText).toContain('Security Guard');
    expect(result.mutatedText).toContain('Boundary Guard');
    expect(result.changeRatio).toBeGreaterThan(0);
    expect(result.changeRatio).toBeLessThanOrEqual(0.25);
  });

  test('mutateSkill rejects candidate rules that match Negative CBR Memory (>= 0.85)', () => {
    const initialText = '# Project Idioms Skill\n\nExisting text.\n';
    const finding = { category: 'SECURITY_INJECTIONS', payload: "' OR '1'='1" };
    const ruleCandidate = mutator.synthesizeRuleFromFinding(finding);

    // Record this exact rule in Negative CBR memory as previously failed
    recordRejection(tmpDir, 'test-skill', 1, [ruleCandidate], 'Caused regression in trial');

    // Attempt mutation
    const result = mutator.mutateSkill(initialText, 'test-skill', [finding]);
    expect(result.rejectedCount).toBe(1);
    expect(result.appliedRules).toHaveLength(0);
    expect(result.mutatedText).toBe(initialText);
  });

  test('mutateSkill enforces Change Budget and throws when change ratio exceeds threshold', () => {
    const shortText = 'tiny text'; // Length 9
    const mutatorStrict = new SkillMutator({
      agentDir: tmpDir,
      maxChangeRatio: 0.10, // Max 10% change
    });

    const findings = [{ category: 'SECURITY_INJECTIONS', payload: 'bad' }];

    expect(() => mutatorStrict.mutateSkill(shortText, 'test-skill', findings)).toThrow(
      /Change Budget Exceeded/,
    );
  });

  test('mutateSkill does not duplicate existing rules', () => {
    const initialText = '# Skill\n\n- **Boundary Guard**: Explicitly guard against null, undefined, empty collections, and extreme bounds before accessing properties or performing numeric operations.\n';
    const finding = { category: 'BOUNDARY_EXTREMA', payload: null };

    const result = mutator.mutateSkill(initialText, 'test-skill', [finding]);
    expect(result.appliedRules).toHaveLength(0);
    expect(result.mutatedText).toBe(initialText);
  });
});
