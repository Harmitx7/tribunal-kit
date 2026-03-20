'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { copyDir, countDir } = require('../../bin/tribunal-kit');

function makeTempDir(prefix = 'tk-test-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('countDir', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = makeTempDir();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('returns 0 for empty directory', () => {
        expect(countDir(tmpDir)).toBe(0);
    });

    test('counts files at top level', () => {
        fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'a');
        fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'b');
        expect(countDir(tmpDir)).toBe(2);
    });

    test('counts files recursively in subdirectories', () => {
        const sub = path.join(tmpDir, 'sub');
        fs.mkdirSync(sub);
        fs.writeFileSync(path.join(tmpDir, 'top.txt'), 'top');
        fs.writeFileSync(path.join(sub, 'nested.txt'), 'nested');
        expect(countDir(tmpDir)).toBe(2);
    });
});

describe('copyDir', () => {
    let srcDir;
    let destDir;

    beforeEach(() => {
        srcDir  = makeTempDir('tk-src-');
        destDir = makeTempDir('tk-dest-');
        // Remove destDir so copyDir can create it fresh
        fs.rmSync(destDir, { recursive: true, force: true });
    });

    afterEach(() => {
        fs.rmSync(srcDir,  { recursive: true, force: true });
        fs.rmSync(destDir, { recursive: true, force: true });
    });

    test('copies files to destination', () => {
        fs.writeFileSync(path.join(srcDir, 'hello.txt'), 'hello');
        copyDir(srcDir, destDir);
        expect(fs.existsSync(path.join(destDir, 'hello.txt'))).toBe(true);
        expect(fs.readFileSync(path.join(destDir, 'hello.txt'), 'utf8')).toBe('hello');
    });

    test('copies nested directories recursively', () => {
        const sub = path.join(srcDir, 'sub');
        fs.mkdirSync(sub);
        fs.writeFileSync(path.join(sub, 'nested.txt'), 'nested');
        copyDir(srcDir, destDir);
        expect(fs.existsSync(path.join(destDir, 'sub', 'nested.txt'))).toBe(true);
    });

    test('returns total file count copied', () => {
        fs.writeFileSync(path.join(srcDir, 'a.txt'), 'a');
        fs.writeFileSync(path.join(srcDir, 'b.txt'), 'b');
        const count = copyDir(srcDir, destDir);
        expect(count).toBe(2);
    });

    test('dry-run does NOT create destination files', () => {
        fs.writeFileSync(path.join(srcDir, 'hello.txt'), 'hello');
        const destDryRun = path.join(os.tmpdir(), 'tk-dryrun-' + Date.now());
        copyDir(srcDir, destDryRun, true);
        expect(fs.existsSync(destDryRun)).toBe(false);
    });

    test('dry-run still returns correct file count', () => {
        fs.writeFileSync(path.join(srcDir, 'a.txt'), 'a');
        fs.writeFileSync(path.join(srcDir, 'b.txt'), 'b');
        const destDryRun = path.join(os.tmpdir(), 'tk-dryrun2-' + Date.now());
        const count = copyDir(srcDir, destDryRun, true);
        expect(count).toBe(2);
    });
});
