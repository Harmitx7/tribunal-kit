'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseYamlContract,
  matchGlob,
  evaluateContract,
  loadContracts: _loadContracts,
  verifyWorkspace,
} = require('../../.agent/scripts/contract_engine');

const {
  captureSnapshot,
  listSnapshots,
  replaySnapshot,
} = require('../../.agent/scripts/trace_engine');

describe('Contract Engine (YAML parsing & rule evaluation)', () => {
  test('parseYamlContract parses schema fields correctly', () => {
    const yaml = `
name: "No console.log"
description: "Block debug logs"
scope: "src/**/*.js"
exclude: "**/*.test.js"
when: file_modified
severity: block
must_not:
  - pattern: "console.log"
    message: "No logs in src"
must:
  - pattern: "use strict"
    message: "Must be strict"
`;
    const parsed = parseYamlContract(yaml);
    expect(parsed.name).toBe('No console.log');
    expect(parsed.description).toBe('Block debug logs');
    expect(parsed.scope).toBe('src/**/*.js');
    expect(parsed.exclude).toBe('**/*.test.js');
    expect(parsed.severity).toBe('block');
    expect(parsed.must_not).toHaveLength(1);
    expect(parsed.must_not[0].pattern).toBe('console.log');
    expect(parsed.must).toHaveLength(1);
    expect(parsed.must[0].pattern).toBe('use strict');
  });

  test('matchGlob handles standard and globstar patterns', () => {
    expect(matchGlob('src/api/user.ts', 'src/**/*.ts')).toBe(true);
    expect(matchGlob('test/user.test.ts', '**/*.test.ts')).toBe(true);
    expect(matchGlob('src/api/user.ts', 'src/**/*.js')).toBe(false);
  });

  test('evaluateContract detects must_not violations', () => {
    const contract = {
      name: 'No console.log',
      scope: 'src/**/*.js',
      severity: 'warn',
      must_not: [
        {
          pattern: 'console.log',
          message: 'No debug logging allowed',
        },
      ],
    };

    const fileContent = `function test() {\n  console.log("hello");\n}`;
    const violations = evaluateContract(contract, 'src/index.js', fileContent);
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(2);
    expect(violations[0].message).toBe('No debug logging allowed');
  });

  test('evaluateContract evaluates regex must rules', () => {
    const contract = {
      name: 'Strict Mode Required',
      scope: 'src/**/*.js',
      severity: 'block',
      must: [
        {
          pattern: 'regex:use strict',
          message: 'Missing strict mode header',
        },
      ],
    };

    const badContent = `function test() {}`;
    const violations = evaluateContract(contract, 'src/index.js', badContent);
    expect(violations).toHaveLength(1);

    const goodContent = `"use strict";\nfunction test() {}`;
    const clean = evaluateContract(contract, 'src/index.js', goodContent);
    expect(clean).toHaveLength(0);
  });

  test('verifyWorkspace verifies workspace contracts against target files', () => {
    const projectRoot = process.cwd();
    const result = verifyWorkspace(projectRoot, [path.join(projectRoot, 'dist', 'cli.js')]);

    expect(result.contracts_loaded).toBeGreaterThanOrEqual(1);
    expect(result.files_checked).toBe(1);
    expect(typeof result.blocked).toBe('boolean');
  });
});

describe('Trace Engine (Failure Snapshots & Replay)', () => {
  const tmpDir = path.join(__dirname, '../../scratch/test_trace_env');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  test('captureSnapshot & listSnapshots & replaySnapshot lifecycle', () => {
    const violation = {
      contract: 'No console.log in production code',
      rule: 'console.log',
      file: 'src/api/user.ts',
      line: 15,
      snippet: "console.log('test')",
      message: 'Forbidden pattern found',
      severity: 'block',
    };

    const captured = captureSnapshot(tmpDir, violation);
    expect(captured.id).toBeDefined();
    expect(captured.contract).toBe('No console.log in production code');

    const snapshots = listSnapshots(tmpDir);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);

    const replayed = replaySnapshot(tmpDir, captured.id);
    expect(replayed).not.toBeNull();
    expect(replayed.target_file).toBe('src/api/user.ts');
  });
});
