'use strict';

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { isSelfInstall } = require('../../bin/tribunal-kit');

describe('isSelfInstall', () => {
    test('returns true when target is the kit root (package root)', () => {
        // The kit root is one level above bin/
        const kitRoot = path.resolve(__dirname, '../../');
        expect(isSelfInstall(kitRoot)).toBe(true);
    });

    test('returns false for an unrelated directory', () => {
        expect(isSelfInstall(os.tmpdir())).toBe(false);
    });

    test('returns true when target package.json has name "tribunal-kit"', () => {
        // Create a temp dir with a fake package.json mimicking the kit
        const fakeKitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-tk-'));
        fs.writeFileSync(
            path.join(fakeKitDir, 'package.json'),
            JSON.stringify({ name: 'tribunal-kit', version: '1.0.0' })
        );
        expect(isSelfInstall(fakeKitDir)).toBe(true);
        fs.rmSync(fakeKitDir, { recursive: true, force: true });
    });

    test('returns false when target package.json has a different name', () => {
        const fakeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'other-pkg-'));
        fs.writeFileSync(
            path.join(fakeDir, 'package.json'),
            JSON.stringify({ name: 'my-other-project', version: '1.0.0' })
        );
        expect(isSelfInstall(fakeDir)).toBe(false);
        fs.rmSync(fakeDir, { recursive: true, force: true });
    });

    test('returns false when target has no package.json', () => {
        const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-pkg-'));
        expect(isSelfInstall(emptyDir)).toBe(false);
        fs.rmSync(emptyDir, { recursive: true, force: true });
    });
});
