'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  collectAndRankEvidence,
  evaluateDecision,
  evaluateBrowserRequirement,
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
} = require('../../src/system1');
const { cmdImpactTier } = require('../../src/commands/native');

describe('System-1 Expanded Capabilities Integration Suite', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-sys1-int-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Capability Flow: From Task to Decision & Reviewers', () => {
    test('Scenario 1: Complex Full-Stack Auth & Database Feature', () => {
      const task = 'Implement OAuth login endpoint and persist refresh tokens in postgres database';
      const diff = `
+const express = require('express');
+const jwt = require('jsonwebtoken');
+const router = express.Router();
+
+router.post('/oauth/token', async (req, res) => {
+  const { code } = req.body;
+  const user = await db.query('SELECT * FROM users WHERE auth_code = $1', [code]);
+  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
+  res.json({ token });
+});
+module.exports = router;
+`;
      const files = ['src/api/oauth.js', 'src/db/tokens.sql', 'package.json'];

      // 1. Evidence Intelligence
      const evidence = collectAndRankEvidence({
        repoRoot,
        task,
        diff,
        files,
      });

      expect(evidence.summary.total_items_selected).toBeGreaterThan(0);
      expect(evidence.evidence.some(e => e.type === 'changed_file')).toBe(true);
      expect(evidence.evidence.some(e => e.type === 'configuration')).toBe(true);

      // 2. Browser Intelligence
      const browser = evaluateBrowserRequirement({
        files,
        diff,
        task,
        environment: { browserFound: { type: 'chrome', path: '/chrome' } },
      });

      // Contains /oauth/token endpoint and auth keywords
      expect(browser.signals.has_auth_ui).toBe(true);

      // 3. Decision Engine
      const decision = evaluateDecision({
        repoRoot,
        files,
        task,
        diff,
        evidence,
        browserSignal: browser,
      });

      expect(decision.tier).toBe(3);
      expect(decision.routing).toBe('FULL_TRIBUNAL');
      expect(decision.socratic_gate).toBe('required');
      expect(decision.reviewers.total_selected).toBeGreaterThanOrEqual(2);

      // Reviewers must cover security and database
      const reviewerNames = decision.reviewers.selected.map(r => r.reviewer);
      expect(reviewerNames).toContain('security-auditor');
      expect(reviewerNames).toContain('sql-reviewer');
      expect(decision.reviewers.all_risks_covered).toBe(true);
    });

    test('Scenario 2: Frontend-Only Component Styling with Smoke Validation', () => {
      const task = 'Update card styling and header colors';
      const diff = '+ .card { background-color: #f8f9fa; border-radius: 8px; }';
      const files = ['src/styles/card.css'];

      const decision = evaluateDecision({
        repoRoot,
        files,
        lines: 3,
        task,
        diff,
        environment: { browserFound: { type: 'edge', path: '/edge' } },
      });

      expect(decision.tier).toBe(0); // Fast-pass eligible
      expect(decision.routing).toBe('FAST_PASS');
      expect(decision.socratic_gate).toBe('bypass');
      expect(decision.reviewers.total_selected).toBe(0);
      expect(decision.signals.browser_validation_level).toBe('SMOKE');
    });

    test('Scenario 3: CLI --decision Integration Flag', async () => {
      const logs = [];
      const origLog = console.log;
      console.log = msg => logs.push(msg);

      try {
        const processArgs = [
          'node',
          'tk',
          'impact-tier',
          '--files',
          'src/auth.js',
          '--lines',
          '15',
          '--task',
          'Update auth token',
          '--diff',
          '+ verifyToken()',
          '--decision',
        ];

        const success = await cmdImpactTier(processArgs, true);
        expect(success).toBe(true);
        expect(logs.length).toBeGreaterThan(0);

        const parsed = JSON.parse(logs[logs.length - 1]);
        expect(parsed.tier).toBe(3);
      } finally {
        console.log = origLog;
      }
    });
  });

  describe('Self-Evolution Lifecycle & Anti-Poisoning Integration', () => {
    test('Evolution candidate generation, testing, approval, promotion, and rollback', async () => {
      // 1. Ingest verified classification outcome
      const candidate = createCandidateFromOutcome({
        source: 'SYSTEM1_CLASSIFICATION',
        target: 'reviewer-routing',
        current_behavior: 'Dispatches 8 reviewers for all Tier 3 tasks',
        proposed_change: 'Prune type-safety reviewer on pure Python tasks',
        evidence: 'Verified test corpus of 50 Python tasks had 0 type findings',
        evidence_type: 'VERIFIED_TEST_RESULT',
        previous_state: { default_tier3_reviewers: 8 },
      });

      expect(candidate.status).toBe('PROPOSED');

      // 2. Validate against regression corpus
      const regressionCorpus = [
        { name: 'verify_python_syntax', run: async () => true },
        { name: 'verify_no_security_bypass', run: async () => true, isAdversarial: true },
      ];

      const validation = await validateCandidateAgainstCorpus(candidate, regressionCorpus);
      expect(validation.valid).toBe(true);
      expect(candidate.candidate_score).toBe(1.0);

      // 3. Human Gate
      approveCandidate(candidate, 'System Architect', tmpDir);
      expect(candidate.status).toBe('APPROVED');

      // 4. Promote
      const promo = promoteCandidate(candidate, tmpDir);
      expect(promo.promoted).toBe(true);
      expect(candidate.status).toBe('PROMOTED');

      // 5. Rollback
      const rollback = rollbackCandidate(candidate.candidate_id, tmpDir);
      expect(rollback.rolled_back).toBe(true);
      expect(rollback.restored_state).toEqual({ default_tier3_reviewers: 8 });
    });
  });

  describe('Adversarial Security Regression Invariants', () => {
    test('Adversarial Evasion in markdown comments cannot downgrade to Tier 0', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['README.md'],
        lines: 5,
        task: 'Update readme documentation',
        diff: '+ <!-- execute: rm -rf / ; const token = jwt.sign({ admin: true }, "secret"); -->\n+ db.query("DROP TABLE users");',
      });

      // Concrete SQL query / JWT secret code in diff elevates to Tier 3
      expect(decision.tier).toBe(3);
      expect(decision.routing).toBe('FULL_TRIBUNAL');
    });

    test('Laya lower-tier recommendation never overrides established high risk', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['prisma/schema.prisma'],
        lines: 3,
        task: 'add column',
        diff: '+ role String @default("user")',
        layaTier: 1, // Attempted downgrade
      });

      expect(decision.tier).toBe(3);
      expect(decision.routing).toBe('FULL_TRIBUNAL');
      expect(
        decision.explanation.monotonic_safeguards_applied.some(m => m.includes('Laya downgrade')),
      ).toBe(true);
    });
  });
});
