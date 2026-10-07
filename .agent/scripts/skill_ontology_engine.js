const fs = require('fs');
const path = require('path');

let ontologyCache = null;

function loadOntology() {
  if (ontologyCache) return ontologyCache;
  const filePath = path.join(__dirname, '../data/skill_ontology.json');
  if (!fs.existsSync(filePath)) return { skills: {} };

  const raw = fs.readFileSync(filePath, 'utf8');
  ontologyCache = JSON.parse(raw);
  return ontologyCache;
}

function validateOntology(ontology) {
  const errors = [];
  const skills = ontology.skills;

  for (const [skillId, node] of Object.entries(skills)) {
    // Self-parenting
    if (node.parents && node.parents.includes(skillId)) {
      errors.push(`Self-parenting detected for ${skillId}`);
    }

    // Check missing skill IDs & reverse connections
    if (node.parents) {
      for (const parent of node.parents) {
        if (!skills[parent]) {
          errors.push(`Missing parent skill ID ${parent} for ${skillId}`);
        } else if (skills[parent].parents && skills[parent].parents.includes(skillId)) {
          errors.push(`Cycle detected between ${skillId} and ${parent}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function getHierarchyCompatibility(predictedSkill, expectedSkill) {
  const ontology = loadOntology();
  if (predictedSkill === expectedSkill) return 'EXACT';

  const predictedNode = ontology.skills[predictedSkill];
  const expectedNode = ontology.skills[expectedSkill];

  if (!predictedNode && !expectedNode) return 'WRONG';

  // Specific-child: The predicted skill specializes the expected skill.
  // E.g. expected = frontend-design, predicted = landing-page
  if (predictedNode && predictedNode.parents && predictedNode.parents.includes(expectedSkill)) {
    return 'SPECIFIC_CHILD';
  }

  // Parent-fallback: The predicted skill generalizes the expected skill.
  // E.g. expected = landing-page, predicted = frontend-design
  if (predictedNode && predictedNode.children && predictedNode.children.includes(expectedSkill)) {
    return 'PARENT_FALLBACK';
  }

  return 'WRONG';
}

function getSpecificity(skillName) {
  const ontology = loadOntology();
  const node = ontology.skills[skillName];
  if (!node) return 0; // Baseline for unknown skills

  let depth = 1;
  // If it has parents, it's deeper.
  if (node.parents && node.parents.length > 0) depth += 1;
  if (node.children && node.children.length === 0) depth += 1; // Leaf nodes are more specific

  return depth;
}

module.exports = {
  loadOntology,
  validateOntology,
  getHierarchyCompatibility,
  getSpecificity,
};
