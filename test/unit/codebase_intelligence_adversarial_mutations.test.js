'use strict';

/**
 * codebase_intelligence_adversarial_mutations.test.js
 * ══════════════════════════════════════════════════════════════════════════════════════
 * Phase 14C: Continuous Adversarial Regression Test Suite
 *
 * Evaluates the 20 deterministic adversarial mutated cases from:
 * test/fixtures/codebase_intelligence_adversarial/adversarial_mutations_eval_dataset.json
 *
 * Verifies:
 *   1. Context removal mutations (missing targets) -> MISSING_CONTEXT
 *   2. Contradictory instructions mutations -> CONTRADICTION
 *   3. Unknown symbol and path mutations -> UNKNOWN_TARGET (L4_UNKNOWN)
 *   4. Prompt injection combined with legitimate requests -> UNTRUSTED_INJECTION
 *   5. Operation precedence challenge mutations -> Positional precedence
 *   6. Ambiguous synonym mutations -> Narrowest capability matching
 *   7. Unnecessary delegation probe mutations -> Bounded delegation
 *   8. Reproducible seed property-based cases -> Deterministic output
 */

const path = require('path');
const fs = require('fs');
const {
  CodebaseIntelligence,
  resolveRoute,
} = require('../../.agent/scripts/codebase_intelligence');

describe('Phase 14C: Continuous Adversarial Mutations Regression Suite', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const mutationsPath = path.join(
    __dirname,
    '../fixtures/codebase_intelligence_adversarial/adversarial_mutations_eval_dataset.json'
  );

  let dataset;

  beforeAll(() => {
    dataset = JSON.parse(fs.readFileSync(mutationsPath, 'utf8'));
  });

  test('dataset contains exactly 20 mutated benchmark test cases', () => {
    expect(Array.isArray(dataset.cases)).toBe(true);
    expect(dataset.cases.length).toBe(20);
  });

  // Dynamically test all 20 mutated cases
  const rawData = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '../fixtures/codebase_intelligence_adversarial/adversarial_mutations_eval_dataset.json'
      ),
      'utf8'
    )
  );

  for (const tc of rawData.cases) {
    test(`[${tc.mutationType}] ${tc.id}: ${tc.request.slice(0, 50)}...`, () => {
      const route = resolveRoute(tc.request, { repoRoot });

      // Verify primary skill and operation
      expect(route.primarySkill).toBe(tc.expectedPrimarySkill);
      expect(route.operation).toBe(tc.expectedOperation);

      // Verify delegated capabilities
      if (tc.expectedDelegatedCapabilities && tc.expectedDelegatedCapabilities.length > 0) {
        expect(route.delegatedCapabilities).toEqual(expect.arrayContaining(tc.expectedDelegatedCapabilities));
      } else {
        expect(route.delegatedCapabilities.length).toBe(0);
      }

      // Verify target extraction
      if (tc.target) {
        expect(route.target).toBe(tc.target);
      } else if (tc.missingContext && tc.missingContext.includes('target')) {
        expect(route.target).toBeUndefined();
      }

      // Verify expected uncertainty
      if (tc.expectedUncertainty) {
        expect(route.expectedUncertainty).toBe(tc.expectedUncertainty);
      }

      // Verify mutation-specific behaviors
      if (tc.category === 'missing-context') {
        expect(route.missingContext).toContain('target');
      }

      if (tc.category === 'contradictory') {
        expect(route.hasContradiction).toBe(true);
        expect(route.limitations.length).toBeGreaterThan(0);
      }

      if (tc.category === 'prompt-injection-malicious') {
        expect(route.isUntrusted).toBe(true);
        expect(route.safeQuery).not.toMatch(/<script>|ignore previous instructions|system override|drop table/i);
      }

      if (tc.category === 'nonexistent-symbol') {
        expect(route.confidence).toBe('L4_UNKNOWN');
      }
    });
  }
});

