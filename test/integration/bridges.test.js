'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const CLI = path.resolve(__dirname, '../../bin/tribunal-kit.js');

function runCLI(args = [], opts = {}) {
    return spawnSync(process.execPath, [CLI, ...args], {
        encoding : 'utf8',
        timeout  : 30000,
        env      : { ...process.env, TK_SKIP_UPDATE_CHECK: '1' },
        ...opts,
    });
}

describe('IDE Bridge File Generation', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-bridge-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('init creates .cursorrules', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const cursorRules = path.join(tmpDir, '.cursorrules');
        expect(fs.existsSync(cursorRules)).toBe(true);
        const content = fs.readFileSync(cursorRules, 'utf8');
        expect(content).toContain('Tribunal');
        expect(content).toContain('Anti-Hallucination');
    });

    test('init creates .windsurfrules', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const windsurfRules = path.join(tmpDir, '.windsurfrules');
        expect(fs.existsSync(windsurfRules)).toBe(true);
        const content = fs.readFileSync(windsurfRules, 'utf8');
        expect(content).toContain('Windsurf Bridge');
        expect(content).toContain('Tribunal');
    });

    test('init creates .gemini/settings.json', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const geminiSettings = path.join(tmpDir, '.gemini', 'settings.json');
        expect(fs.existsSync(geminiSettings)).toBe(true);
        const json = JSON.parse(fs.readFileSync(geminiSettings, 'utf8'));
        expect(json.rules).toBeDefined();
        expect(json.rules[0].path).toContain('.agent/rules/GEMINI.md');
    });

    test('init creates .github/copilot-instructions.md', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const copilot = path.join(tmpDir, '.github', 'copilot-instructions.md');
        expect(fs.existsSync(copilot)).toBe(true);
        const content = fs.readFileSync(copilot, 'utf8');
        expect(content).toContain('Copilot Bridge');
    });

    test('bridge files are NOT overwritten on re-init', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const cursorRules = path.join(tmpDir, '.cursorrules');
        fs.writeFileSync(cursorRules, '# My custom rules\nDo not touch');
        runCLI(['init', '--path', tmpDir, '--force', '--skip-update-check']);
        const content = fs.readFileSync(cursorRules, 'utf8');
        expect(content).toBe('# My custom rules\nDo not touch');
    });

    test('all bridge files contain the routing table', () => {
        runCLI(['init', '--path', tmpDir, '--skip-update-check']);
        const content = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf8');
        expect(content).toContain('backend-specialist');
        expect(content).toContain('frontend-specialist');
    });

    test('init --dry-run does NOT create bridge files', () => {
        runCLI(['init', '--path', tmpDir, '--dry-run', '--skip-update-check']);
        expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(false);
    });
});
