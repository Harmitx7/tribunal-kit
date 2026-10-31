'use strict';

/**
 * codebase_intelligence_diagnostics.test.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Phase 10: Observability, Diagnostics & Failure-Recovery Certification
 *
 * Verifies:
 *   1. Canonical Error Classification (INVALID_INPUT, UNSUPPORTED_OPERATION, ACCESS_DENIED, etc.)
 *   2. Structured Diagnostic Records (code, severity, message, component, recoverable, suggested_action)
 *   3. Secret Redaction Across All Diagnostic Channels (summary, diagnostics, error data, markdown)
 *   4. Partial Results & Non-Fatal Diagnostic Warnings (unresolved dependencies, oversized modules)
 *   5. CLI and MCP Failure Consistency & Error Codes
 *   6. Recovery, Retry Safety & Zero-Mutation Invariant Under Failure
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  classifyError,
  createResultEnvelope,
} = require('../../.agent/scripts/codebase_intelligence');
const { handleRequest } = require('../../bin/mcp-server');

const REPO_ROOT = path.resolve(__dirname, '../..');

describe('Phase 10: Observability, Diagnostics & Failure-Recovery Certification', () => {

  // ── 1. CANONICAL ERROR CLASSIFICATION ───────────────────────────────────────
  test('D1: classifyError maps diverse exceptions into standard error categories', () => {
    // 1. Unsupported operation
    const e1 = classifyError(new Error('Unknown codebase intelligence subcommand: "foo"'), 'foo');
    expect(e1.code).toBe('UNSUPPORTED_OPERATION');
    expect(e1.severity).toBe('ERROR');
    expect(e1.recoverable).toBe(true);
    expect(e1.suggested_action).toContain('Choose one of:');

    // 2. Invalid input / missing target
    const e2 = classifyError(new Error('Trace command requires a target route, feature, or symbol name'), 'trace');
    expect(e2.code).toBe('INVALID_INPUT');
    expect(e2.severity).toBe('ERROR');
    expect(e2.recoverable).toBe(true);

    // 3. Access denied / path traversal
    const e3 = classifyError(new Error('Security Violation: Path traversal detected outside root'), 'overview', '../../etc/passwd');
    expect(e3.code).toBe('ACCESS_DENIED');
    expect(e3.severity).toBe('ERROR');
    expect(e3.recoverable).toBe(false);

    // 4. Resource limit exceeded
    const e4 = classifyError(new Error('Maxfiles resource limit reached'), 'overview');
    expect(e4.code).toBe('RESOURCE_LIMIT_EXCEEDED');
    expect(e4.severity).toBe('ERROR');

    // 5. Configuration error
    const e5 = classifyError(new Error('Malformed package.json manifest in repository'), 'overview');
    expect(e5.code).toBe('CONFIGURATION_ERROR');
    expect(e5.severity).toBe('ERROR');

    // 6. Internal error (fallback)
    const e6 = classifyError(new Error('Unexpected memory fault'), 'prepare');
    expect(e6.code).toBe('INTERNAL_ERROR');
    expect(e6.severity).toBe('ERROR');
  });

  // ── 2. STRUCTURED DIAGNOSTICS IN ERROR ENVELOPES ────────────────────────────
  test('D2: Failed operations return schema 2.0.0 envelopes with structured diagnostics array', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'invalid_op_test',
      repoRoot: REPO_ROOT,
    });

    const envelope = res.data;
    expect(envelope.schema_version).toBe('2.0.0');
    expect(envelope.status).toBe('UNSUPPORTED');
    expect(envelope.data.error).toBeDefined();
    expect(envelope.data.error_code).toBe('UNSUPPORTED_OPERATION');

    // Structured Diagnostics verification
    expect(Array.isArray(envelope.diagnostics)).toBe(true);
    expect(envelope.diagnostics.length).toBeGreaterThan(0);

    const diag = envelope.diagnostics[0];
    expect(diag.code).toBe('UNSUPPORTED_OPERATION');
    expect(diag.severity).toBe('ERROR');
    expect(typeof diag.message).toBe('string');
    expect(diag.component).toBe('codebase_intelligence');
    expect(diag.recoverable).toBe(true);
    expect(typeof diag.suggested_action).toBe('string');

    // Completeness reflects failure
    expect(envelope.completeness.is_complete).toBe(false);
    expect(envelope.completeness.percentage).toBe(0);
  });

  // ── 3. SECRET REDACTION IN DIAGNOSTICS & ERROR CHANNELS ─────────────────────
  test('D3: Synthetic credentials in error triggers are thoroughly redacted across all diagnostics', async () => {
    const sensitiveQuery = 'trace password = "SecretPassword!999" in route eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';

    const res = await runCodebaseIntelligence({
      subcommand: 'unsupported_secret_cmd',
      target: sensitiveQuery,
      repoRoot: REPO_ROOT,
    });

    const env = res.data;

    // 1. Target redacted
    expect(env.target).not.toContain('SecretPassword!999');
    expect(env.target).toContain('[REDACTED_SECRET]');

    // 2. Summary redacted
    expect(env.summary).not.toContain('SecretPassword!999');

    // 3. Diagnostics message and source reference redacted
    for (const d of env.diagnostics) {
      expect(d.message).not.toContain('SecretPassword!999');
      if (d.source_reference) {
        expect(d.source_reference).not.toContain('SecretPassword!999');
        expect(d.source_reference).toContain('[REDACTED_SECRET]');
      }
    }

    // 4. Markdown output redacted
    expect(res.markdown).not.toContain('SecretPassword!999');
    expect(res.markdown).toContain('[REDACTED_SECRET]');
  });

  // ── 4. PARTIAL RESULTS & NON-FATAL WARNING DIAGNOSTICS ──────────────────────
  test('D4: Unresolved dependencies emit non-fatal WARNING diagnostics while preserving analysis', async () => {
    // Run overview on fixture app that has undeclared imports
    const fixtureApp = path.join(REPO_ROOT, 'test/fixtures/codebase_intelligence/fixture_app');

    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: fixtureApp,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.evidence_records.length).toBeGreaterThan(0);

    // If missing dependencies are detected, they must be formatted as WARNING diagnostics
    if (res.data.missingDependencies && res.data.missingDependencies.length > 0) {
      const warnDiags = res.data.diagnostics.filter(d => d.severity === 'WARNING');
      expect(warnDiags.length).toBeGreaterThan(0);
      expect(warnDiags[0].code).toBe('DEPENDENCY_UNRESOLVED');
      expect(warnDiags[0].suggested_action).toContain('npm install');
    }
  });

  // ── 5. CLI AND MCP FAILURE CONSISTENCY ──────────────────────────────────────
  test('D5: CLI and MCP return consistent error codes and diagnostic structure on invalid operation', async () => {
    // 1. MCP Call
    const mcpRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-diag-test',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'unknown_operation_xyz',
          json: true,
        },
      },
    });

    expect(mcpRes.isError).toBe(true);
    const mcpEnvelope = JSON.parse(mcpRes.content[0].text);
    expect(mcpEnvelope.status).toBe('UNSUPPORTED');
    expect(mcpEnvelope.data.error_code).toBe('UNSUPPORTED_OPERATION');
    expect(mcpEnvelope.diagnostics[0].code).toBe('UNSUPPORTED_OPERATION');

    // 2. Direct programmatic gateway call
    const cliRes = await runCodebaseIntelligence({
      subcommand: 'unknown_operation_xyz',
      repoRoot: REPO_ROOT,
    });

    expect(cliRes.status).toBe('UNSUPPORTED');
    expect(cliRes.data.status).toBe(mcpEnvelope.status);
    expect(cliRes.data.data.error_code).toBe(mcpEnvelope.data.error_code);
    expect(cliRes.data.diagnostics[0].code).toBe(mcpEnvelope.diagnostics[0].code);
  });

  // ── 6. RECOVERY & ZERO-MUTATION UNDER FAILURE ───────────────────────────────
  test('D6: Repeated failed invocations cause zero filesystem mutations or persistent state pollution', async () => {
    const beforeFiles = new Set(fs.readdirSync(REPO_ROOT));

    // Execute 5 rapid failing operations with varied invalid parameters
    const failureScenarios = [
      { subcommand: 'foo_bar_bad' },
      { subcommand: 'trace', target: '' },
      { subcommand: 'dependencies', target: 'non_existent_file_xyz.js' },
      { subcommand: 'impact', target: 'missing_symbol_xyz' },
      { subcommand: 'unsupported_xyz_123' },
    ];

    for (const sc of failureScenarios) {
      await runCodebaseIntelligence({
        ...sc,
        repoRoot: REPO_ROOT,
      });
    }

    const afterFiles = new Set(fs.readdirSync(REPO_ROOT));
    expect(afterFiles.size).toBe(beforeFiles.size);
    for (const f of beforeFiles) {
      expect(afterFiles.has(f)).toBe(true);
    }
  });

});
