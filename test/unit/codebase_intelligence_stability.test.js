'use strict';

/**
 * codebase_intelligence_stability.test.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Phase 9: API Stability, Backward Compatibility & Migration Certification
 *
 * Verifies:
 *   1. Package Exports & Entry-Point Backward Compatibility (CJS, ESM, TypeScript)
 *   2. Modular Command Interface (src/commands/understand.js)
 *   3. Result-Envelope V1 Consumer Field Compatibility (spread cleanData)
 *   4. Evidence-Record Legacy Field Aliases (finding_id, source_path, etc.)
 *   5. Legacy Subcommand & Alias Support (deps, relevant_files, dead_code)
 *   6. MCP Tool Schema Stability & Dual Mode Formatting
 *   7. Node.js Engine Compliance (>=18.0.0)
 *   8. Deterministic Error Behavior & Exit Code Semantics
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const {
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  createResultEnvelope,
  createEvidenceRecord,
} = require('../../.agent/scripts/codebase_intelligence');
const { cmdUnderstand } = require('../../src/commands/understand');
const { handleRequest } = require('../../bin/mcp-server');

describe('Phase 9: API Stability, Backward Compatibility & Migration Certification', () => {

  // ── 1. PACKAGE ENTRY POINTS & EXPORTS ───────────────────────────────────────
  test('B1: CJS package main entry exports cmdUnderstand alongside main', () => {
    const pkg = require('../../src/cli.js');
    expect(typeof pkg.main).toBe('function');
    expect(typeof pkg.cmdUnderstand).toBe('function');
  });

  test('B2: Modular src/commands/understand.js conforms to standard CLI command contract', async () => {
    expect(typeof cmdUnderstand).toBe('function');

    // Test with undefined flags/argv
    const result = await cmdUnderstand({}, [], true);
    expect(result).toBeDefined();
    expect(result.status).toBe('COMPLETE');
    expect(result.subcommand).toBe('overview');
  });

  test('B3: src/esm/index.mjs exports cmdUnderstand for modern bundlers and ESM consumers', () => {
    const esmContent = fs.readFileSync(path.join(REPO_ROOT, 'src/esm/index.mjs'), 'utf8');
    expect(esmContent).toContain('export async function cmdUnderstand');
    expect(esmContent).toContain("loadCommand('../commands/understand.js', 'cmdUnderstand'");
  });

  test('B4: src/index.d.ts declares cmdUnderstand and tribunal_understand MCP tool', () => {
    const dtsContent = fs.readFileSync(path.join(REPO_ROOT, 'src/index.d.ts'), 'utf8');
    expect(dtsContent).toContain('export function cmdUnderstand(');
    expect(dtsContent).toContain("'tribunal_understand'");
  });

  // ── 2. SCHEMA V1 CONSUMER FIELD COMPATIBILITY ──────────────────────────────
  test('B5: Result envelope spreads operational data onto root for legacy V1 consumer compatibility', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      repoRoot: REPO_ROOT,
    });

    const envelope = res.data;

    // V2 Canonical Access
    expect(envelope.schema_version).toBe('2.0.0');
    expect(envelope.data.endpoints).toBeDefined();
    expect(envelope.data.workspaces).toBeDefined();
    expect(envelope.data.centralityRanking).toBeDefined();

    // V1 Root Spreading Access (Legacy Consumer Compatibility)
    expect(envelope.endpoints).toBeDefined();
    expect(envelope.workspaces).toBeDefined();
    expect(envelope.centralityRanking).toBeDefined();
    expect(envelope.endpoints).toEqual(envelope.data.endpoints);
  });

  test('B6: Evidence record populates legacy field aliases (finding_id, source_path, repo_fingerprint)', () => {
    const ev = createEvidenceRecord({
      claim: 'Test claim',
      subject: 'TestSubject',
      relationship: 'calls',
      object: 'TargetSymbol',
      source: { file: 'src/cli.js', start_line: 10, end_line: 20 },
      confidence: 'L1', // Legacy confidence string
    });

    // V2 Canonical Fields
    expect(ev.schema_version).toBe('2.0.0');
    expect(ev.evidence_id).toBeDefined();
    expect(ev.confidence).toBe('L1_OBSERVED');
    expect(ev.source.file).toBe('src/cli.js');

    // V1 Legacy Compatibility Aliases
    expect(ev.finding_id).toBe(ev.evidence_id);
    expect(ev.source_path).toBe('src/cli.js');
    expect(ev.relationship_type).toBe('calls');
    expect(ev.verification_method).toBe('ast_static_visitor');
    expect(ev.repo_fingerprint).toBe('working-tree');
    expect(ev.evidence_status).toBe('OBSERVED');
  });

  // ── 3. CLI ARGUMENTS & ALIAS COMPATIBILITY ──────────────────────────────────
  test('B7: Subcommand normalizer accepts legacy aliases and underscores (deps, relevant_files, dead_code)', async () => {
    const aliases = [
      { input: 'deps', expectedSub: 'dependencies' },
      { input: 'relevant_files', expectedSub: 'relevant-files' },
      { input: 'dead_code', expectedSub: 'dead-code' },
    ];

    for (const { input, expectedSub } of aliases) {
      const res = await runCodebaseIntelligence({
        subcommand: input,
        target: 'src/cli.js',
        repoRoot: REPO_ROOT,
      });

      expect(res.status).toBe('COMPLETE');
      expect(res.subcommand).toBe(expectedSub);
      expect(res.data.operation).toBe(expectedSub);
    }
  });

  test('B8: CLI natural language task description automatically routes to relevant-files', async () => {
    const result = await cmdUnderstand({}, ['add payment idempotency support'], true);
    expect(result.status).toBe('COMPLETE');
    expect(result.subcommand).toBe('relevant-files');
    expect(result.data.operation).toBe('relevant-files');
    expect(result.data.primaryFiles.length).toBeGreaterThan(0);
  });

  // ── 4. RUNTIME & ENGINE COMPLIANCE ──────────────────────────────────────────
  test('B9: Host Node.js runtime satisfies package.json engines specification (>=18.0.0)', () => {
    const pkg = require('../../package.json');
    const requiredEngine = pkg.engines?.node;
    expect(requiredEngine).toBeDefined();

    // Verify current runtime meets the requirement
    const satisfies = semver.satisfies(process.version, requiredEngine);
    expect(satisfies).toBe(true);
  });

  // ── 5. ERROR BEHAVIOR & EXIT CODES ──────────────────────────────────────────
  test('B10: Unknown subcommands set process.exitCode = 1 and return structured UNSUPPORTED envelope', async () => {
    const initialCode = process.exitCode;
    const result = await cmdUnderstand({}, ['unsupported_subcommand_test'], true);

    expect(result.status).toBe('UNSUPPORTED');
    expect(result.data.schema_version).toBe('2.0.0');
    expect(result.data.data.error).toContain('Unknown codebase intelligence subcommand');
    expect(process.exitCode).toBe(1);

    // Reset exitCode to avoid poisoning subsequent tests
    process.exitCode = initialCode;
  });

  // ── 6. MCP CONTRACT & MCP_GUIDE STABILITY ───────────────────────────────────
  test('B11: MCP handleRequest lists both tribunal_understand and tribunal_get_context in tools/list', async () => {
    const listRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'list-tools-test',
      method: 'tools/list',
      params: {},
    });

    const toolNames = listRes.tools.map(t => t.name);
    expect(toolNames).toContain('tribunal_understand');
    expect(toolNames).toContain('tribunal_get_context');

    const understandTool = listRes.tools.find(t => t.name === 'tribunal_understand');
    expect(understandTool.inputSchema.properties.subcommand.enum).toEqual([
      'overview',
      'trace',
      'dependencies',
      'relevant-files',
      'impact',
      'dead-code',
      'onboard',
      'prepare',
      'change-impact',
      'investigate',
    ]);
  });

});

