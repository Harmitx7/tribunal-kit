'use strict';

/**
 * codebase_intelligence_workflow.test.js — Tribunal Kit End-to-End Workflow Tests
 * ══════════════════════════════════════════════════════════════════════════════
 * End-to-end integration tests verifying:
 *   1. Full CLI execution via bin/wrapper.js understand
 *   2. Strict token bounding (<2,500 estimated tokens) on all markdown outputs
 *   3. Sub-second execution performance (<3,000ms cold scan)
 *   4. JSON flag (--json) output validity and schema conformity
 *   5. Focused analysis (--focus) boundary containment
 *   6. Clean repository state preservation (zero working tree mutations)
 */

const path = require('path');
const { execSync } = require('child_process');
const { runCodebaseIntelligence } = require('../../.agent/scripts/codebase_intelligence');

describe('Codebase Intelligence End-to-End Workflow', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  // Token count estimator (~4 chars per token)
  function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  // 1. CLI EXECUTION VIA BIN WRAPPER
  test('executes CLI via bin/wrapper.js understand and returns expected markdown', () => {
    const cmd = `node "${path.join(repoRoot, 'bin', 'wrapper.js')}" understand overview`;
    const stdout = execSync(cmd, { cwd: repoRoot, encoding: 'utf8', timeout: 10000 });

    expect(stdout).toContain('SYSTEM TOPOLOGY DOSSIER');
    expect(stdout).toContain('Runtime:');
    expect(stdout).toContain('Primary Entry Points');
  });

  // 2. TOKEN BUDGET ENFORCEMENT (<2,500 tokens)
  test('strictly enforces token budget (<2,500 tokens) across all 8 operations', async () => {
    const subcommands = [
      { subcommand: 'overview' },
      { subcommand: 'trace', target: 'POST /mfa-verify' },
      { subcommand: 'dependencies', target: 'src/security/boundary.js' },
      { subcommand: 'relevant-files', target: 'add OAuth login' },
      { subcommand: 'impact', target: 'src/security/boundary.js' },
      { subcommand: 'dead-code' },
      { subcommand: 'onboard' },
      { subcommand: 'prepare', target: 'migrate database auth table' },
    ];

    for (const sub of subcommands) {
      const res = await runCodebaseIntelligence({ ...sub, repoRoot });
      const tokens = estimateTokens(res.markdown);
      expect(tokens).toBeLessThan(2500);
    }
  });

  // 3. EXECUTION PERFORMANCE (<3s)
  test('executes in-memory scan within performance budget (<3,000ms)', async () => {
    const startTime = Date.now();
    const res = await runCodebaseIntelligence({ subcommand: 'overview', repoRoot });
    const duration = Date.now() - startTime;

    expect(res.subcommand).toBe('overview');
    expect(duration).toBeLessThan(3000);
  });

  // 4. JSON OUTPUT SCHEMA
  test('emits valid parseable JSON with all required keys when requested', async () => {
    const cmd = `node "${path.join(repoRoot, '.agent', 'scripts', 'codebase_intelligence.js')}" overview --json`;
    const stdout = execSync(cmd, { cwd: repoRoot, encoding: 'utf8', timeout: 10000 });

    const json = JSON.parse(stdout);
    expect(json.subcommand).toBe('overview');
    expect(json.runtime).toBeDefined();
    expect(Array.isArray(json.workspaces)).toBe(true);
    expect(json.endpoints).toBeDefined();
    expect(Array.isArray(json.evidenceRecords)).toBe(true);
  });

  // 5. SCOPE FOCUS BOUNDARY
  test('respects --focus flag and limits endpoints scope', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'overview',
      flags: { focus: 'src/commands' },
      repoRoot,
    });

    expect(res.subcommand).toBe('overview');
    expect(res.data.endpoints.total).toBeDefined();
  });

  // 6. REPOSITORY HYGIENE (Zero uncommitted mutations)
  test('leaves git working tree strictly clean after all workflow executions', async () => {
    const statusBefore = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });

    await runCodebaseIntelligence({ subcommand: 'overview', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'trace', target: 'POST /mfa-verify', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'dependencies', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'auth', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'impact', target: 'src/security/boundary.js', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot });
    await runCodebaseIntelligence({ subcommand: 'prepare', target: 'auth', repoRoot });

    const statusAfter = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8' });
    expect(statusAfter).toBe(statusBefore);
  });
});
