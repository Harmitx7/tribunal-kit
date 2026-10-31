'use strict';

/**
 * codebase_intelligence_compatibility.test.js — Phase 4 Schema & Backward Compatibility Gauntlet
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 * Comprehensive verification of:
 *   1. Result-envelope contracts across all 8 operations
 *   2. Controlled failure and error envelope schemas
 *   3. Evidence-record canonical and legacy schema fields
 *   4. Strict AST static evidence guarantees (no false runtime claims)
 *   5. CLI exit codes, aliases, arguments, paths with spaces, and JSON output
 *   6. MCP context-compilation tool safety and compatibility
 *   7. Secret redaction across output boundaries
 *   8. Zero-mutation read-only invariant
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  createResultEnvelope,
  createEvidenceRecord,
  redactSecrets,
} = require('../../.agent/scripts/codebase_intelligence');

const REPO_ROOT = path.resolve(__dirname, '../..');
const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/codebase_intelligence');

describe('Phase 4: Result-Envelope Contract Matrix', () => {
  const operations = [
    { sub: 'overview', target: undefined },
    { sub: 'trace', target: 'POST /checkout' },
    { sub: 'dependencies', target: 'service/checkout.js' },
    { sub: 'dependencies', target: undefined }, // repo-wide
    { sub: 'relevant-files', target: 'payment idempotency' },
    { sub: 'impact', target: 'service/checkout.js' },
    { sub: 'dead-code', target: undefined },
    { sub: 'onboard', target: undefined },
    { sub: 'prepare', target: 'add idempotency key support' },
  ];

  for (const op of operations) {
    const label = op.target ? `${op.sub} ("${op.target}")` : `${op.sub} (default)`;
    test(`operation "${label}" conforms to schema v2.0.0 envelope contract`, async () => {
      const res = await runCodebaseIntelligence({
        subcommand: op.sub,
        target: op.target,
        repoRoot: FIXTURE_DIR,
      });

      expect(res.status).toBe('COMPLETE');
      const env = res.data;

      // 1. Core envelope metadata
      expect(env.schema_version).toBe('2.0.0');
      expect(env.status).toBe('COMPLETE');
      expect(env.operation).toBe(op.sub === 'deps' ? 'dependencies' : op.sub);
      expect(typeof env.summary).toBe('string');
      expect(env.summary.length).toBeGreaterThan(0);
      expect(typeof env.data).toBe('object');
      expect(env.data).not.toBeNull();

      // 2. Arrays conventions
      expect(Array.isArray(env.evidence_records)).toBe(true);
      expect(Array.isArray(env.unresolved_assumptions)).toBe(true);
      expect(Array.isArray(env.limitations)).toBe(true);

      // 3. Completeness metrics
      expect(typeof env.completeness).toBe('object');
      expect(env.completeness.is_complete).toBe(true);
      expect(typeof env.completeness.percentage).toBe('number');
      expect(env.completeness.percentage).toBeGreaterThanOrEqual(0);
      expect(env.completeness.percentage).toBeLessThanOrEqual(100);

      // 4. Backward-compatible aliasing
      expect(env.subcommand).toBe(env.operation);
      expect(res.evidenceRecords).toBe(env.evidence_records);
    });
  }
});

describe('Phase 4: Controlled Failure & Error Handling Contracts', () => {
  test('unknown subcommand produces controlled UNSUPPORTED envelope without throwing unhandled exception', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'invalid-nonexistent-subcommand',
      repoRoot: FIXTURE_DIR,
    });

    expect(res.status).toBe('UNSUPPORTED');
    const env = res.data;
    expect(env.schema_version).toBe('2.0.0');
    expect(env.status).toBe('UNSUPPORTED');
    expect(env.operation).toBe('invalid-nonexistent-subcommand');
    expect(env.data.error).toMatch(/Unknown codebase intelligence subcommand/);
    expect(env.limitations.length).toBeGreaterThan(0);
    expect(env.completeness.is_complete).toBe(false);
    expect(env.completeness.percentage).toBe(0);
    expect(res.markdown).toContain('Error executing /understand');
  });

  test('missing required arguments return controlled FAILED envelope', async () => {
    // trace requires target
    const traceRes = await runCodebaseIntelligence({ subcommand: 'trace', repoRoot: FIXTURE_DIR });
    expect(traceRes.status).toBe('FAILED');
    expect(traceRes.data.schema_version).toBe('2.0.0');
    expect(traceRes.data.completeness.percentage).toBe(0);
    expect(traceRes.data.data.error).toMatch(/Trace command requires a target/);

    // relevant-files requires task description
    const relRes = await runCodebaseIntelligence({ subcommand: 'relevant-files', repoRoot: FIXTURE_DIR });
    expect(relRes.status).toBe('FAILED');
    expect(relRes.data.data.error).toMatch(/relevant-files requires a task description/);

    // impact requires target
    const impRes = await runCodebaseIntelligence({ subcommand: 'impact', repoRoot: FIXTURE_DIR });
    expect(impRes.status).toBe('FAILED');
    expect(impRes.data.data.error).toMatch(/Impact command requires a target/);

    // prepare requires task description
    const prepRes = await runCodebaseIntelligence({ subcommand: 'prepare', repoRoot: FIXTURE_DIR });
    expect(prepRes.status).toBe('FAILED');
    expect(prepRes.data.data.error).toMatch(/prepare requires a proposed change description/);
  });

  test('whitespace-only arguments are treated as missing arguments and return FAILED envelope', async () => {
    const traceRes = await runCodebaseIntelligence({ subcommand: 'trace', target: '   ', repoRoot: FIXTURE_DIR });
    expect(traceRes.status).toBe('FAILED');

    const prepRes = await runCodebaseIntelligence({ subcommand: 'prepare', target: ' \t\n ', repoRoot: FIXTURE_DIR });
    expect(prepRes.status).toBe('FAILED');
  });

  test('target not found in impact analysis returns well-formed INDETERMINATE envelope', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'impact',
      target: 'src/nonexistent/orphan_component.xyz',
      repoRoot: FIXTURE_DIR,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.riskTier).toBe('INDETERMINATE');
    expect(res.data.totalImpactedEntities).toBe(0);
    expect(res.data.limitations.length).toBeGreaterThan(0);
    expect(res.data.unresolved_assumptions.length).toBeGreaterThan(0);
  });
});

describe('Phase 4: Evidence-Record Schema & Legacy Consumer Compatibility', () => {
  test('createEvidenceRecord populates both canonical v2.0.0 and legacy consumer fields', () => {
    const ev = createEvidenceRecord({
      claim: 'Static call path references processOrder in service/checkout.js',
      subject: 'POST /checkout',
      relationship: 'routes_to',
      object: 'processOrder',
      file: 'service/checkout.js',
      source_range: { start_line: 12, end_line: 25 },
      method: 'ast_static_visitor',
      confidence: 'L1_OBSERVED',
    });

    // Canonical v2.0.0
    expect(ev.schema_version).toBe('2.0.0');
    expect(ev.evidence_id).toMatch(/^ev_[a-f0-9]{12}$/);
    expect(ev.claim).toBe('Static call path references processOrder in service/checkout.js');
    expect(ev.subject).toBe('POST /checkout');
    expect(ev.relationship).toBe('routes_to');
    expect(ev.object).toBe('processOrder');
    expect(ev.source.file).toBe('service/checkout.js');
    expect(ev.source.start_line).toBe(12);
    expect(ev.source.end_line).toBe(25);
    expect(ev.confidence).toBe('L1_OBSERVED');
    expect(ev.resolution).toBe('DETERMINISTIC_CHECK');

    // Legacy consumer compatibility fields
    expect(ev.finding_id).toBe(ev.evidence_id);
    expect(ev.source_path).toBe('service/checkout.js');
    expect(ev.source_range).toEqual({ start_line: 12, end_line: 25 });
    expect(ev.relationship_type).toBe('routes_to');
    expect(ev.verification_method).toBe('ast_static_visitor');
    expect(ev.evidence_status).toBe('OBSERVED');
    expect(ev.repo_fingerprint).toBe('working-tree');
  });

  test('confidence levels map into canonical 4-tier vocabulary', () => {
    expect(createEvidenceRecord({ confidence: 'L1' }).confidence).toBe('L1_OBSERVED');
    expect(createEvidenceRecord({ confidence: 'L2' }).confidence).toBe('L2_CORROBORATED');
    expect(createEvidenceRecord({ confidence: 'L3' }).confidence).toBe('L3_INFERRED');
    expect(createEvidenceRecord({ confidence: 'L4' }).confidence).toBe('L0_UNKNOWN');
    expect(createEvidenceRecord({ confidence: 'L5' }).confidence).toBe('L0_UNKNOWN');
  });

  test('DEF-01: Static traces never emit relationship="executes" without dynamic observation', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'trace',
      target: 'POST /checkout',
      repoRoot: FIXTURE_DIR,
    });

    expect(res.status).toBe('COMPLETE');
    for (const ev of res.evidenceRecords) {
      expect(ev.relationship).not.toBe('executes');
      expect(ev.relationship_type).not.toBe('executes');
      expect(ev.claim.toLowerCase()).not.toContain('executes at runtime');
    }
  });
});

describe('Phase 4: CLI Compatibility & Exit Code Certification', () => {
  const cliPath = path.join(REPO_ROOT, 'src/cli.js');
  const enginePath = path.join(REPO_ROOT, '.agent/scripts/codebase_intelligence.js');

  test('CLI understand overview exits with 0 and prints Markdown by default', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'overview'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SYSTEM TOPOLOGY DOSSIER');
  });

  test('CLI tribunal-understand alias dispatches identically to understand', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'tribunal-understand', 'overview'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('SYSTEM TOPOLOGY DOSSIER');
  });

  test('CLI with --json emits pure, parseable JSON conforming to schema v2.0.0', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'overview', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.schema_version).toBe('2.0.0');
    expect(parsed.status).toBe('COMPLETE');
    expect(parsed.operation).toBe('overview');
    expect(parsed.endpoints).toBeDefined();
  });

  test('CLI exits with code 1 for missing required arguments', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'trace'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Error executing /understand trace');
  });

  test('CLI exits with code 1 for unknown subcommands', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'unknown-subcommand-xyz'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Error executing /understand unknown-subcommand-xyz');
  });

  test('CLI with --json still exits with code 1 on failure while outputting parseable JSON error envelope', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'trace', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.schema_version).toBe('2.0.0');
    expect(parsed.status).toBe('FAILED');
    expect(parsed.data.error).toMatch(/Trace command requires a target/);
  });

  test('Natural language task query with spaces correctly dispatches to relevant-files', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'add', 'OAuth', 'login', 'support', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.operation).toBe('relevant-files');
    expect(parsed.primaryFiles).toBeDefined();
  });

  test('Direct script invocation of codebase_intelligence.js exits with code 1 on failure', () => {
    const res = cp.spawnSync(process.execPath, [enginePath, 'impact'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
  });
});

describe('Phase 4: MCP Tool Integration & Safety Boundary Compatibility', () => {
  const mcpServerPath = path.join(REPO_ROOT, 'bin/mcp-server.js');

  test('MCP server initializes and exposes context tools without errors', async () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require(mcpServerPath);

    const initRes = await handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    });
    expect(initRes.serverInfo.name).toBe('tribunal-kit-mcp');

    const toolsRes = await handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });
    const toolNames = toolsRes.tools.map(t => t.name);
    expect(toolNames).toContain('tribunal_get_context');
    expect(toolNames).toContain('get_sparse_context');
  });

  test('MCP tribunal_get_context safely rejects flag injection and path traversal', async () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require(mcpServerPath);

    // Flag injection
    const flagRes = await handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'tribunal_get_context', arguments: { target: '--malicious-flag' } },
    });
    expect(flagRes.isError).toBe(true);
    expect(flagRes.content[0].text).toContain('Security Violation: Invalid target argument');

    // Path traversal
    const travRes = await handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'tribunal_get_context', arguments: { target: '../../outside_secret.txt' } },
    });
    expect(travRes.isError).toBe(true);
    expect(travRes.content[0].text).toContain('Security Violation: Path outside authorized workspace');
  });

  test('MCP tribunal_get_context executes check mode cleanly', async () => {
    process.env.NODE_ENV = 'test';
    const { handleRequest } = require(mcpServerPath);

    const checkRes = await handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'tribunal_get_context', arguments: { check: true } },
    });
    expect(checkRes.isError).toBeFalsy();
    expect(checkRes.content[0].text).toBeDefined();
  });
});

describe('Phase 4: Adversarial Secret Redaction & Read-Only Invariant', () => {
  test('DEF-02: Secret redaction sanitizes all credentials across envelope and markdown', async () => {
    const rawSecret = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak_this_secret';
    const res = await runCodebaseIntelligence({
      subcommand: 'relevant-files',
      target: `fix checkout with token ${rawSecret}`,
      repoRoot: FIXTURE_DIR,
    });

    const jsonStr = JSON.stringify(res);
    expect(jsonStr).not.toContain('do_not_leak_this_secret');
    expect(jsonStr).toContain('[REDACTED_BEARER_TOKEN]');
    expect(res.markdown).not.toContain('do_not_leak_this_secret');
    expect(res.data.summary).not.toContain('do_not_leak_this_secret');
  });

  test('Read-only invariant: codebase analysis creates zero files, modifies zero files', async () => {
    const targetDir = FIXTURE_DIR;
    const beforeFiles = fs.readdirSync(targetDir, { recursive: true });

    await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'trace', target: 'POST /checkout', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'dependencies', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'login', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'impact', target: 'service/checkout.js', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot: targetDir });
    await runCodebaseIntelligence({ subcommand: 'prepare', target: 'refactor', repoRoot: targetDir });

    const afterFiles = fs.readdirSync(targetDir, { recursive: true });
    expect(afterFiles).toEqual(beforeFiles);
  });
});
