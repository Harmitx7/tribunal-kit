'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { rankContext } = require('../../src/context/ranker');
const { cmdContextRank } = require('../../src/commands/context');

describe('Capability 2: Deterministic Context Ranking Engine', () => {
  let tmpRepo;

  beforeAll(() => {
    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-rank-test-'));

    // Create synthetic repository structure
    fs.mkdirSync(path.join(tmpRepo, 'src', 'auth'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'src', 'utils'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'test'), { recursive: true });
    fs.mkdirSync(path.join(tmpRepo, 'docs'), { recursive: true });

    // Directly modified file
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'auth', 'session.js'),
      `const { hashToken } = require('../utils/crypto');\nmodule.exports = { session: true };`,
    );

    // Direct dependency of session.js
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'utils', 'crypto.js'),
      `function hashToken(t) { return 'hash_' + t; }\nmodule.exports = { hashToken };`,
    );

    // Direct importer of session.js
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'auth', 'login.js'),
      `const { session } = require('./session');\nmodule.exports = { login: true };`,
    );

    // Test covering session.js
    fs.writeFileSync(
      path.join(tmpRepo, 'test', 'session.test.js'),
      `const { session } = require('../src/auth/session');\ntest('session', () => {});`,
    );

    // Unrelated test
    fs.writeFileSync(
      path.join(tmpRepo, 'test', 'unrelated.test.js'),
      `test('other', () => {});`,
    );

    // Critical security boundary (not directly modified)
    fs.writeFileSync(
      path.join(tmpRepo, 'SECURITY.md'),
      `# Security Policy\nReport vulnerabilities to security@example.com`,
    );

    // Config file
    fs.writeFileSync(
      path.join(tmpRepo, 'package.json'),
      `{\n  "name": "sample",\n  "version": "1.0.0"\n}`,
    );

    // Public API entrypoint
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'index.js'),
      `module.exports = require('./auth/session');`,
    );

    // Documentation
    fs.writeFileSync(
      path.join(tmpRepo, 'docs', 'readme.md'),
      `# User documentation\nHow to use this system.`,
    );

    // Unrelated file
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'utils', 'formatter.js'),
      `module.exports = { format: (s) => s.trim() };`,
    );
  });

  afterAll(() => {
    if (fs.existsSync(tmpRepo)) {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    }
  });

  test('Directly modified file outranks untouched files and has mandatory flag', () => {
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: [
        'src/auth/session.js',
        'src/utils/formatter.js',
        'docs/readme.md',
      ],
    });

    const sessionItem = result.ranked_items.find(i => i.path === 'src/auth/session.js');
    const formatterItem = result.ranked_items.find(i => i.path === 'src/utils/formatter.js');

    expect(sessionItem).toBeDefined();
    expect(formatterItem).toBeDefined();
    expect(sessionItem.is_mandatory).toBe(true);
    expect(sessionItem.reasons).toContain('directly modified');
    expect(sessionItem.score).toBeGreaterThan(formatterItem.score);
  });

  test('Direct dependency outranks unrelated file', () => {
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: [
        'src/utils/crypto.js',
        'src/utils/formatter.js',
      ],
    });

    const cryptoItem = result.ranked_items.find(i => i.path === 'src/utils/crypto.js');
    const formatterItem = result.ranked_items.find(i => i.path === 'src/utils/formatter.js');

    expect(cryptoItem.score).toBeGreaterThan(formatterItem.score);
    expect(cryptoItem.reasons.some(r => r.includes('direct dependency'))).toBe(true);
  });

  test('Direct importer outranks unrelated file', () => {
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: [
        'src/auth/login.js',
        'src/utils/formatter.js',
      ],
    });

    const loginItem = result.ranked_items.find(i => i.path === 'src/auth/login.js');
    const formatterItem = result.ranked_items.find(i => i.path === 'src/utils/formatter.js');

    expect(loginItem.score).toBeGreaterThan(formatterItem.score);
    expect(loginItem.reasons.some(r => r.includes('direct importer'))).toBe(true);
  });

  test('Security boundary receives mandatory inclusion even when untouched', () => {
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/utils/formatter.js'],
      candidateFiles: [
        'src/utils/formatter.js',
        'SECURITY.md',
        'docs/readme.md',
      ],
    });

    const secItem = result.ranked_items.find(i => i.path === 'SECURITY.md');
    expect(secItem).toBeDefined();
    expect(secItem.is_mandatory).toBe(true);
    expect(secItem.reasons).toContain('security boundary');
  });

  test('Relevant test outranks unrelated test suite', () => {
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: [
        'test/session.test.js',
        'test/unrelated.test.js',
      ],
    });

    const sessionTest = result.ranked_items.find(i => i.path === 'test/session.test.js');
    const unrelatedTest = result.ranked_items.find(i => i.path === 'test/unrelated.test.js');

    expect(sessionTest.score).toBeGreaterThan(unrelatedTest.score);
    expect(sessionTest.reasons).toContain('test covering changed behavior');
  });

  test('Deterministic ordering across repeated runs (byte-identical JSON)', () => {
    const candidates = [
      'docs/readme.md',
      'src/utils/formatter.js',
      'src/auth/login.js',
      'src/auth/session.js',
      'src/utils/crypto.js',
      'SECURITY.md',
      'package.json',
      'test/session.test.js',
    ];

    const run1 = JSON.stringify(rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: candidates,
    }));

    for (let i = 0; i < 10; i++) {
      const runN = JSON.stringify(rankContext({
        repoRoot: tmpRepo,
        targetFiles: ['src/auth/session.js'],
        candidateFiles: candidates,
      }));
      expect(runN).toBe(run1);
    }
  });

  test('Context budget truncation retains mandatory items and measures before/after', () => {
    const candidates = [
      'src/auth/session.js',
      'SECURITY.md',
      'src/auth/login.js',
      'src/utils/crypto.js',
      'src/index.js',
      'test/session.test.js',
      'docs/readme.md',
      'src/utils/formatter.js',
    ];

    // Truncate to maximum 3 items
    const result = rankContext({
      repoRoot: tmpRepo,
      targetFiles: ['src/auth/session.js'],
      candidateFiles: candidates,
      maxItems: 3,
    });

    expect(result.ranked_items.length).toBeLessThanOrEqual(3);
    expect(result.truncated_items.length).toBe(candidates.length - result.ranked_items.length);

    // Mandatory items (session.js and SECURITY.md) must be retained
    const retainedPaths = result.ranked_items.map(i => i.path);
    expect(retainedPaths).toContain('src/auth/session.js');
    expect(retainedPaths).toContain('SECURITY.md');

    // Metrics are populated with exact measurements
    expect(result.metrics.context_items_before).toBe(candidates.length);
    expect(result.metrics.context_items_after).toBe(result.ranked_items.length);
    expect(result.metrics.estimated_tokens_before).toBeGreaterThan(result.metrics.estimated_tokens_after);
    expect(result.metrics.critical_evidence_retained).toBe(2);
  });

  test('CLI integration via cmdContextRank produces valid payload', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const processArgs = [
      'node',
      'tk',
      'context-rank',
      '--target',
      'src/auth/session.js',
      '--json',
    ];

    const result = cmdContextRank({ path: tmpRepo, json: true }, processArgs, true);
    expect(result).toBeDefined();
    expect(result.metrics.context_items_after).toBeGreaterThanOrEqual(1);

    logSpy.mockRestore();
  });
});
