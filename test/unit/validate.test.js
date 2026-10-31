'use strict';

const fs = require('fs');
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

  test('validates file even when target path has no .agent directory', async () => {
    const fakeDir = path.join(repoRoot, 'non_existent_dir_12345');
    const flags = {
      path: fakeDir,
      file: path.join(repoRoot, 'package.json'),
      quiet: true,
    };
    await expect(cmdValidate(flags, true)).resolves.not.toThrow();
  });

  test('rejects malformed swarm payload with exit code 1', async () => {
    const tempFile = path.join(repoRoot, 'scratch_invalid_swarm.json');
    fs.writeFileSync(tempFile, JSON.stringify({ workers: 'not-an-array' }));
    try {
      const flags = {
        path: repoRoot,
        file: tempFile,
        quiet: true,
      };
      await expect(cmdValidate(flags, true)).rejects.toThrow('process.exit: 1');
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

  test('validates conformant swarm payload successfully', async () => {
    const tempFile = path.join(repoRoot, 'scratch_valid_swarm.json');
    const validPayload = {
      workers: [
        {
          task_id: 'task-1',
          type: 'research',
          agent: 'research',
          goal: 'Investigate build system integrity',
          context: 'Focus on validate command parity',
        },
      ],
      wave: 'full',
    };
    fs.writeFileSync(tempFile, JSON.stringify(validPayload));
    try {
      const flags = {
        path: repoRoot,
        file: tempFile,
        quiet: true,
      };
      await expect(cmdValidate(flags, true)).resolves.not.toThrow();
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });
});
