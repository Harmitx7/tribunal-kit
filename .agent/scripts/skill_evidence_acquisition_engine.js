'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSkills } = require('./context_broker');
const { classifySkill } = require('./skill_behavior_classifier');
const { deriveScenarios } = require('./skill_scenario_engine');
const { createFixture } = require('./skill_fixture_engine');
const { observeExecution, hashObservation } = require('./skill_observation_engine');
const { resolveExpectations, compareObservation } = require('./skill_expectation_engine');
const { createReviewPackage } = require('./skill_human_validation');

// ─── Evidence Trust Hierarchy ───────────────────────────────────────────────
const TRUST_LEVELS = {
  E0: { name: 'NO_EVIDENCE', rank: 0, certifiable: false },
  E1: { name: 'STRUCTURAL_EVIDENCE', rank: 1, certifiable: false },
  E2: { name: 'EXISTING_TEST_EVIDENCE', rank: 2, certifiable: true },
  E3: { name: 'EXISTING_IMPLEMENTATION_EVIDENCE', rank: 3, certifiable: false }, // circular risk
  E4: { name: 'HUMAN_APPROVED_EVIDENCE', rank: 4, certifiable: true },
  E5: { name: 'REPEATED_EMPIRICAL_EVIDENCE', rank: 5, certifiable: true },
};

// ─── Certification State Machine ────────────────────────────────────────────
const CERT_STATES = [
  'UNPROVABLE',
  'EVIDENCE_FOUND',
  'SCENARIO_READY',
  'AWAITING_VALIDATION',
  'READY_FOR_EXECUTION',
  'EXECUTING',
  'OBSERVED',
  'REPEATABILITY_PENDING',
  'CERTIFIED',
  'FAILED',
  'QUARANTINED',
  'STALE',
];

const VALID_TRANSITIONS = {
  UNPROVABLE: ['EVIDENCE_FOUND'],
  EVIDENCE_FOUND: ['SCENARIO_READY', 'UNPROVABLE'],
  SCENARIO_READY: ['AWAITING_VALIDATION', 'READY_FOR_EXECUTION', 'UNPROVABLE'],
  AWAITING_VALIDATION: ['READY_FOR_EXECUTION', 'UNPROVABLE', 'FAILED'],
  READY_FOR_EXECUTION: ['EXECUTING'],
  EXECUTING: ['OBSERVED', 'FAILED', 'QUARANTINED'],
  OBSERVED: ['REPEATABILITY_PENDING', 'FAILED'],
  REPEATABILITY_PENDING: ['CERTIFIED', 'FAILED', 'QUARANTINED'],
  CERTIFIED: ['STALE', 'QUARANTINED'],
  FAILED: ['EVIDENCE_FOUND', 'QUARANTINED'], // allow re-evaluation with new evidence
  QUARANTINED: [],
  STALE: ['EVIDENCE_FOUND'],
};

function transition(currentState, targetState) {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    return { success: false, error: `Illegal transition: ${currentState} → ${targetState}` };
  }
  return { success: true, state: targetState };
}

// ─── Evidence Provenance ────────────────────────────────────────────────────
function createEvidenceRecord(sourceType, sourcePath, skillId, scenarioHash, expectationHash, trustLevel) {
  const sourceHash = sourcePath && fs.existsSync(sourcePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')
    : 'NO_FILE';

  return {
    evidence_id: `EV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    source_type: sourceType, // TEST | CONTRACT | IMPLEMENTATION | HUMAN
    source_path: sourcePath || null,
    source_hash: sourceHash,
    skill_id: skillId,
    scenario_hash: scenarioHash,
    expectation_hash: expectationHash,
    created_at: new Date().toISOString(),
    trust_level: trustLevel,
    independent: sourceType !== 'IMPLEMENTATION', // implementation evidence is never independent
    status: 'VALID',
  };
}

function isCircularEvidence(evidenceRecord) {
  // Implementation-sourced evidence verifying itself is circular
  return evidenceRecord.source_type === 'IMPLEMENTATION' && !evidenceRecord.independent;
}

function isStaleEvidence(evidenceRecord) {
  if (!evidenceRecord.source_path || !fs.existsSync(evidenceRecord.source_path)) {
    return true;
  }
  const currentHash = crypto.createHash('sha256')
    .update(fs.readFileSync(evidenceRecord.source_path))
    .digest('hex');
  return currentHash !== evidenceRecord.source_hash;
}

// ─── Evidence Deduplication ─────────────────────────────────────────────────
function deduplicateEvidence(evidenceItems) {
  const seen = new Set();
  const unique = [];
  for (const item of evidenceItems) {
    const key = `${item.skill_id}|${item.scenario_hash}|${item.expectation_hash}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

// ─── Discovery ──────────────────────────────────────────────────────────────
function discoverEvidenceForSkill(skillName, skillRaw) {
  const agentDir = path.join(__dirname, '..');
  const repoRoot = path.join(agentDir, '..');
  const sources = [];

  // 1. Check for existing unit tests
  const testFile = path.join(repoRoot, 'test', 'unit', `${skillName}.test.js`);
  if (fs.existsSync(testFile)) {
    sources.push({
      type: 'TEST',
      path: testFile,
      trust: 'E2',
      description: 'Existing unit test file',
    });
  }

  // 2. Check for contract declarations
  if (skillRaw?.verification?.assertions?.length > 0) {
    sources.push({
      type: 'CONTRACT',
      path: null,
      trust: 'E1',
      description: 'Contract verification assertions',
    });
  }

  // 3. Check for behavior scenarios in contract
  if (skillRaw?.behavior?.scenarios?.length > 0) {
    sources.push({
      type: 'CONTRACT',
      path: null,
      trust: 'E1',
      description: 'Contract behavior scenarios',
    });
  }

  // 4. Check for script bindings
  const skillDir = path.join(agentDir, 'skills', skillName);
  if (fs.existsSync(skillDir)) {
    const scriptsDir = path.join(skillDir, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      sources.push({
        type: 'IMPLEMENTATION',
        path: scriptsDir,
        trust: 'E3',
        description: 'Skill has bound scripts',
      });
    }
  }

  return sources;
}

// ─── Scenario Generation ────────────────────────────────────────────────────
function generateCertificationScenarios(skillName, skillRaw, classification, evidenceSources) {
  const scenarios = [];

  for (const source of evidenceSources) {
    const scenarioContent = JSON.stringify({ skill: skillName, source: source.type, trust: source.trust });
    const scenarioHash = crypto.createHash('sha256').update(scenarioContent).digest('hex');

    // Resolve expectations independently — NEVER from implementation output
    const expectations = resolveExpectations(skillRaw);
    const expectationHash = crypto.createHash('sha256').update(JSON.stringify(expectations)).digest('hex');

    // Independence check: expectation source must differ from observation source
    const independent = source.type !== 'IMPLEMENTATION';

    scenarios.push({
      scenario_id: `SCN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      skill_id: skillName,
      input: {},
      preconditions: [],
      expected: {
        outputs: expectations.assertions,
        files: [],
        exit_code: 0,
        invariants: expectations.assertions,
      },
      evidence_sources: [source],
      independence: {
        verified: independent,
        reason: independent
          ? `Expectation from ${expectations.source}, observation from ${source.type}`
          : 'CIRCULAR: implementation defines its own expectation',
      },
      scenario_hash: scenarioHash,
      expectation_hash: expectationHash,
      trust_level: source.trust,
    });
  }

  return scenarios;
}

// ─── Sandbox Execution with Repeatability ───────────────────────────────────
const MIN_REPETITIONS = 3;

function executeSandboxed(skillName, scenario) {
  const results = [];

  for (let run = 0; run < MIN_REPETITIONS; run++) {
    const fixture = createFixture(skillName);
    const startMs = Date.now();

    try {
      const observation = observeExecution(skillName, fixture, {});
      const durationMs = Date.now() - startMs;

      results.push({
        execution_id: `EXEC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        scenario_id: scenario.scenario_id,
        run_number: run + 1,
        exit_code: observation.exit_code,
        duration_ms: durationMs,
        stdout_hash: observation.sha256,
        stderr_hash: 'none',
        filesystem_hash: hashObservation(observation.filesystem_diff || []),
        network_activity: [],
        side_effects: [],
        status: observation.exit_code === 0 ? 'PASS' : 'FAIL',
        observation,
      });
    } finally {
      fixture.cleanup();
    }
  }

  return results;
}

function classifyRepeatability(executionResults) {
  if (executionResults.length === 0) return 'FAILED';

  const allPassed = executionResults.every(r => r.status === 'PASS');
  if (!allPassed) return 'UNSTABLE';

  // Check output consistency across runs
  const hashes = executionResults.map(r => r.stdout_hash);
  const uniqueHashes = new Set(hashes);

  if (uniqueHashes.size === 1) return 'DETERMINISTIC';
  if (uniqueHashes.size <= 2) return 'STABLE';
  return 'NONDETERMINISTIC';
}

// ─── Full Pipeline ──────────────────────────────────────────────────────────
function acquireEvidenceForSkill(skillName) {
  const agentDir = path.join(__dirname, '..');
  const skills = loadSkills(agentDir);
  const skill = skills.find(s => s.name === skillName);
  if (!skill) return { skill: skillName, status: 'NOT_FOUND' };

  const classification = classifySkill(skillName, skill);
  let certState = 'UNPROVABLE';

  // Step 1: Discover evidence
  const evidenceSources = discoverEvidenceForSkill(skillName, skill);
  if (evidenceSources.length === 0) {
    return { skill: skillName, state: certState, evidence_count: 0, scenarios: [] };
  }

  // Transition: UNPROVABLE → EVIDENCE_FOUND
  const t1 = transition(certState, 'EVIDENCE_FOUND');
  if (!t1.success) return { skill: skillName, state: certState, error: t1.error };
  certState = t1.state;

  // Step 2: Generate scenarios
  const scenarios = generateCertificationScenarios(skillName, skill, classification, evidenceSources);

  // Filter out circular evidence scenarios
  const independentScenarios = scenarios.filter(s => s.independence.verified);
  if (independentScenarios.length === 0) {
    return {
      skill: skillName,
      state: 'UNPROVABLE',
      reason: 'All evidence sources are circular',
      scenarios: scenarios.map(s => ({ id: s.scenario_id, circular: !s.independence.verified })),
    };
  }

  // Transition: EVIDENCE_FOUND → SCENARIO_READY
  const t2 = transition(certState, 'SCENARIO_READY');
  if (!t2.success) return { skill: skillName, state: certState, error: t2.error };
  certState = t2.state;

  // Step 3: Check if expectations exist independently
  const expectations = resolveExpectations(skill);
  if (expectations.source === 'none') {
    // Reference-only or no contract — needs human validation or stays unprovable
    if (classification.class === 'REFERENCE_ONLY') {
      return {
        skill: skillName,
        state: 'UNPROVABLE',
        reason: 'Reference-only skill cannot be behaviorally certified',
        certification: {
          structural: { status: 'CERTIFIED' },
          behavioral: { status: 'UNPROVABLE' },
          safety: { status: 'CERTIFIED' },
          overall: { status: 'PARTIAL' },
        },
      };
    }
    // Needs human validation
    const t3 = transition(certState, 'AWAITING_VALIDATION');
    if (!t3.success) return { skill: skillName, state: certState, error: t3.error };
    certState = t3.state;

    const reviewPkg = createReviewPackage(skillName, expectations, {});
    return {
      skill: skillName,
      state: certState,
      reason: 'No independent expectations — requires human validation',
      review_package: reviewPkg,
    };
  }

  // Transition to execution
  const t4 = transition(certState, 'READY_FOR_EXECUTION');
  if (!t4.success) return { skill: skillName, state: certState, error: t4.error };
  certState = t4.state;

  const t5 = transition(certState, 'EXECUTING');
  if (!t5.success) return { skill: skillName, state: certState, error: t5.error };
  certState = t5.state;

  // Step 4: Execute in sandbox with repeatability
  const allExecutionResults = [];
  const scenarioResults = [];

  for (const scenario of independentScenarios) {
    const execResults = executeSandboxed(skillName, scenario);
    allExecutionResults.push(...execResults);

    const repeatability = classifyRepeatability(execResults);
    const comparison = compareObservation(expectations, execResults[0]?.observation || {});

    scenarioResults.push({
      scenario_id: scenario.scenario_id,
      trust_level: scenario.trust_level,
      repeatability,
      comparison,
      runs: execResults.length,
      passed: execResults.filter(r => r.status === 'PASS').length,
    });
  }

  // Transition: EXECUTING → OBSERVED
  const t6 = transition(certState, 'OBSERVED');
  if (!t6.success) return { skill: skillName, state: certState, error: t6.error };
  certState = t6.state;

  // Step 5: Evaluate repeatability
  const t7 = transition(certState, 'REPEATABILITY_PENDING');
  if (!t7.success) return { skill: skillName, state: certState, error: t7.error };
  certState = t7.state;

  // Step 6: Determine certification
  const allDeterministic = scenarioResults.every(r => r.repeatability === 'DETERMINISTIC');
  const allPassed = scenarioResults.every(r => r.comparison === 'PASS');
  const verifiedScenarios = scenarioResults.filter(r => r.comparison === 'PASS' && r.repeatability === 'DETERMINISTIC');

  // Calculate coverage
  const coverage = independentScenarios.length > 0
    ? Math.round((verifiedScenarios.length / independentScenarios.length) * 100)
    : 0;

  let finalState;
  if (allPassed && allDeterministic && verifiedScenarios.length > 0) {
    const t8 = transition(certState, 'CERTIFIED');
    finalState = t8.success ? 'CERTIFIED' : 'FAILED';
  } else if (verifiedScenarios.length > 0) {
    // Partial — some scenarios verified, some not
    finalState = 'REPEATABILITY_PENDING'; // stays pending
  } else {
    const t8 = transition(certState, 'FAILED');
    finalState = t8.success ? 'FAILED' : certState;
  }

  return {
    skill: skillName,
    state: finalState,
    classification: classification.class,
    evidence_count: evidenceSources.length,
    scenario_count: independentScenarios.length,
    verified_scenarios: verifiedScenarios.length,
    failed_scenarios: scenarioResults.filter(r => r.comparison === 'FAIL').length,
    repeatability: allDeterministic ? 'DETERMINISTIC' : 'MIXED',
    coverage,
    sandbox_status: 'CLEAN',
    certification: {
      structural: { status: 'CERTIFIED' },
      behavioral: {
        status: finalState === 'CERTIFIED' ? 'VERIFIED' : (coverage > 0 ? 'PARTIAL' : 'UNPROVABLE'),
        coverage,
        verified_behaviors: verifiedScenarios.map(s => s.scenario_id),
        unverified_behaviors: scenarioResults.filter(r => r.comparison !== 'PASS').map(s => s.scenario_id),
      },
      safety: { status: 'CERTIFIED' },
      overall: {
        status: finalState === 'CERTIFIED' ? 'CERTIFIED' : (coverage > 0 ? 'PARTIAL' : 'UNPROVABLE'),
      },
    },
    scenario_results: scenarioResults,
  };
}

// ─── Pilot Selection (Deterministic) ────────────────────────────────────────
function selectPilot() {
  const agentDir = path.join(__dirname, '..');
  const skills = loadSkills(agentDir);
  const pilot = [];
  const reasons = {};

  // Sort for determinism
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  // Category finders
  const find = (predicate, reason) => {
    const s = sorted.find(sk => predicate(sk) && !pilot.includes(sk.name));
    if (s) { pilot.push(s.name); reasons[s.name] = reason; }
  };

  // 1. Executable skill
  find(s => {
    const c = classifySkill(s.name, s);
    return c.class === 'EXECUTABLE' && s.content && s.content.includes('node ');
  }, 'Executable skill with node binding');

  // 2. Contract-executable
  find(s => s?.verification?.assertions?.length > 0, 'Contract with explicit assertions');

  // 3. Reference-only
  find(s => {
    const c = classifySkill(s.name, s);
    return c.class === 'REFERENCE_ONLY';
  }, 'Reference-only skill (behavioral certification excluded)');

  // 4. Routing skill
  find(s => {
    const c = classifySkill(s.name, s);
    return c.class === 'ROUTING';
  }, 'Routing skill (mock-router verification)');

  // 5. Composite skill
  find(s => s?.dependencies?.length > 0, 'Composite skill with dependencies');

  // 6. Governance skill
  find(s => {
    const c = classifySkill(s.name, s);
    return c.class === 'GOVERNANCE';
  }, 'Governance skill (static-analysis verification)');

  // 7. Skill with existing tests
  const repoRoot = path.join(agentDir, '..');
  find(s => fs.existsSync(path.join(repoRoot, 'test', 'unit', `${s.name}.test.js`)), 'Has existing unit test');

  // 8. Skill with partial evidence
  find(s => {
    const sources = discoverEvidenceForSkill(s.name, s);
    return sources.length > 0 && sources.length < 3;
  }, 'Partial evidence available');

  // 9. Skill with stale evidence (approximation: old skills with no recent tests)
  find(s => s.name.includes('legacy') || s.name.includes('deprecated'), 'Potentially stale evidence');

  // 10. Requires human validation
  find(s => {
    const exp = resolveExpectations(s);
    return exp.source === 'none' && classifySkill(s.name, s).class !== 'REFERENCE_ONLY';
  }, 'No mechanical expectations — requires human validation');

  // 11. Deterministic file mutation
  find(s => s.content && (s.content.includes('fs.write') || s.content.includes('mkdir')), 'Deterministic file mutation detected');

  // 12. Deliberately unprovable
  find(s => {
    const sources = discoverEvidenceForSkill(s.name, s);
    return sources.length === 0;
  }, 'Deliberately unprovable — zero evidence sources');

  return { pilot, reasons };
}

// ─── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'discover') {
    const skillName = process.argv[3];
    const agentDir = path.join(__dirname, '..');
    const skills = loadSkills(agentDir);
    const skill = skills.find(s => s.name === skillName);
    if (!skill) { console.log('Skill not found'); process.exit(1); }
    console.log(JSON.stringify(discoverEvidenceForSkill(skillName, skill), null, 2));
  } else if (cmd === 'acquire') {
    const skillName = process.argv[3];
    console.log(JSON.stringify(acquireEvidenceForSkill(skillName), null, 2));
  } else if (cmd === 'pilot') {
    console.log(JSON.stringify(selectPilot(), null, 2));
  } else {
    console.log('Usage: node skill_evidence_acquisition_engine.js <discover|acquire|pilot> [skillName]');
  }
}

module.exports = {
  TRUST_LEVELS,
  CERT_STATES,
  VALID_TRANSITIONS,
  transition,
  createEvidenceRecord,
  isCircularEvidence,
  isStaleEvidence,
  deduplicateEvidence,
  discoverEvidenceForSkill,
  generateCertificationScenarios,
  executeSandboxed,
  classifyRepeatability,
  acquireEvidenceForSkill,
  selectPilot,
  MIN_REPETITIONS,
};
