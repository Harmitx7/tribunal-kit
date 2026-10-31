'use strict';

/**
 * Phase 3 Test Suite: Premium AI Chat Presentation & Visual Design System
 *
 * Exhaustively tests:
 * 1. Visual hierarchy, badges, and headers for all 15 operational event types
 * 2. State-specific visual treatments (running, verified, failed, warnings, blocked, retrying, completed, cancelled)
 * 3. Progressive disclosure (<details>) and non-HTML fallback
 * 4. Responsive line wrapping & compact path formatting for narrow chat sidebars
 * 5. Compact mode vs rich mode
 * 6. Error presentation, diagnostic stacks, and secret safety
 * 7. Progress bars and stage pipeline visual treatments
 * 8. Strict renderer separation (Markdown, Terminal, PlainText, Structured)
 */

const {
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  createActivityEvent,
  MarkdownRenderer,
  renderMarkdown,
  TerminalRenderer,
  renderTerminal,
  PlainTextRenderer,
  renderPlainText,
  StructuredRenderer,
  renderStructured,
  STATUS_TREATMENTS,
  formatProgressBar,
  formatStagePipeline,
  formatCompactPath,
  formatDisclosure,
} = require('../../src/activity');

describe('Phase 3: Premium AI Chat Presentation & Visual Design System', () => {
  // ── 1. Design System Tokens & Status Treatments ────────────────────────────
  describe('1. Design System Tokens & Status Treatments', () => {
    test('defines visual treatments for all canonical event types', () => {
      const types = Object.values(EVENT_TYPES);
      types.forEach(type => {
        const treatment = STATUS_TREATMENTS[type];
        expect(treatment).toBeDefined();
        expect(treatment.glyph).toBeDefined();
        expect(treatment.verb).toBeDefined();
        expect(treatment.tone).toBeDefined();
      });
    });

    test('formatProgressBar creates accurate visual indicators', () => {
      expect(formatProgressBar(0, 10)).toBe('[□□□□□□□□□□]');
      expect(formatProgressBar(50, 10)).toBe('[■■■■■□□□□□]');
      expect(formatProgressBar(100, 10)).toBe('[■■■■■■■■■■]');
      expect(formatProgressBar(25, 8)).toBe('[■■□□□□□□]');
      expect(formatProgressBar(-10, 10)).toBe('[□□□□□□□□□□]');
      expect(formatProgressBar(150, 10)).toBe('[■■■■■■■■■■]');
    });

    test('formatStagePipeline produces clean scannable stage flows', () => {
      const stages = [
        { name: 'ast_parse', status: 'completed' },
        { name: 'lint_check', status: 'running' },
        { name: 'schema_valid', status: 'pending' },
      ];
      const pipeline = formatStagePipeline(stages);
      expect(pipeline).toBe('✔ ast_parse · › lint_check · · schema_valid');
    });

    test('formatCompactPath shortens deep paths while preserving file basename', () => {
      const shortPath = 'src/index.js';
      expect(formatCompactPath(shortPath, 45)).toBe('src/index.js');

      const deepPath = 'c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/src/activity/renderers/markdown.js';
      const compacted = formatCompactPath(deepPath, 30);
      expect(compacted).toContain('markdown.js');
      expect(compacted).toContain('/.../');
      expect(compacted.length).toBeLessThan(deepPath.length);
    });

    test('formatDisclosure generates HTML <details> or clean indented fallback', () => {
      const html = formatDisclosure('Extra Findings', '- Finding 1\n- Finding 2', true);
      expect(html).toContain('<details>');
      expect(html).toContain('<summary>Extra Findings</summary>');
      expect(html).toContain('- Finding 1');

      const text = formatDisclosure('Extra Findings', '- Finding 1\n- Finding 2', false);
      expect(text).not.toContain('<details>');
      expect(text).toContain('Extra Findings:');
      expect(text).toContain('    - Finding 1');
    });
  });

  // ── 2. Context-Sensitive Markdown Renderer ─────────────────────────────────
  describe('2. Context-Sensitive Markdown Renderer', () => {
    test('renders agent_activated with distinct badge and domain focus', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.AGENT_ACTIVATED,
        agent: 'resilience-reviewer',
        domain: 'Fault Tolerance & Error Recovery',
        summary: 'Inspecting circuit breakers and retry policies.',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('› **Activated** `@resilience-reviewer` · Fault Tolerance & Error Recovery');
      expect(md).toContain('  Inspecting circuit breakers and retry policies.');
    });

    test('renders skill_activated with distinct badge and domain focus', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.SKILL_ACTIVATED,
        skill: 'error-resilience',
        domain: 'System Reliability',
        summary: 'Applying bulkhead and exponential backoff patterns.',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('› **Skill Applied** `skill:error-resilience` · System Reliability');
      expect(md).toContain('  Applying bulkhead and exponential backoff patterns.');
    });

    test('renders validation_passed with emerald verified glyph and evidence', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'OWASP Security Verification',
        evidence: { vulnerabilities: 0, checkedEndpoints: 18 },
        nextAction: 'Proceed to integration tests',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('✔ **Verified** · OWASP Security Verification');
      expect(md).toContain('Evidence: vulnerabilities=0 · checkedEndpoints=18');
      expect(md).toContain('Next: Proceed to integration tests');
    });

    test('renders validation_failed with rose failed glyph, error code, and remedy', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'AST Parser Contract Check',
        error: {
          message: 'Syntax error at token "export"',
          code: 'ERR_SYNTAX',
          suggestion: 'Ensure module type is set to "module" or use CommonJS',
        },
      });

      const md = renderMarkdown(event);
      expect(md).toContain('✖ **Failed** · AST Parser Contract Check');
      expect(md).toContain('Error [ERR_SYNTAX]: Syntax error at token "export"');
      expect(md).toContain('Remedy: Ensure module type is set to "module" or use CommonJS');
    });

    test('renders warning_detected without masquerading as hard failure', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.WARNING_DETECTED,
        title: 'High Latency Detected',
        warning: {
          message: 'Endpoint p99 response time exceeded 250ms (310ms observed)',
          impact: 'Degraded user experience under peak load',
        },
      });

      const md = renderMarkdown(event);
      expect(md).toContain('⚠ **Warning** · High Latency Detected');
      expect(md).toContain('Warning: Endpoint p99 response time exceeded 250ms (310ms observed)');
      expect(md).toContain('Impact: Degraded user experience under peak load');
      expect(md).not.toContain('✖');
    });

    test('renders human_approval_required with gate glyph and sign-off prompt', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.HUMAN_APPROVAL_REQUIRED,
        title: 'Production Migration Gate',
        summary: 'Migration drops unused table "legacy_sessions". Confirm execution.',
        nextAction: 'Awaiting human sign-off (Y/N/R)',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('⏸ **Approval Required** · Production Migration Gate');
      expect(md).toContain('Migration drops unused table "legacy_sessions". Confirm execution.');
      expect(md).toContain('Next: Awaiting human sign-off (Y/N/R)');
    });

    test('renders operation_blocked with blocker glyph and unblock remedy', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_BLOCKED,
        title: 'Database Connection Blocked',
        error: {
          message: 'Connection to postgresql://localhost:5432 refused',
          suggestion: 'Start local PostgreSQL server via: docker-compose up -d postgres',
        },
        nextAction: 'Unblock via: Start local PostgreSQL server',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('⛔ **Blocked** · Database Connection Blocked');
      expect(md).toContain('Connection to [REDACTED_DB_URL] refused');
      expect(md).toContain('Remedy: Start local PostgreSQL server via: docker-compose up -d postgres');
    });

    test('renders retry_in_progress with attempt counter and reason', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.RETRY_IN_PROGRESS,
        title: 'GitHub API Rate Limit Recovery',
        summary: 'Backing off for 1500ms following 429 response',
        attempt: 2,
        maxAttempts: 3,
      });

      const md = renderMarkdown(event);
      expect(md).toContain('⟳ **Retrying** · GitHub API Rate Limit Recovery (Attempt 2 of 3)');
      expect(md).toContain('Backing off for 1500ms following 429 response');
    });

    test('renders operation_completed with execution duration and artifacts', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_COMPLETED,
        title: 'Full Audit Pipeline',
        summary: 'Validated 42 invariants across 12 modules.',
        reportReferences: ['reports/security_audit.json', 'reports/ast_diff.md'],
      });

      const md = renderMarkdown(event);
      expect(md).toContain('✔ **Completed** · Full Audit Pipeline');
      expect(md).toContain('Validated 42 invariants across 12 modules.');
      expect(md).toContain('Artifacts: `reports/security_audit.json`, `reports/ast_diff.md`');
    });

    test('renders operation_cancelled with cancellation reason', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_CANCELLED,
        title: 'Benchmark Suite',
        summary: 'Cancelled: User interrupted process via Ctrl+C',
      });

      const md = renderMarkdown(event);
      expect(md).toContain('⊘ **Cancelled** · Benchmark Suite');
      expect(md).toContain('Cancelled: User interrupted process via Ctrl+C');
    });
  });

  // ── 3. Progressive Disclosure ──────────────────────────────────────────────
  describe('3. Progressive Disclosure', () => {
    test('collapses large evidence collections into <details> when progressiveDisclosure is active', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'Large Evidence Set',
        evidence: [
          'Assertion 1 passed',
          'Assertion 2 passed',
          'Assertion 3 passed',
          'Assertion 4 passed',
          'Assertion 5 passed',
          'Assertion 6 passed',
        ],
      });

      const md = renderMarkdown(event, { progressiveDisclosure: true, maxInlineEvidence: 2 });
      expect(md).toContain('<details>');
      expect(md).toContain('<summary>... and 4 more verified findings</summary>');
      expect(md).toContain('Assertion 1 passed');
      expect(md).toContain('Assertion 2 passed');
    });

    test('falls back to clean plain bullet list when progressiveDisclosure or allowHtml is disabled', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'Large Evidence Set',
        evidence: [
          'Item 1',
          'Item 2',
          'Item 3',
          'Item 4',
          'Item 5',
        ],
      });

      const md = renderMarkdown(event, { progressiveDisclosure: false, maxInlineEvidence: 3 });
      expect(md).not.toContain('<details>');
      expect(md).toContain('Evidence:');
      expect(md).toContain('- Item 1');
      expect(md).toContain('- Item 2');
      expect(md).toContain('- Item 3');
      expect(md).toContain('... and 2 more verified findings');
    });

    test('collapses deep multiline stack traces into <details> trace block', () => {
      const stack = [
        'Error: Connection timeout',
        '    at Socket.emit (node:events:517:28)',
        '    at TCP.onStreamRead (node:internal/stream_base_commons:217:20)',
        '    at TCP.callbackTrampoline (node:internal/async_hooks:130:17)',
      ].join('\n');

      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Connection Failure',
        error: {
          message: 'Failed to reach database server',
          stack,
        },
      });

      const md = renderMarkdown(event, { progressiveDisclosure: true });
      expect(md).toContain('<details>');
      expect(md).toContain('<summary>Diagnostic Stack Trace</summary>');
      expect(md).toContain('```text\nError: Connection timeout');
    });
  });

  // ── 4. Responsive Narrow Panel Wrapping & Compact Mode ──────────────────────
  describe('4. Responsive Narrow Panel Wrapping & Compact Mode', () => {
    test('renders compact mode for rapid micro-events', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.TOOL_EXECUTING,
        title: 'Tool: git_diff',
        summary: 'Comparing HEAD~1 against working directory',
        progress: { current: 1, total: 2, percentage: 50, isAuthoritative: true },
      });

      const mdCompact = renderMarkdown(event, { compact: true });
      expect(mdCompact).toContain('› **Executing** · git_diff (Comparing HEAD~1 against working directory · 50%)');
      expect(mdCompact.split('\n')).toHaveLength(1);
    });

    test('shortens deep file paths when shortenPaths is enabled', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_COMPLETED,
        title: 'Compiled AST Artifacts',
        reportReferences: [
          'c:/Users/sunrise/Desktop/pfojects/cli project/tribunal-kit/test/unit/activity_lifecycle_phase2.test.js',
        ],
      });

      const mdShortened = renderMarkdown(event, { shortenPaths: true });
      expect(mdShortened).toContain('activity_lifecycle_phase2.test.js');
      expect(mdShortened).toContain('/.../');
    });
  });

  // ── 5. Strict Renderer Separation & Cross-Environment Consistency ───────────
  describe('5. Strict Renderer Separation', () => {
    let sampleEvent;

    beforeEach(() => {
      sampleEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'System Invariant Parity',
        summary: 'Parity verified across all 4 execution environments.',
        evidence: { passedInvariants: 24, coverage: '100%' },
        reportReferences: ['reports/parity_evidence.json'],
      });
    });

    test('MarkdownRenderer contains GFM bold badges and zero ANSI codes', () => {
      const md = renderMarkdown(sampleEvent);
      expect(md).toContain('✔ **Verified** · System Invariant Parity');
      expect(md).toContain('Evidence: passedInvariants=24 · coverage=100%');
      expect(md).not.toContain('\x1b[');
    });

    test('TerminalRenderer contains ANSI styling and respects noColor', () => {
      const termColor = renderTerminal(sampleEvent, { forceColor: true });
      expect(termColor).toContain('Verified');
      expect(termColor).toContain('System Invariant Parity');

      const termNoColor = renderTerminal(sampleEvent, { noColor: true });
      expect(termNoColor).not.toContain('\x1b[');
      expect(termNoColor).toContain('Verified');
    });

    test('PlainTextRenderer contains zero markdown formatting and zero ANSI codes', () => {
      const plain = renderPlainText(sampleEvent);
      expect(plain).toContain('[OK] System Invariant Parity');
      expect(plain).not.toContain('**');
      expect(plain).not.toContain('`');
      expect(plain).not.toContain('\x1b[');
    });

    test('StructuredRenderer produces valid JSON matching schemaVersion 1.0.0', () => {
      const jsonStr = renderStructured(sampleEvent);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.schemaVersion).toBe('1.0.0');
      expect(parsed.eventType).toBe(EVENT_TYPES.VALIDATION_PASSED);
      expect(parsed.title).toBe('System Invariant Parity');
      expect(parsed.evidence.passedInvariants).toBe(24);
    });
  });
});
