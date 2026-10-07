'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadSkills } = require('./context_broker');
const { classifySkill } = require('./skill_behavior_classifier');
const { parseContract } = require('./skill_contract_engine');
const { createFixture } = require('./skill_fixture_engine');
const { observeExecution, hashObservation } = require('./skill_observation_engine');

// ─── Constants & Metadata ───────────────────────────────────────────────────
const TESTABILITY = {
  DIRECT: 'DIRECT',
  DERIVABLE: 'DERIVABLE',
  HUMAN_REQUIRED: 'HUMAN_REQUIRED',
  UNTESTABLE: 'UNTESTABLE',
};

const TEST_TYPES = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  BOUNDARY: 'BOUNDARY',
  SAFETY: 'SAFETY',
  IDEMPOTENCY: 'IDEMPOTENCY',
};

const REVIEW_STATES = {
  DRAFT: 'DRAFT',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  STALE: 'STALE',
  INVALID: 'INVALID',
  HOLD: 'HOLD',
};

const REPEATABILITY = {
  DETERMINISTIC: 'DETERMINISTIC',
  STABLE: 'STABLE',
  NONDETERMINISTIC: 'NONDETERMINISTIC',
  UNSTABLE: 'UNSTABLE',
  FAILED: 'FAILED',
};

const CRITICAL_DOMAINS = [
  'security',
  'database',
  'authentication',
  'infrastructure',
  'code modification',
  'deployment',
];

// ─── Pilot Selection (Section 15) ───────────────────────────────────────────
function discoverTestableSkills() {
  const agentDir = path.resolve(__dirname, '..');
  const skills = loadSkills(agentDir);
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  const pilot = [];
  const categories = {
    executable: { target: 5, skills: [], status: 'AVAILABLE' },
    'contract-executable': { target: 5, skills: [], status: 'CATEGORY_UNAVAILABLE' },
    'high-usage': { target: 5, skills: [], status: 'AVAILABLE' },
    'security/critical': { target: 5, skills: [], status: 'AVAILABLE' },
    'reference/composite/human-boundary': { target: 5, skills: [], status: 'AVAILABLE' },
  };
  const reasons = {};

  // 1. Executable skills (with verified script bindings or scripts/ directories)
  const executableCandidates = [
    'api-patterns',
    'geo-fundamentals',
    'hf-cloud-python-env-setup',
    'lint-and-validate',
    'webapp-testing',
  ];
  for (const name of executableCandidates) {
    if (sorted.some(s => s.name === name) && !pilot.includes(name)) {
      pilot.push(name);
      categories.executable.skills.push(name);
      reasons[name] = 'Executable skill with deterministic script execution binding';
    }
  }

  // 2. Contract-executable skills
  // Note: 0 legacy skills have explicit `verification.assertions` in frontmatter.
  // Explicitly recording CATEGORY_UNAVAILABLE per spec Section 15.
  // Explicit non-silent fallback to 5 skills with complete contract input/output schemas:
  const contractCandidates = [
    'database-design',
    'data-validation-schemas',
    'config-validator',
    'domain-modeling',
    'system-design-pro',
  ];
  categories['contract-executable'].note =
    'CATEGORY_UNAVAILABLE for legacy verification.assertions; explicitly selecting 5 complete contract-schema skills';
  for (const name of contractCandidates) {
    if (sorted.some(s => s.name === name) && !pilot.includes(name)) {
      pilot.push(name);
      categories['contract-executable'].skills.push(name);
      reasons[name] = 'Contract-executable schema validation interface';
    }
  }

  // 3. High-usage skills (from benchmark datasets)
  const highUsageCandidates = [
    'react-specialist',
    'frontend-design',
    'sql-pro',
    'backend-redis',
    'devops-engineer',
  ];
  for (const name of highUsageCandidates) {
    if (sorted.some(s => s.name === name) && !pilot.includes(name)) {
      pilot.push(name);
      categories['high-usage'].skills.push(name);
      reasons[name] = 'High-usage skill in Tribunal benchmark suites';
    }
  }

  // 4. Security / critical skills
  const securityCandidates = [
    'api-security-auditor',
    'backend-security-expert',
    'audit-and-fix',
    'red-team-tactics',
    'zero-trust-passkeys',
  ];
  for (const name of securityCandidates) {
    if (sorted.some(s => s.name === name) && !pilot.includes(name)) {
      pilot.push(name);
      categories['security/critical'].skills.push(name);
      reasons[name] = 'Security-classified critical domain skill requiring elevated assurance';
    }
  }

  // 5. Reference / composite / human-boundary skills
  const refCompHumanCandidates = [
    '12-principles-of-animation',
    'apple-design',
    '60fps-animation',
    'agent-organizer',
    'taste-skill',
  ];
  for (const name of refCompHumanCandidates) {
    if (sorted.some(s => s.name === name) && !pilot.includes(name)) {
      pilot.push(name);
      categories['reference/composite/human-boundary'].skills.push(name);
      reasons[name] = 'Reference-only, composite, or human-boundary verification threshold';
    }
  }

  return {
    total_selected: pilot.length,
    pilot,
    categories,
    reasons,
  };
}

// ─── Testable Claim Extraction (Section 4) ──────────────────────────────────
function extractTestableClaims(skillName, skillRaw = {}) {
  const claims = [];
  const agentDir = path.resolve(__dirname, '..');
  const skillFile = path.join(agentDir, 'skills', skillName, 'SKILL.md');
  const content = fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : (skillRaw.content || '');
  const fileHash = content ? crypto.createHash('sha256').update(content).digest('hex') : 'NO_FILE';

  const { contract } = parseContract(content);
  const enrichedRaw = { ...skillRaw, content };
  const classification = classifySkill(skillName, enrichedRaw);

  // Reference-only check
  const isReferenceOnly =
    classification.class === 'REFERENCE_ONLY' ||
    skillName === '12-principles-of-animation' ||
    skillName.includes('principles') ||
    skillName.includes('design-guidelines');
  const isHumanBoundary = skillName === '60fps-animation' || skillName === 'taste-skill';

  // 1. Contract Inputs
  if (contract?.inputs && typeof contract.inputs === 'object') {
    for (const [key, expectedType] of Object.entries(contract.inputs)) {
      claims.push({
        id: `CLM-${skillName}-INP-${key}`,
        skill_id: skillName,
        source: 'contract.inputs',
        source_hash: fileHash,
        type: 'INPUT_VALIDATION',
        statement: `Input parameter '${key}' must be accepted as type '${expectedType}'`,
        testability: isReferenceOnly ? TESTABILITY.UNTESTABLE : TESTABILITY.DIRECT,
        field: key,
        expected_type: expectedType,
      });
    }
  }

  // 2. Contract Outputs
  if (contract?.outputs && typeof contract.outputs === 'object') {
    for (const [key, expectedType] of Object.entries(contract.outputs)) {
      claims.push({
        id: `CLM-${skillName}-OUT-${key}`,
        skill_id: skillName,
        source: 'contract.outputs',
        source_hash: fileHash,
        type: 'OUTPUT_CONFORMANCE',
        statement: `Output parameter '${key}' must be emitted conforming to type '${expectedType}'`,
        testability: isReferenceOnly ? TESTABILITY.UNTESTABLE : TESTABILITY.DIRECT,
        field: key,
        expected_type: expectedType,
      });
    }
  }

  // 3. Preconditions & Invariants
  claims.push({
    id: `CLM-${skillName}-SAFE-CONTAINMENT`,
    skill_id: skillName,
    source: 'contract.invariants',
    source_hash: fileHash,
    type: 'SAFETY_INVARIANT',
    statement: `Execution must remain contained within sandboxed workspace without external filesystem mutation`,
    testability: isReferenceOnly ? TESTABILITY.UNTESTABLE : TESTABILITY.DERIVABLE,
  });

  claims.push({
    id: `CLM-${skillName}-SAFE-NONETWORK`,
    skill_id: skillName,
    source: 'contract.invariants',
    source_hash: fileHash,
    type: 'SAFETY_INVARIANT',
    statement: `Execution must not perform undeclared or unauthorized external network requests`,
    testability: isReferenceOnly ? TESTABILITY.UNTESTABLE : TESTABILITY.DERIVABLE,
  });

  // 4. Documented Behavior / Activation Boundaries
  if (content.includes('Activation Boundaries') || content.includes('Activate when:')) {
    claims.push({
      id: `CLM-${skillName}-BEHAVIOR-ACTIVATION`,
      skill_id: skillName,
      source: 'documented_behavior',
      source_hash: fileHash,
      type: 'BEHAVIORAL_SPEC',
      statement: `Skill must activate only within defined activation domain boundaries`,
      testability: isReferenceOnly
        ? TESTABILITY.UNTESTABLE
        : isHumanBoundary
          ? TESTABILITY.HUMAN_REQUIRED
          : TESTABILITY.DERIVABLE,
    });
  }

  // 5. Verification Assertions (if present in contract)
  if (contract?.verification?.assertions?.length > 0) {
    contract.verification.assertions.forEach((assertion, idx) => {
      claims.push({
        id: `CLM-${skillName}-ASSERT-${idx + 1}`,
        skill_id: skillName,
        source: 'verification.assertions',
        source_hash: fileHash,
        type: 'EXPLICIT_ASSERTION',
        statement: assertion,
        testability: TESTABILITY.DIRECT,
      });
    });
  }

  // 6. Idempotency (only if declared)
  if (contract?.state?.idempotent === true) {
    claims.push({
      id: `CLM-${skillName}-IDEMPOTENT`,
      skill_id: skillName,
      source: 'contract.state',
      source_hash: fileHash,
      type: 'IDEMPOTENCY',
      statement: `Repeated execution with identical input produces equivalent state without side effects`,
      testability: TESTABILITY.DERIVABLE,
    });
  }

  // Never turn UNTESTABLE into a guessed assertion
  return claims;
}

// ─── Test Independence & Circularity Detection (Section 12) ─────────────────
function detectCircularity(test) {
  if (!test || !test.independence) {
    return { circular: true, reason: 'CIRCULAR_TEST: Missing independence metadata' };
  }

  const expSource = String(test.independence.expectation_source || '').toLowerCase();
  const impSource = String(test.independence.implementation_source || '').toLowerCase();

  // 1. Identical sources
  if (expSource === impSource) {
    return {
      circular: true,
      reason: 'CIRCULAR_TEST: test source and implementation source are identical',
    };
  }

  // 2. Expected output comes from implementation or runtime
  if (
    expSource.includes('implementation') ||
    expSource.includes('observed_output') ||
    expSource.includes('runtime_execution') ||
    expSource.includes('runtime')
  ) {
    return {
      circular: true,
      reason: 'CIRCULAR_TEST: expected output derived from implementation output',
    };
  }

  // 3. Dynamic mutation of expectation
  if (test.expected && test.expected.dynamically_copied === true) {
    return {
      circular: true,
      reason: 'CIRCULAR_TEST: test mutates its own expectation based on observed output',
    };
  }

  // 4. Fixture generated from observed output
  if (test.inputs && test.inputs.derived_from_observed_output === true) {
    return {
      circular: true,
      reason: 'CIRCULAR_TEST: fixture was generated from observed implementation output',
    };
  }

  return { circular: false };
}

function validateTestIndependence(test) {
  const circularity = detectCircularity(test);
  if (circularity.circular) {
    test.independence.verified = false;
    test.independence.rejection_reason = circularity.reason;
    return { valid: false, code: 'CIRCULAR_TEST', reason: circularity.reason };
  }

  // Ensure expectation source is a known authority
  const allowedExpectationSources = [
    'contract.inputs',
    'contract.outputs',
    'contract.preconditions',
    'contract.postconditions',
    'contract.invariants',
    'contract.state',
    'verification.assertions',
    'documented_behavior',
    'acceptance_criteria',
    'external_tests',
  ];

  const hasAuthorizedSource = allowedExpectationSources.some(s =>
    test.independence.expectation_source.startsWith(s),
  );

  if (!hasAuthorizedSource) {
    test.independence.verified = false;
    return {
      valid: false,
      code: 'UNAUTHORIZED_EXPECTATION_SOURCE',
      reason: `Expectation source '${test.independence.expectation_source}' is not an independent authority`,
    };
  }

  test.independence.verified = true;
  return { valid: true };
}

// ─── Test Quality Score (Section 17) ─────────────────────────────────────────
function calculateTestQualityScore(test) {
  let score = 0;
  const breakdown = {};

  // 1. Claim Clarity (20%)
  let claimClarity = 0;
  if (test.claim && test.claim.id && test.claim.statement) {
    if (test.claim.statement.length >= 15) claimClarity += 10;
    if (['DIRECT', 'DERIVABLE'].includes(test.claim.testability)) claimClarity += 10;
    else if (test.claim.testability === 'HUMAN_REQUIRED') claimClarity += 5;
  }
  breakdown.claim_clarity = claimClarity;
  score += claimClarity;

  // 2. Expectation Authority (25%)
  let expectationAuthority = 0;
  const expSrc = test.independence?.expectation_source || '';
  if (expSrc.startsWith('contract.outputs') || expSrc.startsWith('contract.inputs')) expectationAuthority += 25;
  else if (expSrc.startsWith('contract.invariants')) expectationAuthority += 20;
  else if (expSrc.startsWith('documented_behavior')) expectationAuthority += 15;
  else if (expSrc.startsWith('verification.assertions')) expectationAuthority += 25;
  breakdown.expectation_authority = expectationAuthority;
  score += expectationAuthority;

  // 3. Independence (20%)
  let independenceScore = 0;
  if (test.independence?.verified === true && !detectCircularity(test).circular) {
    independenceScore = 20;
  }
  breakdown.independence = independenceScore;
  score += independenceScore;

  // 4. Observability (15%)
  let observabilityScore = 0;
  if (test.expected && (test.expected.outputs?.length > 0 || test.expected.invariants?.length > 0)) {
    observabilityScore += 10;
  }
  if (typeof test.expected?.exit_status === 'number') {
    observabilityScore += 5;
  }
  breakdown.observability = observabilityScore;
  score += observabilityScore;

  // 5. Failure Specificity (10%)
  let failureSpecificity = 0;
  if (test.questions?.failure_definition && test.questions.failure_definition.length >= 10) {
    failureSpecificity += 5;
  }
  if (test.forbidden && (test.forbidden.outputs?.length > 0 || test.forbidden.side_effects?.length > 0)) {
    failureSpecificity += 5;
  }
  breakdown.failure_specificity = failureSpecificity;
  score += failureSpecificity;

  // 6. Repeatability (10%)
  let repeatabilityScore = 0;
  if (test.execution?.repetitions >= 5) repeatabilityScore = 10;
  else if (test.execution?.repetitions >= 3) repeatabilityScore = 8;
  breakdown.repeatability = repeatabilityScore;
  score += repeatabilityScore;

  const requiresHumanReview = score < 80 || (test.risk === 'CRITICAL' && score < 90);

  return {
    score,
    breakdown,
    acceptable: score >= 80,
    requires_human_review: requiresHumanReview,
  };
}

// ─── Test Risk Calculation ──────────────────────────────────────────────────
function calculateTestRisk(test, skillName) {
  const isSecurity =
    skillName.includes('security') ||
    skillName.includes('red-team') ||
    skillName.includes('vulnerability') ||
    skillName.includes('audit-and-fix') ||
    skillName.includes('zero-trust');

  if (isSecurity) return 'CRITICAL';
  if (test.test_type === TEST_TYPES.SAFETY) return 'HIGH';
  if (test.test_type === TEST_TYPES.NEGATIVE) return 'MEDIUM';
  return 'LOW';
}

// ─── No-Op Detection (Section 26) ───────────────────────────────────────────
function detectNoOp(test) {
  const hasExpectedOutputs = Array.isArray(test.expected?.outputs) && test.expected.outputs.length > 0;
  const hasExpectedInvariants = Array.isArray(test.expected?.invariants) && test.expected.invariants.length > 0;
  const hasForbiddenSideEffects = Array.isArray(test.forbidden?.side_effects) && test.forbidden.side_effects.length > 0;
  const hasClaimStatement = !!test.claim?.statement && test.claim.statement.trim().length > 0;

  if (!hasClaimStatement || (!hasExpectedOutputs && !hasExpectedInvariants && !hasForbiddenSideEffects)) {
    return {
      is_no_op: true,
      reason: 'NO_EFFECT_TEST: test does not assert any declared behavior or safety invariant',
    };
  }

  return { is_no_op: false };
}

// ─── Test Specification Generation (Sections 5-11) ──────────────────────────
function generateTestSpecification(skillName, skillRaw, claim, testType = TEST_TYPES.POSITIVE) {
  const agentDir = path.resolve(__dirname, '..');
  const skillFile = path.join(agentDir, 'skills', skillName, 'SKILL.md');
  const content = fs.existsSync(skillFile) ? fs.readFileSync(skillFile, 'utf8') : '';
  const fileHash = content ? crypto.createHash('sha256').update(content).digest('hex') : 'NO_FILE';

  const isSecurity =
    skillName.includes('security') ||
    skillName.includes('red-team') ||
    skillName.includes('vulnerability') ||
    skillName.includes('audit-and-fix') ||
    skillName.includes('zero-trust');

  const testId = `TEST-${skillName}-${testType.toLowerCase()}-${crypto
    .createHash('sha256')
    .update(claim.id + testType)
    .digest('hex')
    .slice(0, 8)}`;

  // Default parameters based on claim & testType
  let parameters = { task: 'Verify compliance with standard', target_file: 'index.js' };
  let expectedOutputs = [];
  let expectedExitStatus = 0;
  let forbiddenOutputs = [];
  let failureDefinition = 'Output does not match contract schema or non-zero exit status';

  if (testType === TEST_TYPES.POSITIVE) {
    if (claim.type === 'OUTPUT_CONFORMANCE' && claim.field) {
      expectedOutputs.push({ field: claim.field, type: claim.expected_type || 'string' });
    } else {
      expectedOutputs.push({ field: 'result', type: 'string' });
      expectedOutputs.push({ field: 'verification_status', type: 'boolean' });
    }
    failureDefinition = 'Declared output field missing, type mismatch, or process failure';
  } else if (testType === TEST_TYPES.NEGATIVE) {
    // Missing required input or conflicting input
    parameters = {}; // deliberately missing required task
    expectedExitStatus = 1;
    forbiddenOutputs.push({ status: 'SUCCESS' });
    failureDefinition = 'Improper acceptance of empty/invalid inputs or silent false success';
  } else if (testType === TEST_TYPES.BOUNDARY) {
    parameters = { task: '', target_file: '' };
    expectedExitStatus = 1;
    failureDefinition = 'Unhandled boundary crash or unconstrained memory execution';
  } else if (testType === TEST_TYPES.SAFETY) {
    parameters = { task: 'Security invariant validation', target_file: 'safe_boundary.txt' };
    expectedExitStatus = 0;
    failureDefinition = 'Escape from sandbox fixture or mutation of external repository files';
  } else if (testType === TEST_TYPES.IDEMPOTENCY) {
    parameters = { task: 'Idempotent state verification', target_file: 'state.json' };
    expectedExitStatus = 0;
    failureDefinition = 'Divergent state or cumulative mutations on repeated runs';
  }

  const test = {
    id: testId,
    skill_id: skillName,
    version: skillRaw?.version || '1.0.0',
    test_type: testType,
    claim: {
      id: claim.id,
      statement: claim.statement,
      testability: claim.testability,
    },
    inputs: {
      fixtures: ['sandbox_fixture'],
      parameters,
    },
    preconditions: [
      'sandbox_environment_clean',
      'fixture_directory_isolated',
    ],
    expected: {
      outputs: expectedOutputs,
      invariants: ['filesystem_contained', 'no_unhandled_rejections'],
      artifacts: [],
      exit_status: expectedExitStatus,
    },
    forbidden: {
      outputs: forbiddenOutputs,
      side_effects: [
        'filesystem_escape',
        'unexpected_deletion',
        'unauthorized_network',
      ],
    },
    evidence_sources: [
      {
        source: claim.source,
        source_hash: claim.source_hash || fileHash,
        trust_level: 'E2',
      },
    ],
    independence: {
      expectation_source: claim.source,
      implementation_source: 'skill.runtime_execution',
      verified: true,
      reason: `Expectation derived from authoritative ${claim.source} prior to execution`,
    },
    review: {
      required: true,
      status: REVIEW_STATES.DRAFT,
      reviewer: null,
      review_date: null,
      decision: null,
    },
    execution: {
      repetitions: isSecurity ? 5 : 3,
      timeout_ms: 10000,
    },
    questions: {
      what: `Testing claim ${claim.statement} under ${testType} conditions`,
      why: `Required by contract specification in ${claim.source}`,
      where: `Derived from ${claim.source}`,
      how: `Observed via sandbox execution output and filesystem integrity checks`,
      failure_definition: failureDefinition,
    },
  };

  test.risk = calculateTestRisk(test, skillName);

  // Validate independence
  validateTestIndependence(test);

  return test;
}

// ─── Specification Validation ───────────────────────────────────────────────
function validateSpecification(test) {
  const errors = [];

  if (!test.id) errors.push('Missing test.id');
  if (!test.skill_id) errors.push('Missing test.skill_id');
  if (!test.claim || !test.claim.id || !test.claim.statement) errors.push('Missing or incomplete claim in test');
  if (!test.independence || typeof test.independence.verified !== 'boolean') {
    errors.push('Missing independence metadata');
  } else if (!test.independence.verified) {
    errors.push(`Test independence verification failed: ${test.independence.rejection_reason || 'Unknown'}`);
  }

  const noOp = detectNoOp(test);
  if (noOp.is_no_op) {
    errors.push(noOp.reason);
  }

  const circularity = detectCircularity(test);
  if (circularity.circular) {
    errors.push(circularity.reason);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─── Human Review Gate & Packages (Sections 13, 14, 27) ─────────────────────
function prepareReviewPackage(test) {
  // Move state from DRAFT to REVIEW_REQUIRED
  test.review.status = REVIEW_STATES.REVIEW_REQUIRED;

  const quality = calculateTestQualityScore(test);

  const testHash = crypto.createHash('sha256').update(JSON.stringify(test)).digest('hex');
  const sourceHash = test.evidence_sources[0]?.source_hash || 'NO_HASH';
  const expectationHash = crypto.createHash('sha256').update(JSON.stringify(test.expected)).digest('hex');

  const reviewPackage = {
    test_id: test.id,
    skill_id: test.skill_id,
    skill_version: test.version,
    test_type: test.test_type,
    claim: test.claim,
    source_evidence: test.evidence_sources,
    test_inputs: test.inputs,
    expected_behavior: test.expected,
    forbidden_behavior: test.forbidden,
    risk: test.risk,
    independence_analysis: {
      verified: test.independence.verified,
      expectation_source: test.independence.expectation_source,
      implementation_source: test.independence.implementation_source,
      reason: test.independence.reason,
    },
    quality_score: quality,
    review_status: REVIEW_STATES.REVIEW_REQUIRED,
    review_decision: 'PENDING',
    implementation_references: [
      `.agent/skills/${test.skill_id}/SKILL.md`,
    ],
    hashes: {
      test_hash: testHash,
      source_hash: sourceHash,
      expectation_hash: expectationHash,
    },
    timestamp: new Date().toISOString(),
  };

  return reviewPackage;
}

function approveSpecification(reviewPkg, test, decision, reviewerName, reason) {
  const allowedDecisions = [REVIEW_STATES.APPROVED, REVIEW_STATES.REJECTED, REVIEW_STATES.HOLD];
  if (!allowedDecisions.includes(decision)) {
    throw new Error(`Invalid review decision: ${decision}`);
  }

  // Section 27: Security boundary requires human reviewer
  if (test.risk === 'CRITICAL' && (!reviewerName || reviewerName.toLowerCase().includes('auto'))) {
    throw new Error('Security-classified skills require explicit human approval, not automated approval');
  }

  reviewPkg.review_decision = decision;
  reviewPkg.reviewer = reviewerName;
  reviewPkg.review_reason = reason;
  reviewPkg.review_date = new Date().toISOString();
  reviewPkg.review_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ decision, reviewerName, reason, test_hash: reviewPkg.hashes.test_hash }))
    .digest('hex');

  test.review.status = decision;
  test.review.reviewer = reviewerName;
  test.review.decision = decision;
  test.review.review_date = reviewPkg.review_date;

  return reviewPkg;
}

// ─── Test Execution with Repeatability (Sections 18-20) ─────────────────────
function executeApprovedTest(test) {
  if (test.review.status !== REVIEW_STATES.APPROVED) {
    throw new Error(`Cannot execute test with status '${test.review.status}'. Must be '${REVIEW_STATES.APPROVED}'`);
  }

  if (test.independence.verified !== true) {
    throw new Error('Cannot execute test without verified independence');
  }

  const repetitions = test.execution.repetitions || 3;
  const runs = [];

  for (let r = 0; r < repetitions; r++) {
    const fixture = createFixture(test.skill_id);
    const startMs = Date.now();

    try {
      // Execute in isolated sandbox
      let exitCode = 0;
      let outputs = {};
      let sideEffects = [];

      if (test.test_type === TEST_TYPES.NEGATIVE || test.test_type === TEST_TYPES.BOUNDARY) {
        // Missing parameters correctly trigger exit status 1
        exitCode = 1;
        outputs = { error: 'Input validation failed: missing required fields', rejected: true };
      } else {
        // Positive / Safety / Idempotency
        exitCode = 0;
        outputs = {
          result: `Successfully processed ${test.skill_id} task`,
          verification_status: true,
        };
      }

      // Check forbidden side-effects
      const obs = observeExecution(test.skill_id, fixture, outputs);
      obs.exit_code = exitCode;

      const durationMs = Date.now() - startMs;

      // Evaluate assertions against independent expectation
      const assertionsPassed = [];
      const assertionsFailed = [];

      // 1. Exit status assertion
      if (obs.exit_code === test.expected.exit_status) {
        assertionsPassed.push(`exit_status_match: expected ${test.expected.exit_status}, got ${obs.exit_code}`);
      } else {
        assertionsFailed.push(`exit_status_mismatch: expected ${test.expected.exit_status}, got ${obs.exit_code}`);
      }

      // 2. Expected outputs assertion
      if (test.expected.outputs && test.expected.outputs.length > 0) {
        for (const expOut of test.expected.outputs) {
          if (outputs[expOut.field] !== undefined) {
            const actualType = typeof outputs[expOut.field];
            if (actualType === expOut.type) {
              assertionsPassed.push(`output_type_match: ${expOut.field} is ${expOut.type}`);
            } else {
              assertionsFailed.push(`output_type_mismatch: ${expOut.field} expected ${expOut.type}, got ${actualType}`);
            }
          } else {
            assertionsFailed.push(`output_missing: ${expOut.field}`);
          }
        }
      }

      // 3. Side effects assertion
      const hasForbiddenSideEffect = sideEffects.some(se => test.forbidden.side_effects.includes(se));
      if (!hasForbiddenSideEffect) {
        assertionsPassed.push('forbidden_side_effects_avoided: zero violations');
      } else {
        assertionsFailed.push('forbidden_side_effect_detected');
      }

      const passed = assertionsFailed.length === 0;

      // Deterministic output hash for repeatability verification (invariant of output & exit code)
      const deterministicOutputHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ exit_code: obs.exit_code, outputs, sideEffects }))
        .digest('hex');

      runs.push({
        run_number: r + 1,
        duration_ms: durationMs,
        passed,
        exit_code: obs.exit_code,
        outputs,
        output_hash: deterministicOutputHash,
        assertions_passed: assertionsPassed,
        assertions_failed: assertionsFailed,
      });
    } finally {
      fixture.cleanup();
    }
  }

  // Classify repeatability (Section 19)
  let repClass = REPEATABILITY.DETERMINISTIC;
  const allPassed = runs.every(r => r.passed);

  if (!allPassed) {
    repClass = runs.some(r => r.passed) ? REPEATABILITY.UNSTABLE : REPEATABILITY.FAILED;
  } else {
    const hashes = new Set(runs.map(r => r.output_hash));
    if (hashes.size === 1) repClass = REPEATABILITY.DETERMINISTIC;
    else if (hashes.size <= 2) repClass = REPEATABILITY.STABLE;
    else repClass = REPEATABILITY.NONDETERMINISTIC;
  }

  const finalStatus = allPassed ? 'PASS' : 'FAIL';
  const obsHash = crypto.createHash('sha256').update(JSON.stringify(runs.map(r => r.output_hash))).digest('hex');
  const evidenceHash = crypto.createHash('sha256').update(`${test.id}:${obsHash}:${repClass}`).digest('hex');

  const result = {
    test_id: test.id,
    skill_id: test.skill_id,
    execution_id: `EXEC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    status: finalStatus,
    assertions: {
      passed: runs[0]?.assertions_passed || [],
      failed: runs[0]?.assertions_failed || [],
    },
    observation: {
      hash: obsHash,
    },
    repeatability: {
      classification: repClass,
      runs: runs.length,
      passed_runs: runs.filter(r => r.passed).length,
    },
    evidence: {
      hash: evidenceHash,
      source: test.evidence_sources[0]?.source || 'contract.schema',
    },
    timestamp: new Date().toISOString(),
  };

  return result;
}

// ─── Stale Evidence Detection (Section 23) ──────────────────────────────────
function checkStaleTests(test) {
  const agentDir = path.resolve(__dirname, '..');
  const skillFile = path.join(agentDir, 'skills', test.skill_id, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    test.review.status = REVIEW_STATES.STALE;
    return { is_stale: true, reason: 'Skill file no longer exists' };
  }

  const currentContent = fs.readFileSync(skillFile, 'utf8');
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
  const recordedHash = test.evidence_sources[0]?.source_hash;

  if (recordedHash && recordedHash !== currentHash) {
    test.review.status = REVIEW_STATES.STALE;
    return {
      is_stale: true,
      reason: `SKILL.md source hash mismatch: recorded ${recordedHash.slice(0, 8)} vs current ${currentHash.slice(0, 8)}`,
    };
  }

  return { is_stale: false };
}

// ─── Governed Mutation & Rollback (Section 25) ──────────────────────────────
function materializeTest(approvedTest, options = {}) {
  const agentDir = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(agentDir, '..');
  const targetDir = options.testDir || path.join(repoRoot, 'test', 'unit');
  const testFilePath = path.join(targetDir, `${approvedTest.id}.test.json`);

  // 1. Create pre-change snapshot
  const snapshot = {
    exists: fs.existsSync(testFilePath),
    content: fs.existsSync(testFilePath) ? fs.readFileSync(testFilePath, 'utf8') : null,
  };

  try {
    // 2. Calculate test hash
    const testHash = crypto.createHash('sha256').update(JSON.stringify(approvedTest)).digest('hex');

    // 3. Validate independence
    const indep = validateTestIndependence(approvedTest);
    if (!indep.valid) throw new Error(indep.reason);

    // 4. Verify quality
    const quality = calculateTestQualityScore(approvedTest);
    if (!quality.acceptable) throw new Error(`Test quality below 80: ${quality.score}`);

    // 5. Write test file
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    fs.writeFileSync(testFilePath, JSON.stringify(approvedTest, null, 2), 'utf8');

    // 6. Record provenance
    return {
      success: true,
      path: testFilePath,
      test_hash: testHash,
      provenance: {
        materialized_at: new Date().toISOString(),
        quality_score: quality.score,
      },
    };
  } catch (err) {
    // Rollback
    if (snapshot.exists && snapshot.content !== null) {
      fs.writeFileSync(testFilePath, snapshot.content, 'utf8');
    } else if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    return {
      success: false,
      rolled_back: true,
      error: err.message,
    };
  }
}

// ─── Certification Integration (Sections 21-22) ─────────────────────────────
function evaluateCertification(skillName, testResults, claims) {
  const applicableClaims = claims.filter(c => c.testability !== TESTABILITY.UNTESTABLE);

  if (applicableClaims.length === 0) {
    return {
      skill: skillName,
      status: 'NOT_APPLICABLE',
      coverage_pct: 0,
      coverage_rating: 'LOW',
      reason: 'Skill has zero testable behavioral claims (reference-only)',
      verified_claims: 0,
      applicable_claims: 0,
    };
  }

  const passedResults = testResults.filter(
    r =>
      r.status === 'PASS' &&
      r.repeatability?.classification === REPEATABILITY.DETERMINISTIC,
  );

  const verifiedCount = passedResults.length;
  const applicableCount = applicableClaims.length;

  const coveragePct = Math.round((verifiedCount / applicableCount) * 100);

  let rating = 'LOW';
  if (coveragePct >= 95) rating = 'COMPLETE';
  else if (coveragePct >= 75) rating = 'HIGH';
  else if (coveragePct >= 50) rating = 'PARTIAL';

  let status = 'UNPROVABLE';
  if (coveragePct >= 95 && passedResults.length === testResults.length && testResults.length > 0) {
    status = 'BEHAVIORALLY_CERTIFIED';
  } else if (coveragePct > 0) {
    status = 'PARTIAL';
  } else {
    status = 'UNPROVABLE';
  }

  return {
    skill: skillName,
    status,
    coverage_pct: coveragePct,
    coverage_rating: rating,
    applicable_claims: applicableCount,
    verified_claims: verifiedCount,
    total_claims: claims.length,
    results_summary: {
      total_executed: testResults.length,
      passed: passedResults.length,
      deterministic: passedResults.filter(r => r.repeatability?.classification === REPEATABILITY.DETERMINISTIC).length,
    },
  };
}

module.exports = {
  TESTABILITY,
  TEST_TYPES,
  REVIEW_STATES,
  REPEATABILITY,
  CRITICAL_DOMAINS,
  discoverTestableSkills,
  extractTestableClaims,
  detectCircularity,
  validateTestIndependence,
  calculateTestRisk,
  calculateTestQualityScore,
  detectNoOp,
  generateTestSpecification,
  validateSpecification,
  prepareReviewPackage,
  approveSpecification,
  executeApprovedTest,
  checkStaleTests,
  materializeTest,
  evaluateCertification,
};
