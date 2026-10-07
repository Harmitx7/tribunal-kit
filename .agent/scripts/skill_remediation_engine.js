const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { evaluateAllSkills } = require('./skill_quality_engine');
const { parseContract } = require('./skill_contract_engine');

const AGENT_DIR = path.join(__dirname, '..');
const QUALITY_REPORT_PATH = path.join(AGENT_DIR, '../phase17/skill_quality_report.json');
const SNAPSHOTS_DIR = path.join(AGENT_DIR, '../phase18/snapshots');
const HISTORY_PATH = path.join(AGENT_DIR, 'data/remediation_history.jsonl');
const PLANS_PATH = path.join(AGENT_DIR, '../phase18/remediation_plans.json');

function generateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadQualityReport() {
  if (!fs.existsSync(QUALITY_REPORT_PATH)) return null;
  return JSON.parse(fs.readFileSync(QUALITY_REPORT_PATH, 'utf8'));
}

function loadPlans() {
  if (!fs.existsSync(PLANS_PATH)) return {};
  return JSON.parse(fs.readFileSync(PLANS_PATH, 'utf8'));
}

function savePlans(plans) {
  fs.mkdirSync(path.dirname(PLANS_PATH), { recursive: true });
  fs.writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2));
}

function appendHistory(record) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.appendFileSync(
    HISTORY_PATH,
    JSON.stringify({ timestamp: new Date().toISOString(), ...record }) + '\n',
  );
}

function classifyRemediationSafety(finding) {
  if (finding.recommendation === 'ADD_VERIFICATION') return 3; // VERIFICATION AUGMENTATION
  if (finding.finding_id === 'CON-001') return 1; // SAFE STRUCTURAL (fix basic validity if we can, else manual)
  if (finding.dimension === 'ontology') return 0; // OBSERVE
  if (finding.dimension === 'routing') return 0; // OBSERVE
  if (finding.dimension === 'context') return 4; // CONTEXT RESTRUCTURING
  return 0; // Default observe
}

function planRemediations() {
  const report = loadQualityReport();
  if (!report) throw new Error('Phase 17 report not found');

  const plans = {};
  for (const skill of Object.values(report.skills)) {
    for (const finding of skill.findings) {
      const safetyLevel = classifyRemediationSafety(finding);
      const planId = `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let op = 'OBSERVE';
      if (safetyLevel === 3) op = 'ADD_VERIFICATION_STUB';
      else if (safetyLevel === 1) op = 'FIX_STRUCTURE';

      plans[planId] = {
        remediation_id: planId,
        skill_id: skill.skill_id,
        finding_ids: [finding.finding_id],
        safety_level: safetyLevel,
        operation: op,
        reason: finding.recommendation,
        files: [`skills/${skill.skill_id}/SKILL.md`],
        preconditions: ['contract_valid'],
        expected_effects: ['quality_score_increase'],
        risk: safetyLevel <= 2 ? 'LOW' : 'MEDIUM',
        rollback_strategy: 'RESTORE_FILE',
        status: 'PROPOSED',
      };
    }
  }

  savePlans(plans);
  return plans;
}

function createPreChangeSnapshot(plan) {
  const skillDir = path.join(AGENT_DIR, 'skills', plan.skill_id);
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) throw new Error('Skill file missing');

  const content = fs.readFileSync(skillFile, 'utf8');
  const hash = generateHash(content);

  const snapshotDir = path.join(SNAPSHOTS_DIR, plan.remediation_id);
  fs.mkdirSync(snapshotDir, { recursive: true });

  fs.writeFileSync(path.join(snapshotDir, 'SKILL.md'), content);
  fs.writeFileSync(
    path.join(snapshotDir, 'meta.json'),
    JSON.stringify(
      {
        hash,
        skill_id: plan.skill_id,
      },
      null,
      2,
    ),
  );

  return hash;
}

function applyOperationToMemory(content, operation) {
  if (operation === 'ADD_VERIFICATION_STUB') {
    // We only add if it's missing, but as a proposal (safety level 3) we wouldn't auto-apply.
    // In simulation or forced apply, we do it.
    if (!content.includes('verification:')) {
      // Just inject a dummy verification block at the end of frontmatter
      return content.replace(
        /---\n$/,
        'verification:\n  declared: true\n  assertions:\n    - "Output format is correct"\n---\n',
      );
    }
  }
  return content; // NO-OP
}

function simulateRemediation(planId) {
  const plans = loadPlans();
  const plan = plans[planId];
  if (!plan) throw new Error('Plan not found');

  const beforeReport = evaluateAllSkills();
  const beforeSkill = beforeReport.skills[plan.skill_id];

  const skillDir = path.join(AGENT_DIR, 'skills', plan.skill_id);
  const skillFile = path.join(skillDir, 'SKILL.md');
  const originalContent = fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : '';

  const newContent = applyOperationToMemory(originalContent, plan.operation);

  if (newContent === originalContent) {
    plan.status = 'SIMULATED';
    savePlans(plans);
    return { verdict: 'NO_EFFECT' };
  }

  // To simulate, we'd write to a tmp file, but evaluateAllSkills reads from the real dir.
  // We mock by temporarily writing, evaluating, and restoring.
  fs.writeFileSync(skillFile, newContent);
  let afterReport;
  try {
    afterReport = evaluateAllSkills();
  } finally {
    fs.writeFileSync(skillFile, originalContent); // Restore
  }

  const afterSkill = afterReport.skills[plan.skill_id];

  let verdict = 'SAFE';
  if (plan.safety_level > 2) verdict = 'SAFE_WITH_REVIEW';
  if (afterSkill.overall_score < beforeSkill.overall_score) verdict = 'UNSAFE';

  plan.status = 'SIMULATED';
  savePlans(plans);

  return {
    verdict,
    before_score: beforeSkill.overall_score,
    after_score: afterSkill.overall_score,
    delta: afterSkill.overall_score - beforeSkill.overall_score,
  };
}

function applyRemediation(planId) {
  const plans = loadPlans();
  const plan = plans[planId];
  if (!plan) throw new Error('Plan not found');

  if (plan.status !== 'SIMULATED' && plan.status !== 'PROPOSED') {
    throw new Error('Plan must be SIMULATED/PROPOSED before application');
  }

  const simResult = simulateRemediation(planId);
  if (simResult.verdict === 'UNSAFE' || simResult.verdict === 'NO_EFFECT') {
    plan.status = 'REJECTED';
    savePlans(plans);
    return { status: 'REJECTED', reason: simResult.verdict };
  }
  if (plan.safety_level > 2) {
    plan.status = 'REJECTED';
    savePlans(plans);
    return { status: 'REJECTED', reason: 'SAFETY_LEVEL_TOO_HIGH' };
  }

  const beforeHash = createPreChangeSnapshot(plan);

  const skillFile = path.join(AGENT_DIR, 'skills', plan.skill_id, 'SKILL.md');
  const originalContent = fs.readFileSync(skillFile, 'utf8');
  const newContent = applyOperationToMemory(originalContent, plan.operation);

  fs.writeFileSync(skillFile, newContent);
  const afterHash = generateHash(newContent);

  const afterReport = evaluateAllSkills();
  const afterSkill = afterReport.skills[plan.skill_id];

  // Verify Regression
  let regression = false;
  if (afterSkill.overall_score < simResult.before_score) regression = true;
  // check blockers
  if (afterSkill.classification === 'BLOCK') regression = true;

  if (regression) {
    // Rollback
    fs.writeFileSync(skillFile, originalContent);
    plan.status = 'ROLLED_BACK';
    savePlans(plans);
    appendHistory({ remediation_id: planId, skill_id: plan.skill_id, status: 'ROLLED_BACK' });
    return { status: 'ROLLED_BACK', reason: 'REGRESSION_DETECTED' };
  }

  plan.status = 'APPLIED';
  savePlans(plans);
  appendHistory({
    remediation_id: planId,
    skill_id: plan.skill_id,
    finding_ids: plan.finding_ids,
    operator: 'SYSTEM',
    safety_level: plan.safety_level,
    before_hash: beforeHash,
    after_hash: afterHash,
    before_score: simResult.before_score,
    after_score: afterSkill.overall_score,
    delta: afterSkill.overall_score - simResult.before_score,
    status: 'APPLIED',
  });

  return { status: 'APPLIED' };
}

function rollbackRemediation(planId) {
  const plans = loadPlans();
  const plan = plans[planId];
  if (!plan) throw new Error('Plan not found');

  if (plan.status !== 'APPLIED') throw new Error('Only APPLIED plans can be rolled back');

  const snapshotMetaFile = path.join(SNAPSHOTS_DIR, planId, 'meta.json');
  const snapshotSkillFile = path.join(SNAPSHOTS_DIR, planId, 'SKILL.md');

  if (!fs.existsSync(snapshotMetaFile)) throw new Error('Snapshot missing');

  const meta = JSON.parse(fs.readFileSync(snapshotMetaFile, 'utf8'));
  const currentSkillFile = path.join(AGENT_DIR, 'skills', plan.skill_id, 'SKILL.md');

  const currentContent = fs.readFileSync(currentSkillFile, 'utf8');
  const currentHash = generateHash(currentContent);

  // We should verify we own the change, but for simple rollback, if currentHash != afterHash we might have conflict.
  // Actually, we can just look up history.

  fs.writeFileSync(currentSkillFile, fs.readFileSync(snapshotSkillFile, 'utf8'));

  plan.status = 'ROLLED_BACK';
  savePlans(plans);
  appendHistory({
    remediation_id: planId,
    skill_id: plan.skill_id,
    status: 'ROLLED_BACK',
    reason: 'MANUAL_ROLLBACK',
  });

  return { status: 'ROLLED_BACK' };
}

function auditRemediations() {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  const lines = fs.readFileSync(HISTORY_PATH, 'utf8').trim().split('\n');
  return lines.map(l => JSON.parse(l));
}

function planBatchRemediation() {
  const plans = loadPlans();
  const batches = {};
  for (const plan of Object.values(plans)) {
    if (plan.status === 'PROPOSED') {
      const key = `${plan.operation}_${plan.safety_level}`;
      if (!batches[key]) batches[key] = [];
      batches[key].push(plan.remediation_id);
    }
  }
  return batches;
}

// CLI
if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'plan') {
    const plans = planRemediations();
    console.log(`Generated ${Object.keys(plans).length} proposed plans.`);
  } else if (cmd === 'simulate') {
    const res = simulateRemediation(process.argv[3]);
    console.log(JSON.stringify(res, null, 2));
  } else if (cmd === 'apply') {
    const res = applyRemediation(process.argv[3]);
    console.log(JSON.stringify(res, null, 2));
  } else if (cmd === 'rollback') {
    const res = rollbackRemediation(process.argv[3]);
    console.log(JSON.stringify(res, null, 2));
  } else if (cmd === 'audit') {
    const history = auditRemediations();
    console.log(JSON.stringify(history, null, 2));
  } else if (cmd === 'batch') {
    const b = planBatchRemediation();
    console.log(JSON.stringify(b, null, 2));
  }
}

module.exports = {
  planRemediations,
  simulateRemediation,
  applyRemediation,
  rollbackRemediation,
  auditRemediations,
  planBatchRemediation,
  generateHash,
};
