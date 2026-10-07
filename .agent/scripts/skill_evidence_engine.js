const fs = require('fs');
const path = require('path');
const { loadSkills } = require('./context_broker');
const { classifySkill } = require('./skill_behavior_classifier');

const CONFIDENCE_MODEL = {
  EXPLICIT_ACCEPTANCE: 1.0,
  PASSING_TEST: 0.98,
  FORMAL_SCHEMA: 0.95,
  EXECUTABLE_CONTRACT: 0.92,
  SCRIPT_BINDING: 0.9,
  DOCUMENTED_OUTPUT: 0.8,
  EXECUTION_TRACE: 0.75,
  HUMAN_REVIEW: 0.7,
  HEURISTIC: 0.2,
};

function determineSkillEvidenceClass(skillRaw, classification) {
  if (classification.class === 'REFERENCE_ONLY') return 'CLASS D';
  if (classification.class === 'ROUTING') return 'CLASS A'; // Can mock route
  if (classification.class === 'EXECUTABLE') {
    if (
      skillRaw.content &&
      (skillRaw.content.includes('npm run') || skillRaw.content.includes('node '))
    ) {
      return 'CLASS A';
    }
    return 'CLASS B';
  }
  return 'CLASS F';
}

function gatherEvidenceInventory() {
  const agentDir = path.join(__dirname, '..');
  const skills = loadSkills(agentDir);
  const inventory = {};

  for (const skill of skills) {
    const classification = classifySkill(skill.name, skill);
    const evidenceClass = determineSkillEvidenceClass(skill, classification);

    let confidence = 0.0;
    if (evidenceClass === 'CLASS A') confidence = CONFIDENCE_MODEL.SCRIPT_BINDING;
    else if (evidenceClass === 'CLASS B') confidence = CONFIDENCE_MODEL.EXECUTABLE_CONTRACT;
    else if (evidenceClass === 'CLASS D') confidence = CONFIDENCE_MODEL.DOCUMENTED_OUTPUT;

    inventory[skill.name] = {
      skill_id: skill.name,
      evidence_class: evidenceClass,
      evidence_level: evidenceClass === 'CLASS F' ? 'NO_EVIDENCE' : 'PARTIAL_EVIDENCE',
      confidence,
    };
  }

  return inventory;
}

function generateBootstrapQueue() {
  const inventory = gatherEvidenceInventory();
  const queue = { A: [], B: [], C: [], D: [], E: [] };

  for (const [name, inv] of Object.entries(inventory)) {
    if (inv.evidence_class === 'CLASS A') queue.A.push(name);
    else if (inv.evidence_class === 'CLASS B') queue.B.push(name);
    else if (inv.evidence_class === 'CLASS E')
      queue.C.push(name); // Human
    else if (inv.evidence_class === 'CLASS D') queue.D.push(name);
    else queue.E.push(name); // F -> E queue (Unprovable)
  }

  return queue;
}

if (require.main === module) {
  const q = generateBootstrapQueue();
  console.log(JSON.stringify(q, null, 2));
}

module.exports = {
  gatherEvidenceInventory,
  generateBootstrapQueue,
  CONFIDENCE_MODEL,
};
