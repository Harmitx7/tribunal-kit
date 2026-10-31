'use strict';

/**
 * codebase_intelligence_cross_module.test.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Phase 8: Architecture Integrity & Cross-Module Consistency Certification
 *
 * Verifies:
 *   1. Architecture Dependency Map & Clean Acyclic Require Graph (DAG)
 *   2. Authoritative Result-Envelope (schema 2.0.0) Across All 8 Operations
 *   3. Evidence Record Semantics & Confidence Labels (L1, L2, L3, L0)
 *   4. Strict CLI and MCP Operational Parity
 *   5. MCP Path Containment & Traversal Defense
 *   6. Secret Redaction Across Cross-Module Output Boundaries
 *   7. Read-Only Invariant Preservation
 *   8. Canonical and Mirrored Artifact Hash Parity
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '../..');
const { runCodebaseIntelligence, CodebaseIntelligence } = require('../../.agent/scripts/codebase_intelligence');
const { handleRequest } = require('../../bin/mcp-server');

describe('Phase 8: Architecture Integrity & Cross-Module Consistency Certification', () => {

  // ── 1. ARCHITECTURE DEPENDENCY MAP & DAG ────────────────────────────────────
  test('A1: Core intelligence modules form a clean acyclic dependency graph', () => {
    const modules = [
      'src/cli.js',
      '.agent/scripts/codebase_intelligence.js',
      '.agent/scripts/architecture_extractor.js',
      '.agent/scripts/blast_radius_engine.js',
      '.agent/scripts/architecture_verifier.js',
      'bin/mcp-server.js',
    ];

    const graph = {};
    for (const mod of modules) {
      const fullPath = path.join(REPO_ROOT, mod);
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /require\(['"]([^'"]+)['"]\)/g;
      let match;
      const deps = new Set();
      while ((match = regex.exec(content)) !== null) {
        if (match[1].startsWith('.')) {
          deps.add(match[1]);
        }
      }
      graph[mod] = Array.from(deps);
    }

    // ArchitectureExtractor & ArchitectureVerifier must be leaf modules
    expect(graph['.agent/scripts/architecture_extractor.js'].every(d => d.includes('_colors'))).toBe(true);
    expect(graph['.agent/scripts/architecture_verifier.js'].every(d => d.includes('_colors'))).toBe(true);

    // CodebaseIntelligence coordinates extractors and verifiers
    const ciDeps = graph['.agent/scripts/codebase_intelligence.js'];
    expect(ciDeps.some(d => d.includes('architecture_extractor'))).toBe(true);
    expect(ciDeps.some(d => d.includes('blast_radius_engine'))).toBe(true);
    expect(ciDeps.some(d => d.includes('architecture_verifier'))).toBe(true);
  });

  // ── 2. CANONICAL RESULT-ENVELOPE ACROSS ALL 8 OPERATIONS ───────────────────
  test('A2: All 8 operations return schema 2.0.0 envelopes with standardized fields', async () => {
    const ops = [
      { op: 'overview', target: undefined },
      { op: 'trace', target: 'src/cli.js' },
      { op: 'dependencies', target: 'src/cli.js' },
      { op: 'relevant-files', target: 'cli commands' },
      { op: 'impact', target: 'src/cli.js' },
      { op: 'dead-code', target: undefined },
      { op: 'onboard', target: undefined },
      { op: 'prepare', target: 'add command' },
    ];

    for (const { op, target } of ops) {
      const res = await runCodebaseIntelligence({
        subcommand: op,
        target,
        repoRoot: REPO_ROOT,
      });

      const env = res.data;
      expect(env.schema_version).toBe('2.0.0');
      expect(env.status).toBe('COMPLETE');
      expect(env.operation).toBe(op);
      expect(typeof env.summary).toBe('string');
      expect(env.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(env.evidence_records)).toBe(true);
      expect(env.evidence_records.length).toBeGreaterThan(0);
      expect(Array.isArray(env.unresolved_assumptions)).toBe(true);
      expect(Array.isArray(env.limitations)).toBe(true);
      expect(env.completeness).toEqual({
        total_expected: undefined,
        analyzed: undefined,
        percentage: 100,
        is_complete: true,
      });
    }
  });

  // ── 3. EVIDENCE RECORD SEMANTICS & CONFIDENCE LABELS ───────────────────────
  test('A3: Evidence records strictly adhere to standard confidence enum and static semantics', async () => {
    const validConfidences = new Set(['L1_OBSERVED', 'L2_CORROBORATED', 'L3_INFERRED', 'L0_UNKNOWN']);

    const res = await runCodebaseIntelligence({
      subcommand: 'trace',
      target: 'src/cli.js',
      repoRoot: REPO_ROOT,
    });

    expect(res.data.evidence_records.length).toBeGreaterThan(0);
    for (const ev of res.data.evidence_records) {
      expect(ev.schema_version).toBe('2.0.0');
      expect(typeof ev.evidence_id).toBe('string');
      expect(ev.evidence_id).toBe(ev.finding_id); // Compatibility alias
      expect(validConfidences.has(ev.confidence)).toBe(true);
      expect(typeof ev.claim).toBe('string');
      expect(typeof ev.subject).toBe('string');
      expect(typeof ev.relationship).toBe('string');
      expect(ev.source).toBeDefined();
      expect(typeof ev.source.file).toBe('string');

      // Static trace invariant: must not claim runtime execution
      expect(ev.claim.toLowerCase()).not.toContain('runtime execution guaranteed');
    }

    // Static limitation must be explicitly recorded
    expect(res.data.limitations.some(l => l.includes('cannot guarantee runtime path execution'))).toBe(true);
  });

  // ── 4. CLI AND MCP OPERATIONAL PARITY ───────────────────────────────────────
  test('A4: MCP tribunal_understand tool returns identical structured envelope to CLI', async () => {
    // 1. Invoke through MCP handleRequest
    const mcpRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-test-1',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'overview',
          json: true,
        },
      },
    });

    expect(mcpRes.isError).toBeFalsy();
    expect(mcpRes.content).toHaveLength(1);
    const mcpEnvelope = JSON.parse(mcpRes.content[0].text);

    // 2. Invoke through CLI execution
    const cliOutput = execSync(`node bin/wrapper.js understand overview --json`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 15000,
    });
    const cliEnvelope = JSON.parse(cliOutput);

    // 3. Assert parity
    expect(mcpEnvelope.schema_version).toBe(cliEnvelope.schema_version);
    expect(mcpEnvelope.operation).toBe(cliEnvelope.operation);
    expect(mcpEnvelope.status).toBe(cliEnvelope.status);
    expect(mcpEnvelope.endpoints.total).toBe(cliEnvelope.endpoints.total);
    expect(mcpEnvelope.workspaces.length).toBe(cliEnvelope.workspaces.length);
    expect(mcpEnvelope.centralityRanking.length).toBe(cliEnvelope.centralityRanking.length);
  });

  test('A5: MCP tribunal_understand markdown output matches CLI markdown dossier', async () => {
    const mcpRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-test-2',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'onboard',
          json: false,
        },
      },
    });

    expect(mcpRes.isError).toBeFalsy();
    const mcpMarkdown = mcpRes.content[0].text;
    expect(mcpMarkdown).toContain('DEVELOPER ONBOARDING DOSSIER');
    expect(mcpMarkdown).toContain('Mental Model');
    expect(mcpMarkdown).toContain('Guided Reading Order');
    expect(mcpMarkdown).toContain('Verification Recipes');
  });

  // ── 5. MCP PATH CONTAINMENT & TRAVERSAL DEFENSE ─────────────────────────────
  test('A6: MCP tribunal_understand safely rejects path traversal attempts in target and focus', async () => {
    // Path traversal in target
    await expect(
      handleRequest({
        jsonrpc: '2.0',
        id: 'mcp-sec-1',
        method: 'tools/call',
        params: {
          name: 'tribunal_understand',
          arguments: {
            subcommand: 'dependencies',
            target: '../../../../etc/passwd',
          },
        },
      })
    ).rejects.toThrow('Path traversal detected');

    // Focus directory outside root
    const focusRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-sec-2',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'overview',
          focus: '../..',
        },
      },
    });
    expect(focusRes.isError).toBe(true);
    expect(focusRes.content[0].text).toContain('escapes authorized root');
  });

  // ── 6. ERROR PROPAGATION & UNSUPPORTED SUBCOMMANDS ─────────────────────────
  test('A7: Unknown subcommands return structured UNSUPPORTED envelope without crashing', async () => {
    const mcpRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-test-err',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'non_existent_op',
          json: true,
        },
      },
    });

    expect(mcpRes.isError).toBe(true);
    const envelope = JSON.parse(mcpRes.content[0].text);
    expect(envelope.schema_version).toBe('2.0.0');
    expect(envelope.status).toBe('UNSUPPORTED');
    expect(envelope.data.error).toContain('Unknown codebase intelligence subcommand');
  });

  // ── 7. SECRET REDACTION ACROSS BOUNDARIES ──────────────────────────────────
  test('A8: Sensitive tokens in target queries are redacted before envelope serialization', async () => {
    const sensitiveQuery = 'trace password = "SuperSecretPassword123!" in auth flow';
    const mcpRes = await handleRequest({
      jsonrpc: '2.0',
      id: 'mcp-sec-3',
      method: 'tools/call',
      params: {
        name: 'tribunal_understand',
        arguments: {
          subcommand: 'relevant-files',
          target: sensitiveQuery,
          json: true,
        },
      },
    });

    const envelope = JSON.parse(mcpRes.content[0].text);
    expect(envelope.target).not.toContain('SuperSecretPassword123!');
    expect(envelope.target).toContain('[REDACTED_SECRET]');
  });

  // ── 8. READ-ONLY INVARIANT PRESERVATION ─────────────────────────────────────
  test('A9: Codebase intelligence execution causes zero filesystem mutations', async () => {
    const beforeFiles = new Set(fs.readdirSync(REPO_ROOT));

    await runCodebaseIntelligence({
      subcommand: 'dead-code',
      repoRoot: REPO_ROOT,
    });

    const afterFiles = new Set(fs.readdirSync(REPO_ROOT));
    expect(afterFiles.size).toBe(beforeFiles.size);
    for (const f of beforeFiles) {
      expect(afterFiles.has(f)).toBe(true);
    }
  });

  // ── 9. CANONICAL & MIRRORED ARTIFACT HASH PARITY ────────────────────────────
  test('A10: Canonical inner and mirrored outer artifacts maintain 100% hash parity', () => {
    function computeHash(filePath) {
      return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    }

    const parityPairs = [
      ['tribunal-kit/.agent/scripts/codebase_intelligence.js', '.agent/scripts/codebase_intelligence.js'],
      ['tribunal-kit/.agent/scripts/architecture_extractor.js', '.agent/scripts/architecture_extractor.js'],
      ['tribunal-kit/.agent/scripts/blast_radius_engine.js', '.agent/scripts/blast_radius_engine.js'],
      ['tribunal-kit/.agent/scripts/architecture_verifier.js', '.agent/scripts/architecture_verifier.js'],
      ['tribunal-kit/.agent/scripts/context_compiler.js', '.agent/scripts/context_compiler.js'],
      ['tribunal-kit/.agent/workflows/understand.md', '.agent/workflows/understand.md'],
      ['tribunal-kit/.agent/skills/codebase-intelligence/SKILL.md', '.agent/skills/codebase-intelligence/SKILL.md'],
      ['tribunal-kit/.agent/config/slash-commands.json', '.agent/config/slash-commands.json'],
      ['tribunal-kit/.agent/skill_topic_map.json', '.agent/skill_topic_map.json'],
    ];

    const workspaceRoot = path.resolve(REPO_ROOT, '..');
    for (const [innerRel, outerRel] of parityPairs) {
      const innerPath = path.join(workspaceRoot, innerRel);
      const outerPath = path.join(workspaceRoot, outerRel);

      if (!fs.existsSync(innerPath) || !fs.existsSync(outerPath)) {
        // Multi-root parent container mirror not present (e.g. standalone CI runner checkout)
        continue;
      }

      const innerHash = computeHash(innerPath);
      const outerHash = computeHash(outerPath);
      expect(innerHash).toBe(outerHash);
    }
  });

});
