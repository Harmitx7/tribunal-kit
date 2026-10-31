'use strict';

const {
  ACTIVITY_STATES,
  ACTIVITY_VERBS,
  ACTIVITY_GLYPHS,
  ENVIRONMENTS,
  createEvent,
  normalizeProgress,
  redactSecrets,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderJson,
  formatActivity,
  announceAgent,
  announceSkill,
  SkillAgentResolver,
  ActivityTracker,
} = require('../../src/activity');

describe('Tribunal Activity Presentation System', () => {
  describe('1. Activity States & Schema Validation', () => {
    test('defines all 14 canonical activity states', () => {
      const states = Object.values(ACTIVITY_STATES);
      expect(states).toHaveLength(15); // including AGENT_ACTIVATED and SKILL_ACTIVATED
      expect(states).toContain('operation_started');
      expect(states).toContain('agent_activated');
      expect(states).toContain('skill_activated');
      expect(states).toContain('analysis_in_progress');
      expect(states).toContain('tool_executing');
      expect(states).toContain('tests_running');
      expect(states).toContain('evidence_collecting');
      expect(states).toContain('validation_passed');
      expect(states).toContain('validation_failed');
      expect(states).toContain('warning_detected');
      expect(states).toContain('human_approval_required');
      expect(states).toContain('operation_blocked');
      expect(states).toContain('retry_in_progress');
      expect(states).toContain('operation_completed');
      expect(states).toContain('operation_cancelled');
    });

    test('creates event with default IDs and timestamps', () => {
      const event = createEvent({ title: 'AST Parsing' });
      expect(event.eventId).toMatch(/^evt_/);
      expect(event.operationId).toMatch(/^op_/);
      expect(event.eventType).toBe(ACTIVITY_STATES.OPERATION_STARTED);
      expect(event.title).toBe('AST Parsing');
      expect(event.startedAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    test('maps unknown or colloquial event types to canonical states', () => {
      expect(createEvent({ eventType: 'test_execution' }).eventType).toBe(ACTIVITY_STATES.TESTS_RUNNING);
      expect(createEvent({ eventType: 'build_failed' }).eventType).toBe(ACTIVITY_STATES.VALIDATION_FAILED);
      expect(createEvent({ eventType: 'check_passed', evidence: { ok: true } }).eventType).toBe(ACTIVITY_STATES.VALIDATION_PASSED);
      expect(createEvent({ eventType: 'approval_gate' }).eventType).toBe(ACTIVITY_STATES.HUMAN_APPROVAL_REQUIRED);
      expect(createEvent({ eventType: 'worker_blocked' }).eventType).toBe(ACTIVITY_STATES.OPERATION_BLOCKED);
      expect(createEvent({ eventType: 'random_unknown_state' }).eventType).toBe(ACTIVITY_STATES.ANALYSIS_IN_PROGRESS);
    });

    test('handles missing or partial fields gracefully without crashing', () => {
      const event = createEvent({});
      expect(event.title).toBe('Operational Event');
      expect(event.summary).toBeNull();
      expect(event.phase).toBeNull();
      expect(event.progress).toBeNull();
      expect(event.evidence).toBeNull();
      expect(event.error).toBeNull();
      expect(event.warning).toBeNull();
      expect(event.reportReferences).toEqual([]);
    });
  });

  describe('2. Evidence Integrity & Anti-Fabrication Invariants', () => {
    test('refuses to claim validation_passed without evidence or verified flag', () => {
      const unverifiedPass = createEvent({
        eventType: ACTIVITY_STATES.VALIDATION_PASSED,
        title: 'Unverified Claim',
        // no evidence, verified not true
      });

      // Degrades to analysis_in_progress to preserve evidence integrity
      expect(unverifiedPass.eventType).toBe(ACTIVITY_STATES.ANALYSIS_IN_PROGRESS);
      expect(unverifiedPass.evidence.unverifiedNote).toBeDefined();
    });

    test('preserves validation_passed when authoritative evidence is supplied', () => {
      const verifiedPass = createEvent({
        eventType: ACTIVITY_STATES.VALIDATION_PASSED,
        title: 'Verified Schema Check',
        evidence: { violations: 0, checkedTables: 14 },
      });

      expect(verifiedPass.eventType).toBe(ACTIVITY_STATES.VALIDATION_PASSED);
      expect(verifiedPass.evidence.violations).toBe(0);
    });

    test('distinguishes warnings from hard failures', () => {
      const warnEvent = createEvent({
        eventType: ACTIVITY_STATES.WARNING_DETECTED,
        title: 'Deprecation Warning',
        warning: { message: 'Node.js 18 will be EOL soon', impact: 'Upgrade to Node.js 22 recommended' },
      });

      const failEvent = createEvent({
        eventType: ACTIVITY_STATES.VALIDATION_FAILED,
        title: 'Syntax Error',
        error: { message: 'Unexpected token in config.json', code: 'PARSE_ERROR' },
      });

      expect(warnEvent.eventType).toBe(ACTIVITY_STATES.WARNING_DETECTED);
      expect(warnEvent.warning.impact).toBe('Upgrade to Node.js 22 recommended');
      expect(failEvent.eventType).toBe(ACTIVITY_STATES.VALIDATION_FAILED);
      expect(failEvent.error.code).toBe('PARSE_ERROR');
    });

    test('progress integrity: does not fabricate percentages when not authoritative', () => {
      const unmetered = normalizeProgress({ current: 5, total: 10, isAuthoritative: false });
      expect(unmetered.isAuthoritative).toBe(false);
      expect(unmetered.percentage).toBeNull();

      const authoritative = normalizeProgress({ current: 8, total: 10, isAuthoritative: true });
      expect(authoritative.isAuthoritative).toBe(true);
      expect(authoritative.percentage).toBe(80);
    });

    test('handles zero or invalid progress totals safely', () => {
      const zeroTotal = normalizeProgress({ current: 0, total: 0, isAuthoritative: true });
      expect(zeroTotal.percentage).toBeNull();

      const negativeTotal = normalizeProgress({ current: -5, total: -1, isAuthoritative: true });
      expect(negativeTotal.current).toBe(0);
      expect(negativeTotal.percentage).toBeNull();
    });
  });

  describe('3. Sensitive Data & Secret Redaction', () => {
    test('redacts API keys, Bearer tokens, and JWTs in strings', () => {
      const text = 'Connected with sk_live_abc1234567890 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisKey';
      const redacted = redactSecrets(text);
      expect(redacted).not.toContain('sk_live_abc1234567890');
      expect(redacted).toContain('[REDACTED_API_KEY]');
      expect(redacted).not.toContain('doNotLeakThisKey');
      expect(redacted).toContain('[REDACTED_TOKEN]');
    });

    test('redacts database connection strings and AWS keys', () => {
      const text = 'DATABASE_URL=postgres://admin:superSecretPassword@localhost:5432/mydb and AWS key AKIAIOSFODNN7EXAMPLE';
      const redacted = redactSecrets(text);
      expect(redacted).not.toContain('superSecretPassword');
      expect(redacted).toContain('[REDACTED_DB_URL]');
      expect(redacted).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(redacted).toContain('[REDACTED_AWS_KEY]');
    });

    test('deeply redacts secrets inside nested objects and arrays of an event', () => {
      const event = createEvent({
        title: 'Database Sync',
        evidence: {
          dsn: 'mongodb://root:hiddenpass@cluster0.net/prod',
          tokens: ['sk_test_abcdef1234567890', 'Bearer 123456789012345678901234567890'],
        },
      });

      expect(event.evidence.dsn).toBe('[REDACTED_DB_URL]');
      expect(event.evidence.tokens[0]).toBe('[REDACTED_API_KEY]');
      expect(event.evidence.tokens[1]).toBe('Bearer [REDACTED_TOKEN]');
    });
  });

  describe('4. Markdown Presentation Renderer', () => {
    test('renders all 14 operational states with clear visual hierarchy', () => {
      for (const [key, state] of Object.entries(ACTIVITY_STATES)) {
        const event = createEvent({
          eventType: state,
          title: `Testing State ${key}`,
          summary: 'Brief description of current action',
          evidence: state === ACTIVITY_STATES.VALIDATION_PASSED ? { ok: true } : null,
          verified: true,
        });

        const rendered = renderMarkdown(event);
        expect(rendered).toContain('**');
        expect(rendered).toContain(ACTIVITY_VERBS[state]);
        expect(rendered).toContain('Brief description of current action');
        // Check zero ANSI codes
        expect(rendered).not.toContain('\x1b[');
        // Check zero ASCII border lines
        expect(rendered).not.toContain('━━━');
        expect(rendered).not.toContain('╔');
      }
    });

    test('renders agent activation with domain and context', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.AGENT_ACTIVATED,
        agent: 'resilience-reviewer',
        domain: 'Fault Tolerance & Error Resilience',
        summary: 'Audits network boundaries and fallback chains. Target: API route.',
      });

      const output = renderMarkdown(event);
      expect(output).toContain('› **Activated** `@resilience-reviewer` · Fault Tolerance & Error Resilience');
      expect(output).toContain('  Audits network boundaries and fallback chains. Target: API route.');
    });

    test('renders authoritative progress and pending counts', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.TESTS_RUNNING,
        title: 'Phase 14 Baseline Verification',
        progress: { current: 8, total: 12, unit: 'suites', isAuthoritative: true },
        nextAction: 'Capture baseline counts',
      });

      const output = renderMarkdown(event);
      expect(output).toContain('Progress: 8/12 suites (67%) · 4 pending');
      expect(output).toContain('Next: Capture baseline counts');
    });

    test('renders unmetered progress without fabricating percentage', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.TESTS_RUNNING,
        title: 'E2E Smoke Tests',
        progress: { isAuthoritative: false },
      });

      const output = renderMarkdown(event);
      expect(output).toContain('Status: In progress (unmetered)');
      expect(output).not.toContain('%');
    });

    test('renders errors with code and actionable remedy', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.VALIDATION_FAILED,
        title: 'AST Contract Gate',
        error: { message: 'Export mismatch in index.ts', code: 'CONTRACT_VIOLATION', suggestion: 'Export cmdUnderstand' },
      });

      const output = renderMarkdown(event);
      expect(output).toContain('✖ **Failed** · AST Contract Gate');
      expect(output).toContain('Error [CONTRACT_VIOLATION]: Export mismatch in index.ts');
      expect(output).toContain('Remedy: Export cmdUnderstand');
    });

    test('renders human approval gates with prompt and next action', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.HUMAN_APPROVAL_REQUIRED,
        title: 'Orchestration Fan-In Gate',
        summary: '3 files to modify, 1 file to create.',
        nextAction: 'Awaiting human sign-off (Y/N/R)',
      });

      const output = renderMarkdown(event);
      expect(output).toContain('⏸ **Approval Required** · Orchestration Fan-In Gate');
      expect(output).toContain('Next: Awaiting human sign-off (Y/N/R)');
    });
  });

  describe('5. Multi-Environment Fallbacks (Terminal & PlainText & JSON)', () => {
    test('renders clean plain-text fallback without Markdown or ANSI', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.OPERATION_COMPLETED,
        title: 'Build Complete',
        summary: 'All artifacts generated successfully.',
        reportReferences: ['dist/bundle.js'],
      });

      const plain = renderPlainText(event);
      expect(plain).toContain('[DONE] Build Complete');
      expect(plain).toContain('All artifacts generated successfully.');
      expect(plain).toContain('Artifacts: dist/bundle.js');
      expect(plain).not.toContain('**');
      expect(plain).not.toContain('\x1b[');
    });

    test('renders valid JSON for telemetry and MCP', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.VALIDATION_PASSED,
        title: 'Schema Audit',
        evidence: { tables: 12, valid: true },
        verified: true,
      });

      const jsonStr = renderJson(event);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.eventType).toBe(ACTIVITY_STATES.VALIDATION_PASSED);
      expect(parsed.evidence.tables).toBe(12);
    });

    test('renders terminal output with appropriate glyphs and labels', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.OPERATION_STARTED,
        title: 'Terminal Check',
        summary: 'Running in CLI mode',
      });

      const termOutput = renderTerminal(event);
      expect(termOutput).toContain('Started');
      expect(termOutput).toContain('Terminal Check');
      expect(termOutput).toContain('Running in CLI mode');
    });
  });

  describe('6. Skill & Agent Metadata Resolver', () => {
    test('resolves core built-in agents instantly with zero I/O', () => {
      const resolver = new SkillAgentResolver();
      const meta = resolver.resolveAgent('resilience-reviewer');
      expect(meta.name).toBe('resilience-reviewer');
      expect(meta.domain).toBe('Fault Tolerance & Error Resilience');
      expect(meta.mandate).toContain('network boundaries');
      expect(meta.source).toBe('builtin');
    });

    test('announceAgent produces context-aware headline and mandate', () => {
      const announcement = announceAgent('security-auditor', 'checkout payment route');
      expect(announcement).toContain('› **Activated** `@security-auditor` · Application Security & OWASP Defense');
      expect(announcement).toContain('checkout payment route');
    });

    test('announceSkill produces clean skill application notice', () => {
      const announcement = announceSkill('clean-code', 'refactoring user service');
      expect(announcement).toContain('› **Skill Applied** `skill:clean-code`');
      expect(announcement).toContain('user service');
    });

    test('handles unknown agent names gracefully with fallback heuristics', () => {
      const resolver = new SkillAgentResolver();
      const meta = resolver.resolveAgent('quantum-cryptographer');
      expect(meta.name).toBe('quantum-cryptographer');
      expect(meta.domain).toBe('Quantum Cryptographer Specialist');
      expect(meta.source).toBe('fallback');
    });
  });

  describe('7. Activity Tracker (Lifecycle, Progress, Long-Running Operations)', () => {
    test('tracks full operation lifecycle from start to completion', () => {
      const emitted = [];
      const tracker = new ActivityTracker({
        title: 'Phase 14 Baseline Verification',
        onEvent: (evt, formatted) => emitted.push({ evt, formatted }),
      });

      tracker.start(null, 'Verifying 12 Codebase Intelligence test suites.');
      tracker.setPhase('Phase 14');
      tracker.runningTests('test/unit/codebase_intelligence*.test.js', { current: 6, total: 12, unit: 'suites', isAuthoritative: true });
      tracker.runningTests('test/unit/codebase_intelligence*.test.js', { current: 12, total: 12, unit: 'suites', isAuthoritative: true });
      tracker.passed('Codebase Intelligence Baseline Suites', { suites: 12, failed: 0 });
      tracker.complete('All 12 suites verified.', { exitCode: 0 }, ['reports/phase14_baseline.json']);

      expect(emitted).toHaveLength(5);
      expect(emitted[0].evt.eventType).toBe(ACTIVITY_STATES.OPERATION_STARTED);
      expect(emitted[1].evt.eventType).toBe(ACTIVITY_STATES.TESTS_RUNNING);
      expect(emitted[2].evt.eventType).toBe(ACTIVITY_STATES.TESTS_RUNNING);
      expect(emitted[3].evt.eventType).toBe(ACTIVITY_STATES.VALIDATION_PASSED);
      expect(emitted[4].evt.eventType).toBe(ACTIVITY_STATES.OPERATION_COMPLETED);

      const summary = tracker.getExecutiveSummary();
      expect(summary.passedCount).toBe(1);
      expect(summary.failedCount).toBe(0);
      expect(summary.artifacts).toContain('reports/phase14_baseline.json');
      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('deduplicates identical consecutive status updates', () => {
      const emitted = [];
      const tracker = new ActivityTracker({
        title: 'Deduplication Test',
        onEvent: (evt, formatted) => emitted.push(evt),
      });

      // Emitting same progress twice
      const res1 = tracker.runningTests('jest', { current: 5, total: 10, unit: 'tests', isAuthoritative: true });
      const res2 = tracker.runningTests('jest', { current: 5, total: 10, unit: 'tests', isAuthoritative: true });

      expect(res1.isDuplicate).toBe(false);
      expect(res2.isDuplicate).toBe(true);
      expect(emitted).toHaveLength(1);
    });

    test('tracks retries and recovery attempts accurately', () => {
      const tracker = new ActivityTracker({ title: 'Resilience Test' });
      tracker.retry(1, 3, 'Network socket timeout, retrying with exponential backoff');
      tracker.retry(2, 3, 'Network socket timeout, retrying with maximum timeout');

      expect(tracker.retries).toBe(2);
      const summary = tracker.getExecutiveSummary();
      expect(summary.retriesCount).toBe(2);
    });

    test('handles blocked state and human approval gates', () => {
      const tracker = new ActivityTracker({ title: 'Gate Test' });
      const blockedRes = tracker.blocked('Missing auth middleware context', 'Inspect src/middleware.ts');
      expect(blockedRes.event.eventType).toBe(ACTIVITY_STATES.OPERATION_BLOCKED);
      expect(blockedRes.formatted).toContain('⛔ **Blocked**');
      expect(blockedRes.formatted).toContain('Remedy: Inspect src/middleware.ts');

      const approvalRes = tracker.approvalRequired('Pre-Deploy Gate', 'Approve write to production?');
      expect(approvalRes.event.eventType).toBe(ACTIVITY_STATES.HUMAN_APPROVAL_REQUIRED);
      expect(approvalRes.formatted).toContain('⏸ **Approval Required**');
    });

    test('handles operation cancellation', () => {
      const tracker = new ActivityTracker({ title: 'Cancelled Operation' });
      const cancelRes = tracker.cancel('User requested interrupt');
      expect(cancelRes.event.eventType).toBe(ACTIVITY_STATES.OPERATION_CANCELLED);
      expect(cancelRes.formatted).toContain('⊘ **Cancelled**');
      expect(cancelRes.formatted).toContain('User requested interrupt');
    });
  });

  describe('8. Token Overhead & Performance Benchmarking', () => {
    test('verifies activity messages have compact token footprint (under 80 estimated tokens)', () => {
      const event = createEvent({
        eventType: ACTIVITY_STATES.AGENT_ACTIVATED,
        agent: 'resilience-reviewer',
        domain: 'Fault Tolerance & Error Resilience',
        summary: 'Audits network boundaries, timeout wraps, and error degradation paths.',
      });

      const formatted = renderMarkdown(event);
      // Rough token heuristic: 1 token ≈ 4 characters
      const charCount = formatted.length;
      const estimatedTokens = Math.ceil(charCount / 4);

      expect(estimatedTokens).toBeLessThan(80);
      expect(formatted).not.toContain('\n\n\n'); // No excessive whitespace
    });

    test('formats at high throughput (sub-millisecond per event)', () => {
      const start = Date.now();
      const iterations = 500;
      for (let i = 0; i < iterations; i++) {
        formatActivity({
          eventType: ACTIVITY_STATES.ANALYSIS_IN_PROGRESS,
          title: `Analysis step ${i}`,
          summary: 'Evaluating dependency graph and blast radius',
          progress: { current: i, total: iterations, unit: 'nodes', isAuthoritative: true },
        });
      }
      const elapsed = Date.now() - start;
      const avgPerCallMs = elapsed / iterations;
      expect(avgPerCallMs).toBeLessThan(1.0); // Sub-millisecond formatting
    });
  });
});

