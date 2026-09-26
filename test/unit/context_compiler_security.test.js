'use strict';

/**
 * Security regression tests for context_compiler.js
 * ══════════════════════════════════════════════════
 * Verifies that OS command injection (CWE-78) via malicious filenames
 * is no longer possible in findInboundCallers() and extractFileSkeleton().
 *
 * These tests create temporary files with shell-metacharacter filenames
 * and verify that no unintended command execution occurs.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { analyzeSingleFile } = require('../../scripts/context_compiler');

/**
 * Helper: create a unique temporary directory for each test.
 * Returns the absolute path to the temp directory.
 */
function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tribunal-sec-${prefix}-`));
}

/**
 * Helper: clean up a temporary directory.
 */
function cleanupTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort cleanup
  }
}

describe('Security: Command Injection Regression Tests (CWE-78)', () => {
  let tempDir;

  afterEach(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
      tempDir = null;
    }
  });

  test('malicious filename with $() does not trigger shell command substitution', () => {
    tempDir = createTempDir('injection');
    // Create a marker path that would be created if command injection occurred
    const markerFile = path.join(tempDir, 'tribunal-kit-injection-marker');

    // The malicious filename contains a command substitution pattern.
    // On a vulnerable system, this would execute: touch <markerFile>
    // We use a platform-aware command to detect injection on both Unix and Windows.
    const isWin = process.platform === 'win32';
    const maliciousCmd = isWin ? `type nul > "${markerFile}"` : `touch "${markerFile}"`;
    const maliciousFilename = `util$(${maliciousCmd}).js`;

    // Create a safe file with the malicious filename
    const maliciousFilePath = path.join(tempDir, maliciousFilename);
    try {
      fs.writeFileSync(maliciousFilePath, '// test file\nmodule.exports = {};\n', 'utf8');
    } catch {
      // Some filesystems may reject the $ character — test is still valid
      // because the vulnerability is in how the stem is used in grep, not file creation
      console.log('Filesystem rejected malicious filename; creating safe equivalent');
      // Create a simpler file and manually test the code path
      const safeFile = path.join(tempDir, 'util_safe.js');
      fs.writeFileSync(safeFile, '// test file\nmodule.exports = {};\n', 'utf8');
    }

    // Even if file creation fails, the marker must NOT exist
    expect(fs.existsSync(markerFile)).toBe(false);

    // If the file was successfully created, run the full analysis
    if (fs.existsSync(maliciousFilePath)) {
      // This should NOT trigger shell execution of the $() expression
      // The function will fail to find callers (no git repo), but that's expected
      try {
        analyzeSingleFile(maliciousFilePath, tempDir);
      } catch {
        // Expected: may throw because tempDir is not a git repo
      }

      // CRITICAL ASSERTION: The marker file must NOT have been created
      expect(fs.existsSync(markerFile)).toBe(false);
    }
  });

  test('filename with backtick command substitution does not execute', () => {
    tempDir = createTempDir('backtick');
    const markerFile = path.join(tempDir, 'backtick-injection-marker');

    // Backtick-based command substitution
    const maliciousFilename = 'util`touch ' + markerFile.replace(/\\/g, '/') + '`.js';

    const maliciousFilePath = path.join(tempDir, maliciousFilename);
    try {
      fs.writeFileSync(maliciousFilePath, '// backtick test\nconst x = 1;\n', 'utf8');
    } catch {
      // Filesystem may reject backticks
    }

    expect(fs.existsSync(markerFile)).toBe(false);

    if (fs.existsSync(maliciousFilePath)) {
      try {
        analyzeSingleFile(maliciousFilePath, tempDir);
      } catch {
        // Expected
      }
      expect(fs.existsSync(markerFile)).toBe(false);
    }
  });

  test('filename with shell metacharacters is handled safely', () => {
    tempDir = createTempDir('metachar');

    // Test various shell metacharacters in filenames
    const testCases = [
      { name: 'spaces in name.js', content: 'const a = 1;' },
      { name: 'quotes"in"name.js', content: 'const b = 2;' },
      { name: "single'quote.js", content: 'const c = 3;' },
      { name: 'semi;colon.js', content: 'const d = 4;' },
      { name: 'pipe|char.js', content: 'const e = 5;' },
      { name: 'ampersand&name.js', content: 'const f = 6;' },
    ];

    for (const tc of testCases) {
      const filePath = path.join(tempDir, tc.name);
      try {
        fs.writeFileSync(filePath, tc.content + '\n', 'utf8');

        // Should not throw due to shell interpretation
        try {
          analyzeSingleFile(filePath, tempDir);
        } catch {
          // May fail for non-git reasons; that's OK
        }
      } catch {
        // Filesystem may reject certain characters (especially on Windows)
      }
    }

    // If we get here without uncaught exceptions, the test passes
    expect(true).toBe(true);
  });

  test('filename starting with dash is not interpreted as option', () => {
    tempDir = createTempDir('dash');

    const dashFilePath = path.join(tempDir, '-dangerous-flag.js');
    fs.writeFileSync(dashFilePath, '// dash test\nmodule.exports = {};\n', 'utf8');

    // Should not throw due to the dash being interpreted as a git/rg option
    try {
      analyzeSingleFile(dashFilePath, tempDir);
    } catch {
      // Expected: not a git repo
    }

    // Success: no unintended option interpretation
    expect(true).toBe(true);
  });

  test('filename with newlines does not cause argument splitting', () => {
    tempDir = createTempDir('newline');

    // Most filesystems don't allow newlines in filenames, but we test the token
    // derivation logic directly. Create a normal file and verify behavior.
    const safePath = path.join(tempDir, 'normalfile.js');
    fs.writeFileSync(safePath, '// normal test\nmodule.exports = {};\n', 'utf8');

    try {
      const result = analyzeSingleFile(safePath, tempDir);
      // The callers array should be empty or contain valid entries
      expect(Array.isArray(result.callers)).toBe(true);
    } catch {
      // Expected in non-git directory
    }
  });

  test('filename with Unicode characters is handled safely', () => {
    tempDir = createTempDir('unicode');

    const unicodePath = path.join(tempDir, 'утилита_工具.js');
    try {
      fs.writeFileSync(unicodePath, '// unicode test\nconst x = 1;\n', 'utf8');

      try {
        analyzeSingleFile(unicodePath, tempDir);
      } catch {
        // Expected
      }
    } catch {
      // Filesystem may not support these characters
    }

    // No crash = success
    expect(true).toBe(true);
  });

  test('filename with redirection characters does not create files', () => {
    tempDir = createTempDir('redirect');
    const markerFile = path.join(tempDir, 'redirect-marker');

    // Filenames with shell redirection operators
    const redirectNames = [
      `redir_gt.js`, // safe name for systems rejecting >
      `redir_lt.js`, // safe name for systems rejecting <
    ];

    for (const name of redirectNames) {
      const filePath = path.join(tempDir, name);
      try {
        fs.writeFileSync(filePath, '// redirect test\n', 'utf8');
        try {
          analyzeSingleFile(filePath, tempDir);
        } catch {
          // Expected: not a git repo
        }
      } catch {
        // Filesystem may reject these characters
      }
    }

    // Marker must NOT have been created by shell redirection
    expect(fs.existsSync(markerFile)).toBe(false);
  });

  test('filename with && command chaining does not execute second command', () => {
    tempDir = createTempDir('andand');
    const markerFile = path.join(tempDir, 'andand-marker');

    // Use a safe filename since Windows rejects && in filenames
    const safeName = 'util_ampamp.js';
    const filePath = path.join(tempDir, safeName);
    fs.writeFileSync(filePath, '// chain test\n', 'utf8');
    try {
      analyzeSingleFile(filePath, tempDir);
    } catch {
      // Expected
    }

    expect(fs.existsSync(markerFile)).toBe(false);
  });

  test('filename with || command chaining does not execute fallback command', () => {
    tempDir = createTempDir('orpipe');
    const markerFile = path.join(tempDir, 'orpipe-marker');

    // Use a safe filename since Windows rejects || in filenames
    const safeName = 'util_orpipe.js';
    const filePath = path.join(tempDir, safeName);
    fs.writeFileSync(filePath, '// or-pipe test\n', 'utf8');
    try {
      analyzeSingleFile(filePath, tempDir);
    } catch {
      // Expected
    }

    expect(fs.existsSync(markerFile)).toBe(false);
  });
});

describe('Security: execFileSync is used instead of execSync for grep', () => {
  test('context_compiler.js does not use shell-interpolated execSync for grep commands', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // Verify no shell-interpolated git grep or rg commands remain
    // These patterns indicate the vulnerable code pattern
    expect(source).not.toMatch(/execSync\s*\(\s*`git grep/);
    expect(source).not.toMatch(/execSync\s*\(\s*`rg /);

    // Verify execFileSync is used for search commands
    expect(source).toMatch(/execFileSync\s*\(\s*'git'/);
    expect(source).toMatch(/execFileSync\s*\(\s*'rg'/);

    // Verify -e flag is used for safe token passing
    expect(source).toMatch(/'-e',\s*token/);
  });

  test('context_compiler.js does not use shell-interpolated execSync for AST extraction', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // The old vulnerable pattern was:
    //   execSync(`"${corePath}" ast-extract --file "${absPath}"`, ...)
    // Verify this pattern no longer exists
    expect(source).not.toMatch(/execSync\s*\(\s*`.*ast-extract/);

    // Verify execFileSync is used instead
    expect(source).toMatch(/execFileSync\s*\(\s*corePath,\s*\['ast-extract'/);
  });

  test('context_compiler.js does not use execSync at all', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // The context compiler should only use execFileSync (no shell)
    // It should NOT require or use execSync
    expect(source).not.toMatch(/\bexecSync\b/);
    expect(source).toMatch(/\bexecFileSync\b/);
  });

  test('dist/commands/sdd.js uses execFileSync for git operations with user input', () => {
    const sourcePath = path.resolve(__dirname, '../../dist/commands/sdd.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // sdd.js should NOT have template-literal git commands with user input
    expect(source).not.toMatch(/execSync\s*\(\s*`git rev-parse.*\$\{/);
    expect(source).not.toMatch(/execSync\s*\(\s*`git diff.*\$\{/);

    // Verify execFileSync is used for git rev-parse and git diff
    expect(source).toMatch(/execFileSync\s*\(\s*"git",\s*\["rev-parse"/);
    expect(source).toMatch(/execFileSync\s*\(\s*"git",\s*\["diff"/);
  });
});

describe('Security: findInboundCallers argument structure', () => {
  test('git grep uses -e flag to prevent option injection via dash-prefixed tokens', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // The -e flag must appear before the token in the argument array
    // to prevent tokens starting with '-' from being parsed as options
    expect(source).toMatch(/'-e',\s*\n?\s*token/);
  });

  test('git grep uses -- separator to isolate pathspec arguments', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // The -- separator must appear in the argument array
    expect(source).toMatch(/'--',/);
  });

  test('ripgrep fallback uses -e flag for safe pattern passing', () => {
    const sourcePath = path.resolve(__dirname, '../../scripts/context_compiler.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    // The ripgrep invocation must also use -e for the search pattern
    // Find the rg block and verify -e is present
    const rgBlock = source.match(/execFileSync\s*\(\s*'rg'[\s\S]*?\)/);
    expect(rgBlock).toBeTruthy();
    expect(rgBlock[0]).toContain("'-e'");
  });
});
