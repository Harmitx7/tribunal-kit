const { analyzeSingleFile } = require('../../scripts/context_compiler');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Security Regression: Command Injection in context_compiler', () => {
  let execFileSyncSpy;
  let existsSyncSpy;
  let readFileSyncSpy;

  beforeEach(() => {
    // Mock execFileSync to prevent actual git commands and check arguments
    execFileSyncSpy = jest.spyOn(cp, 'execFileSync').mockImplementation((cmd, args) => {
      if (args && args.includes('rev-parse')) return Buffer.from(path.resolve(__dirname, '../../'));
      return Buffer.from('');
    });

    // Mock fs functions to bypass Windows file name restrictions
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('export function test() {}');
  });

  afterEach(() => {
    execFileSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
    readFileSyncSpy.mockRestore();
  });

  test('analyzeSingleFile should use execFileSync with argument arrays, not shell strings', () => {
    const maliciousInput = 'test_file"; touch malicious_file.txt; echo ".txt';
    const workspace = path.resolve(__dirname, '../../');

    try {
      analyzeSingleFile(maliciousInput, workspace);
    } catch (_e) {
      // Catch possible errors later in the flow
    }

    // Verify that execFileSync was called (at least once for git rev-parse, and once for git grep)
    expect(execFileSyncSpy).toHaveBeenCalled();

    // Iterate through all calls to ensure the command is isolated from the arguments
    const calls = execFileSyncSpy.mock.calls;
    for (const [cmd, args] of calls) {
      if (cmd === 'git') {
        expect(Array.isArray(args)).toBe(true);
      } else if (cmd === 'rg') {
        expect(Array.isArray(args)).toBe(true);
      }
    }
  });
});
