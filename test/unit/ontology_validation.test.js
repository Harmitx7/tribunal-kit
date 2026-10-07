const { validateOntology } = require('../../.agent/scripts/skill_ontology_engine');

describe('Ontology Validation', () => {
  it('should fail on cycle', () => {
    const invalidOntology = {
      skills: {
        A: { parents: ['B'] },
        B: { parents: ['A'] },
      },
    };
    const result = validateOntology(invalidOntology);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
