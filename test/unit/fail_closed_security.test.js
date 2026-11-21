'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

describe('TK-011: Fail-Closed Security & Strong Exit Codes', () => {
  const scriptsDir = path.resolve(__dirname, '../../.agent/scripts');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-failclosed-test-'));

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  test('security_scan.js: exits non-zero (code 1) when HIGH severity issues are detected', () => {
    const vulnerableFile = path.join(tempDir, 'vuln.js');
    // Pattern that triggers HIGH severity (e.g. hardcoded jwt secret or eval)
    fs.writeFileSync(
      vulnerableFile,
      'const secret = "secret123"; const token = jwt.sign(payload, secret); eval(req.query.cmd);',
      'utf8',
    );

    const res = spawnSync(
      process.execPath,
      [path.join(scriptsDir, 'security_scan.js'), tempDir, '--severity', 'high'],
      { encoding: 'utf8' },
    );

    expect(res.status).toBe(1);
    expect(res.stdout).toMatch(/critical\/high issue\(s\) require immediate attention|HIGH/);
  });

  test('guardrail_engine.js: does not bypass // VERIFY check on substring match containing .agent in non-agent files', () => {
    const { ruleUnresolvedVerify } = require(path.join(scriptsDir, 'guardrail_engine'));
    const content = '// VERIFY: fix this before deploying';

    // File outside .agent whose filename has .agent as a substring
    const outsideCtx = {
      filePath: 'src/service.agent.validator.ts',
      projectRoot: tempDir,
    };
    const outsideViolations = ruleUnresolvedVerify(content, {}, outsideCtx);
    expect(outsideViolations.length).toBe(1);
    expect(outsideViolations[0].rule).toBe('unresolved-verify');

    // Genuine .agent internal file
    const insideCtx = {
      filePath: path.join(tempDir, '.agent', 'rules', 'test.md'),
      projectRoot: tempDir,
    };
    const insideViolations = ruleUnresolvedVerify(content, {}, insideCtx);
    expect(insideViolations.length).toBe(0);
  });

  test('skill_behavior_harness.js: returns UNPROVABLE and no PASS evidence for unexecutable or stubbed scenarios', () => {
    const { runBehavioralTest } = require(path.join(scriptsDir, 'skill_behavior_harness'));
    const skill = { name: 'unverified-skill', version: '1.0.0' };
    const classification = { class: 'EXECUTABLE', verification_mode: 'sandbox' };
    const scenarios = [{ id: 'generic-stubbed-scenario', status: 'PROVABLE', confidence: 0.5 }];

    const result = runBehavioralTest(skill, classification, scenarios);
    expect(result.status).toBe('UNPROVABLE');
    expect(result.evidence.length).toBe(1);
    expect(result.evidence[0].result.status).toBe('FAIL');
    expect(result.evidence[0].observation.unprovable).toBe(true);
  });
});
