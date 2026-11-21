'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('TK-009: Path Containment Across Filesystem Scripts', () => {
  const scriptsDir = path.resolve(__dirname, '../../.agent/scripts');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-containment-test-'));

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('context_compiler.js: analyzeDirectory throws on parent directory traversal', () => {
    const { analyzeDirectory } = require(path.join(scriptsDir, 'context_compiler'));
    expect(() => {
      analyzeDirectory('../../..', tempDir);
    }).toThrow(/Path security violation|Security Violation/);
  });

  test('findings_validator.js: rejects --in escaping workspace root', () => {
    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'findings_validator.js'), '--in=../../secret.json', '--out=out.json'],
      { cwd: tempDir, encoding: 'utf8' },
    );
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Security Violation/);
  });

  test('findings_validator.js: fails closed (exit 1) on malformed JSON input', () => {
    const badJson = path.join(tempDir, 'malformed.json');
    fs.writeFileSync(badJson, '{ bad json: true, ', 'utf8');

    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'findings_validator.js'), `--in=${badJson}`, '--out=out.json'],
      { cwd: tempDir, encoding: 'utf8' },
    );
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Failed to parse JSON/);
  });

  test('mutation_runner.js: rejects target escaping workspace root', () => {
    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'mutation_runner.js'), '../../outside.js', 'npm test'],
      { cwd: tempDir, encoding: 'utf8' },
    );
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Security Violation/);
  });

  test('mutation_runner.js: rejects test command with shell metacharacters', () => {
    const dummyFile = path.join(tempDir, 'dummy.js');
    fs.writeFileSync(dummyFile, 'const x = 1;', 'utf8');

    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'mutation_runner.js'), dummyFile, 'npm test; echo PWNED'],
      { cwd: tempDir, encoding: 'utf8' },
    );
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/Security Violation: Shell metacharacters detected/);
  });

  test('skill_fixture_engine.js: rejects skillId with traversal characters', () => {
    const { createFixture } = require(path.join(scriptsDir, 'skill_fixture_engine'));
    expect(() => {
      createFixture('../../evil-skill');
    }).toThrow(/Invalid resource identifier/);
  });

  test('skill_behavior_harness.js: rejects skillRaw.name with traversal characters', () => {
    const { runBehavioralTest } = require(path.join(scriptsDir, 'skill_behavior_harness'));
    expect(() => {
      runBehavioralTest({ name: '../../evil-skill' }, { class: 'EXECUTABLE' }, []);
    }).toThrow(/Invalid resource identifier/);
  });

  test('skill_remediation_engine.js: rejects planId with traversal characters', () => {
    const { rollbackRemediation } = require(path.join(scriptsDir, 'skill_remediation_engine'));
    expect(() => {
      rollbackRemediation('../../evil-plan');
    }).toThrow(/Invalid resource identifier/);
  });

  test('skill_integrator.js: verifyScript returns invalid on path escaping workspace', () => {
    const { verifyScript } = require(path.join(scriptsDir, 'skill_integrator'));
    const result = verifyScript('../../outside.js', tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Path security violation/);
  });

  test('schema_validator.js: rejects --file escaping projectRoot', () => {
    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'schema_validator.js'), tempDir, '--file', '../../outside.prisma'],
      { cwd: tempDir, encoding: 'utf8' },
    );
    expect(res.status).toBe(1);
    expect(res.stdout + res.stderr).toMatch(/Security Violation/);
  });

  test('security_scan.js: rejects --files escaping projectRoot', () => {
    const { scanDirectory } = require(path.join(scriptsDir, 'security_scan'));
    const findings = scanDirectory(tempDir, ['../../outside.js']);
    expect(findings).toEqual([]);
  });
});
