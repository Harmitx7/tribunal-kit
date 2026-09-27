const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');
const crypto = require('crypto');
const provider = require('../../src/system1/provider');
const { cmdSystem1 } = require('../../src/commands/system1');

// Mock child_process and console
jest.mock('child_process');
jest.mock('../../src/system1/provider', () => ({
    getLayaDir: jest.fn(),
    getConfigPath: jest.fn()
}));

jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('System-1 Laya Pre-Load Integrity Boundary', () => {
    let layaDir;
    let events = [];

    beforeEach(() => {
        events = [];
        // Use a temp dir for layaDir
        layaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-laya-test-'));
        jest.spyOn(provider, 'getLayaDir').mockReturnValue(layaDir);
        jest.spyOn(provider, 'getConfigPath').mockReturnValue(path.join(layaDir, 'config.json'));
        
        // Mock execFileSync to not actually run npm ci, but just create a dummy module
        child_process.execFileSync.mockImplementation((cmd, args) => {
            events.push('npm_ci');
            const modDir = path.join(layaDir, 'node_modules', '@receptron', 'laya');
            fs.mkdirSync(modDir, { recursive: true });
            
            // Create a fake module that records events
            const fakeModule = `
                module.exports.ensureBundle = async (opts) => {
                    global.layaEvents.push('downloadCompleted');
                    return opts.cacheDir;
                };
                module.exports.Laya = {
                    load: async (opts) => {
                        global.layaEvents.push('layaLoadStarted');
                        return { close: async () => {} };
                    }
                };
            `;
            fs.writeFileSync(path.join(modDir, 'index.js'), fakeModule);
        });

        global.layaEvents = events;
    });

    afterEach(() => {
        if (fs.existsSync(layaDir)) {
            fs.rmSync(layaDir, { recursive: true, force: true });
        }
        delete global.layaEvents;
        jest.restoreAllMocks();
    });

    test('Test E: Order must be acquire -> verify -> load', async () => {
        // Setup valid hashes
        const modelsDir = path.join(layaDir, 'models');
        fs.mkdirSync(modelsDir, { recursive: true });
        const onnxData = 'fake-onnx';
        const onnxDataExt = 'fake-onnx-data';
        
        fs.writeFileSync(path.join(modelsDir, 'laya.onnx'), onnxData);
        fs.writeFileSync(path.join(modelsDir, 'laya.onnx.data'), onnxDataExt);
        
        fs.mkdirSync(path.join(modelsDir, 'tokenizer'), { recursive: true });
        fs.writeFileSync(path.join(modelsDir, 'tokenizer/tokenizer.json'), '{}');
        fs.writeFileSync(path.join(modelsDir, 'tokenizer/tokenizer_config.json'), '{}');

        // Let's mock crypto.createHash to return a fake hash stream that yields the expected hashes.
        let fileIndex = 0;
        const expectedHashes = [
            'a874eb254b58b0fcb1e7ad56fbb188c29d64e08c9a46b689433e1f52c66dba1e',
            '487746363a8da57bcadb4345352997d22a0fb90d70aa22c6856668d023242aba'
        ];
        jest.spyOn(crypto, 'createHash').mockImplementation(() => {
            events.push('checksumStarted');
            return {
                update: () => {},
                digest: () => {
                    events.push('checksumCompleted');
                    return expectedHashes[fileIndex++];
                }
            };
        });

        await cmdSystem1([], ['node', 'cli.js', 'enable'], true);

        // Verify the exact ordering!
        expect(events).toEqual([
            'npm_ci',
            'downloadCompleted',
            'checksumStarted',
            'checksumCompleted',
            'checksumStarted',
            'checksumCompleted',
            'layaLoadStarted'
        ]);
        
        expect(fs.existsSync(path.join(layaDir, 'config.json'))).toBe(true);
    });

    test('Test F: Hash failure prevents Laya.load', async () => {
        const modelsDir = path.join(layaDir, 'models');
        fs.mkdirSync(modelsDir, { recursive: true });
        fs.writeFileSync(path.join(modelsDir, 'laya.onnx'), 'bad');
        fs.writeFileSync(path.join(modelsDir, 'laya.onnx.data'), 'bad');

        jest.spyOn(crypto, 'createHash').mockImplementation(() => {
            events.push('checksumStarted');
            return {
                update: () => {},
                digest: () => {
                    events.push('checksumCompleted');
                    return 'wrong-hash';
                }
            };
        });

        // Suppress expected error
        jest.spyOn(process, 'exitCode', 'set').mockImplementation(() => {});

        await cmdSystem1([], ['node', 'cli.js', 'enable'], true);

        expect(events).toEqual([
            'npm_ci',
            'downloadCompleted',
            'checksumStarted',
            'checksumCompleted'
        ]);
        
        expect(events).not.toContain('layaLoadStarted');
        expect(fs.existsSync(layaDir)).toBe(false); // Should be quarantined/purged
    });
});
