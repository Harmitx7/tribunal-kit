'use strict';

/**
 * Phase 10 Test Suite: Progressive Disclosure, Diagnostic Intelligence, and Output Optimization
 *
 * Exhaustively tests:
 * 1. Information priority evaluation and detail-level resolution
 * 2. Invariant preservation: critical errors & blocks NEVER hidden across any detail level
 * 3. Bounded diagnostic retention, memory limits, and secret scrubbing
 * 4. Actionable diagnostic failure classification and reporting
 * 5. Semantic large output truncation and pagination metadata
 * 6. High-information completion summary generation (accuracy, invariants, no false success)
 * 7. Multi-environment rendering under progressive disclosure (Markdown, Terminal, Plaintext, Structured)
 * 8. ActivityTracker Phase 10 integration and diagnostic retrieval
 */

const {
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  ENVIRONMENTS,
  createActivityEvent,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
  renderActivity,
  ActivityTracker,
  OperationRecord,
  OperationRegistry,
  // Phase 10 exports
  DETAIL_LEVELS,
  PRIORITY_LEVELS,
  resolveDetailLevel,
  getEventPriority,
  shouldDisplayEvent,
  FAILURE_CATEGORIES,
  OperationDiagnosticRecord,
  DiagnosticBuffer,
  classifyFailure,
  defaultDiagnosticBuffer,
  getDiagnostics,
  getDiagnosticReport,
  boundArray,
  boundString,
  boundObject,
  formatDuration,
  normalizeSummaryData,
  formatCompletionSummary,
} = require('../../src/activity');

describe('Phase 10: Progressive Disclosure, Diagnostic Intelligence, and Output Optimization', () => {
  beforeEach(() => {
    defaultDiagnosticBuffer.clearAll();
  });

  // ── 1. Information Priority & Detail Levels ──────────────────────────────────
  describe('1. Information Priority & Detail Levels', () => {
    test('defines canonical detail levels', () => {
      expect(DETAIL_LEVELS.ESSENTIAL).toBe('essential');
      expect(DETAIL_LEVELS.EXPANDED).toBe('expanded');
      expect(DETAIL_LEVELS.DIAGNOSTIC).toBe('diagnostic');
    });

    test('resolves detail level from flags and options correctly', () => {
      expect(resolveDetailLevel({ detailLevel: 'essential' })).toBe('essential');
      expect(resolveDetailLevel({ detailLevel: 'EXPANDED' })).toBe('expanded');
      expect(resolveDetailLevel({ verbose: true })).toBe('diagnostic');
      expect(resolveDetailLevel({ debug: true })).toBe('diagnostic');
      expect(resolveDetailLevel({ verbosity: 'diagnostic' })).toBe('diagnostic');
      expect(resolveDetailLevel({ expanded: true })).toBe('expanded');
      expect(resolveDetailLevel({ quiet: true })).toBe('essential');
      expect(resolveDetailLevel({ isCompletion: true })).toBe('expanded');
      expect(resolveDetailLevel({})).toBe('essential');
    });

    test('classifies event priorities accurately', () => {
      const failEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Check failed',
        error: { message: 'Failed assertion' },
      });
      expect(getEventPriority(failEvent)).toBe(PRIORITY_LEVELS.CRITICAL);

      const blockEvent = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_BLOCKED,
        title: 'Blocked',
      });
      expect(getEventPriority(blockEvent)).toBe(PRIORITY_LEVELS.CRITICAL);

      const warnEvent = createActivityEvent({
        eventType: EVENT_TYPES.WARNING_DETECTED,
        title: 'Warning',
      });
      expect(getEventPriority(warnEvent)).toBe(PRIORITY_LEVELS.HIGH);

      const completedEvent = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_COMPLETED,
        title: 'Completed',
      });
      expect(getEventPriority(completedEvent)).toBe(PRIORITY_LEVELS.HIGH);

      const startEvent = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Started',
      });
      expect(getEventPriority(startEvent)).toBe(PRIORITY_LEVELS.MEDIUM);

      const passedEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'Passed',
        evidence: { checks: 5 },
      });
      expect(getEventPriority(passedEvent)).toBe(PRIORITY_LEVELS.MEDIUM);

      const toolEvent = createActivityEvent({
        eventType: EVENT_TYPES.TOOL_EXECUTING,
        title: 'Tool execution',
      });
      expect(getEventPriority(toolEvent)).toBe(PRIORITY_LEVELS.LOW);

      const intermediateProg = createActivityEvent({
        eventType: EVENT_TYPES.PROGRESS_UPDATED,
        title: 'Progress',
        progress: { current: 3, total: 10, percentage: 30, isAuthoritative: true },
      });
      expect(getEventPriority(intermediateProg)).toBe(PRIORITY_LEVELS.LOW);

      const finalProg = createActivityEvent({
        eventType: EVENT_TYPES.PROGRESS_UPDATED,
        title: 'Progress Final',
        progress: { current: 10, total: 10, percentage: 100, isAuthoritative: true },
      });
      expect(getEventPriority(finalProg)).toBe(PRIORITY_LEVELS.MEDIUM);
    });

    test('INVARIANT: Critical failures and blocks are NEVER hidden across any detail level', () => {
      const failEvent = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Compilation failed',
        error: { message: 'Syntax error' },
      });

      const blockEvent = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_BLOCKED,
        title: 'Operation halted',
      });

      const gateEvent = createActivityEvent({
        eventType: EVENT_TYPES.HUMAN_APPROVAL_REQUIRED,
        title: 'Gate check',
      });

      // Even in essential mode, all critical events are visible
      expect(shouldDisplayEvent(failEvent, DETAIL_LEVELS.ESSENTIAL).visible).toBe(true);
      expect(shouldDisplayEvent(blockEvent, DETAIL_LEVELS.ESSENTIAL).visible).toBe(true);
      expect(shouldDisplayEvent(gateEvent, DETAIL_LEVELS.ESSENTIAL).visible).toBe(true);

      // In expanded mode
      expect(shouldDisplayEvent(failEvent, DETAIL_LEVELS.EXPANDED).visible).toBe(true);
      expect(shouldDisplayEvent(blockEvent, DETAIL_LEVELS.EXPANDED).visible).toBe(true);

      // In diagnostic mode
      expect(shouldDisplayEvent(failEvent, DETAIL_LEVELS.DIAGNOSTIC).visible).toBe(true);
    });

    test('suppresses routine progress chatter in essential mode while preserving expanded/diagnostic visibility', () => {
      const routineProg = createActivityEvent({
        eventType: EVENT_TYPES.PROGRESS_UPDATED,
        title: 'Running suite 4',
        progress: { current: 4, total: 12, percentage: 33, isAuthoritative: true },
      });

      const toolRun = createActivityEvent({
        eventType: EVENT_TYPES.TOOL_EXECUTING,
        title: 'Tool: linter',
      });

      // In essential mode: suppressed
      expect(shouldDisplayEvent(routineProg, DETAIL_LEVELS.ESSENTIAL).visible).toBe(false);
      expect(shouldDisplayEvent(toolRun, DETAIL_LEVELS.ESSENTIAL).visible).toBe(false);

      // In expanded mode: visible
      expect(shouldDisplayEvent(routineProg, DETAIL_LEVELS.EXPANDED).visible).toBe(true);
      expect(shouldDisplayEvent(toolRun, DETAIL_LEVELS.EXPANDED).visible).toBe(true);

      // In diagnostic mode: visible
      expect(shouldDisplayEvent(routineProg, DETAIL_LEVELS.DIAGNOSTIC).visible).toBe(true);
      expect(shouldDisplayEvent(toolRun, DETAIL_LEVELS.DIAGNOSTIC).visible).toBe(true);
    });
  });

  // ── 2. Diagnostic Retention & Retrieval Engine ──────────────────────────────
  describe('2. Diagnostic Retention & Retrieval Engine', () => {
    test('stores events per operation in a bounded circular buffer', () => {
      const buffer = new DiagnosticBuffer({ maxEventsPerOperation: 3 });
      const opId = 'op-test-100';

      for (let i = 1; i <= 5; i++) {
        buffer.record({
          operationId: opId,
          eventType: EVENT_TYPES.TOOL_EXECUTING,
          title: `Step ${i}`,
        });
      }

      const diag = buffer.getDiagnostics(opId);
      expect(diag.operationId).toBe(opId);
      expect(diag.events.length).toBe(3);
      expect(diag.events[0].title).toBe('Step 3');
      expect(diag.events[1].title).toBe('Step 4');
      expect(diag.events[2].title).toBe('Step 5');
      expect(diag.retention.truncatedCount).toBe(2);
      expect(diag.retention.isTruncated).toBe(true);
    });

    test('scrubs secrets before retaining events in diagnostic buffer', () => {
      const buffer = new DiagnosticBuffer();
      const opId = 'op-secret-test';

      buffer.record({
        operationId: opId,
        eventType: EVENT_TYPES.TOOL_EXECUTING,
        title: 'Tool invocation with secret',
        summary: 'Connecting with key ghp_1234567890123456789012345678 to api',
        evidence: { apiKey: 'sk-ant-api03-1234567890abcdef123456' },
      });

      const diag = buffer.getDiagnostics(opId);
      expect(diag.events.length).toBe(1);
      const stored = diag.events[0];
      expect(stored.summary).not.toContain('ghp_1234567890123456789012345678');
      expect(stored.summary).toContain('[REDACTED_API_KEY]');
      expect(stored.evidence.apiKey).not.toContain('sk-ant-api03');
      expect(stored.evidence.apiKey).toContain('[REDACTED_API_KEY]');
    });

    test('classifies failure categories accurately and provides actionable suggestions', () => {
      expect(classifyFailure({ code: 'EACCES', message: 'permission denied' })).toBe(FAILURE_CATEGORIES.PERMISSION_ERROR);
      expect(classifyFailure({ code: 'ETIMEDOUT', message: 'connection timed out' })).toBe(FAILURE_CATEGORIES.TIMEOUT_OR_STALL);
      expect(classifyFailure({ message: 'Jest: 2 tests failed' })).toBe(FAILURE_CATEGORIES.TEST_FAILURE);
      expect(classifyFailure({ code: 'MODULE_NOT_FOUND', message: 'Cannot find module "zod"' })).toBe(FAILURE_CATEGORIES.DEPENDENCY_FAILURE);
      expect(classifyFailure({ message: 'Validation failed on schema' })).toBe(FAILURE_CATEGORIES.VALIDATION_FAILURE);
      expect(classifyFailure({ message: 'Unexpected internal crash' })).toBe(FAILURE_CATEGORIES.INTERNAL_ERROR);
    });

    test('generates an actionable diagnostic report with root cause and remedy', () => {
      const buffer = new DiagnosticBuffer();
      const opId = 'op-fail-report';

      buffer.record({
        operationId: opId,
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Database Sync',
      });

      buffer.record({
        operationId: opId,
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Connection Dropped',
        error: {
          code: 'ETIMEDOUT',
          message: 'Connection timed out after 5000ms',
          suggestion: 'Check database firewall rules and restart proxy daemon',
          stack: 'Error: Connection timed out\n    at TCPConnectWrap.afterConnect (node:net:1606:16)',
        },
      });

      const report = buffer.getDiagnosticReport(opId);
      expect(report).toContain('### Diagnostic Report: `op-fail-report`');
      expect(report).toContain('**Failure Category**: `timeout_or_stall`');
      expect(report).toContain('Connection timed out after 5000ms');
      expect(report).toContain('Check database firewall rules and restart proxy daemon');
      expect(report).toContain('TCPConnectWrap.afterConnect');
      expect(report).toContain('Operational Event Sequence');
      expect(report).toContain('1. **operation_started** · Database Sync');
      expect(report).toContain('2. **validation_failed** · Connection Dropped');
    });

    test('exports diagnostics in structured JSON format', () => {
      const buffer = new DiagnosticBuffer();
      const opId = 'op-export-json';
      buffer.record({ operationId: opId, eventType: EVENT_TYPES.OPERATION_STARTED, title: 'Export Test' });

      const exportedJson = buffer.exportDiagnostics(opId, 'json');
      const parsed = JSON.parse(exportedJson);
      expect(parsed.operationId).toBe(opId);
      expect(Array.isArray(parsed.events)).toBe(true);
      expect(parsed.events.length).toBe(1);
    });

    test('cleans up diagnostic records explicitly', () => {
      const buffer = new DiagnosticBuffer();
      buffer.record({ operationId: 'op-clear', eventType: EVENT_TYPES.OPERATION_STARTED, title: 'To Clear' });
      expect(buffer.getDiagnostics('op-clear').events.length).toBe(1);

      buffer.clear('op-clear');
      expect(buffer.getDiagnostics('op-clear').events.length).toBe(0);
    });
  });

  // ── 3. Semantic Output Truncation & Bounding ─────────────────────────────────
  describe('3. Semantic Output Truncation & Bounding', () => {
    test('boundArray preserves small arrays without modification', () => {
      const items = ['item1', 'item2', 'item3'];
      const res = boundArray(items, { maxItems: 5 });
      expect(res.items).toEqual(['item1', 'item2', 'item3']);
      expect(res.pagination.total).toBe(3);
      expect(res.pagination.shown).toBe(3);
      expect(res.pagination.omitted).toBe(0);
      expect(res.pagination.isTruncated).toBe(false);
      expect(res.pagination.notice).toBeNull();
    });

    test('boundArray truncates large arrays with pagination and retention notice', () => {
      const items = Array.from({ length: 45 }, (_, i) => `Finding ${i + 1}`);
      const res = boundArray(items, { maxItems: 10, diagnosticRef: 'op-audit-99' });

      expect(res.items.length).toBe(10);
      expect(res.items[0]).toBe('Finding 1');
      expect(res.items[9]).toBe('Finding 10');
      expect(res.pagination.total).toBe(45);
      expect(res.pagination.shown).toBe(10);
      expect(res.pagination.omitted).toBe(35);
      expect(res.pagination.isTruncated).toBe(true);
      expect(res.pagination.notice).toContain('... and 35 more verified findings; use --verbose to view all (retained in diagnostics: op-audit-99)');
    });

    test('boundString bounds text preserving head and tail', () => {
      const longText = 'HEAD_START\n' + 'line '.repeat(1000) + '\nTAIL_END';
      const res = boundString(longText, { maxLength: 300 });

      expect(res.isTruncated).toBe(true);
      expect(res.text).toContain('HEAD_START');
      expect(res.text).toContain('TAIL_END');
      expect(res.text).toContain('characters truncated for display');
      expect(res.text.length).toBeLessThan(longText.length);
    });

    test('boundObject limits depth and array length safely', () => {
      const deepObj = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'too deep',
              },
            },
          },
        },
        largeList: Array.from({ length: 20 }, (_, i) => i),
      };

      const bounded = boundObject(deepObj, { maxDepth: 3, maxArrayLength: 5 });
      expect(bounded.level1.level2.level3).toBe('[Object: maximum depth reached]');
      expect(bounded.largeList.length).toBe(6); // 5 items + 1 omitted notice
      expect(bounded.largeList[5]).toContain('15 items omitted');
    });
  });

  // ── 4. High-Information Completion Summaries ────────────────────────────────
  describe('4. High-Information Completion Summaries', () => {
    test('formats a completed summary with high information density', () => {
      const summary = formatCompletionSummary({
        title: 'Full Repository Security Scan',
        status: STATUSES.COMPLETED,
        durationMs: 2450,
        attempted: ['Static AST scan', 'Dependency CVE audit', 'Secret leak detector'],
        changed: ['package-lock.json', '.agent/case_law.json'],
        succeeded: ['Zero critical vulnerabilities', 'All package signatures verified'],
        verified: ['OWASP Top 10 compliance', 'Dependency tree sanitized'],
        warnings: ['Lodash 4.17.15 deprecation warning'],
        artifacts: ['reports/security.json', 'reports/sbom.json'],
        diagnosticsRef: 'op-sec-101',
      }, { environment: ENVIRONMENTS.MARKDOWN });

      expect(summary).toContain('✔ **Completed** · Full Repository Security Scan (2.45s)');
      expect(summary).toContain('Attempted: Static AST scan, Dependency CVE audit, Secret leak detector');
      expect(summary).toContain('Changed: package-lock.json, .agent/case_law.json');
      expect(summary).toContain('Succeeded:');
      expect(summary).toContain('✔ Zero critical vulnerabilities');
      expect(summary).toContain('Verified:');
      expect(summary).toContain('- OWASP Top 10 compliance');
      expect(summary).toContain('Attention:');
      expect(summary).toContain('⚠ Lodash 4.17.15 deprecation warning');
      expect(summary).toContain('Artifacts: `reports/security.json`, `reports/sbom.json`');
      expect(summary).toContain('Diagnostics: `op-sec-101`');
    });

    test('INVARIANT: Failed operation never produces a success badge', () => {
      const summary = formatCompletionSummary({
        title: 'Database Migration',
        status: STATUSES.FAILED,
        durationMs: 820,
        failed: ['Relation "orders" does not exist in target database'],
        diagnosticsRef: 'op-db-fail',
      }, { environment: ENVIRONMENTS.MARKDOWN });

      expect(summary).toContain('✖ **Failed** · Database Migration (820ms)');
      expect(summary).not.toContain('Completed');
      expect(summary).toContain('Failed:');
      expect(summary).toContain('✖ Relation "orders" does not exist');
    });

    test('INVARIANT: Cancelled operation produces cancelled badge', () => {
      const summary = formatCompletionSummary({
        title: 'Long Running Crawl',
        status: STATUSES.CANCELLED,
        durationMs: 1500,
        attempted: ['Page indexing'],
      }, { environment: ENVIRONMENTS.MARKDOWN });

      expect(summary).toContain('⊘ **Cancelled** · Long Running Crawl (1.50s)');
    });

    test('supports terminal, plaintext, and structured summary formatting', () => {
      const data = {
        title: 'Core Engine Build',
        status: STATUSES.COMPLETED,
        durationMs: 1200,
        succeeded: ['Compilation succeeded'],
        verified: ['Bytecode checksum verified'],
        diagnosticsRef: 'op-build-2',
      };

      const term = formatCompletionSummary(data, { environment: ENVIRONMENTS.TERMINAL });
      expect(term).toContain('✔ Completed: Core Engine Build (1.20s)');
      expect(term).toContain('[OK] Compilation succeeded');

      const plain = formatCompletionSummary(data, { environment: ENVIRONMENTS.PLAINTEXT });
      expect(plain).toContain('[DONE] Core Engine Build (1.20s)');
      expect(plain).toContain('Succeeded: Compilation succeeded');

      const struct = formatCompletionSummary(data, { environment: ENVIRONMENTS.STRUCTURED });
      const parsed = JSON.parse(struct);
      expect(parsed.title).toBe('Core Engine Build');
      expect(parsed.status).toBe(STATUSES.COMPLETED);
    });
  });

  // ── 5. Multi-Environment Rendering & Progressive Disclosure ──────────────────
  describe('5. Multi-Environment Rendering & Progressive Disclosure', () => {
    test('renderMarkdown honors detailLevel essential by bounding large evidence collections', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'Large Finding Set',
        evidence: Array.from({ length: 30 }, (_, i) => `Vulnerability check ${i + 1} passed`),
      });

      // Essential mode: limits items in disclosure
      const mdEssential = renderMarkdown(event, { detailLevel: DETAIL_LEVELS.ESSENTIAL });
      expect(mdEssential).toContain('<details>');
      expect(mdEssential).toContain('... and 28 more verified findings');
      expect(mdEssential).toContain('Vulnerability check 1 passed');
      expect(mdEssential).toContain('Vulnerability check 2 passed');
      // Should not include raw dump of all 30 items
      expect(mdEssential).toContain('more verified findings (retained in diagnostics');

      // Diagnostic mode: renders full items
      const mdDiag = renderMarkdown(event, { detailLevel: DETAIL_LEVELS.DIAGNOSTIC });
      expect(mdDiag).toContain('Vulnerability check 20 passed');
    });

    test('renderMarkdown in diagnostic mode renders uncollapsed stack trace', () => {
      const stack = [
        'Error: Deadlock detected',
        '    at Client.query (pg/lib/client.js:142:10)',
        '    at Worker.execute (src/worker.js:84:18)',
        '    at async Pipeline.run (src/pipeline.js:24:5)',
      ].join('\n');

      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_FAILED,
        title: 'Database Deadlock',
        error: { message: 'Transaction rolled back', stack },
      });

      const mdDiag = renderMarkdown(event, { detailLevel: DETAIL_LEVELS.DIAGNOSTIC });
      expect(mdDiag).toContain('Diagnostic Stack:');
      expect(mdDiag).toContain('```text\nError: Deadlock detected');
      expect(mdDiag).toContain('Client.query');
    });

    test('renderTerminal honors detailLevel and renders cleanly', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'Terminal Check',
        evidence: { testsPassed: 42, suites: 4 },
      });

      const term = renderTerminal(event, { noColor: true, detailLevel: DETAIL_LEVELS.ESSENTIAL });
      expect(term).toContain('Terminal Check');
      expect(term).toContain('Evidence:');
      expect(term).toContain('testsPassed');
    });

    test('renderPlainText honors detailLevel', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.OPERATION_STARTED,
        title: 'Plain Task',
        summary: 'Plain execution',
      });

      const plain = renderPlainText(event, { detailLevel: DETAIL_LEVELS.ESSENTIAL });
      expect(plain).toContain('> Plain Task');
      expect(plain).toContain('Plain execution');
    });

    test('renderStructured preserves canonical JSON schema and attaches detailLevel', () => {
      const event = createActivityEvent({
        eventType: EVENT_TYPES.VALIDATION_PASSED,
        title: 'JSON Check',
        evidence: 'Verified OK',
      });

      const jsonStr = renderStructured(event, { detailLevel: DETAIL_LEVELS.EXPANDED, pretty: false });
      const parsed = JSON.parse(jsonStr);
      expect(parsed.eventType).toBe(EVENT_TYPES.VALIDATION_PASSED);
      expect(parsed._detailLevel).toBe('expanded');
    });
  });

  // ── 6. ActivityTracker Phase 10 Integration ─────────────────────────────────
  describe('6. ActivityTracker Phase 10 Integration', () => {
    test('ActivityTracker automatically records events into diagnostic buffer', () => {
      const tracker = new ActivityTracker({
        title: 'Tracked Operation',
      });

      tracker.start('Initialize pipeline', 'Starting workers');
      tracker.passed('Stage 1 Validated', { valid: true });
      tracker.warning('High memory utilization', 'GC latency may increase');

      const diag = tracker.getDiagnostics();
      expect(diag).not.toBeNull();
      expect(diag.operationId).toBe(tracker.operationId);
      expect(diag.events.length).toBe(3);
      expect(diag.events[0].title).toBe('Initialize pipeline');
      expect(diag.events[1].title).toBe('Stage 1 Validated');
      expect(diag.events[2].title).toBe('Warning Detected');
    });

    test('ActivityTracker generates actionable diagnostic reports on failure', () => {
      const tracker = new ActivityTracker({
        title: 'Failure Investigation Operation',
      });

      tracker.start('Connecting to Redis', 'Establishing cluster connection');
      tracker.failed('Connection Refused', {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:6379',
        suggestion: 'Verify redis-server daemon is active on port 6379',
        stack: 'Error: connect ECONNREFUSED\n    at TCPConnectWrap.afterConnect (node:net:1606:16)',
      });

      const report = tracker.getDiagnosticReport();
      expect(report).toContain('Diagnostic Report:');
      expect(report).toContain('ECONNREFUSED');
      expect(report).toContain('Verify redis-server daemon is active on port 6379');
      expect(report).toContain('Operational Event Sequence');
    });

    test('ActivityTracker generates executive completion summary card', () => {
      const tracker = new ActivityTracker({
        title: 'API Regression Test Suite',
      });

      tracker.start('API Regression Test Suite', 'Running Integration Tests');
      tracker.passed('Auth Endpoint Validated', 'auth_token_verified');
      tracker.passed('Billing Endpoint Validated', 'webhook_signature_verified');
      tracker.complete('All 2 integration endpoints passed behavioral audit');

      const summaryCard = tracker.getCompletionSummary({ environment: ENVIRONMENTS.MARKDOWN });
      expect(summaryCard).toContain('✔ **Completed** · API Regression Test Suite');
      expect(summaryCard).toContain('Verified:');
      expect(summaryCard).toContain('Diagnostics:');
      expect(summaryCard).toContain(tracker.operationId);
    });

    test('ActivityTracker bounds event history to prevent memory leak', () => {
      const tracker = new ActivityTracker({ title: 'Long-running event loop' });

      for (let i = 1; i <= 250; i++) {
        tracker.updateProgress({ current: i, total: 250, unit: 'items', isAuthoritative: true });
      }

      expect(tracker.events.length).toBeLessThanOrEqual(200);
      expect(tracker._eventsTruncated).toBeGreaterThanOrEqual(50);
    });
  });
});
