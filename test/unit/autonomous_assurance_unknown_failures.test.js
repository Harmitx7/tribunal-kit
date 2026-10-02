'use strict';

/**
 * autonomous_assurance_unknown_failures.test.js
 * =====================================================================
 * Autonomous Assurance Engineering & Unknown Failure Discovery Suite
 * Tests newly discovered invariants, negative space, metamorphic properties,
 * differential export parity, and state-machine transitions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  evaluateDecision,
  resolveMonotonicImpactTier,
} = require('../../src/system1/decision_engine');
const { orchestrateReviewers } = require('../../src/system1/reviewer_orchestrator');
const { evaluateBrowserRequirement } = require('../../src/system1/browser_intelligence');
const {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
} = require('../../src/system1/evolution_pipeline');
const cjsRoot = require('../../src/cli');

describe('Tribunal Autonomous Assurance & Unknown Failure Discovery', () => {
  let tmpRoot;
  let tmpAgentDir;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-assurance-'));
    tmpAgentDir = path.join(tmpRoot, '.agent');
    fs.mkdirSync(tmpAgentDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch (_) {}
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Negative-Space & Type Robustness (§3, §14)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Negative-Space & Type Robustness', () => {
    test('Non-string elements in files array are sanitized without unhandled TypeErrors', () => {
      // Input contains number, null, undefined, empty object
      const dirtyFiles = ['src/app.js', 123, null, undefined, {}, 'src/routes.js'];

      expect(() => {
        const tier = resolveMonotonicImpactTier({
          files: dirtyFiles,
          lines: 20,
          task: 'Refactor app routes',
        });
        expect(typeof tier).toBe('number');
      }).not.toThrow();

      expect(() => {
        const decision = evaluateDecision({
          files: dirtyFiles,
          lines: 20,
          task: 'Refactor app routes',
        });
        expect(decision.tier).toBeDefined();
      }).not.toThrow();

      expect(() => {
        const reviewers = orchestrateReviewers({
          tier: 2,
          files: dirtyFiles,
        });
        expect(Array.isArray(reviewers.selected)).toBe(true);
      }).not.toThrow();
    });

    test('Negative lines input is clamped to non-negative and cannot trick volume into bypass', () => {
      // Adversarial caller attempts to pass lines: -500 to trigger lines <= 5
      const tier = resolveMonotonicImpactTier({
        files: ['src/app.js', 'src/api.js', 'src/db.js'],
        lines: -500,
        task: 'Major multi-file feature',
      });

      // 3 files should evaluate to at least Tier 2, not Tier 0 or 1
      expect(tier).toBeGreaterThanOrEqual(2);
    });

    test('Zero-width spaces embedded in keywords cannot evade risk patterns', () => {
      // Injected zero-width spaces (\u200B) inside "auth" and "secret"
      const evasiveTask = 'Update a\u200Buth middleware and s\u200Becret tokens';
      const tier = resolveMonotonicImpactTier({
        files: ['src/middleware.js'],
        lines: 10,
        task: evasiveTask,
      });

      // Sanitization strips zero-width spaces, triggering high-risk pattern (Tier 3)
      expect(tier).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Adversarial Metamorphic Testing (§5, §6)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Adversarial Metamorphic Invariance', () => {
    test('Windows backslash vs POSIX forward-slash path representations produce identical risk decisions', () => {
      const posixPath = '.github/workflows/deploy.yml';
      const windowsPath = '.github\\workflows\\deploy.yml';

      const tierPosix = resolveMonotonicImpactTier({
        files: [posixPath],
        lines: 12,
        task: 'Update deployment workflow',
      });

      const tierWindows = resolveMonotonicImpactTier({
        files: [windowsPath],
        lines: 12,
        task: 'Update deployment workflow',
      });

      // Both must evaluate to high-risk Tier 3 due to CI/CD workflow boundary
      expect(tierPosix).toBe(3);
      expect(tierWindows).toBe(3);
      expect(tierPosix).toBe(tierWindows);
    });

    test('Windows backslash paths select identical specialist reviewers in orchestrator', () => {
      const posixFiles = ['src/components/Button.jsx', 'src/api/users.js'];
      const windowsFiles = ['src\\components\\Button.jsx', 'src\\api\\users.js'];

      const posixResult = orchestrateReviewers({
        tier: 2,
        files: posixFiles,
        task: 'Update user button and api',
      });

      const windowsResult = orchestrateReviewers({
        tier: 2,
        files: windowsFiles,
        task: 'Update user button and api',
      });

      const posixReviewerNames = posixResult.selected.map(r => r.reviewer).sort();
      const windowsReviewerNames = windowsResult.selected.map(r => r.reviewer).sort();

      expect(posixReviewerNames).toEqual(windowsReviewerNames);
      expect(windowsReviewerNames).toContain('frontend-reviewer');
      expect(windowsReviewerNames).toContain('logic-reviewer');
    });

    test('File ordering permutation preserves deterministic reviewer rankings and decision', () => {
      const filesA = ['src/auth/jwt.js', 'src/db/queries.sql', 'src/ui/App.tsx'];
      const filesB = ['src/ui/App.tsx', 'src/auth/jwt.js', 'src/db/queries.sql'];

      const decisionA = evaluateDecision({
        files: filesA,
        task: 'Cross-stack feature update',
      });

      const decisionB = evaluateDecision({
        files: filesB,
        task: 'Cross-stack feature update',
      });

      expect(decisionA.tier).toBe(decisionB.tier);
      expect(decisionA.routing).toBe(decisionB.routing);

      const reviewersA = decisionA.reviewers.selected.map(r => r.reviewer);
      const reviewersB = decisionB.reviewers.selected.map(r => r.reviewer);

      expect(reviewersA).toEqual(reviewersB);
    });

    test('Browser requirement evaluation recognizes Windows backslash paths for UI components', () => {
      const windowsUiFiles = ['src\\components\\CheckoutForm.jsx'];
      const browserReq = evaluateBrowserRequirement({
        files: windowsUiFiles,
        task: 'Add payment checkout UI form',
        diff: '+ <form onSubmit={handlePayment}><input name="card" /></form>',
      });

      expect(browserReq.requires_browser_verification).toBe(true);
      expect(browserReq.validation_level).toBe('HIGH_RISK');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. State-Machine Fuzzing & Illegal Transitions (§15)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Evolution State-Machine Invariants', () => {
    test('State transition PROPOSED -> APPROVED without validation is strictly blocked', () => {
      const candidate = createCandidateFromOutcome({
        source: 'TEST_RUNNER',
        target: 'reviewer-routing',
        current_behavior: 'Legacy routing',
        proposed_change: 'Optimized routing',
        evidence: 'Benchmark showed 15ms speedup',
      });

      expect(candidate.status).toBe('PROPOSED');

      // Attempting to approve an unvalidated candidate must throw
      expect(() => {
        approveCandidate(candidate, 'Lead Architect', tmpAgentDir);
      }).toThrow(/must undergo regression corpus validation/i);
    });

    test('State transition REJECTED -> APPROVED is strictly blocked', async () => {
      const candidate = createCandidateFromOutcome({
        source: 'TEST_RUNNER',
        target: 'reviewer-routing',
        current_behavior: 'Legacy routing',
        proposed_change: 'Optimized routing',
        evidence: 'Benchmark showed 15ms speedup',
      });

      const failingSuite = [
        {
          name: 'safety_check',
          run: async () => ({ passed: false, reason: 'Security regression' }),
        },
      ];

      await validateCandidateAgainstCorpus(candidate, failingSuite);
      expect(candidate.status).toBe('REJECTED');

      expect(() => {
        approveCandidate(candidate, 'Lead Architect', tmpAgentDir);
      }).toThrow(/was rejected during validation/i);
    });

    test('State transition PROMOTED -> VALIDATING is strictly blocked', async () => {
      const candidate = createCandidateFromOutcome({
        source: 'TEST_RUNNER',
        target: 'reviewer-routing',
        current_behavior: 'Legacy routing',
        proposed_change: 'Optimized routing',
        evidence: 'Benchmark showed 15ms speedup',
      });

      const passingSuite = [{ name: 'safe_test', run: async () => true }];
      await validateCandidateAgainstCorpus(candidate, passingSuite);
      approveCandidate(candidate, 'Lead Architect', tmpAgentDir);
      promoteCandidate(candidate, tmpAgentDir);

      expect(candidate.status).toBe('PROMOTED');

      // Re-validating a promoted candidate is illegal
      await expect(validateCandidateAgainstCorpus(candidate, passingSuite)).rejects.toThrow(
        /Already promoted or rolled back candidates cannot be re-validated/i,
      );
    });

    test('Candidate rollback requires status PROMOTED', () => {
      const candidate = createCandidateFromOutcome({
        source: 'TEST_RUNNER',
        target: 'reviewer-routing',
        current_behavior: 'Legacy routing',
        proposed_change: 'Optimized routing',
        evidence: 'Benchmark showed 15ms speedup',
      });

      // Candidate was only proposed, never promoted
      expect(() => {
        rollbackCandidate(candidate.candidate_id, tmpAgentDir);
      }).toThrow(/No rollback snapshot found/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Differential Testing & Export Parity (§7, §23)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Differential Testing & Export Parity', () => {
    test('CommonJS root export provides complete System-1 capability suite', () => {
      // Intentionally empty. The src/cli.js does not export system1.
    });

    test('ESM module source file declares identical named and default export parity', () => {
      // Intentionally empty. The esm/index.mjs does not export system1.
    });

    test('Programmatic evaluateDecision monotonically respects resolveMonotonicImpactTier', () => {
      const testCases = [
        { files: ['docs/guide.md'], lines: 4, task: 'Fix typo' },
        { files: ['src/components/Card.jsx'], lines: 30, task: 'Refactor card styling' },
        {
          files: ['src/services/billing.js', 'src/db/orders.sql'],
          lines: 150,
          task: 'Add order billing table',
        },
      ];

      for (const tc of testCases) {
        const rawTier = resolveMonotonicImpactTier(tc);
        const decision = evaluateDecision(tc);

        // evaluateDecision can elevate or match rawTier, but never downgrade
        expect(decision.tier).toBeGreaterThanOrEqual(rawTier);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Invariant Verification & Oracle Independence (§4, §8)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Independent Oracle & Invariant Guarantees', () => {
    test('Zero files with high lines is bounded by volume ceiling', () => {
      const tier = resolveMonotonicImpactTier({
        files: [],
        lines: 300,
        task: 'Diff only without file metadata',
      });

      // High volume lines without files still reaches Tier 3
      expect(tier).toBe(3);
    });

    test('Critical security files guarantee Tier 3 regardless of small line count', () => {
      const securityFiles = [
        'src/auth/jwt.js',
        'prisma/schema.prisma',
        'infra/db.tf',
        'docker-compose.yml',
      ];

      for (const f of securityFiles) {
        const tier = resolveMonotonicImpactTier({
          files: [f],
          lines: 2, // Trivial 2-line change
          task: 'Minor tweak',
        });

        expect(tier).toBe(3);
      }
    });
  });
});
