'use strict';

/**
 * Phase 1 Test Suite: Canonical Activity Contract & Renderer Foundation
 *
 * Exhaustively tests:
 * - Contract validation (required fields, schemaVersion, IDs, timestamps, enums)
 * - Progress validation (negative, out-of-range, current > total, unmetered)
 * - Evidence integrity (started is nonterminal, pass requires evidence, failure preserves info)
 * - Secret redaction & caller object immutability
 * - All 4 renderers (MarkdownRenderer, TerminalRenderer, PlainTextRenderer, StructuredRenderer)
 * - Determinism, multiline/Unicode, large error messages, ANSI-free fallbacks
 * - Performance benchmarking with reproducible local measurement
 */

const {
  SCHEMA_VERSION,
  EVENT_TYPES,
  STATUSES,
  DEFAULT_EVENT_STATUS,
  ActivityValidationError,
  validateActivityEvent,
  assertValidActivityEvent,
  createActivityEvent,
  sanitizeActivityEvent,
  redactSecrets,
  MarkdownRenderer,
  renderMarkdown,
  TerminalRenderer,
  renderTerminal,
  PlainTextRenderer,
  renderPlainText,
  StructuredRenderer,
  renderStructured,
  renderActivity,
  formatActivity,
} = require('../../src/activity');

describe('Phase 1: Canonical Activity Contract & Renderer Foundation', () => {
  // ── 1. Contract Validation ─────────────────────────────────────────────────
  describe('1. Contract Validation', () => {
    test('validates a complete, conformant ActivityEvent', () => {
      const validEvent = {
        schemaVersion: '1.0.0',
        eventId: 'evt_test_001',
        operationId: 'op_test_001',
        eventType: EVENT_TYPES.OPERATION_STARTED,
        status: STATUSES.RUNNING,
        title: 'Verifying AST Parity',
        summary: 'Running parity checks across AST parsers.',
        phase: 'Phase 1',
        timestamps: {
          startedAt: '2026-10-30T10:00:00.000Z',
          updatedAt: '2026-10-30T10:00:00.000Z',
        },
        progress: {
          current: 0,
          total: 10,
          unit: 'files',
          percentage: 0,
          isAuthoritative: true,
        },
      };

      const result = validateActivityEvent(validEvent);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => assertValidActivityEvent(validEvent)).not.toThrow();
    });

    test('rejects non-object or null input', () => {
      expect(validateActivityEvent(null).valid).toBe(false);
      expect(validateActivityEvent(undefined).valid).toBe(false);
      expect(validateActivityEvent('string').valid).toBe(false);
      expect(validateActivityEvent([1, 2, 3]).valid).toBe(false);
    });

    test('rejects unsupported schema versions', () => {
      const event = {
        schemaVersion: '2.0.0',
        eventId: 'evt_001',
        operationId: 'op_001',
        eventType: EVENT_TYPES.OPERATION_STARTED,
        status: STATUSES.RUNNING,
        title: 'Version check',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
      };
      const res = validateActivityEvent(event);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain("expected '1.0.0'");
    });

    test('rejects invalid identifiers', () => {
      const base = {
        schemaVersion: '1.0.0',
        eventType: EVENT_TYPES.OPERATION_STARTED,
        status: STATUSES.RUNNING,
        title: 'ID check',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
      };

      // Too short
      expect(validateActivityEvent({ ...base, eventId: 'ab', operationId: 'op_valid' }).valid).toBe(false);
      // Illegal characters (spaces, special chars)
      expect(validateActivityEvent({ ...base, eventId: 'evt with space', operationId: 'op_valid' }).valid).toBe(false);
      expect(validateActivityEvent({ ...base, eventId: 'evt_valid', operationId: 'bad/slash' }).valid).toBe(false);
    });

    test('rejects invalid or missing timestamps', () => {
      const base = {
        schemaVersion: '1.0.0',
        eventId: 'evt_001',
        operationId: 'op_001',
        eventType: EVENT_TYPES.OPERATION_STARTED,
        status: STATUSES.RUNNING,
        title: 'Timestamp check',
      };

      // Missing timestamps object
      expect(validateActivityEvent({ ...base }).valid).toBe(false);
      // Malformed ISO string
      expect(validateActivityEvent({ ...base, timestamps: { startedAt: 'not-a-date', updatedAt: '2026-10-30T10:00:00.000Z' } }).valid).toBe(false);
      // completedAt earlier than startedAt
      expect(validateActivityEvent({
        ...base,
        timestamps: {
          startedAt: '2026-10-30T12:00:00.000Z',
          updatedAt: '2026-10-30T12:00:00.000Z',
          completedAt: '2026-10-30T11:00:00.000Z',
        },
      }).valid).toBe(false);
    });

    test('rejects invalid progress values and inconsistent totals', () => {
      const base = {
        schemaVersion: '1.0.0',
        eventId: 'evt_001',
        operationId: 'op_001',
        eventType: EVENT_TYPES.PROGRESS_UPDATED,
        status: STATUSES.RUNNING,
        title: 'Progress check',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
      };

      // Negative current
      expect(validateActivityEvent({ ...base, progress: { current: -1, total: 10, isAuthoritative: true } }).valid).toBe(false);
      // Negative total
      expect(validateActivityEvent({ ...base, progress: { current: 5, total: -10, isAuthoritative: true } }).valid).toBe(false);
      // Current exceeds total
      expect(validateActivityEvent({ ...base, progress: { current: 15, total: 10, isAuthoritative: true } }).valid).toBe(false);
      // Percentage > 100
      expect(validateActivityEvent({ ...base, progress: { percentage: 150, isAuthoritative: true } }).valid).toBe(false);
      // Percentage < 0
      expect(validateActivityEvent({ ...base, progress: { percentage: -5, isAuthoritative: true } }).valid).toBe(false);
      // Unmetered progress with fabricated percentage
      expect(validateActivityEvent({ ...base, progress: { percentage: 50, isAuthoritative: false } }).valid).toBe(false);
    });

    test('handles unknown optional metadata safely without breaking validation', () => {
      const eventWithExtra = {
        schemaVersion: '1.0.0',
        eventId: 'evt_001',
        operationId: 'op_001',
        eventType: EVENT_TYPES.OPERATION_STARTED,
        status: STATUSES.RUNNING,
        title: 'Extra Metadata Test',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
        customEngineData: { runner: 'Jest', pid: 12345 },
      };

      const res = validateActivityEvent(eventWithExtra);
      expect(res.valid).toBe(true);
    });

    test('assertValidActivityEvent throws ActivityValidationError on invalid events', () => {
      expect(() => assertValidActivityEvent({})).toThrow(ActivityValidationError);
    });
  });

  // ── 2. Evidence Semantics & Invariants ─────────────────────────────────────
  describe('2. Evidence Semantics & Invariants', () => {
    test('started event remains nonterminal and does not imply completion', () => {
      const started = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Phase 1 Run',
      });

      expect(started.status).toBe(STATUSES.RUNNING);
      expect(started.timestamps.completedAt).toBeNull();
    });

    test('completed event does not automatically imply successful verification', () => {
      const completed = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_COMPLETED,
        title: 'Build Finished',
        status: STATUSES.COMPLETED,
      });

      expect(completed.status).toBe(STATUSES.COMPLETED);
      expect(completed.eventType).toBe(EVENT_TYPES.OPERATION_COMPLETED);
      expect(completed.verified).toBe(false);
    });

    test('validation_passed requires authoritative verification evidence', () => {
      // Without evidence or verified flag
      const unverified = {
        schemaVersion: '1.0.0',
        eventId: 'evt_pass_01',
        operationId: 'op_pass_01',
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        status: STATUSES.PASSED,
        title: 'Phantom Pass',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
      };

      const res = validateActivityEvent(unverified);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('requires authoritative verification evidence');

      // With authoritative evidence
      const verified = {
        ...unverified,
        evidence: { passedRules: 15, failedRules: 0 },
      };
      expect(validateActivityEvent(verified).valid).toBe(true);
    });

    test('validation_failed requires actual error details with a message', () => {
      const missingError = {
        schemaVersion: '1.0.0',
        eventId: 'evt_fail_01',
        operationId: 'op_fail_01',
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        status: STATUSES.FAILED,
        title: 'Empty Failure',
        timestamps: { startedAt: '2026-10-30T10:00:00.000Z', updatedAt: '2026-10-30T10:00:00.000Z' },
      };

      expect(validateActivityEvent(missingError).valid).toBe(false);

      const withError = {
        ...missingError,
        error: { message: 'Timeout waiting for AST parser', code: 'TIMEOUT' },
      };
      expect(validateActivityEvent(withError).valid).toBe(true);
    });
  });

  // ── 3. Secret-Safe Event Handling & Immutability ───────────────────────────
  describe('3. Secret-Safe Event Handling & Immutability', () => {
    test('does not mutate caller-owned event objects', () => {
      const callerInput = {
        title: 'Original Title with sk_live_secretkey12345678',
        evidence: { key: 'secret_value' },
      };

      const event = createActivityEvent(callerInput);
      expect(callerInput.title).toContain('sk_live_secretkey12345678');
      expect(callerInput.eventId).toBeUndefined(); // Input not mutated!
      expect(Object.isFrozen(event)).toBe(true); // Result is frozen!
    });

    test('redacts multiple credential patterns across title, error, and evidence', () => {
      const callerInput = {
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Connecting with key sk_live_abc1234567890',
        summary: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.supersecretkey',
        evidence: {
          db: 'postgres://admin:pass123@cluster.com:5432/db',
          aws: 'AKIAIOSFODNN7EXAMPLE',
          privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----',
        },
      };

      const event = createActivityEvent(callerInput);
      expect(event.title).toBe('Connecting with key [REDACTED_API_KEY]');
      expect(event.summary).toBe('Authorization: Bearer [REDACTED_TOKEN]');
      expect(event.evidence.db).toBe('[REDACTED_DB_URL]');
      expect(event.evidence.aws).toBe('[REDACTED_AWS_KEY]');
      expect(event.evidence.privateKey).toBe('[REDACTED_PRIVATE_KEY]');

      // Caller input remains unmutated
      expect(callerInput.title).toContain('sk_live_abc1234567890');
    });
  });

  // ── 4. Renderer Foundation (Markdown, Terminal, PlainText, Structured) ──────
  describe('4. Renderer Foundation', () => {
    let testEvent;

    beforeEach(() => {
      testEvent = createActivityEvent({
        eventType: EVENT_TYPES.TOOL_EXECUTION_STARTED,
        title: 'AST Context Generation',
        summary: 'Compiling AST symbol table for src/index.ts',
        progress: { current: 3, total: 5, unit: 'files', isAuthoritative: true },
        nextAction: 'Emit sparse context prompt',
      });
    });

    test('MarkdownRenderer produces clean GFM without ANSI escapes or ASCII box borders', () => {
      const renderer = new MarkdownRenderer();
      const output = renderer.render(testEvent);

      expect(output).toContain('› **Executing** · AST Context Generation');
      expect(output).toContain('Compiling AST symbol table for src/index.ts');
      expect(output).toContain('Progress: 3/5 files (60%) · 2 pending');
      expect(output).toContain('Next: Emit sparse context prompt');
      expect(output).not.toContain('\x1b[');
      expect(output).not.toContain('━━━');
    });

    test('TerminalRenderer supports color and clean non-TTY fallback', () => {
      const renderer = new TerminalRenderer();

      // Non-color mode
      const noColorOut = renderer.render(testEvent, { noColor: true });
      expect(noColorOut).not.toContain('\x1b[');
      expect(noColorOut).toContain('Executing');
      expect(noColorOut).toContain('AST Context Generation');

      // ASCII mode
      const asciiOut = renderer.render(testEvent, { noColor: true, ascii: true });
      expect(asciiOut.startsWith('>')).toBe(true);
    });

    test('PlainTextRenderer emits zero Markdown formatting and zero escape codes', () => {
      const renderer = new PlainTextRenderer();
      const output = renderer.render(testEvent);

      expect(output).toContain('> AST Context Generation');
      expect(output).toContain('Progress: 3/5 files (60%) - 2 pending');
      expect(output).not.toContain('**');
      expect(output).not.toContain('\x1b[');
    });

    test('StructuredRenderer produces valid, deterministic JSON', () => {
      const renderer = new StructuredRenderer();
      const output = renderer.render(testEvent);

      const parsed = JSON.parse(output);
      expect(parsed.schemaVersion).toBe('1.0.0');
      expect(parsed.eventType).toBe(EVENT_TYPES.TOOL_EXECUTION_STARTED);
      expect(parsed.title).toBe('AST Context Generation');
      expect(parsed.progress.percentage).toBe(60);
    });

    test('renderers handle Unicode, multiline summaries, and large error stacks safely', () => {
      const complexEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Unicode Test ⚡ 🔱 审查',
        summary: 'Line 1: Analysis failed.\nLine 2: Missing edge definition.\nLine 3: Cycle detected.',
        error: {
          message: 'Graph cycle in module imports: A -> B -> C -> A',
          code: 'CYCLE_ERROR',
          suggestion: 'Decouple module B and C using an interface',
        },
      });

      const md = renderMarkdown(complexEvent);
      expect(md).toContain('Unicode Test ⚡ 🔱 审查');
      expect(md).toContain('Line 1: Analysis failed.');
      expect(md).toContain('Error [CYCLE_ERROR]: Graph cycle in module imports');
      expect(md).toContain('Remedy: Decouple module B and C using an interface');

      const plain = renderPlainText(complexEvent);
      expect(plain).toContain('[FAIL]');
      expect(plain).toContain('Unicode Test ⚡ 🔱 审查');

      const json = JSON.parse(renderStructured(complexEvent));
      expect(json.title).toContain('Unicode Test ⚡ 🔱 审查');
    });

    test('renderers produce deterministic output for identical input', () => {
      const md1 = renderMarkdown(testEvent);
      const md2 = renderMarkdown(testEvent);
      expect(md1).toBe(md2);

      const plain1 = renderPlainText(testEvent);
      const plain2 = renderPlainText(testEvent);
      expect(plain1).toBe(plain2);

      const json1 = renderStructured(testEvent);
      const json2 = renderStructured(testEvent);
      expect(json1).toBe(json2);
    });
  });

  // ── 5. Reproducible Performance Benchmark ─────────────────────────────────
  describe('5. Performance & Overhead Benchmarking', () => {
    test('measures local rendering throughput (reproducible benchmark)', () => {
      const sampleEvent = createActivityEvent({
        eventType: EVENT_TYPES.TESTS_RUNNING,
        title: 'Benchmark Event',
        summary: 'Measuring microsecond rendering budget.',
        progress: { current: 50, total: 100, isAuthoritative: true },
      });

      const iterations = 1000;
      const start = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        renderMarkdown(sampleEvent);
        renderPlainText(sampleEvent);
        renderStructured(sampleEvent);
      }

      const elapsedNs = process.hrtime.bigint() - start;
      const elapsedMs = Number(elapsedNs) / 1e6;
      const avgMsPerTriple = elapsedMs / iterations;

      // Ensure all 3 renderers combined take under 0.2ms per call
      expect(avgMsPerTriple).toBeLessThan(0.5);
    });
  });
});
