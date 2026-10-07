const fs = require('fs');
const path = require('path');
const { loadSkills } = require('./context_broker');
const { parseContract } = require('./skill_contract_engine');

function classifySkill(skillName, skillRaw) {
  const reasons = [];
  let skillClass = 'UNKNOWN';
  let confidence = 0.0;
  let mode = 'sandbox';

  // We look for evidence in the skill contract or metadata
  const content = skillRaw?.content || '';
  const triggers = skillRaw?.triggers || [];

  if (
    skillName.includes('routing') ||
    skillName.includes('orchestrate') ||
    content.includes('router') ||
    content.includes('dispatch')
  ) {
    skillClass = 'ROUTING';
    confidence = 0.8;
    reasons.push('Contains routing or dispatch keywords');
    mode = 'mock-router';
  } else if (
    skillName.includes('design') ||
    skillName.includes('guidelines') ||
    content.includes('principles')
  ) {
    skillClass = 'REFERENCE_ONLY';
    confidence = 0.7;
    reasons.push('Contains design or guideline keywords');
    mode = 'none';
  } else if (
    content.includes('npm run') ||
    content.includes('node ') ||
    content.includes('bash ') ||
    content.includes('python ')
  ) {
    skillClass = 'EXECUTABLE';
    confidence = 0.9;
    reasons.push('Contains executable CLI commands in content');
    mode = 'sandbox';
  } else if (skillRaw?.dependencies && skillRaw.dependencies.length > 0) {
    skillClass = 'COMPOSITE';
    confidence = 0.75;
    reasons.push('Has explicit skill dependencies');
    mode = 'sub-invoke';
  } else if (skillName.includes('audit') || skillName.includes('governance')) {
    skillClass = 'GOVERNANCE';
    confidence = 0.8;
    reasons.push('Contains audit or governance keywords');
    mode = 'static-analysis';
  } else {
    // Default fallback if we can't strongly identify
    skillClass = 'EXECUTABLE'; // optimistic
    confidence = 0.4;
    reasons.push('Optimistic default to executable');
  }

  return {
    skill: skillName,
    class: skillClass,
    confidence,
    reasons,
    verification_mode: mode,
  };
}

function classifyAllSkills() {
  const agentDir = path.join(__dirname, '..');
  const skills = loadSkills(agentDir);
  const results = {};

  for (const s of skills) {
    results[s.name] = classifySkill(s.name, s);
  }

  return results;
}

if (require.main === module) {
  console.log(JSON.stringify(classifyAllSkills(), null, 2));
}

module.exports = {
  classifySkill,
  classifyAllSkills,
};
