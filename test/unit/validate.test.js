'use strict';

const path = require('path');
const { cmdValidate } = require('../../src/commands/validate');

describe('cmdValidate command', () => {
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

  test('exports cmdValidate function', () => {
    expect(typeof cmdValidate).toBe('function');
  });

  test('validates existing .agent structure in repoRoot', async () => {
    const flags = { path: repoRoot, quiet: true };
    await expect(cmdValidate(flags, true)).resolves.not.toThrow();
  });

  test('validates a valid JSON file successfully', async () => {
    const flags = {
      path: repoRoot,
      file: path.join(repoRoot, 'package.json'),
      quiet: true,
    };
    await expect(cmdValidate(flags, true)).resolves.not.toThrow();
  });

  test('exits with code 1 if .agent directory is missing in target path', async () => {
    const fakeDir = path.join(repoRoot, 'non_existent_dir_12345');
    const flags = { path: fakeDir, quiet: true };
    await expect(cmdValidate(flags, true)).rejects.toThrow('process.exit: 1');
  });

  test('exits with code 1 if specified file does not exist', async () => {
    const flags = {
      path: repoRoot,
      file: path.join(repoRoot, 'non_existent_file.json'),
      quiet: true,
    };
    await expect(cmdValidate(flags, true)).rejects.toThrow('process.exit: 1');
  });
});
