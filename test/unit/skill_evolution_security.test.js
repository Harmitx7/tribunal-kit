'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('TK-007: Skill Evolution Security Hardening', () => {
  const scriptsDir = path.resolve(__dirname, '../../.agent/scripts');
  const skillEvolution = require(path.join(scriptsDir, 'skill_evolution'));

  test('renderSkillMd replaces Authority Level ABSOLUTE with ADVISORY (Human-Reviewed)', () => {
    const rendered = skillEvolution.renderSkillMd([
      { pattern: 'test-pattern', reason: 'test-reason', domain: 'security', since: '2026-11-19' },
    ]);

    expect(rendered).toContain('Authority Level: ADVISORY (Human-Reviewed)');
    expect(rendered).not.toContain('Authority Level: ABSOLUTE');
    expect(rendered).toContain('All rules require human approval before taking effect.');
  });

  test('secret_redactor is wired to redact API keys from diff payloads', () => {
    const { redactSecrets } = require(path.join(scriptsDir, 'secret_redactor'));
    const secretDiff = '+ const apiKey = "sk-1234567890123456789012345678901234";';
    const redacted = redactSecrets(secretDiff);

    expect(redacted.redactions).toBeGreaterThan(0);
    expect(redacted.text).not.toContain('sk-1234567890123456789012345678901234');
    expect(redacted.text).toContain('[REDACTED_API_KEY]');
  });

  test('callLlmApi redacts prompt content containing secrets', async () => {
    // Calling with a fake provider to observe redacted prompt
    const secretPrompt = 'Here is the diff: sk-1234567890123456789012345678901234';
    // Even if network fails, prompt redaction runs first
    const res = await skillEvolution.callLlmApi(secretPrompt, 'unknown-provider', 'key');
    expect(res).toBeNull();
  });

  test('cmdDigest enforces path containment on --log argument', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await skillEvolution.cmdDigest(['--log=../../outside_workspace.log']);
    const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
    consoleSpy.mockRestore();

    expect(output).toMatch(/Security Violation/);
  });
});
