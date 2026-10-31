'use strict';

/**
 * Tribunal-Kit Phase 12: End-to-End Release Certification (Scenarios A - N)
 *
 * Authoritative integration scenarios certifying that all subsystems (Phases 1-11)
 * operate together reliably as an operating system for AI software engineering.
 */

const { execSync } = require('child_process');
const path = require('path');
const kit = require('../../src/cli');
const {
  ActivityTracker,
  createActivityEvent,
  validateActivityEvent,
  assertValidActivityEvent,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
  stripAnsi,
  redactSecrets,
  deepClone,
  boundArray,
  boundString,
  boundObject,
  DiagnosticBuffer,
  StallDetector,
  HOSTS,
  ENVIRONMENTS,
  LIFECYCLE_STATES,
  ACTIVITY_STATES,
  PROGRESS_STATES,
  TOOL_STATES,
} = kit;

describe('Phase 12: End-to-End Release Certification (Scenarios A - N)', () => {

  // ── Scenario A: Successful Execution ───────────────────────────────────────
  test('Scenario A: Successful execution with authoritative progress and verified completion summary', () => {
    const tracker = new ActivityTracker({
      title: 'Full Build & Verify Flow',
      environment: ENVIRONMENTS.MARKDOWN,
    });

    expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.RUNNING);

    // Step 1: Agent activation
    const agentRes = tracker.activateAgent('backend-specialist', 'Database Migration Service');
    expect(agentRes.formatted).toContain('› **Activated** `@backend-specialist`');
    expect(agentRes.formatted).toContain('Database Migration Service');

    // Step 2: Tool execution
    tracker.executingTool('prisma-migrate', 'Applying migration 20261030_init');

    // Step 3: Authoritative progress
    const progRes = tracker.updateProgress(
      { current: 5, total: 10, isAuthoritative: true, unit: 'migrations' },
      { title: 'Applying database migrations', phase: 'Execution' }
    );
    expect(progRes.event.progress.percentage).toBe(50);

    // Step 4: Verification pass with authoritative evidence
    const verifyRes = tracker.passed('Database Schema Consistency', { appliedMigrations: 10, checksum: 'a1b2c3d4' });
    expect(verifyRes.formatted).toContain('✔ **Verified** · Database Schema Consistency');

    // Step 5: Completed
    tracker.complete('All migrations applied cleanly', { checksum: 'a1b2c3d4' }, ['docs/migrations.md']);
    expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.COMPLETED);

    // Final summary check
    const summary = tracker.getCompletionSummary();
    expect(summary).toContain('Completed');
    expect(summary).toContain('Full Build & Verify Flow');

    tracker.dispose();
  });

  // ── Scenario B: Validation Failure ─────────────────────────────────────────
  test('Scenario B: Validation failure rejects malformed events without false success', () => {
    const malformed = {
      schemaVersion: '999.0.0', // Unsupported version
      title: 'Invalid Event',
    };

    const validation = validateActivityEvent(malformed);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);

    expect(() => assertValidActivityEvent(malformed)).toThrow();

    // Invariant rejection on progress overflow
    expect(() => createActivityEvent({ progress: { current: 15, total: 10, isAuthoritative: true } })).toThrow();

    // Ensure tracker does not report completion for invalid operations
    const tracker = new ActivityTracker({ title: 'Validation Safeguard' });
    expect(tracker.getStatus()).not.toBe(LIFECYCLE_STATES.COMPLETED);
    tracker.dispose();
  });

  // ── Scenario C: Internal Operation Failure ──────────────────────────────────
  test('Scenario C: Execution error is preserved through tracking, rendering, and diagnostic reporting', () => {
    const buffer = new DiagnosticBuffer();
    const tracker = new ActivityTracker({
      title: 'Resilient Payment Pipeline',
      diagnosticBuffer: buffer,
    });

    const runtimeError = new Error('Gateway connection timeout: 504 Gateway Timeout');
    runtimeError.code = 'ETIMEDOUT';

    const failRes = tracker.failed('Payment Gateway Invocation', runtimeError, 'Check API credentials and retry', {
      terminal: true,
    });

    expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.FAILED);
    expect(failRes.formatted).toContain('✖ **Failed**');
    expect(failRes.formatted).toContain('Gateway connection timeout');
    expect(failRes.formatted).toContain('ETIMEDOUT');
    expect(failRes.formatted).toContain('Check API credentials and retry');

    // Diagnostic record preservation
    const report = tracker.getDiagnosticReport();
    expect(report).toContain('Payment Gateway Invocation');
    expect(report).toContain('Gateway connection timeout');

    tracker.dispose();
  });

  // ── Scenario D: Cancellation ───────────────────────────────────────────────
  test('Scenario D: Cancellation produces terminal state, releases resources, and records reason', () => {
    const tracker = new ActivityTracker({
      title: 'Long-running Indexing Job',
      enableStallDetection: true,
    });
    tracker.updateProgress({ current: 20, total: 100, isAuthoritative: true });

    const cancelRes = tracker.cancel('User requested interrupt via SIGINT', {
      metadata: { initiatedBy: 'user', signal: 'SIGINT' },
    });

    expect(tracker.getStatus()).toBe(LIFECYCLE_STATES.CANCELLED);
    expect(cancelRes.formatted).toContain('Cancelled');
    expect(cancelRes.formatted).toContain('SIGINT');

    // Verify stall detector stopped monitoring
    expect(tracker.stallDetector.monitored.has(tracker.operationId)).toBe(false);

    tracker.dispose();
  });

  // ── Scenario E: Timeout ────────────────────────────────────────────────────
  test('Scenario E: Stall detector identifies idle operation and dispatches warning/failure', (done) => {
    let triggered = false;
    const detector = new StallDetector({
      stallThresholdMs: 30,
      checkIntervalMs: 10,
      onStall: (stallEvt) => {
        triggered = true;
      },
    });

    detector.startMonitoring('op-stall-test-12', { title: 'Slow Network Request' });

    setTimeout(() => {
      detector.stopMonitoring('op-stall-test-12');
      expect(triggered).toBe(true);
      done();
    }, 60);
  });

  // ── Scenario F: Partial Completion ─────────────────────────────────────────
  test('Scenario F: Partial completion distinguishes passed and failed subtasks without false claims', () => {
    const tracker = new ActivityTracker({ title: 'Multi-Suite Test Execution' });

    tracker.runningTests('Combined Test Suite', { current: 10, total: 20, isAuthoritative: true });
    tracker.passed('Unit Tests Passed', { passed: 10, failed: 0 });

    tracker.runningTests('Combined Test Suite', { current: 15, total: 20, isAuthoritative: true });
    tracker.failed('E2E Browser Tests', new Error('Timeout waiting for selector "#submit"'), 'Inspect DOM fixture');

    const summary = tracker.getExecutiveSummary();
    expect(summary.passedCount).toBe(1);
    expect(summary.failedCount).toBe(1);

    const completionCard = tracker.getCompletionSummary();
    expect(completionCard).toContain('Failed');
    expect(completionCard).not.toContain('All suites passed');

    tracker.dispose();
  });

  // ── Scenario G: Unsupported Host Capability ────────────────────────────────
  test('Scenario G: Unsupported host capability falls back safely without broken markdown or crashes', () => {
    const sampleEvent = createActivityEvent({
      eventType: 'validation_failed',
      title: 'Type Safety Verification',
      error: { message: 'Type "string" is not assignable to type "number".' },
      nextAction: 'Cast to number or update schema definition',
    });

    // Test across all 4 primary renderers
    const md = renderMarkdown(sampleEvent, { allowHtml: false });
    expect(md).toContain('Type Safety Verification');
    expect(md).not.toContain('<details>'); // Safely omitted when HTML is unsupported

    const term = renderTerminal(sampleEvent, { isTty: false });
    expect(term).toContain('Type Safety Verification');
    expect(term).not.toContain('\u001b['); // Non-TTY strips ANSI codes

    const plain = renderPlainText(sampleEvent);
    expect(plain).toContain('Type Safety Verification');

    const json = renderStructured(sampleEvent, { pretty: false });
    expect(() => JSON.parse(json)).not.toThrow();
  });

  // ── Scenario H: Large Result & Bounded Output ──────────────────────────────
  test('Scenario H: Output limits are enforced without corrupting structured responses or hiding errors', () => {
    const massiveList = Array.from({ length: 500 }, (_, i) => ({ id: `item_${i}`, value: `data_${i}` }));
    const bounded = boundArray(massiveList, { maxItems: 10, diagnosticRef: 'op-large-query' });

    expect(bounded.pagination.shown).toBe(10);
    expect(bounded.pagination.total).toBe(500);
    expect(bounded.pagination.omitted).toBe(490);
    expect(bounded.pagination.isTruncated).toBe(true);

    const longError = 'E_FAIL: '.repeat(200);
    const boundedStr = boundString(longError, { maxLength: 100 });
    expect(boundedStr.isTruncated).toBe(true);
    expect(boundedStr.text.length).toBeLessThanOrEqual(140);
  });

  // ── Scenario I: Secret-Bearing Error ───────────────────────────────────────
  test('Scenario I: Sensitive credentials redacted across renderers and diagnostic buffers', () => {
    const sensitiveError = new Error(
      'Database connection failed to postgres://postgres:SecretSuperPass@db.internal:5432/prod with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY'
    );

    const tracker = new ActivityTracker({ title: 'Secure Migration' });
    const failRes = tracker.failed('DB Connect', sensitiveError, 'Check VPN');

    expect(failRes.formatted).not.toContain('SecretSuperPass');
    expect(failRes.formatted).toContain('[REDACTED_DB_URL]');
    expect(failRes.formatted).toContain('[REDACTED_TOKEN]');

    // Verify diagnostic buffer is also clean
    const diag = tracker.getDiagnostics();
    const diagStr = JSON.stringify(diag);
    expect(diagStr).not.toContain('SecretSuperPass');
    expect(diagStr).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

    tracker.dispose();
  });

  // ── Scenario J: Non-Interactive Execution ──────────────────────────────────
  test('Scenario J: Non-interactive execution emits clean, machine-parsable output', () => {
    const event = createActivityEvent({
      eventType: 'progress_updated',
      title: 'Batch compilation',
      progress: { current: 100, total: 100, isAuthoritative: true },
    });

    const jsonOutput = renderStructured(event, { pretty: false });
    const parsed = JSON.parse(jsonOutput);

    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.eventType).toBe('progress_updated');
    expect(stripAnsi(jsonOutput)).toBe(jsonOutput); // Zero ANSI leakage
  });

  // ── Scenario K: Concurrent Activity ────────────────────────────────────────
  test('Scenario K: Concurrent parallel operations maintain distinct state and event ordering', () => {
    const tracker1 = new ActivityTracker({ title: 'Task A (Backend)' });
    const tracker2 = new ActivityTracker({ title: 'Task B (Frontend)' });

    tracker1.updateProgress({ current: 1, total: 5, isAuthoritative: true });
    tracker2.updateProgress({ current: 2, total: 10, isAuthoritative: true });

    tracker1.passed('Task A Schema Validated', { valid: true });
    tracker2.failed('Task B CSS Linting', new Error('Parse error'), 'Fix syntax', { terminal: true });

    expect(tracker1.getStatus()).toBe(LIFECYCLE_STATES.RUNNING);
    expect(tracker2.getStatus()).toBe(LIFECYCLE_STATES.FAILED);

    expect(tracker1.events.length).toBe(2);
    expect(tracker2.events.length).toBe(2);

    expect(tracker1.events[0].title).toBe('Task A (Backend)');
    expect(tracker2.events[0].title).toBe('Task B (Frontend)');

    tracker1.dispose();
    tracker2.dispose();
  });

  // ── Scenario L: Repeated Initialization and Shutdown ───────────────────────
  test('Scenario L: Repeated tracker lifecycles release timers and avoid buffer accumulation', () => {
    const initialMem = process.memoryUsage().heapUsed;

    for (let i = 0; i < 50; i++) {
      const t = new ActivityTracker({
        title: `Ephemeral Run #${i}`,
        enableCoalescing: true,
        stallDetectorOptions: { stallThresholdMs: 1000 },
      });
      t.updateProgress({ current: i, total: 50, isAuthoritative: true });
      t.complete('Done', { count: i });
      t.dispose();
    }

    const finalMem = process.memoryUsage().heapUsed;
    const diffMb = (finalMem - initialMem) / (1024 * 1024);
    // Heap delta should be negligible (< 15MB) for 50 disposed trackers
    expect(diffMb).toBeLessThan(15);
  });

  // ── Scenario M: MCP Response Formatting ────────────────────────────────────
  test('Scenario M: MCP response formats adhere to protocol contracts with clean serialization', () => {
    const { serializeResponse } = require('../../src/mcp/response_optimizer');

    const rawPayload = {
      status: 'success',
      data: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Record ${i}` })),
      metadata: { serverTime: new Date().toISOString() },
    };

    const optimized = serializeResponse(rawPayload, { maxBytes: 2048 });
    expect(optimized).toBeDefined();
    expect(optimized.content).toBeInstanceOf(Array);
    expect(optimized.content[0].type).toBe('text');

    const parsedJson = JSON.parse(optimized.content[0].text);
    expect(parsedJson.status).toBe('success');
  });

  // ── Scenario N: Package Consumption & Public Exports ───────────────────────
  test('Scenario N: Package artifact exposes expected public interfaces in CommonJS and ESM', () => {
    // 1. CommonJS require from main package entry point
    const mainCjs = require('../../src/cli');
    expect(typeof mainCjs.ActivityTracker).toBe('function');
    expect(typeof mainCjs.createActivityEvent).toBe('function');
    expect(typeof mainCjs.renderMarkdown).toBe('function');
    expect(typeof mainCjs.renderTerminal).toBe('function');
    expect(typeof mainCjs.renderPlainText).toBe('function');
    expect(typeof mainCjs.renderStructured).toBe('function');
    expect(typeof mainCjs.stripAnsi).toBe('function');
    expect(typeof mainCjs.redactSecrets).toBe('function');
    expect(typeof mainCjs.deepClone).toBe('function');
    expect(typeof mainCjs.activity).toBe('object');

    // 2. ESM import from package exports via Node subprocess
    const esmCheckCommand = `node --input-type=module -e "import { ActivityTracker, renderMarkdown, deepClone, activity } from './src/esm/index.mjs'; if (typeof ActivityTracker !== 'function' || typeof renderMarkdown !== 'function' || typeof deepClone !== 'function' || typeof activity !== 'object') process.exit(1);"`;
    expect(() => execSync(esmCheckCommand, { cwd: path.resolve(__dirname, '../..'), stdio: 'pipe' })).not.toThrow();
  });

});

