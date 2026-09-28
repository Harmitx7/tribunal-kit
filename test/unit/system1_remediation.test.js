const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Expose the internal function for testing purposes
const system1Src = fs.readFileSync(path.resolve(__dirname, '../../src/commands/system1.js'), 'utf8');

describe('System-1 Laya Security Remediations', () => {
    test('Test A: Exact dependency pin', () => {
        // Assert that the source file does NOT contain ^0.1.2 and does contain 0.1.2
        expect(system1Src).not.toContain('^0.1.2');
        expect(system1Src).toContain('const RECEPTRON_LAYA_VERSION = "0.1.2"');
    });

    test('Test B: Shell disabled', () => {
        // Assert that we use process.execPath for win32 and shell: false
        expect(system1Src).toContain(`cmd = process.execPath;`);
        expect(system1Src).toContain(`cmd = 'npm';`);
        expect(system1Src).toContain(`shell: false`);
        expect(system1Src).not.toContain(`shell: process.platform === 'win32'`);
        expect(system1Src).not.toContain(`shell: true`);
    });

    describe('SHA-256 verification', () => {
        let verifyChecksum;

        beforeAll(() => {
            // Extract the verifyChecksum function dynamically for unit testing
            const match = system1Src.match(/function verifyChecksum.*?\{[\s\S]*?\n\}/m);
            if (match) {
                // Use a secure Function constructor sandbox
                verifyChecksum = new Function('require', `
                    const fs = require('fs');
                    const crypto = require('crypto');
                    const path = require('path');
                    ${match[0]}
                    return verifyChecksum;
                `)(require);
            }
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
