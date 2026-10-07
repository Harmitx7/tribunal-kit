const fs = require('fs');
const path = require('path');
const { classifySkill } = require('./skill_behavior_classifier');
const { deriveScenarios } = require('./skill_scenario_engine');
const { runBehavioralTest } = require('./skill_behavior_harness');
const { evaluateAllSkills } = require('./skill_quality_engine');
const { loadSkills } = require('./context_broker');

const AGENT_DIR = path.join(__dirname, '..');
const RECONSTRUCTION_QUEUE_PATH = path.join(AGENT_DIR, '../phase19/reconstruction_queue.json');
const HISTORY_PATH = path.join(AGENT_DIR, 'data/reconstruction_history.jsonl');
const EVIDENCE_HISTORY_PATH = path.join(AGENT_DIR, 'data/skill_behavior_history.jsonl');

function generateQueue() {
  const skills = loadSkills(AGENT_DIR);
  const queue = {
    A: [], // High evidence, low risk (eligible for automated)
    B: [], // Medium evidence/risk (simulation + human approval)
    C: [], // Low evidence/high risk (proposal only)
  };

  const baselineQuality = evaluateAllSkills();

  for (const skill of skills) {
    const classification = classifySkill(skill.name, skill);
    const scenarios = deriveScenarios(skill, classification);
    const provable = scenarios.filter(s => s.status === 'PROVABLE');
    const qualityProfile = baselineQuality.skills[skill.name];

    // Evaluate behavioral risk
    let risk = 'high';
    if (classification.class === 'REFERENCE_ONLY' || classification.class === 'UNKNOWN')
      risk = 'low';
    if (classification.class === 'EXECUTABLE') risk = 'medium';
    if (classification.class === 'ROUTING') risk = 'low'; // Because it can be mocked safely
    if (provable.length > 0 && classification.class !== 'UNKNOWN') risk = 'low';

    const verificationGap = qualityProfile ? qualityProfile.dimensions.verification < 50 : true;

    if (provable.length > 0 && risk === 'low') {
      queue.A.push(skill.name);
    } else if (provable.length > 0) {
      queue.B.push(skill.name);
    } else if (verificationGap) {
      queue.C.push(skill.name);
    }
  }

  fs.mkdirSync(path.dirname(RECONSTRUCTION_QUEUE_PATH), { recursive: true });
  fs.writeFileSync(RECONSTRUCTION_QUEUE_PATH, JSON.stringify(queue, null, 2));
  return queue;
}

function reconstructSkill(skillName) {
  const skills = loadSkills(AGENT_DIR);
  const skill = skills.find(s => s.name === skillName);
  if (!skill) throw new Error('Skill not found');

  const beforeReport = evaluateAllSkills();
  const beforeQuality = beforeReport.skills[skillName];

  const classification = classifySkill(skillName, skill);
  const scenarios = deriveScenarios(skill, classification);

  const testResults = runBehavioralTest(skill, classification, scenarios);

  if (testResults.status === 'UNPROVABLE') {
    return {
      status: 'REJECTED',
      reason: 'UNPROVABLE',
      message: 'Cannot reconstruct without provable behavioral evidence',
    };
  }

  // Simulate reconstruction
  const skillFile = path.join(AGENT_DIR, 'skills', skillName, 'SKILL.md');
  const originalContent = fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : '';

  // Extract assertions from evidence
  const newAssertions = [];
  for (const ev of testResults.evidence) {
    if (ev.observation && ev.observation.expected) {
      if (Array.isArray(ev.observation.expected)) {
        newAssertions.push(...ev.observation.expected);
      } else {
        newAssertions.push(JSON.stringify(ev.observation.expected));
      }
    }
  }

  if (newAssertions.length === 0) {
    return {
      status: 'REJECTED',
      reason: 'NO_EVIDENCE_FOR_ASSERTIONS',
      message: 'No concrete assertions could be extracted from behavioral tests',
    };
  }

  // Mock patching the file with evidence-backed assertions
  let newContent = originalContent;
  if (!originalContent.includes('verification:')) {
    newContent = originalContent.replace(
      /---\n$/,
      `verification:\n  declared: true\n  assertions:\n${newAssertions.map(a => `    - ${a}`).join('\n')}\n---\n`,
    );
  }

  if (newContent === originalContent) {
    return { status: 'REJECTED', reason: 'NO_OP', message: 'AST unchanged' };
  }

  // Verify Quality Regression
  fs.writeFileSync(skillFile, newContent);
  let afterReport;
  let regression = false;
  try {
    afterReport = evaluateAllSkills();
    const afterQuality = afterReport.skills[skillName];
    if (afterQuality.overall_score < beforeQuality.overall_score) {
      regression = true;
    }
  } finally {
    if (regression) {
      fs.writeFileSync(skillFile, originalContent); // Rollback immediately
    }
  }

  if (regression) {
    return { status: 'REJECTED', reason: 'QUALITY_REGRESSION' };
  }

  // Log history
  const evidenceRecord = {
    timestamp: new Date().toISOString(),
    reconstruction_id: `REC-${Date.now()}`,
    skill_id: skillName,
    source_evidence: testResults.evidence.map(e => e.id),
    behavioral_results: testResults.status,
    quality_delta: afterReport.skills[skillName].overall_score - beforeQuality.overall_score,
  };

  fs.appendFileSync(HISTORY_PATH, JSON.stringify(evidenceRecord) + '\n');
  fs.appendFileSync(EVIDENCE_HISTORY_PATH, JSON.stringify(testResults) + '\n');

  return { status: 'RECONSTRUCTED', record: evidenceRecord };
}

// CLI Integration
if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'queue') {
    const q = generateQueue();
    console.log(JSON.stringify(q, null, 2));
  } else if (cmd === 'reconstruct') {
    const skillName = process.argv[3];
    const res = reconstructSkill(skillName);
    console.log(JSON.stringify(res, null, 2));
  }
}

module.exports = {
  generateQueue,
  reconstructSkill,
};
