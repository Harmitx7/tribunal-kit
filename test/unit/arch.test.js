'use strict';

const path = require('path');
const { cmdArch } = require('../../src/commands/arch');

describe('cmdArch command', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  let exitMock;

  beforeEach(() => {
    exitMock = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`process.exit: ${code}`);
    });
  });

  afterEach(() => {
    exitMock.mockRestore();
  });

  test('exports cmdArch function', () => {
    expect(typeof cmdArch).toBe('function');
  });

  test('runs help subcommand by default', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'help'], true),
    ).resolves.not.toThrow();
  });

  test('runs audit subcommand cleanly', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'audit'], true),
    ).resolves.not.toThrow();
  });

  test('runs verify subcommand cleanly', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'verify'], true),
    ).resolves.not.toThrow();
  });

  test('runs map subcommand cleanly', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'map'], true),
    ).resolves.not.toThrow();
  });

  test('runs impact subcommand with known target', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'impact', 'logger.js'], true),
    ).resolves.not.toThrow();
  });

  test('exits with code 1 if impact subcommand is called without target', async () => {
    await expect(
      cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'impact'], true),
    ).rejects.toThrow('process.exit: 1');
  });

  test('exits with code 1 if diff subcommand is called without models', async () => {
    await expect(cmdArch({ path: repoRoot }, ['node', 'tk', 'arch', 'diff'], true)).rejects.toThrow(
      'process.exit: 1',
    );
  });
});
