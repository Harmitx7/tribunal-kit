'use strict';

const fs = require('fs');
const path = require('path');
const { validateOutputPath, cmdDeconstruct } = require('../../src/commands/deconstruct');

describe('Phase 2 (#13) — tk deconstruct --output security & path containment', () => {
  const cwd = process.cwd();

  describe('validateOutputPath', () => {
    test('accepts valid workspace-relative path', () => {
      const rel = 'src/components/Card.tsx';
      const resolved = validateOutputPath(rel, cwd);
      expect(resolved).toBe(path.resolve(cwd, rel));
    });

    test('rejects null bytes in output path', () => {
      expect(() => {
        validateOutputPath('src/components/Card\0.tsx', cwd);
      }).toThrow(/Null byte detected/i);
    });

    test('rejects path traversal attempting to escape workspace root', () => {
      expect(() => {
        validateOutputPath('../../evil.tsx', cwd);
      }).toThrow(/Path traversal detected/i);

      expect(() => {
        validateOutputPath('../../../etc/passwd', cwd);
      }).toThrow(/Path traversal detected/i);
    });

    test('rejects absolute paths outside workspace root', () => {
      const outside = path.resolve(cwd, '..', 'external.tsx');
      expect(() => {
        validateOutputPath(outside, cwd);
      }).toThrow(/Path traversal detected/i);
    });

    test('rejects writing directly to filesystem root', () => {
      const rootPath = path.parse(cwd).root;
      expect(() => {
        validateOutputPath(rootPath, cwd);
      }).toThrow(/filesystem root is forbidden/i);
    });
  });

  describe('cmdDeconstruct CLI output containment', () => {
    test('fails fast and does not create file on traversal attempt', async () => {
      const outsideFile = path.resolve(cwd, '..', 'evil_deconstruct_test.tsx');
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      const flags = {
        selector: '.btn',
        output: '../../evil_deconstruct_test.tsx',
      };
      const processArgs = ['node', 'tk', 'deconstruct', 'https://example.com'];

      await expect(cmdDeconstruct(flags, processArgs, true)).rejects.toThrow('process.exit: 1');
      expect(fs.existsSync(outsideFile)).toBe(false);
      mockExit.mockRestore();
    });
  });
});
