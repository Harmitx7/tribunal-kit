'use strict';

const path = require('path');
const { evaluateDecision } = require('../../src/system1/decision_engine');

describe('System-1 Capability 2: Cross-Capability Decision Engine', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  describe('Standard Routing & Tier Classification', () => {
    test('T0 Fast-Pass for low-risk doc/CSS changes', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['README.md'],
        lines: 4,
        task: 'Fix spelling in documentation',
        diff: '+ fixed spelling',
      });

      expect(decision.tier).toBe(0);
      expect(decision.routing).toBe('FAST_PASS');
      expect(decision.socratic_gate).toBe('bypass');
      expect(decision.reviewers.total_selected).toBe(0);
      expect(decision.explanation.why_tier_selected).toContain('Fast-Pass');
    });

    test('T1 Express Pass for single-file UI logic edit', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/tui/banner.js'],
        lines: 15,
        task: 'Update banner rendering colors',
        diff: '+ const color = "cyan";',
      });

      expect(decision.tier).toBe(1);
      expect(decision.routing).toBe('EXPRESS_PASS');
      expect(decision.socratic_gate).toBe('bypass');
      expect(decision.reviewers.total_selected).toBe(1);
    });

    test('T2 Targeted Review for multi-file non-critical feature edit', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/tui/banner.js', 'src/tui/theme.js'],
        lines: 80,
        task: 'Refactor terminal theme system and banner layout',
        diff: '+ function applyTheme() {}',
      });

      expect(decision.tier).toBe(2);
      expect(decision.routing).toBe('TARGETED_REVIEW');
      expect(decision.socratic_gate).toBe('conditional');
      expect(decision.reviewers.total_selected).toBeGreaterThanOrEqual(1);
    });

    test('T3 Full Gauntlet for critical auth change', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/auth/jwt.js'],
        lines: 10,
        task: 'Verify token expiration and signature',
        diff: '+ if (!jwt.verify(token)) return 401;',
      });

      expect(decision.tier).toBe(3);
      expect(decision.routing).toBe('FULL_TRIBUNAL');
      expect(decision.socratic_gate).toBe('required');
      expect(decision.reviewers.total_selected).toBeGreaterThanOrEqual(2);
      expect(decision.reviewers.all_risks_covered).toBe(true);
    });
  });

  describe('Conflict Resolution & Monotonic Safety Invariants', () => {
    test('Conflict Rule: Base Impact = T1, but Risk = HIGH -> forces T3', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/utils/helpers.js'],
        lines: 5, // T1 change volume
        task: 'Quick helper tweak',
        diff: '+ const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);',
      });

      expect(decision.tier).toBe(3);
      expect(decision.routing).toBe('FULL_TRIBUNAL');
      expect(decision.explanation.fired_risk_signals.length).toBeGreaterThan(0);
      expect(
        decision.explanation.monotonic_safeguards_applied.some(m => m.includes('Tier 3')),
      ).toBe(true);
    });

    test('Conflict Rule: Laya misclassifies high-risk as T0/T1 -> upgraded to T3', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/auth/session.js'],
        lines: 8,
        task: 'Update session cookie parameters',
        diff: '+ setSessionCookie(token);',
        layaTier: 0, // Adversarially low Laya output
      });

      expect(decision.tier).toBe(3);
      expect(
        decision.explanation.monotonic_safeguards_applied.some(m =>
          m.includes('Prevented Laya downgrade'),
        ),
      ).toBe(true);
    });

    test('Conflict Rule: UI verification required but browser UNAVAILABLE -> triggers ESCALATE', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/components/LoginForm.jsx'],
        lines: 20,
        task: 'Update login form with 2FA input',
        diff: '+ <form><input name="2fa" /></form>',
        environment: { browserFound: null }, // Headless server with no browser binary
      });

      expect(decision.escalated).toBe(true);
      expect(decision.routing).toBe('ESCALATE');
      expect(decision.socratic_gate).toBe('required');
      expect(decision.explanation.capabilities_unavailable).toContain('browser_cdp');
    });

    test('Conflict Rule: Low evidence confidence prevents Fast-Pass assumption', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/unknown_module.js'],
        lines: 5,
        task: 'vague change',
        evidence: {
          evidence: [],
          summary: { confidence: 'L4', critical_evidence_count: 0 },
        },
      });

      // Cannot be Tier 0 Fast-Pass under L4 confidence
      expect(decision.tier).toBeGreaterThanOrEqual(1);
      expect(decision.routing).not.toBe('FAST_PASS');
    });
  });

  describe('Explainability & Comprehensive Audit Trail', () => {
    test('Decision payload contains all required audit fields', () => {
      const decision = evaluateDecision({
        repoRoot,
        files: ['src/commands/native.js'],
        lines: 25,
        task: 'Refactor native command options',
      });

      expect(decision.explanation.why_tier_selected).toBeTruthy();
      expect(Array.isArray(decision.explanation.influencing_evidence)).toBe(true);
      expect(Array.isArray(decision.explanation.fired_risk_signals)).toBe(true);
      expect(Array.isArray(decision.explanation.capabilities_consulted)).toBe(true);
      expect(decision.explanation.capabilities_consulted).toContain('evidence_engine');
      expect(decision.explanation.capabilities_consulted).toContain('browser_intelligence');
      expect(decision.explanation.capabilities_consulted).toContain('reviewer_orchestrator');
      expect(typeof decision.explanation.fallback_used).toBe('boolean');
    });
  });
});
