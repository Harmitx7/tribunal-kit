const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Expose the internal function for testing purposes
const system1Src = fs.readFileSync(
  path.resolve(__dirname, '../../src/commands/system1.js'),
  'utf8',
);

describe('System-1 Laya Security Remediations', () => {
  test('Test A: Exact dependency pin', () => {
    // Assert that the source file does NOT contain ^0.1.2 and does contain 0.1.2
    expect(system1Src).not.toContain('^0.1.2');
    expect(system1Src).toMatch(/const RECEPTRON_LAYA_VERSION = ['"]0\.1\.2['"]/);
  });

  test('Test B: Windows NPM Resolution', () => {
    // Assert that we use npm.cmd for win32 and shell: true for Windows
    expect(system1Src).toContain(`cmd = 'npm.cmd';`);
    expect(system1Src).toContain(`shell = true; // Windows requires shell: true for .cmd files`);
    expect(system1Src).toContain(`cmd = 'npm';`);
    expect(system1Src).toContain(`shell: shell`);
  });

  describe('SHA-256 verification', () => {
    let verifyChecksum;

    beforeAll(() => {
      const system1 = require('../../src/commands/system1');
      verifyChecksum = system1.verifyChecksum;
    });

    test('Test C: SHA-256 success', async () => {
      expect(verifyChecksum).toBeDefined();

      // Create a small test fixture
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-laya-test-'));
      const fixturePath = path.join(tmpDir, 'test.onnx');
      const data = 'fake-model-data';
      fs.writeFileSync(fixturePath, data);

      const expectedHash = crypto.createHash('sha256').update(data).digest('hex');

      // Should pass
      await expect(verifyChecksum(fixturePath, expectedHash)).resolves.toBe(true);
      fs.rmSync(tmpDir, { recursive: true });
    });

    test('Test D: SHA-256 failure', async () => {
      expect(verifyChecksum).toBeDefined();

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-laya-test-'));
      const fixturePath = path.join(tmpDir, 'test.onnx');
      const data = 'fake-model-data';
      fs.writeFileSync(fixturePath, data);

      // Deliberately incorrect hash
      const expectedHash = 'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e';

      // Should fail
      await expect(verifyChecksum(fixturePath, expectedHash)).rejects.toThrow(/Hash mismatch/);
      fs.rmSync(tmpDir, { recursive: true });
    });
  });
});
