'use strict';

/**
 * Phase 10 Baseline & Comparative Benchmark: Output Optimization & Progressive Disclosure
 *
 * Measures:
 * 1. Unfiltered Baseline vs Progressive Disclosure (Essential, Expanded, Diagnostic)
 * 2. Total visible output bytes, line counts, and percentage reductions
 * 3. Average and maximum message sizes
 * 4. Diagnostic retention volume vs immediately displayed volume
 * 5. High-density completion summary vs raw event logs
 * 6. Rendering latency per event and throughput (ops/sec) across all renderers
 */

const {
  EVENT_TYPES,
  STATUSES,
  LIFECYCLE_STATES,
  createActivityEvent,
  formatActivity,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
  ActivityTracker,
  DETAIL_LEVELS,
  shouldDisplayEvent,
  formatCompletionSummary,
  defaultDiagnosticBuffer,
} = require('../src/activity');

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// ── Representative Workload Generators ────────────────────────────────────────

function createTestExecutionWorkload() {
  const events = [];
  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_STARTED,
    title: 'Unit Test Execution Pipeline',
    summary: 'Running 8 test suites across 4 worker threads',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.AGENT_ACTIVATED,
    agent: 'test-engineer',
    domain: 'Test Strategy & Execution',
    summary: 'Orchestrating test runners and asserting behavior contracts.',
  }));

  for (let i = 1; i <= 8; i++) {
    events.push(createActivityEvent({
      eventType: EVENT_TYPES.PROGRESS_UPDATED,
      title: 'Executing Jest Unit Test Suites',
      progress: {
        current: i,
        total: 8,
        percentage: Math.round((i / 8) * 100),
        unit: 'suites',
        isAuthoritative: true,
      },
    }));
  }

  for (let i = 1; i <= 4; i++) {
    events.push(createActivityEvent({
      eventType: EVENT_TYPES.TOOL_EXECUTING,
      title: `Tool: test_runner suite_${i}`,
      summary: `Subprocess executing test/unit/suite_${i}.test.js`,
    }));
  }

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.WARNING_DETECTED,
    title: 'Deprecation Warning',
    warning: {
      message: 'Punycodes module is deprecated; use node:buffer or url module instead.',
      impact: 'Will be removed in next Node runtime release.',
    },
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.VALIDATION_PASSED,
    title: 'Behavioral Contract Assertions',
    evidence: { passedSuites: 8, passedTests: 142, failedTests: 0, durationMs: 1820 },
    nextAction: 'Ready for integration deployment',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_COMPLETED,
    title: 'Unit Test Execution Pipeline',
    summary: 'All 8 test suites passed with 142 assertions and 0 regressions.',
    reportReferences: ['coverage/lcov.info', 'reports/test_summary.json'],
  }));

  return events;
}

function createSecurityAuditWorkload() {
  const events = [];
  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_STARTED,
    title: 'Deep OWASP Source Code Security Audit',
    summary: 'Analyzing AST for injection vectors, secret leaks, and prototype pollution.',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.SKILL_ACTIVATED,
    skill: 'api-security-auditor',
    domain: 'Application Security & Pen-Testing',
    summary: 'Auditing route handlers and query parameters against OWASP Top 10.',
  }));

  // Large evidence payload with 30 findings
  const mockFindings = [];
  for (let i = 1; i <= 30; i++) {
    mockFindings.push({
      id: `VULN-${1000 + i}`,
      severity: i % 10 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
      file: `src/routes/api_v${i % 3}/endpoint_${i}.js`,
      line: 42 + i * 2,
      rule: 'no-raw-sql-interpolation',
      status: 'verified_safe_parameterized',
    });
  }

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.ANALYSIS_STARTED,
    title: 'AST Vulnerability Scanner',
    summary: 'Scanning 84 endpoints across 12 services.',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.EVIDENCE_COLLECTED,
    title: 'Static Analysis Security Scanner Findings',
    evidence: mockFindings,
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.WARNING_DETECTED,
    title: 'Outdated Dependency Alert',
    warning: {
      message: 'Package "lodash" version 4.17.15 has moderate prototype pollution vulnerability.',
      impact: 'Potential remote property injection if untrusted user objects are merged.',
    },
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.VALIDATION_PASSED,
    title: 'Zero High-Severity Security Vulnerabilities',
    evidence: { scannedEndpoints: 84, critical: 0, high: 0, medium: 3, low: 27 },
    nextAction: 'Generate SBOM report',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_COMPLETED,
    title: 'Deep OWASP Source Code Security Audit',
    summary: 'Repository passed security gate with 0 blocking CVEs.',
    reportReferences: ['reports/security_audit.json', 'reports/sbom.spdx.json'],
  }));

  return events;
}

function createFailureRecoveryWorkload() {
  const events = [];
  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_STARTED,
    title: 'Database Schema Migration Pipeline',
    summary: 'Applying incremental migrations to production replica.',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.TOOL_EXECUTING,
    title: 'Tool: prisma_migrate',
    summary: 'Executing migration 20261030_user_preferences',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.VALIDATION_FAILED,
    title: 'Migration Lock Acquisition Failure',
    error: {
      message: 'Deadlock detected: transaction waiting for ExclusiveLock on relation "users"',
      code: 'PG_ERR_DEADLOCK',
      suggestion: 'Retry migration with exponential backoff or terminate blocking query PID 4129',
      stack: [
        'DatabaseError: Deadlock detected',
        '    at Query.handleError (node_modules/pg/lib/query.js:142:12)',
        '    at Connection.parseE (node_modules/pg/lib/connection.js:612:15)',
        '    at Connection.parseMessage (node_modules/pg/lib/connection.js:413:19)',
        '    at Socket.<anonymous> (node_modules/pg/lib/connection.js:129:22)',
      ].join('\n'),
    },
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.RETRY_STARTED,
    title: 'Retrying Migration Pipeline',
    attempt: 1,
    maxAttempts: 3,
    summary: 'Backing off 500ms before retrying transaction.',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.APPROVAL_REQUIRED,
    title: 'Manual DB Lock Clearance Gate',
    summary: 'Awaiting operator sign-off to terminate blocking query PID 4129.',
    evidence: { blockingPid: 4129, query: 'SELECT * FROM users FOR UPDATE', duration: '45s' },
    nextAction: 'Operator must approve killing PID 4129 before retry 2',
  }));

  events.push(createActivityEvent({
    eventType: EVENT_TYPES.OPERATION_BLOCKED,
    title: 'Migration Halted Awaiting Lock Clearance',
    error: {
      message: 'Lock contention unresolved',
      suggestion: 'Run "SELECT pg_terminate_backend(4129);" to unblock',
    },
  }));

  return events;
}

// ── Benchmark Execution ───────────────────────────────────────────────────────

function runBenchmark() {
  console.log('================================================================');
  console.log(' Tribunal-Kit Activity Engine — Phase 10 Output Optimization');
  console.log(' Baseline vs Progressive Disclosure Comparative Benchmark');
  console.log('================================================================\n');

  const workloads = {
    testExecution: { name: 'Workload 1: Test Execution', events: createTestExecutionWorkload() },
    securityAudit: { name: 'Workload 2: Security Audit (Large Evidence)', events: createSecurityAuditWorkload() },
    failureRecovery: { name: 'Workload 3: Failure & Retry Recovery', events: createFailureRecoveryWorkload() },
  };

  const results = {};

  for (const [key, wl] of Object.entries(workloads)) {
    console.log(`=== ${wl.name} (${wl.events.length} emitted events) ===`);

    // 1. Unfiltered Baseline Stream (Phase 9 equivalent)
    let baselineBytes = 0;
    let baselineLines = 0;
    const baselineOutputs = [];

    const startBaseline = process.hrtime.bigint();
    for (const ev of wl.events) {
      const out = renderMarkdown(ev);
      baselineOutputs.push(out);
      baselineBytes += Buffer.byteLength(out, 'utf8');
      baselineLines += out.split('\n').length;
    }
    const endBaseline = process.hrtime.bigint();
    const baselineLatencyMs = Number(endBaseline - startBaseline) / 1e6;

    // 2. Phase 10 Essential Mode (Filtered & Bounded)
    let essentialBytes = 0;
    let essentialLines = 0;
    let essentialMsgCount = 0;
    const essentialOutputs = [];

    const startEssential = process.hrtime.bigint();
    for (const ev of wl.events) {
      const check = shouldDisplayEvent(ev, DETAIL_LEVELS.ESSENTIAL);
      if (check.visible) {
        const out = renderMarkdown(ev, { detailLevel: DETAIL_LEVELS.ESSENTIAL });
        essentialOutputs.push(out);
        essentialBytes += Buffer.byteLength(out, 'utf8');
        essentialLines += out.split('\n').length;
        essentialMsgCount++;
      }
    }
    const endEssential = process.hrtime.bigint();
    const essentialLatencyMs = Number(endEssential - startEssential) / 1e6;

    // 3. Phase 10 Expanded Mode
    let expandedBytes = 0;
    let expandedLines = 0;
    let expandedMsgCount = 0;

    for (const ev of wl.events) {
      const check = shouldDisplayEvent(ev, DETAIL_LEVELS.EXPANDED);
      if (check.visible) {
        const out = renderMarkdown(ev, { detailLevel: DETAIL_LEVELS.EXPANDED });
        expandedBytes += Buffer.byteLength(out, 'utf8');
        expandedLines += out.split('\n').length;
        expandedMsgCount++;
      }
    }

    // 4. Phase 10 Diagnostic Mode
    let diagBytes = 0;
    let diagLines = 0;

    for (const ev of wl.events) {
      const out = renderMarkdown(ev, { detailLevel: DETAIL_LEVELS.DIAGNOSTIC });
      diagBytes += Buffer.byteLength(out, 'utf8');
      diagLines += out.split('\n').length;
    }

    // 5. Completion Summary
    const summaryCard = formatCompletionSummary({
      title: wl.name,
      status: key === 'failureRecovery' ? STATUSES.FAILED : STATUSES.COMPLETED,
      durationMs: 1250,
      attempted: ['Pipeline execution'],
      succeeded: key !== 'failureRecovery' ? ['All invariants verified'] : [],
      failed: key === 'failureRecovery' ? ['Deadlock detected: transaction waiting for ExclusiveLock'] : [],
      verified: key !== 'failureRecovery' ? ['Checksums valid'] : [],
      diagnosticsRef: `op-${key}-001`,
    });
    const summaryBytes = Buffer.byteLength(summaryCard, 'utf8');

    // Reductions
    const byteReductionPct = Math.round(((baselineBytes - essentialBytes) / baselineBytes) * 100);
    const lineReductionPct = Math.round(((baselineLines - essentialLines) / baselineLines) * 100);
    const msgReductionPct = Math.round(((wl.events.length - essentialMsgCount) / wl.events.length) * 100);

    console.log(`  Emitted Events:             ${wl.events.length}`);
    console.log(`  Baseline Total Bytes:       ${baselineBytes} bytes (${estimateTokens(baselineOutputs.join('\n'))} tokens, ${baselineLines} lines)`);
    console.log(`  Essential Mode Visible:     ${essentialBytes} bytes (${estimateTokens(essentialOutputs.join('\n'))} tokens, ${essentialLines} lines, ${essentialMsgCount} msgs)`);
    console.log(`  Expanded Mode Visible:      ${expandedBytes} bytes (${expandedLines} lines, ${expandedMsgCount} msgs)`);
    console.log(`  Diagnostic Mode Visible:    ${diagBytes} bytes (${diagLines} lines)`);
    console.log(`  Completion Summary Card:    ${summaryBytes} bytes (${summaryCard.split('\n').length} lines)`);
    console.log(`  OUTPUT REDUCTION:           ${byteReductionPct}% byte reduction · ${lineReductionPct}% line reduction · ${msgReductionPct}% message reduction`);
    console.log(`  Baseline Render Latency:    ${baselineLatencyMs.toFixed(3)} ms (${(baselineLatencyMs / wl.events.length).toFixed(4)} ms/event)`);
    console.log(`  Essential Render Latency:   ${essentialLatencyMs.toFixed(3)} ms\n`);

    results[key] = {
      name: wl.name,
      eventsEmitted: wl.events.length,
      baselineBytes,
      baselineLines,
      essentialBytes,
      essentialLines,
      essentialMsgCount,
      expandedBytes,
      diagBytes,
      summaryBytes,
      byteReductionPct,
      lineReductionPct,
      msgReductionPct,
      baselineLatencyMs,
      essentialLatencyMs,
    };
  }

  // Latency & High-Frequency Throughput Benchmark
  const BENCH_ROUNDS = 25000;
  const sampleEvent = workloads.testExecution.events[0];
  const startThroughput = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderMarkdown(sampleEvent, { detailLevel: DETAIL_LEVELS.ESSENTIAL });
  }
  const endThroughput = process.hrtime.bigint();
  const throughputSec = Number(endThroughput - startThroughput) / 1e9;
  const throughputOps = Math.round(BENCH_ROUNDS / throughputSec);

  console.log(`=== Throughput & Engine Performance ===`);
  console.log(`  Iterations:                 ${BENCH_ROUNDS.toLocaleString()}`);
  console.log(`  Total Time:                 ${throughputSec.toFixed(3)} s`);
  console.log(`  Throughput:                 ${throughputOps.toLocaleString()} renders/sec\n`);

  results.throughput = {
    rounds: BENCH_ROUNDS,
    durationSec: throughputSec,
    opsPerSec: throughputOps,
  };

  return results;
}

if (require.main === module) {
  runBenchmark();
  console.log('Comparative benchmark completed successfully.');
}

module.exports = {
  runBenchmark,
  createTestExecutionWorkload,
  createSecurityAuditWorkload,
  createFailureRecoveryWorkload,
};

