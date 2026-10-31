'use strict';

/**
 * codebase_intelligence_security_certification.test.js
 * ══════════════════════════════════════════════════════════════════════════════════════
 * Phase 5: Security Certification & Release Gate Suite for Tribunal-Kit v9.3.0
 *
 * Verifies:
 *   1. Adversarial secret redaction across all 8 operations and output boundaries
 *   2. Static analysis and evidence integrity (negative tests against false certainty)
 *   3. Zero-mutation filesystem guarantees across normal and failure scenarios
 *   4. CLI entry points, exit codes, and MCP context security containment
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const {
  CodebaseIntelligence,
  runCodebaseIntelligence,
  runCodebaseIntelligenceCli,
  createEvidenceRecord,
  createResultEnvelope,
  redactSecrets,
} = require('../../.agent/scripts/codebase_intelligence');

const REPO_ROOT = path.resolve(__dirname, '../..');
const FIXTURE_DIR = path.resolve(__dirname, '../fixtures/codebase_intelligence');

describe('Phase 5 — Security Boundary Audit: Secret Redaction Matrix', () => {
  const secretVectors = [
    {
      type: 'Anthropic API Key',
      secret: 'sk-ant-api03-abcdef1234567890abcdef1234567890AA',
      payload: 'task sk-ant-api03-abcdef1234567890abcdef1234567890AA in auth',
    },
    {
      type: 'OpenAI API Key (Project)',
      secret: 'sk-proj-abcdef1234567890abcdef1234567890abcdef12',
      payload: 'export OPENAI_API_KEY=sk-proj-abcdef1234567890abcdef1234567890abcdef12',
    },
    {
      type: 'AWS Access Key ID',
      secret: 'AKIAIOSFODNN7EXAMPLE',
      payload: 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE in s3-upload',
    },
    {
      type: 'JWT Token',
      secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      payload: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
    {
      type: 'PostgreSQL Connection URI',
      secret: 'db_secret_super_pass_9988',
      payload: 'postgres://dbuser:db_secret_super_pass_9988@database.internal.net:5432/orders',
    },
    {
      type: 'MongoDB+srv Connection URI',
      secret: 'mongo_ultra_secret_pw',
      payload: 'mongodb+srv://clusteradmin:mongo_ultra_secret_pw@cluster0.abcde.mongodb.net/production',
    },
    {
      type: 'Generic Quoted Password with Spaces',
      secret: 'super secret internal password',
      payload: 'password = "super secret internal password"',
    },
    {
      type: 'GitHub PAT',
      secret: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      payload: 'GITHUB_TOKEN=ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 in ci config',
    },
    {
      type: 'Secret embedded in File Path',
      secret: 'sk-ant-api03-abcdef1234567890abcdef1234567890AA',
      payload: '/secrets/sk-ant-api03-abcdef1234567890abcdef1234567890AA/credentials.json',
    },
  ];

  for (const vec of secretVectors) {
    test(`redacts ${vec.type} across envelope, data, markdown, and summary in relevant-files`, async () => {
      const res = await runCodebaseIntelligence({
        subcommand: 'relevant-files',
        target: `inspect checkout logic with ${vec.payload}`,
        repoRoot: FIXTURE_DIR,
      });

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain(vec.secret);
      expect(res.markdown).not.toContain(vec.secret);
      expect(res.data.summary).not.toContain(vec.secret);
      expect(res.data.target).not.toContain(vec.secret);
    });

    test(`redacts ${vec.type} on failing execution paths (error envelope and limitations)`, async () => {
      // Trigger a failure while supplying the secret in target
      const res = await runCodebaseIntelligence({
        subcommand: 'invalid-operation-name',
        target: `error with ${vec.payload}`,
        repoRoot: FIXTURE_DIR,
      });

      expect(res.status).toBe('UNSUPPORTED');
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain(vec.secret);
      expect(res.markdown).not.toContain(vec.secret);
      expect(res.data.summary).not.toContain(vec.secret);
      for (const lim of res.data.limitations) {
        expect(lim).not.toContain(vec.secret);
      }
    });
  }

  test('redacts secrets embedded in evidence record sources, subjects, and claims', () => {
    const rawFile = 'config/secrets/sk-ant-api03-abcdef1234567890abcdef1234567890AA.json';
    const ev = createEvidenceRecord({
      claim: 'Declared API key in config: password = "my super password"',
      subject: 'api_key_symbol',
      object: 'mongodb+srv://admin:pass1234@cluster.mongodb.net/db',
      file: rawFile,
      confidence: 'L1_OBSERVED',
    });

    const serialized = JSON.stringify(ev);
    expect(serialized).not.toContain('sk-ant-api03-abcdef1234567890abcdef1234567890AA');
    expect(serialized).not.toContain('my super password');
    expect(serialized).not.toContain('pass1234');
    expect(ev.claim).toContain('[REDACTED_SECRET]');
    expect(ev.object).toContain('[REDACTED_DB_URI]');
    expect(ev.source.file).toContain('[REDACTED_API_KEY]');
  });
});

describe('Phase 5 — Static Analysis & Evidence Integrity (Negative Tests)', () => {
  test('Negative Test: Trace never claims runtime execution from static AST', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'trace',
      target: 'POST /checkout',
      repoRoot: FIXTURE_DIR,
    });

    expect(res.status).toBe('COMPLETE');
    for (const step of res.data.steps) {
      expect(['direct_reference', 'framework_mediated', 'unresolved']).toContain(step.relationType);
      expect(step.relationType).not.toBe('executes');
      expect(step.action.toLowerCase()).not.toContain('executes at runtime');
    }
    for (const ev of res.evidenceRecords) {
      expect(['routes_to', 'references', 'imports']).toContain(ev.relationship);
      expect(ev.relationship).not.toBe('executes');
      expect(ev.claim.toLowerCase()).not.toContain('executes at runtime');
    }
  });

  test('Negative Test: Unresolvable dynamic paths are captured as limitations rather than fabricated certainty', async () => {
    const res = await runCodebaseIntelligence({
      subcommand: 'dependencies',
      target: undefined, // repo-wide
      repoRoot: FIXTURE_DIR,
    });

    expect(res.status).toBe('COMPLETE');
    expect(res.data.mode).toBe('project_wide');
    expect(Array.isArray(res.data.unresolvableImports)).toBe(true);
    expect(Array.isArray(res.data.missingDependencies)).toBe(true);
    // Missing dependencies must be distinguished from unresolvable imports
    for (const missing of res.data.missingDependencies) {
      expect(missing.status).toBe('MISSING_FROM_MANIFEST');
    }
  });

  test('Negative Test: Confidence levels cannot be upgraded to L1 without ground-truth evidence', () => {
    const inferredEv = createEvidenceRecord({
      claim: 'Heuristically inferred entry point',
      confidence: 'L3_INFERRED',
    });
    expect(inferredEv.confidence).toBe('L3_INFERRED');
    expect(inferredEv.resolution).toBe('HEURISTIC_CORROBORATION');
    expect(inferredEv.evidence_status).toBe('UNVERIFIED_CLAIM');

    const unknownEv = createEvidenceRecord({
      claim: 'Unverified candidate',
      confidence: 'L4',
    });
    expect(unknownEv.confidence).toBe('L0_UNKNOWN');
    expect(unknownEv.evidence_status).toBe('UNVERIFIED_CLAIM');
  });

  test('Completeness metrics accurately reflect execution status and limitations', async () => {
    // Complete operation
    const compRes = await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: FIXTURE_DIR });
    expect(compRes.data.completeness.is_complete).toBe(true);
    expect(compRes.data.completeness.percentage).toBe(100);

    // Failed operation
    const failRes = await runCodebaseIntelligence({ subcommand: 'trace', target: '', repoRoot: FIXTURE_DIR });
    expect(failRes.data.completeness.is_complete).toBe(false);
    expect(failRes.data.completeness.percentage).toBe(0);

    // Unsupported operation
    const unsupRes = await runCodebaseIntelligence({ subcommand: 'bogus_sub', repoRoot: FIXTURE_DIR });
    expect(unsupRes.data.completeness.is_complete).toBe(false);
    expect(unsupRes.data.completeness.percentage).toBe(0);
  });
});

describe('Phase 5 — Filesystem & Read-Only Guarantees (Zero-Mutation Audit)', () => {
  function getTreeSnapshot(dir) {
    const map = new Map();
    function walk(curr) {
      const entries = fs.readdirSync(curr, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(curr, e.name);
        const rel = path.relative(dir, full).replace(/\\/g, '/');
        if (e.isDirectory()) {
          walk(full);
        } else {
          const content = fs.readFileSync(full);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          map.set(rel, hash);
        }
      }
    }
    walk(dir);
    return map;
  }

  const scenarios = [
    { name: 'Normal execution (all 8 ops)', action: async () => {
      await runCodebaseIntelligence({ subcommand: 'overview', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'trace', target: 'POST /checkout', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'dependencies', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'relevant-files', target: 'auth', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'impact', target: 'service/checkout.js', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'onboard', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'prepare', target: 'add feature', repoRoot: FIXTURE_DIR });
    }},
    { name: 'Invalid operation', action: async () => {
      await runCodebaseIntelligence({ subcommand: 'totally-invalid-operation-name', repoRoot: FIXTURE_DIR });
    }},
    { name: 'Missing target on required operation', action: async () => {
      await runCodebaseIntelligence({ subcommand: 'trace', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'impact', repoRoot: FIXTURE_DIR });
      await runCodebaseIntelligence({ subcommand: 'prepare', repoRoot: FIXTURE_DIR });
    }},
    { name: 'Attempted traversal or inaccessible target', action: async () => {
      await runCodebaseIntelligence({ subcommand: 'impact', target: '../../../../etc/passwd', repoRoot: FIXTURE_DIR });
    }},
    { name: 'Dead code analysis (confirming 0 unlinks)', action: async () => {
      const res = await runCodebaseIntelligence({ subcommand: 'dead-code', repoRoot: FIXTURE_DIR });
      expect(res.status).toBe('COMPLETE');
    }},
  ];

  for (const sc of scenarios) {
    test(`Scenario: ${sc.name} guarantees zero filesystem mutations`, async () => {
      const beforeSnapshot = getTreeSnapshot(FIXTURE_DIR);
      await sc.action();
      const afterSnapshot = getTreeSnapshot(FIXTURE_DIR);

      expect(afterSnapshot.size).toBe(beforeSnapshot.size);
      for (const [file, hash] of beforeSnapshot.entries()) {
        expect(afterSnapshot.has(file)).toBe(true);
        expect(afterSnapshot.get(file)).toBe(hash);
      }
    });
  }
});

describe('Phase 5 — CLI Standard Output & Exit Code Defense', () => {
  const cliPath = path.join(REPO_ROOT, 'src/cli.js');

  test('CLI --json output is strictly parseable JSON without extraneous diagnostic lines', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'overview', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    expect(() => JSON.parse(res.stdout)).not.toThrow();
    const parsed = JSON.parse(res.stdout);
    expect(parsed.schema_version).toBe('2.0.0');
    expect(parsed.status).toBe('COMPLETE');
  });

  test('CLI failures exit with 1 and keep stdout machine-readable when --json is passed', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'trace', '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(() => JSON.parse(res.stdout)).not.toThrow();
    const parsed = JSON.parse(res.stdout);
    expect(parsed.schema_version).toBe('2.0.0');
    expect(parsed.status).toBe('FAILED');
    expect(parsed.data.error).toMatch(/Trace command requires a target/);
  });

  test('CLI unknown subcommand exits with 1', () => {
    const res = cp.spawnSync(process.execPath, [cliPath, 'understand', 'unsupported-action-xyz'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('Error executing /understand unsupported-action-xyz');
  });
});
