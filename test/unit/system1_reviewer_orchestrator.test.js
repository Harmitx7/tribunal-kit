'use strict';

const {
  orchestrateReviewers,
  detectRequiredDomains,
} = require('../../src/system1/reviewer_orchestrator');

describe('System-1 Capability 3: Adaptive Reviewer Orchestration', () => {
  describe('Domain Detection', () => {
    test('detects database and sql domains for prisma/sql changes', () => {
      const domains = detectRequiredDomains({
        files: ['prisma/schema.prisma', 'migrations/001_init.sql'],
        task: 'Add user preferences table',
      });

      expect(domains).toContain('database');
      expect(domains).toContain('sql');
    });

    test('detects security and auth domains for jwt token changes', () => {
      const domains = detectRequiredDomains({
        files: ['src/auth/session.js'],
        task: 'Handle session token expiration and refresh',
        diff: '+ const verified = jwt.verify(token, secret);',
      });

      expect(domains).toContain('security');
      expect(domains).toContain('auth');
    });

    test('detects accessibility domain for a11y UI changes', () => {
      const domains = detectRequiredDomains({
        files: ['src/components/Modal.jsx'],
        task: 'Fix aria-label and keyboard focus trap for modal',
      });

      expect(domains).toContain('accessibility');
      expect(domains).toContain('frontend');
    });
  });

  describe('Adaptive Reviewer Selection by Tier', () => {
    test('Tier 0 (Fast-Pass) selects exactly 0 reviewers', () => {
      const result = orchestrateReviewers({
        tier: 0,
        files: ['README.md'],
        task: 'Fix typo',
      });

      expect(result.total_selected).toBe(0);
      expect(result.selected).toEqual([]);
      expect(result.rejected.length).toBeGreaterThan(0);
      expect(result.rejected[0].reason).toContain('Fast-Pass');
    });

    test('Tier 1 (Express Pass) selects exactly 1 specialized reviewer', () => {
      const result = orchestrateReviewers({
        tier: 1,
        files: ['src/components/Button.jsx'],
        task: 'Update button styling and hover animation',
        diff: '+ .hover-anim { transform: scale(1.02); }',
      });

      expect(result.total_selected).toBe(1);
      expect(result.selected[0].reviewer).toBe('frontend-reviewer');
      expect(result.selected[0].reason).toContain('directly covers primary risk domains');
      expect(result.selected[0].expected_contribution).toBeDefined();
    });

    test('Tier 2 (Targeted Audit) selects minimal set covering active risks without overlap', () => {
      const result = orchestrateReviewers({
        tier: 2,
        files: ['src/api/auth.js', 'src/models/user.js'],
        task: 'Implement JWT login verification and password hashing',
        diff: '+ const user = await db.query(...);\n+ const token = jwt.sign(...);',
      });

      expect(result.total_selected).toBeGreaterThanOrEqual(1);
      expect(result.total_selected).toBeLessThanOrEqual(3);

      const reviewerNames = result.selected.map(r => r.reviewer);
      expect(reviewerNames).toContain('security-auditor');
    });

    test('Tier 3 (Full Gauntlet) covers all critical domains with full explanations', () => {
      const result = orchestrateReviewers({
        tier: 3,
        files: ['src/auth/jwt.js', 'prisma/schema.prisma', 'package.json'],
        task: 'Update authentication schema, dependencies, and token verification',
        diff: '+ const jwt = require("jsonwebtoken");\n+ model User { role String }',
      });

      expect(result.total_selected).toBeGreaterThanOrEqual(3);
      const reviewerNames = result.selected.map(r => r.reviewer);
      expect(reviewerNames).toContain('security-auditor');
      expect(reviewerNames).toContain('sql-reviewer');

      expect(result.coverage.all_risks_covered).toBe(true);

      for (const sel of result.selected) {
        expect(sel.reason).toBeTruthy();
        expect(sel.risk_covered).toBeTruthy();
        expect(sel.expected_contribution).toBeTruthy();
      }
    });
  });

  describe('Overlap Penalty & Minimality', () => {
    test('avoids selecting duplicate reviewers from same overlap group when domains are covered', () => {
      const result = orchestrateReviewers({
        tier: 2,
        files: ['src/components/Card.jsx'],
        task: 'Fix card layout alignment',
        diff: '+ <div className="card-body">',
      });

      const reviewerNames = result.selected.map(r => r.reviewer);
      // frontend-reviewer should be selected; other frontend reviewers should be pruned or lower
      expect(reviewerNames).toContain('frontend-reviewer');
      expect(
        result.rejected.some(
          r => r.reason.includes('Tier 2 capacity limit') || r.reason.includes('overlap'),
        ),
      ).toBe(true);
    });

    test('preserves forced reviewers regardless of baseline scoring', () => {
      const result = orchestrateReviewers({
        tier: 1,
        files: ['src/utils/math.js'],
        task: 'Add helper',
        forcedReviewers: ['precedence-reviewer'],
      });

      expect(result.selected.some(r => r.reviewer === 'precedence-reviewer')).toBe(true);
    });
  });
});
