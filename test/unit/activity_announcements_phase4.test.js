'use strict';

/**
 * Phase 4 Test Suite: Context-Aware Agent & Skill Announcements
 *
 * Exhaustively tests:
 * 1. Announcement relevance and internal state suppression (selected vs activated)
 * 2. Operation-scoped deduplication of duplicate agent and skill activations
 * 3. Identity and human-readable metadata resolution with safe fallbacks
 * 4. Concurrent independent operations without cross-operation suppression
 * 5. Retry attempt boundary resets (allowing re-activation on attempt 2)
 * 6. Progress tick deduplication (suppressing 0-delta spam)
 * 7. Critical state transition guarantee (pass, fail, block, gate, completion never suppressed)
 * 8. Context-aware announcement formatting with task integration
 * 9. Instruction file consistency (verifying absence of legacy patterns)
 * 10. Security redaction across announcement summaries
 */

const fs = require('fs');
const path = require('path');
const {
  EVENT_TYPES,
  AGENT_SKILL_STATES,
  createActivityEvent,
  ActivityTracker,
  SkillAgentResolver,
  CORE_AGENT_REGISTRY,
  ANNOUNCEMENT_DECISIONS,
  ANNOUNCEMENT_REASONS,
  AnnouncementDeduplicator,
  AnnouncementIntelligence,
  defaultAnnouncementIntelligence,
  renderMarkdown,
} = require('../../src/activity');

describe('Phase 4: Context-Aware Agent & Skill Announcements', () => {
  let intelligence;
  let resolver;

  beforeEach(() => {
    intelligence = new AnnouncementIntelligence();
    resolver = new SkillAgentResolver();
  });

  afterEach(() => {
    intelligence.reset();
  });

  // ── 1. Announcement Relevance & Internal State Filtering ───────────────────
  describe('1. Announcement Relevance & Internal State Filtering', () => {
    test('suppresses internal candidate consideration or dry-run events', () => {
      const candidateEvent = createActivityEvent({
        operationId: 'op_rel_1',
        eventType: EVENT_TYPES.AGENT_ACTIVATED,
        agent: 'backend-specialist',
        executionState: AGENT_SKILL_STATES.SELECTED,
      });

      const decision = intelligence.evaluate(candidateEvent);
      expect(decision.shouldAnnounce).toBe(false);
      expect(decision.verdict).toBe(ANNOUNCEMENT_DECISIONS.SUPPRESS);
      expect(decision.reason).toBe(ANNOUNCEMENT_REASONS.INTERNAL_CANDIDATE);
    });

    test('announces genuine agent activation with verified mandate', () => {
      const activationEvent = createActivityEvent({
        operationId: 'op_rel_2',
        eventType: EVENT_TYPES.AGENT_ACTIVATED,
        agent: 'backend-specialist',
      });

      const decision = intelligence.evaluate(activationEvent);
      expect(decision.shouldAnnounce).toBe(true);
      expect(decision.verdict).toBe(ANNOUNCEMENT_DECISIONS.ANNOUNCE);
      expect(decision.reason).toBe(ANNOUNCEMENT_REASONS.FIRST_ACTIVATION);
    });
  });

  // ── 2. Operation-Scoped Deduplication ───────────────────────────────────────
  describe('2. Operation-Scoped Deduplication', () => {
    test('suppresses repeated announcements of the same agent in the same attempt', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_dedup_1',
        announcementIntelligence: intelligence,
      });

      // First activation announces
      const first = tracker.activateAgent('resilience-reviewer', 'Checking error boundaries');
      expect(first.isDuplicate).toBe(false);
      expect(first.formatted).toContain('› **Activated** `@resilience-reviewer`');

      // Immediate second activation in same attempt is cleanly suppressed
      const second = tracker.activateAgent('resilience-reviewer', 'Checking error boundaries again');
      expect(second.isDuplicate).toBe(true);
      expect(second.formatted).toBeNull();
      expect(second.suppressedReason).toBe(ANNOUNCEMENT_REASONS.DUPLICATE_SUPPRESSED);
    });

    test('suppresses repeated announcements of the same skill in the same attempt', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_dedup_skill',
        announcementIntelligence: intelligence,
      });

      const first = tracker.activateSkill('error-resilience', 'Timeout wraps');
      expect(first.isDuplicate).toBe(false);
      expect(first.formatted).toContain('› **Skill Applied** `skill:error-resilience`');

      const second = tracker.activateSkill('error-resilience', 'Timeout wraps repeat');
      expect(second.isDuplicate).toBe(true);
      expect(second.formatted).toBeNull();
    });

    test('allows force option to override suppression when explicitly requested', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_dedup_force',
        announcementIntelligence: intelligence,
      });

      tracker.activateAgent('security-auditor');
      const forced = tracker._dispatch(
        resolver.createAgentActivationEvent('security-auditor', 'Mandatory re-audit'),
        { force: true }
      );

      expect(forced.isDuplicate).toBe(false);
      expect(forced.formatted).not.toBeNull();
    });
  });

  // ── 3. Identity & Metadata Resolution ───────────────────────────────────────
  describe('3. Identity & Metadata Resolution', () => {
    test('resolves core built-in agents with rich display name and category', () => {
      const meta = resolver.resolveAgent('database-architect');
      expect(meta.name).toBe('database-architect');
      expect(meta.displayName).toBe('Database Architect');
      expect(meta.domain).toBe('Database Schema & Query Integrity');
      expect(meta.category).toBe('database');
      expect(meta.mandate).toContain('indexing strategy');
      expect(meta.source).toBe('builtin');
    });

    test('handles unknown agent names gracefully without crashing or fabricating', () => {
      const meta = resolver.resolveAgent('custom-compliance-auditor');
      expect(meta.name).toBe('custom-compliance-auditor');
      expect(meta.displayName).toBe('Custom Compliance Auditor');
      expect(meta.domain).toBe('Custom Compliance Auditor Specialist');
      expect(meta.source).toBe('fallback');
      expect(meta.mandate).toBe('Enforcing custom compliance auditor invariants and engineering standards.');
    });

    test('handles null, undefined, or empty agent names safely', () => {
      const meta = resolver.resolveAgent(null);
      expect(meta.name).toBe('unknown-agent');
      expect(meta.domain).toBe('Engineering Review');

      const skillMeta = resolver.resolveSkill('');
      expect(skillMeta.name).toBe('unknown-skill');
    });

    test('generates context-aware summaries integrating task context with agent mandate', () => {
      const event = resolver.createAgentActivationEvent(
        'security-auditor',
        'Auditing JWT signature verification and expiry algorithms'
      );

      expect(event.agent).toBe('security-auditor');
      expect(event.domain).toBe('Application Security & OWASP Defense');
      expect(event.summary).toContain('Auditing JWT signature verification and expiry algorithms.');
      expect(event.summary).toContain('Focus: Audits injection vectors');
      expect(event.summary).not.toContain('Applying knowledge of');
    });
  });

  // ── 4. Concurrency & Operation Isolation ────────────────────────────────────
  describe('4. Concurrency & Operation Isolation', () => {
    test('two concurrent independent operations do not suppress each other announcements', () => {
      const trackerA = new ActivityTracker({
        operationId: 'op_concur_A',
        announcementIntelligence: intelligence,
      });

      const trackerB = new ActivityTracker({
        operationId: 'op_concur_B',
        announcementIntelligence: intelligence,
      });

      // Operation A activates security-auditor
      const resA = trackerA.activateAgent('security-auditor', 'Reviewing service A');
      expect(resA.isDuplicate).toBe(false);
      expect(resA.formatted).not.toBeNull();

      // Operation B activates security-auditor simultaneously
      // MUST NOT be suppressed by Operation A's activation!
      const resB = trackerB.activateAgent('security-auditor', 'Reviewing service B');
      expect(resB.isDuplicate).toBe(false);
      expect(resB.formatted).not.toBeNull();
    });
  });

  // ── 5. Retries & Attempt Boundaries ─────────────────────────────────────────
  describe('5. Retries & Attempt Boundaries', () => {
    test('permits agent announcement on attempt 2 after explicit retry reset', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_retry_ann',
        announcementIntelligence: intelligence,
      });

      // Attempt 1: security-auditor activated
      tracker.activateAgent('security-auditor', 'Initial check');

      // Attempt 1 fails and triggers retry
      tracker.retry(2, 3, 'Transient network failure during audit');
      expect(tracker.getOperation().attempt).toBe(2);

      // Attempt 2: security-auditor activated again for retry
      const retryActivation = tracker.activateAgent('security-auditor', 'Retry attempt verification');
      expect(retryActivation.isDuplicate).toBe(false);
      expect(retryActivation.formatted).not.toBeNull();
    });
  });

  // ── 6. Progress & Heartbeat Deduplication ───────────────────────────────────
  describe('6. Progress & Heartbeat Deduplication', () => {
    test('suppresses 0-delta progress spam while announcing progress milestones', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_prog_dedup',
        announcementIntelligence: intelligence,
      });

      // Initial progress tick announces
      const tick1 = tracker.updateProgress({ current: 2, total: 10, unit: 'files' });
      expect(tick1.isDuplicate).toBe(false);

      // Identical progress tick (zero delta) is suppressed
      const tickDuplicate = tracker.updateProgress({ current: 2, total: 10, unit: 'files' });
      expect(tickDuplicate.isDuplicate).toBe(true);
      expect(tickDuplicate.formatted).toBeNull();

      // Advancing progress announces
      const tickAdvance = tracker.updateProgress({ current: 5, total: 10, unit: 'files' });
      expect(tickAdvance.isDuplicate).toBe(false);
      expect(tickAdvance.formatted).not.toBeNull();
    });
  });

  // ── 7. Critical State Transition Guarantees ─────────────────────────────────
  describe('7. Critical State Transition Guarantees', () => {
    test('never suppresses critical validation failures or approval gates', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_crit_gate',
        announcementIntelligence: intelligence,
      });

      const passRes = tracker.passed('Invariant verified', { ok: true });
      expect(passRes.isDuplicate).toBe(false);
      expect(passRes.formatted).toContain('✔ **Verified**');

      const failRes = tracker.failed('Hard constraint failed', { message: 'Type error' });
      expect(failRes.isDuplicate).toBe(false);
      expect(failRes.formatted).toContain('✖ **Failed**');

      const gateRes = tracker.approvalRequired('Deploy Gate', 'Approve deployment?');
      expect(gateRes.isDuplicate).toBe(false);
      expect(gateRes.formatted).toContain('⏸ **Approval Required**');

      const blockRes = tracker.blocked('Missing token', 'Set GITHUB_TOKEN');
      expect(blockRes.isDuplicate).toBe(false);
      expect(blockRes.formatted).toContain('⛔ **Blocked**');
    });
  });

  // ── 8. Instruction File Alignment & Legacy Pattern Removal ──────────────────
  describe('8. Instruction File Alignment', () => {
    test('verifies absence of legacy "Applying knowledge of @" across instruction files', () => {
      const targetPaths = [
        path.resolve(__dirname, '../../.claude/CLAUDE.md'),
        path.resolve(__dirname, '../../.gemini/GEMINI.md'),
        path.resolve(__dirname, '../../.gemini/rules/GEMINI.md'),
        path.resolve(__dirname, '../../../.claude/CLAUDE.md'),
        path.resolve(__dirname, '../../../.gemini/GEMINI.md'),
        path.resolve(__dirname, '../../../.agent/config/system-prompt.md'),
        path.resolve(__dirname, '../../../.agent/rules/kernel.md'),
      ];

      for (const p of targetPaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          expect(content).not.toContain('Applying knowledge of @');
          expect(content).toContain('› **Activated**');
        }
      }
    });
  });

  // ── 9. Security & Information Redaction in Announcements ────────────────────
  describe('9. Security & Information Redaction in Announcements', () => {
    test('redacts secrets contained in announcement task context', () => {
      const tracker = new ActivityTracker({
        operationId: 'op_sec_ann',
        announcementIntelligence: intelligence,
      });

      const res = tracker.activateAgent(
        'security-auditor',
        'Testing token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken'
      );

      expect(res.formatted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(res.formatted).toContain('Bearer [REDACTED_TOKEN]');

      // Direct bare JWT token redaction
      const resJwt = tracker._dispatch(
        resolver.createAgentActivationEvent(
          'security-auditor',
          'Direct token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken'
        ),
        { force: true }
      );
      expect(resJwt.formatted).toContain('[REDACTED_JWT]');
    });
  });
});
