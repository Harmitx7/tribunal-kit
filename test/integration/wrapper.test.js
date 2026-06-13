'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WRAPPER = path.resolve(__dirname, '../../bin/wrapper.js');

function runWrapper(args = []) {
    return spawnSync(process.execPath, [WRAPPER, ...args], {
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, TK_SKIP_UPDATE_CHECK: '1' }
    });
}

describe('wrapper.js fallback routing', () => {
    test('routes unknown commands to JS implementation directly', () => {
        const result = runWrapper(['unknown-command-test']);
        // The JS implementation outputs 'Tribunal Kit' when run without args or unhandled command
        expect(result.stdout).toContain('Run tribunal-kit --help for usage');
    });

    test('warns and falls back to JS when Rust binary is not found for supported command', () => {
        const result = runWrapper(['status']);
        // Since the binary doesn't exist yet, it should log the warning and then run JS status
        expect(result.stderr).toContain('Rust binary not found');
        // Check that the JS status command actually runs (it usually prints the agent config status)
        // We look for any known output from JS cmdStatus or at least lack of Rust execution
        expect(result.stdout).not.toContain('Executing via Rust Core Engine');
    });
});
