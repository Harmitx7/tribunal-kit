'use strict';

const { cmdGuardrail } = require('../../src/commands/guardrail');
const logger = require('../../src/utils/logger');

describe('SEC-004: Guardrail CLI Path Traversal Containment', () => {
  let exitSpy;
  let errSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit: ${code}`);
    });
    errSpy = jest.spyOn(logger, 'err').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  test('cmdGuardrail rejects fileArg attempting path traversal outside projectRoot', async () => {
    const flags = { path: process.cwd() };
    const argv = ['node', 'tk', 'guardrail', '--file', '../../outside_secret.md'];

    await expect(cmdGuardrail(flags, argv, true)).rejects.toThrow('process.exit: 1');
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Path traversal detected|Path security violation/),
    );
  });
});
