'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { loadSkills } = require('./context_broker');
const { parseContract } = require('./skill_contract_engine');
const { classifySkill } = require('./skill_behavior_classifier');
const { extractTestableClaims } = require('./skill_test_authoring_engine');
const certEngine = require('./skill_certification_engine');
const expansionEngine = require('./skill_coverage_expansion_engine');

// ─── Constants ───────────────────────────────────────────────────────────────
const ELIGIBILITY_CLASSES = {
  EXECUTABLE: 'EXECUTABLE',
  CONTRACT_EXECUTABLE: 'CONTRACT_EXECUTABLE',
  COMPOSITE: 'COMPOSITE',
  ROUTING: 'ROUTING',
  GOVERNANCE: 'GOVERNANCE',
  REFERENCE_ONLY: 'REFERENCE_ONLY',
  HUMAN_REQUIRED: 'HUMAN_REQUIRED',
  UNPROVABLE: 'UNPROVABLE',
};

const EXCLUDED_CLASSES = [
  ELIGIBILITY_CLASSES.REFERENCE_ONLY,
  ELIGIBILITY_CLASSES.HUMAN_REQUIRED,
  ELIGIBILITY_CLASSES.UNPROVABLE,
];

const PILOT_SKILLS = [
  'api-patterns',
  'geo-fundamentals',
  'hf-cloud-python-env-setup',
  'lint-and-validate',
  'webapp-testing',
  'data-validation-schemas',
  'config-validator',
  'domain-modeling',
  'react-specialist',
  'sql-pro',
  'backend-redis',
  'devops-engineer',
  'api-security-auditor',
  'backend-security-expert',
  'audit-and-fix',
  'red-team-tactics',
  'zero-trust-passkeys',
  '60fps-animation',
  'agent-organizer',
  '12-principles-of-animation',
  'apple-design',
  'database-design',
  'frontend-design',
  'system-design-pro',
  'taste-skill',
];

// ─── Section 6: Eligibility Classification ────────────────────────────────────
function classifyCorpusEligibility(skillName, skillRaw = {}) {
  const content = skillRaw.content || '';
  const triggers = skillRaw.triggers || [];
  const name = skillName.toLowerCase();

  // 1. Human-required boundary check
  if (
    name.includes('taste') ||
    name.includes('delight') ||
    name.includes('whimsy') ||
    name.includes('soft-skill')
  ) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.HUMAN_REQUIRED,
      human_boundary: true,
      reason: 'Subjective human evaluation or aesthetic judgment boundary',
    };
  }

  // 2. Reference-only check
  const baseCls = classifySkill(skillName, skillRaw);
  if (
    baseCls.class === 'REFERENCE_ONLY' ||
    name.includes('design') ||
    name.includes('guidelines') ||
    name.includes('principles') ||
    name.includes('swiss-design') ||
    name.includes('apple-design')
  ) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.REFERENCE_ONLY,
      human_boundary: false,
      reason: 'Reference-only architecture or design guideline specification',
    };
  }

  // 3. Routing / dispatch check
  if (
    name.includes('router') ||
    name.includes('routing') ||
    name.includes('orchestrat') ||
    name.includes('dispatcher') ||
    content.includes('router')
  ) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.ROUTING,
      human_boundary: false,
      reason: 'Routing decision or agent dispatch layer',
    };
  }

  // 4. Governance check
  if (name.includes('governance') || name.includes('audit-and-fix')) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.GOVERNANCE,
      human_boundary: false,
      reason: 'Policy enforcement or static governance ruleset',
    };
  }

  // 5. Composite check
  if (skillRaw.dependencies && skillRaw.dependencies.length > 0) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.COMPOSITE,
      human_boundary: false,
      reason: 'Multi-skill composite orchestration dependency',
    };
  }

  // 6. Contract-executable check
  const { contract } = parseContract(content);
  const hasInputs = contract?.inputs && Object.keys(contract.inputs).length > 0;
  const hasOutputs = contract?.outputs && Object.keys(contract.outputs).length > 0;

  if (
    content.includes('npm run') ||
    content.includes('node ') ||
    content.includes('python ') ||
    content.includes('bash ') ||
    content.includes('scripts/') ||
    name.includes('validator') ||
    name.includes('pro') ||
    name.includes('engineer')
  ) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.EXECUTABLE,
      human_boundary: false,
      reason: 'Executable CLI or deterministic script runtime binding',
    };
  }

  if (hasInputs && hasOutputs) {
    return {
      behavior_class: ELIGIBILITY_CLASSES.CONTRACT_EXECUTABLE,
      human_boundary: false,
      reason: 'Complete contract input and output schema specification',
    };
  }

  return {
    behavior_class: ELIGIBILITY_CLASSES.UNPROVABLE,
    human_boundary: false,
    reason: 'Insufficient executable or contract assertions to obtain evidence',
  };
}

// ─── Section 11: Deterministic Priority Scoring ──────────────────────────────
function calculatePriorityScore(skillRecord) {
  let score = 0;
  const breakdown = {};
  const reasons = [];

  // Security criticality (+40)
  if (skillRecord.security_class) {
    score += 40;
    breakdown.security_criticality = 40;
    reasons.push('+40 security criticality');
  } else {
    breakdown.security_criticality = 0;
  }

  // Executable evidence (+30)
  if (skillRecord.behavior_class === ELIGIBILITY_CLASSES.EXECUTABLE) {
    score += 30;
    breakdown.executable_evidence = 30;
    reasons.push('+30 executable evidence');
  } else {
    breakdown.executable_evidence = 0;
  }

  // Contract executable (+25)
  if (
    skillRecord.behavior_class === ELIGIBILITY_CLASSES.CONTRACT_EXECUTABLE ||
    skillRecord.contract_status === 'VALID'
  ) {
    score += 25;
    breakdown.contract_executable = 25;
    reasons.push('+25 contract executable');
  } else {
    breakdown.contract_executable = 0;
  }

  // Existing external tests (+20)
  if (skillRecord.has_external_tests) {
    score += 20;
    breakdown.existing_external_tests = 20;
    reasons.push('+20 existing external tests');
  } else {
    breakdown.existing_external_tests = 0;
  }

  // High usage (+15)
  if (skillRecord.routing_usage >= 5) {
    score += 15;
    breakdown.high_usage = 15;
    reasons.push('+15 high usage');
  } else {
    breakdown.high_usage = 0;
  }

  // High routing importance (+10)
  if (skillRecord.routing_importance >= 5) {
    score += 10;
    breakdown.high_routing_importance = 10;
    reasons.push('+10 high routing importance');
  } else {
    breakdown.high_routing_importance = 0;
  }

  // Strong contract (+10)
  if (skillRecord.strong_contract) {
    score += 10;
    breakdown.strong_contract = 10;
    reasons.push('+10 strong contract');
  } else {
    breakdown.strong_contract = 0;
  }

  // Human boundary (-50)
  if (skillRecord.human_boundary) {
    score -= 50;
    breakdown.human_boundary = -50;
    reasons.push('-50 human boundary penalty');
  } else {
    breakdown.human_boundary = 0;
  }

  // Reference only (-100)
  if (skillRecord.behavior_class === ELIGIBILITY_CLASSES.REFERENCE_ONLY) {
    score -= 100;
    breakdown.reference_only = -100;
    reasons.push('-100 reference only penalty');
  } else {
    breakdown.reference_only = 0;
  }

  return {
    raw_score: score,
    breakdown,
    reasons,
    explanation: reasons.join('; '),
  };
}

// ─── Section 5: Corpus Inventory ─────────────────────────────────────────────
function buildCorpusInventory(options = {}) {
  const agentDir = options.agentDir || path.resolve(__dirname, '..');
  const skills = loadSkills(agentDir);
  const repoRoot = path.resolve(agentDir, '..');
  const p24CertPath = path.join(repoRoot, 'phase24', 'certification.json');

  let p24Cert = { skills: {} };
  if (fs.existsSync(p24CertPath)) {
    try {
      p24Cert = JSON.parse(fs.readFileSync(p24CertPath, 'utf8'));
    } catch {}
  }

  const inventory = [];
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  for (const s of sorted) {
    const skillName = s.name;
    const content = s.content || '';
    const { contract } = parseContract(content);
    const classification = classifyCorpusEligibility(skillName, s);

    const isSecurity =
      skillName.includes('security') ||
      skillName.includes('red-team') ||
      skillName.includes('vulnerability') ||
      skillName.includes('audit-and-fix') ||
      skillName.includes('zero-trust') ||
      skillName.includes('injection') ||
      skillName.includes('defense');

    const claims = extractTestableClaims(skillName, s);
    const p24Record = p24Cert.skills[skillName];
    const currentCert = p24Record ? p24Record.status : 'UNPROVABLE';
    const isPilot = PILOT_SKILLS.includes(skillName);

    const hasStrongContract =
      contract &&
      contract.inputs &&
      contract.outputs &&
      Object.keys(contract.inputs).length > 0 &&
      Object.keys(contract.outputs).length > 0;

    const record = {
      skill_id: skillName,
      behavior_class: classification.behavior_class,
      contract_status: contract ? 'VALID' : 'MISSING',
      claim_count: claims.length,
      testability: classification.behavior_class === ELIGIBILITY_CLASSES.REFERENCE_ONLY ? 'UNTESTABLE' : 'DIRECT',
      current_certification: currentCert,
      routing_usage: (s.triggers || []).length,
      routing_importance: skillName.includes('pro') || skillName.includes('specialist') ? 6 : 2,
      security_class: isSecurity,
      human_boundary: classification.human_boundary,
      strong_contract: !!hasStrongContract,
      has_external_tests: fs.existsSync(path.join(agentDir, 'skills', skillName, 'tests')),
      is_pilot: isPilot,
      eligible: !isPilot && !EXCLUDED_CLASSES.includes(classification.behavior_class) && claims.length > 0,
    };

    const scoring = calculatePriorityScore(record);
    record.priority_score = scoring.raw_score;
    record.score_breakdown = scoring.breakdown;
    record.score_explanation = scoring.explanation;

    inventory.push(record);
  }

  return inventory;
}

// ─── Section 10 & 12: Wave Selection ─────────────────────────────────────────
function selectWave(waveNumber = 1, inventory = [], options = {}) {
  const maxWaveSize = options.maxWaveSize || 25;
  const eligibleSkills = inventory.filter(s => s.eligible && s.current_certification === 'UNPROVABLE');

  // Deterministic sort: descending priority score, tie-breaker: skill_id
  const sorted = [...eligibleSkills].sort((a, b) => {
    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }
    return a.skill_id.localeCompare(b.skill_id);
  });

  const selected = sorted.slice(0, maxWaveSize);
  const selectedIds = selected.map(s => s.skill_id);

  const excluded = inventory.filter(s => !selectedIds.includes(s.skill_id));
  const excludedRecords = excluded.map(s => ({
    skill_id: s.skill_id,
    reason: s.is_pilot
      ? 'Already evaluated in pilot corpus'
      : EXCLUDED_CLASSES.includes(s.behavior_class)
      ? `Excluded class: ${s.behavior_class}`
      : 'Deferred to later waves (capacity threshold)',
    automated_certification: false,
  }));

  const selectionHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(selectedIds))
    .digest('hex');

  return {
    wave: waveNumber,
    selected_skills: selectedIds,
    selected_records: selected,
    excluded_skills: excludedRecords,
    selection_hash: selectionHash,
    selection_method: 'DETERMINISTIC_CORPUS_PRIORITY',
    timestamp: new Date().toISOString(),
  };
}

// ─── Section 27-28: Wave Snapshots & Atomicity ───────────────────────────────
function createWaveSnapshot(currentCertificationSnapshot, options = {}) {
  return {
    snapshot_hash: crypto.createHash('sha256').update(JSON.stringify(currentCertificationSnapshot)).digest('hex'),
    timestamp: new Date().toISOString(),
    skills: JSON.parse(JSON.stringify(currentCertificationSnapshot.skills || {})),
    summary: JSON.parse(JSON.stringify(currentCertificationSnapshot.summary || {})),
  };
}

function computeWaveDiff(preSnapshot, postSnapshot) {
  return certEngine.compareCertificationSnapshots(preSnapshot, postSnapshot);
}

// ─── Section 27: Rollback ────────────────────────────────────────────────────
function rollbackWave(waveNumber, preSnapshot, targetCertPath) {
  fs.writeFileSync(targetCertPath, JSON.stringify(preSnapshot, null, 2), 'utf8');

  // Section 24: Record WAVE_ROLLED_BACK to history ledger
  const historyPath = path.resolve(__dirname, '..', 'data', 'corpus_certification_history.jsonl');
  if (fs.existsSync(historyPath)) {
    fs.appendFileSync(
      historyPath,
      JSON.stringify({
        event: 'WAVE_ROLLED_BACK',
        wave_id: waveNumber,
        restored_hash: preSnapshot.snapshot_hash,
        timestamp: new Date().toISOString(),
      }) + '\n',
      'utf8'
    );
  }

  return {
    wave: waveNumber,
    status: 'ROLLED_BACK',
    restored_hash: preSnapshot.snapshot_hash,
    timestamp: new Date().toISOString(),
  };
}

// ─── Section 30: Corpus Certification Metrics ────────────────────────────────
function generateCorpusMetrics(inventory, certificationState, waveResults = []) {
  const totalCorpus = inventory.length;
  const skillsMap = certificationState.skills || {};

  let certified = 0;
  let highConf = 0;
  let partial = 0;
  let unprovable = 0;
  let referenceOnly = 0;
  let humanRequired = 0;
  let securityCertified = 0;

  for (const item of inventory) {
    const cert = skillsMap[item.skill_id];
    const status = cert ? cert.status : 'UNPROVABLE';

    if (item.behavior_class === ELIGIBILITY_CLASSES.REFERENCE_ONLY) {
      referenceOnly++;
    }
    if (item.human_boundary) {
      humanRequired++;
    }

    if (status === certEngine.CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED) {
      certified++;
      if (item.security_class) securityCertified++;
    } else if (status === certEngine.CERTIFICATION_LEVELS.HIGH_CONFIDENCE) {
      highConf++;
    } else if (status === certEngine.CERTIFICATION_LEVELS.PARTIAL) {
      partial++;
    } else {
      unprovable++;
    }
  }

  let totalDiscoveredClaims = 0;
  let totalVerifiedClaims = 0;
  let totalFailedClaims = 0;

  for (const item of inventory) {
    totalDiscoveredClaims += item.claim_count;
    const cert = skillsMap[item.skill_id];
    if (cert && cert.claims_summary) {
      totalVerifiedClaims += cert.claims_summary.verified || 0;
      totalFailedClaims += cert.claims_summary.failed || 0;
    }
  }

  return {
    total_corpus_skills: totalCorpus,
    pilot_certified_skills: 18,
    newly_certified_skills: certified - 18 > 0 ? certified - 18 : 0,
    behaviorally_certified_skills: certified,
    high_confidence_skills: highConf,
    partial_skills: partial,
    unprovable_skills: unprovable,
    reference_only_skills: referenceOnly,
    human_required_skills: humanRequired,
    security_skills_certified: securityCertified,
    total_claims_discovered: totalDiscoveredClaims,
    total_claims_verified: totalVerifiedClaims,
    total_claims_failed: totalFailedClaims,
    total_evidence_promoted: waveResults.reduce((acc, w) => acc + (w.promoted_evidence || 0), 0),
    waves_executed: waveResults.length,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  ELIGIBILITY_CLASSES,
  EXCLUDED_CLASSES,
  PILOT_SKILLS,
  classifyCorpusEligibility,
  calculatePriorityScore,
  buildCorpusInventory,
  selectWave,
  createWaveSnapshot,
  computeWaveDiff,
  rollbackWave,
  generateCorpusMetrics,
};
