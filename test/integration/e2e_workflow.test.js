'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('Phase 10 — End-to-End Workflow & Integration Verification', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const wrapperBin = path.join(repoRoot, 'bin', 'wrapper.js');
  let tempWorkspace = null;

  beforeAll(() => {
    tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-e2e-workspace-'));
    // Create a mock package.json in the test workspace
    fs.writeFileSync(
      path.join(tempWorkspace, 'package.json'),
      JSON.stringify(
        {
          name: 'e2e-mock-project',
          version: '1.0.0',
          dependencies: {
            express: '^4.18.2',
          },
        },
        null,
        2
      )
    );
  });

  afterAll(() => {
    if (tempWorkspace && fs.existsSync(tempWorkspace)) {
      try {
        fs.rmSync(tempWorkspace, { recursive: true, force: true });
      } catch {
        // Ignore temporary file cleanup locks on Windows
      }
    }
  });

  test('Step 1: tk init scaffolds .agent/ and IDE bridges in target project', () => {
    const res = spawnSync(process.execPath, [wrapperBin, 'init'], {
      cwd: tempWorkspace,
      encoding: 'utf8',
      env: { ...process.env, TRIBUNAL_FORCE_JS: '1' },
    });

    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tempWorkspace, '.agent'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, '.agent', 'agents'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, '.agent', 'skills'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, '.windsurfrules'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempWorkspace, 'AGENTS.md'))).toBe(true);
  });

  test('Step 2: tk status reports green health cockpit', () => {
    const res = spawnSync(process.execPath, [wrapperBin, 'status'], {
      cwd: tempWorkspace,
      encoding: 'utf8',
      env: { ...process.env, TRIBUNAL_FORCE_JS: '1' },
    });

    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/(Status|Health|Reviewers|Skills|Bridges)/i);
  });

  test('Step 3: tk sync synchronizes IDE bridges successfully', () => {
    const res = spawnSync(process.execPath, [wrapperBin, 'sync'], {
      cwd: tempWorkspace,
      encoding: 'utf8',
      env: { ...process.env, TRIBUNAL_FORCE_JS: '1' },
    });

    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tempWorkspace, '.cursorrules'))).toBe(true);
  });

  test('Step 4: tk memory store persists memory entry', () => {
    const res = spawnSync(
      process.execPath,
      [
        wrapperBin,
        'memory',
        'store',
        '--type',
        'semantic',
        '--content',
        'Never store raw secrets in codebase',
        '--tags',
        'security,secrets',
      ],
      {
        cwd: tempWorkspace,
        encoding: 'utf8',
      }
    );

    expect(res.status).toBe(0);
  });

  test('Step 5: tk memory recall retrieves persisted memory entry', () => {
    const res = spawnSync(process.execPath, [wrapperBin, 'memory', 'recall', 'secrets'], {
      cwd: tempWorkspace,
      encoding: 'utf8',
    });

    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.action).toBe('recall');
    expect(parsed.query).toBe('secrets');
    expect(parsed.count).toBeGreaterThanOrEqual(1);
    expect(parsed.entries[0].content).toBe('Never store raw secrets in codebase');
  });

  test('Step 6: tk case add and search operations succeed', () => {
    const addRes = spawnSync(
      process.execPath,
      [
        wrapperBin,
        'case',
        'add',
        '--rule',
        'No plaintext secrets',
        '--reason',
        'OWASP credential protection',
        '--bad',
        'const key = "12345";',
        '--good',
        'const key = process.env.KEY;',
      ],
      {
        cwd: tempWorkspace,
        encoding: 'utf8',
        env: { ...process.env, TRIBUNAL_FORCE_JS: '1' },
      }
    );
    expect(addRes.status).toBe(0);

    const searchRes = spawnSync(process.execPath, [wrapperBin, 'case', 'search', 'secrets'], {
      cwd: tempWorkspace,
      encoding: 'utf8',
      env: { ...process.env, TRIBUNAL_FORCE_JS: '1' },
    });
    expect(searchRes.status).toBe(0);
    expect(searchRes.stdout).toMatch(/(plaintext secrets|OWASP credential protection|case)/i);
  });

  test('Step 7: tk impact-tier evaluates risk scoring', () => {
    const res = spawnSync(
      process.execPath,
      [wrapperBin, 'impact-tier', '--files', 'src/auth/login.ts', '--lines', '120'],
      {
        cwd: tempWorkspace,
        encoding: 'utf8',
      }
    );

    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed).toHaveProperty('tier');
    expect(parsed).toHaveProperty('tier_name');
    expect(parsed.tier).toBeGreaterThanOrEqual(0);
  });
});
