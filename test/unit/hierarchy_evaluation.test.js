const { getHierarchyCompatibility } = require('../../.agent/scripts/skill_ontology_engine');

describe('Hierarchy Evaluation', () => {
  it('should identify SPECIFIC_CHILD', () => {
    expect(getHierarchyCompatibility('landing-page', 'frontend-design')).toBe('SPECIFIC_CHILD');
  });

  it('should identify PARENT_FALLBACK', () => {
    expect(getHierarchyCompatibility('frontend-design', 'landing-page')).toBe('PARENT_FALLBACK');
  });

  it('should identify EXACT', () => {
    expect(getHierarchyCompatibility('landing-page', 'landing-page')).toBe('EXACT');
  });
});
