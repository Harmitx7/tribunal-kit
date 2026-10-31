'use strict';

/**
 * Phase 3 Benchmark: AI Chat Presentation & Visual Design System
 *
 * Measures:
 * 1. MarkdownRenderer throughput across rendering modes (default, compact, progressive disclosure)
 * 2. Multi-renderer comparison (Markdown, Terminal, PlainText, Structured)
 * 3. Output character size & token footprint comparisons
 * 4. Token savings achieved via progressive disclosure and compact mode
 */

const {
  EVENT_TYPES,
  createActivityEvent,
  renderMarkdown,
  renderTerminal,
  renderPlainText,
  renderStructured,
} = require('../src/activity');

function estimateTokens(text) {
  // Common heuristic for code/markdown LLM tokenization: ~4 chars per token
  return Math.ceil(text.length / 4);
}

function runBenchmark() {
  console.log('================================================================');
  console.log(' Tribunal-Kit Activity Engine — Phase 3 Presentation Benchmark');
  console.log('================================================================\n');

  const SAMPLE_EVENTS = {
    skill: createActivityEvent({
      eventType: EVENT_TYPES.SKILL_ACTIVATED,
      skill: 'error-resilience',
      domain: 'System Reliability & Fault Tolerance',
      summary: 'Applying bulkhead isolation and exponential retry backoff.',
    }),
    tool: createActivityEvent({
      eventType: EVENT_TYPES.TOOL_EXECUTING,
      title: 'Tool: ast_parser',
      summary: 'Extracting export symbols and call graphs.',
      progress: { current: 4, total: 10, unit: 'files', isAuthoritative: true },
    }),
    passed: createActivityEvent({
      eventType: EVENT_TYPES.VALIDATION_PASSED,
      title: 'Schema Conformance Verification',
      evidence: { violations: 0, checkedTables: 14, constraints: '100% valid' },
      nextAction: 'Proceed to migration execution',
      reportReferences: ['reports/schema_valid.json'],
    }),
    failedWithStack: createActivityEvent({
      eventType: EVENT_TYPES.VALIDATION_FAILED,
      title: 'AST Syntax Validation',
      error: {
        message: 'Unexpected token "export" in CJS context',
        code: 'ERR_SYNTAX',
        suggestion: 'Set "type": "module" in package.json or use module.exports',
        stack: [
          'SyntaxError: Unexpected token "export"',
          '    at compileSourceTextModule (node:internal/modules/esm/utils:346:16)',
          '    at ModuleLoader.createModuleWrap (node:internal/modules/esm/loader:266:12)',
          '    at node:internal/process/execution:317:29',
          '    at asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:11)',
        ].join('\n'),
      },
    }),
    completed: createActivityEvent({
      eventType: EVENT_TYPES.OPERATION_COMPLETED,
      title: 'Full Security Audit Pipeline',
      summary: 'Analyzed 128 routes across 14 modules with zero critical vulnerabilities.',
      reportReferences: ['reports/owasp_audit.json', 'reports/sbom.json'],
    }),
  };

  const BENCH_ROUNDS = 25000;

  // 1. MarkdownRenderer Throughput
  const startMd = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderMarkdown(SAMPLE_EVENTS.passed);
  }
  const endMd = process.hrtime.bigint();
  const mdSec = Number(endMd - startMd) / 1e9;
  const mdOps = Math.round(BENCH_ROUNDS / mdSec);

  // 2. Compact Mode Throughput
  const startCompact = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderMarkdown(SAMPLE_EVENTS.tool, { compact: true });
  }
  const endCompact = process.hrtime.bigint();
  const compactSec = Number(endCompact - startCompact) / 1e9;
  const compactOps = Math.round(BENCH_ROUNDS / compactSec);

  // 3. Multi-Renderer Throughput Comparison
  const startTerm = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderTerminal(SAMPLE_EVENTS.passed, { noColor: true });
  }
  const endTerm = process.hrtime.bigint();
  const termSec = Number(endTerm - startTerm) / 1e9;
  const termOps = Math.round(BENCH_ROUNDS / termSec);

  const startPlain = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderPlainText(SAMPLE_EVENTS.passed);
  }
  const endPlain = process.hrtime.bigint();
  const plainSec = Number(endPlain - startPlain) / 1e9;
  const plainOps = Math.round(BENCH_ROUNDS / plainSec);

  const startStruct = process.hrtime.bigint();
  for (let i = 0; i < BENCH_ROUNDS; i++) {
    renderStructured(SAMPLE_EVENTS.passed, { pretty: false });
  }
  const endStruct = process.hrtime.bigint();
  const structSec = Number(endStruct - startStruct) / 1e9;
  const structOps = Math.round(BENCH_ROUNDS / structSec);

  console.log(`[1] Renderer Throughput (25,000 iterations each):`);
  console.log(`    Markdown (Rich Mode):     ${mdOps.toLocaleString()} ops/sec (${(mdSec * 1000).toFixed(2)} ms)`);
  console.log(`    Markdown (Compact Mode):  ${compactOps.toLocaleString()} ops/sec (${(compactSec * 1000).toFixed(2)} ms)`);
  console.log(`    Terminal (No-Color TTY):  ${termOps.toLocaleString()} ops/sec (${(termSec * 1000).toFixed(2)} ms)`);
  console.log(`    PlainText (Clean ASCII):  ${plainOps.toLocaleString()} ops/sec (${(plainSec * 1000).toFixed(2)} ms)`);
  console.log(`    Structured JSON:          ${structOps.toLocaleString()} ops/sec (${(structSec * 1000).toFixed(2)} ms)\n`);

  console.log(`[2] Output Character Size & Estimated Token Footprint:`);
  console.log('----------------------------------------------------------------');
  console.log(String('Event Type').padEnd(20) + String('Chars').padEnd(10) + String('Est. Tokens').padEnd(15) + 'Preview');
  console.log('----------------------------------------------------------------');

  for (const [key, ev] of Object.entries(SAMPLE_EVENTS)) {
    const rendered = renderMarkdown(ev);
    const chars = rendered.length;
    const tokens = estimateTokens(rendered);
    const firstLine = rendered.split('\n')[0];
    console.log(String(key).padEnd(20) + String(chars).padEnd(10) + String(tokens).padEnd(15) + firstLine);
  }

  // 4. Compact vs Rich Comparison
  const richTool = renderMarkdown(SAMPLE_EVENTS.tool, { compact: false });
  const compactTool = renderMarkdown(SAMPLE_EVENTS.tool, { compact: true });
  console.log('\n[3] Information Density Optimization (Compact vs Rich):');
  console.log(`    Rich Mode Tool Execution:    ${richTool.length} chars (~${estimateTokens(richTool)} tokens) across 3 lines`);
  console.log(`    Compact Mode Tool Execution: ${compactTool.length} chars (~${estimateTokens(compactTool)} tokens) in 1 line`);
  console.log(`    Token reduction:             ${Math.round((1 - compactTool.length / richTool.length) * 100)}% savings for rapid status ticks`);

  console.log('\n================================================================');
  console.log(' Benchmark Completed Successfully');
  console.log('================================================================');
}

runBenchmark();

