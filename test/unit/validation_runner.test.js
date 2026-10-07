'use strict';

const { ValidationRunner, VALIDATION_REGISTRY } = require('../../src/execution/validation_runner');
const path = require('path');

describe('ValidationRunner', () => {
  let runner;

  beforeEach(() => {
    runner = new ValidationRunner({ workspaceRoot: process.cwd() });
  });

  it('fails closed when validationId is unknown (allowlist enforcement)', async () => {
    const result = await runner.run('arbitrary_malicious_command');
    expect(result.status).toBe('CRASHED');
    expect(result.stderr).toContain('Unknown validation ID');
  });

  it('executes a known validation safely', async () => {
    // We add a safe mock to the registry for testing
    VALIDATION_REGISTRY.test_echo = {
      command: 'node',
      args: ['-e', 'console.log("Tests: 5 passed")'],
      timeout: 5000,
      parser: 'jest',
    };

    const result = await runner.run('test_echo');
    expect(result.status).toBe('PASSED');
    expect(result.testsPassed).toBe(5);
  });

  it('fails closed on workspace traversal attempts (sandbox constraint)', async () => {
    runner = new ValidationRunner({
      workspaceRoot: path.resolve(process.cwd(), '../fake-outside-dir'),
    });

    const result = await runner.run('test_echo');
    expect(result.status).toBe('CRASHED');
    expect(result.stderr).toContain('Path traversal detected');
  });

  it('handles timeouts correctly (resource constraint)', async () => {
    VALIDATION_REGISTRY.test_timeout = {
      command: 'node',
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      timeout: 100, // Very short timeout
      parser: 'jest',
    };

    const result = await runner.run('test_timeout');
    expect(result.status).toBe('TIMEOUT');
  });
});
