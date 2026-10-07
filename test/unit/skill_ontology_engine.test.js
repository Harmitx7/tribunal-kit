const {
  loadOntology,
  validateOntology,
  getHierarchyCompatibility,
  getSpecificity,
} = require('../../.agent/scripts/skill_ontology_engine');

describe('Skill Ontology Engine', () => {
  it('should load ontology correctly', () => {
    const ontology = loadOntology();
    expect(ontology.skills).toBeDefined();
  });

  it('should validate ontology without errors', () => {
    const ontology = loadOntology();
    const result = validateOntology(ontology);
    expect(result.valid).toBe(true);
  });

  it('should calculate specificity correctly', () => {
    const spec = getSpecificity('landing-page');
    expect(spec).toBeGreaterThan(0);
  });
});
