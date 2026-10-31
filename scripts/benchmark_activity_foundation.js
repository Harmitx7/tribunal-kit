'use strict';

/**
 * Benchmark Activity Presentation Foundation (Phase 1)
 *
 * Measures throughput, execution latency, and token footprint
 * for contract creation, validation, secret redaction, and all 4 renderers.
 */

const {
  createActivityEvent,
  validateActivityEvent,
  sanitizeActivityEvent,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
  EVENT_TYPES,
  STATUSES,
} = require('../src/activity');

function runBenchmark() {
  const iterations = 5000;
  console.log(`\n=== Tribunal-Kit Phase 1 Activity Benchmark (${iterations} iterations) ===\n`);

  const sampleEvent = createActivityEvent({
    eventType: EVENT_TYPES.TESTS_RUNNING,
    title: 'Phase 14 Baseline Verification',
    summary: 'Running 12 Codebase Intelligence test suites across unit and integration targets.',
    progress: { current: 8, total: 12, unit: 'suites', isAuthoritative: true },
    nextAction: 'Capture baseline counts and exit codes',
  });

  // 1. Validation Benchmark
  let t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    validateActivityEvent(sampleEvent);
  }
  let elapsedNs = process.hrtime.bigint() - t0;
  let elapsedMs = Number(elapsedNs) / 1e6;
  let perOpUs = (elapsedMs / iterations) * 1000;
  let opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[Validation]           ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 2. Secret Redaction Benchmark
  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    sanitizeActivityEvent(sampleEvent);
  }
  elapsedNs = process.hrtime.bigint() - t0;
  elapsedMs = Number(elapsedNs) / 1e6;
  perOpUs = (elapsedMs / iterations) * 1000;
  opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[Secret Redaction]     ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 3. MarkdownRenderer Benchmark
  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    renderMarkdown(sampleEvent);
  }
  elapsedNs = process.hrtime.bigint() - t0;
  elapsedMs = Number(elapsedNs) / 1e6;
  perOpUs = (elapsedMs / iterations) * 1000;
  opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[MarkdownRenderer]     ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 4. TerminalRenderer Benchmark
  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    renderTerminal(sampleEvent, { noColor: true });
  }
  elapsedNs = process.hrtime.bigint() - t0;
  elapsedMs = Number(elapsedNs) / 1e6;
  perOpUs = (elapsedMs / iterations) * 1000;
  opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[TerminalRenderer]     ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 5. PlainTextRenderer Benchmark
  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    renderPlainText(sampleEvent);
  }
  elapsedNs = process.hrtime.bigint() - t0;
  elapsedMs = Number(elapsedNs) / 1e6;
  perOpUs = (elapsedMs / iterations) * 1000;
  opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[PlainTextRenderer]    ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 6. StructuredRenderer Benchmark
  t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    renderStructured(sampleEvent, { pretty: false });
  }
  elapsedNs = process.hrtime.bigint() - t0;
  elapsedMs = Number(elapsedNs) / 1e6;
  perOpUs = (elapsedMs / iterations) * 1000;
  opsSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(`[StructuredRenderer]   ${elapsedMs.toFixed(2)} ms total | ${perOpUs.toFixed(2)} µs/op | ${opsSec.toLocaleString()} ops/sec`);

  // 7. Token and Payload Footprint
  const mdOutput = renderMarkdown(sampleEvent);
  const plainOutput = renderPlainText(sampleEvent);
  const jsonOutput = renderStructured(sampleEvent, { pretty: false });

  console.log('\n--- Output Footprint ---');
  console.log(`Markdown Output:   ${mdOutput.length} chars (~${Math.ceil(mdOutput.length / 4)} tokens)`);
  console.log(`PlainText Output:  ${plainOutput.length} chars (~${Math.ceil(plainOutput.length / 4)} tokens)`);
  console.log(`JSON Output:       ${jsonOutput.length} chars (~${Math.ceil(jsonOutput.length / 4)} tokens)`);
  console.log('\nBenchmark completed successfully.\n');
}

runBenchmark();

