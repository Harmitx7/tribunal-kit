const { validateSkillSchema } = require('../../.agent/scripts/verification_auditor');

describe('verification_auditor - Phase 5/6 Verification', () => {
  const dummySkill = {
    contract: {
      inputs: {
        target_file: { type: 'string', required: true, description: 'File to edit' },
        line_number: { type: 'number', required: false },
      },
      outputs: {
        success: { type: 'boolean', required: true },
      },
    },
  };

  it('validates correct input payload', () => {
    const res = validateSkillSchema(dummySkill, { target_file: 'app.js' }, 'input');
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('fails missing required input payload field', () => {
    const res = validateSkillSchema(dummySkill, { line_number: 42 }, 'input');
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/target_file.*invalid_type|expected string/i);
  });

  it('fails strict mode on extra properties', () => {
    const res = validateSkillSchema(dummySkill, { target_file: 'app.js', extra: true }, 'input');
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/extra.*Unrecognized/is);
  });

  it('validates correct output payload', () => {
    const res = validateSkillSchema(dummySkill, { success: true }, 'output');
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('returns valid with warning if no schema defined', () => {
    const res = validateSkillSchema({ contract: {} }, { success: true }, 'output');
    expect(res.valid).toBe(true);
    expect(res.errors[0]).toMatch(/WARNING/);
  });
});
