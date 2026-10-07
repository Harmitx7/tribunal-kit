'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseContract,
  validateContract,
  normalizeContract,
  scoreCompleteness,
  diffContracts,
  reconcileWithRegistry,
} = require('../../../.agent/scripts/skill_contract_engine');

describe('Skill Contract Engine', () => {
  it('should parse simple frontmatter into JSON', () => {
    const markdown = `---
name: test-skill
version: 1.0.0
description: "A test skill"
skills:
  - test1
  - test2
---
# Content
`;
    const { contract, error } = parseContract(markdown);
    expect(error).toBeNull();
    expect(contract.name).toBe('test-skill');
    expect(contract.version).toBe('1.0.0');
    expect(contract.description).toBe('A test skill');
    expect(Array.isArray(contract.skills)).toBe(true);
    expect(contract.skills[0]).toBe('test1');
  });

  it('should normalize a contract and handle legacy fields', () => {
    const raw = {
      name: 'legacy-skill',
      version: '2.0.0',
      description: 'Legacy description',
      skills: ['dep1'],
      tools: ['bash'],
    };

    const normalized = normalizeContract(raw, true);

    expect(normalized.skill.id).toBe('legacy-skill');
    expect(normalized.skill.version).toBe('2.0.0');
    expect(normalized.composition.requires).toEqual(['dep1']);
    expect(normalized.execution.tools).toEqual(['bash']);
    expect(normalized.skill.description).toBe('Legacy description');
  });

  it('should validate canonical contract schema', () => {
    const validRaw = {
      skill: { id: 'new-skill', name: 'New Skill', version: '1.0.0' },
      contract: {
        inputs: [{ name: 'input1', type: 'string' }],
        outputs: [{ name: 'out1', type: 'object' }],
      },
    };
    const { valid, errors } = validateContract(validRaw);
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);

    const invalidRaw = {
      skill: { id: 'bad-skill', name: 'Bad Skill', version: '1.0.0' },
      contract: {
        inputs: [{ name: 'input1', type: 'invalid_type' }],
      },
    };
    const result = validateContract(invalidRaw);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('received "invalid_type"');
  });

  it('should score completeness', () => {
    const normalized = normalizeContract({ name: 'test' });
    const score = scoreCompleteness(normalized);
    // Since we populate defaults, the score will be somewhat high even for an empty object.
    expect(score).toBeGreaterThan(0);
  });

  it('should detect breaking changes in contract diff', () => {
    const oldC = normalizeContract({ name: 'test', contract: { inputs: [] } });
    const newC = normalizeContract({
      name: 'test',
      contract: { inputs: [{ name: 'param1', type: 'string' }] },
    });

    const diff = diffContracts(oldC, newC);
    expect(diff.isBreaking).toBe(true);
    expect(diff.diffs).toContain('INPUTS CHANGED');
  });
});
