const fs = require('fs');
const path = require('path');

function deriveScenarios(skillRaw, classifierResult) {
  const scenarios = [];

  if (classifierResult.class === 'REFERENCE_ONLY') {
    return [
      {
        id: 'reference-verify',
        status: 'UNPROVABLE',
        source_evidence: 'classifier',
        derivation_reason: 'Skill is purely reference material, no behavioral output expected',
        confidence: 1.0,
      },
    ];
  }

  // Attempt to parse contract tests/assertions
  let hasEvidence = false;

  // 1. Check if contract has explicit `behavior.scenarios`
  if (skillRaw?.behavior?.scenarios) {
    hasEvidence = true;
    for (const scen of skillRaw.behavior.scenarios) {
      scenarios.push({
        id: scen.id || `scen-${Date.now()}`,
        status: 'PROVABLE',
        source_evidence: 'canonical_contract',
        derivation_reason: 'Explicit scenario defined in contract',
        confidence: 1.0,
        ...scen,
      });
    }
  }

  // 2. Check if we have tests in the `test/` directory named after the skill
  const agentDir = path.join(__dirname, '..');
  const repoRoot = path.join(agentDir, '..');
  const possibleTestFile = path.join(repoRoot, 'test', 'unit', `${skillRaw.name}.test.js`);
  if (fs.existsSync(possibleTestFile)) {
    hasEvidence = true;
    scenarios.push({
      id: 'existing-unit-test',
      status: 'PROVABLE',
      source_evidence: 'existing_tests',
      derivation_reason: 'Unit test file exists',
      confidence: 0.9,
      expected: { has_tests: true },
    });
  }

  // 3. Fallback to verification.assertions if they exist
  if (skillRaw?.verification?.assertions && skillRaw.verification.assertions.length > 0) {
    hasEvidence = true;
    scenarios.push({
      id: 'verification-assertions',
      status: 'PROVABLE',
      source_evidence: 'verification_block',
      derivation_reason: 'Explicit assertions declared in frontmatter',
      confidence: 0.8,
      expected: { invariants: skillRaw.verification.assertions },
    });
  }

  if (!hasEvidence) {
    scenarios.push({
      id: 'unprovable-fallback',
      status: 'UNPROVABLE',
      source_evidence: 'none',
      derivation_reason: 'No evidence-backed scenarios could be derived',
      confidence: 0.0,
    });
  }

  // Add adversarial boundary tests if executable
  if (classifierResult.class === 'EXECUTABLE' && hasEvidence) {
    if (skillRaw?.state?.idempotent) {
      scenarios.push({
        id: 'repeated-execution',
        applicable: true,
        reason: 'skill declares idempotent=true',
        status: 'PROVABLE',
        source_evidence: 'contract.state',
        derivation_reason: 'Derived from state idempotency declaration',
        confidence: 1.0,
      });
    }

    if (skillRaw?.state?.retry_policy) {
      scenarios.push({
        id: 'retry-boundary',
        applicable: true,
        reason: 'skill declares retry_policy',
        status: 'PROVABLE',
        source_evidence: 'contract.state',
        derivation_reason: 'Derived from state retry policy',
        confidence: 1.0,
      });
    }
  }

  return scenarios;
}

module.exports = {
  deriveScenarios,
};
