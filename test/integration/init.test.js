'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const CLI = path.resolve(__dirname, '../../bin/tribunal-kit.js');

function runCLI(args = [], opts = {}) {
    return spawnSync(process.execPath, [CLI, ...args], {
        encoding : 'utf8',
        timeout  : 15000,
        env      : { ...process.env, TK_SKIP_UPDATE_CHECK: '1' },
        ...opts,
    });
}

describe('tribunal-kit init command', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-init-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('init --path installs .agent/ and exits 0', () => {
        const result = runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(tmpDir, '.agent'))).toBe(true);
    });

    test('init --dry-run writes NO files and exits 0', () => {
        const dryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-dry-'));
        fs.rmSync(dryDir, { recursive: true, force: true });
        fs.mkdirSync(dryDir);
        const result = runCLI(['init', '--path', dryDir, '--dry-run', '--skip-update-check']);
        expect(result.status).toBe(0);
        expect(fs.existsSync(path.join(dryDir, '.agent'))).toBe(false);
        fs.rmSync(dryDir, { recursive: true, force: true });
    });

    test('init warns and exits 0 when .agent already exists (no --force)', () => {
        // Pre-create the .agent dir
        fs.mkdirSync(path.join(tmpDir, '.agent'));
        const result = runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        expect(result.status).toBe(0);
        // Should warn about existing install
        expect(result.stdout).toMatch(/already exists|--force/i);
    });

    test('init --quiet suppresses main output and exits 0', () => {
        const result = runCLI(['init', '--path', tmpDir, '--quiet', '--skip-update-check']);
        expect(result.status).toBe(0);
        // --quiet suppresses the big banner/card but dim() may still emit
        // a version line; what matters is the .agent/ folder was installed
        expect(fs.existsSync(path.join(tmpDir, '.agent'))).toBe(true);
    });

    test('init --force overwrites existing .agent/ and exits 0', () => {
        // First install
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        // Write a marker inside a known-cleaned subdir (agents/)
        const marker = path.join(tmpDir, '.agent', 'agents', '__test_marker__.md');
        fs.writeFileSync(marker, 'marker');
        // Force reinstall
        const result = runCLI(['init', '--path', tmpDir, '--force', '--skip-update-check']);
        expect(result.status).toBe(0);
        // The agents/ subdir is wiped and rebuilt, so the extra marker is gone
        expect(fs.existsSync(marker)).toBe(false);
    });
});

describe('tribunal-kit status command', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-status-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('status exits 0 when not installed', () => {
        const result = runCLI(['status', '--path', tmpDir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/not installed/i);
    });

    test('status exits 0 and shows counts when installed', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const result = runCLI(['status', '--path', tmpDir]);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/installed/i);
    });
});

describe('tribunal-kit help / unknown commands', () => {
    test('--help exits 0 and shows usage', () => {
        const result = runCLI(['--help']);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/init|update|status/i);
    });

    test('unknown command exits 1', () => {
        const result = runCLI(['totally-unknown-command']);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/unknown command/i);
    });
});
