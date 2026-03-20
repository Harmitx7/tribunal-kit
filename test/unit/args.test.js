'use strict';

const { parseArgs } = require('../../bin/tribunal-kit');

describe('parseArgs', () => {
    test('parses "init" command', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init']);
        expect(result.command).toBe('init');
        expect(result.flags).toEqual({});
    });

    test('parses "update" command', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'update']);
        expect(result.command).toBe('update');
    });

    test('parses "status" command', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'status']);
        expect(result.command).toBe('status');
    });

    test('returns null command when no args given', () => {
        const result = parseArgs(['node', 'tribunal-kit.js']);
        expect(result.command).toBeNull();
    });

    test('parses --force flag', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--force']);
        expect(result.flags.force).toBe(true);
    });

    test('parses --quiet flag', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--quiet']);
        expect(result.flags.quiet).toBe(true);
    });

    test('parses --dry-run flag', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--dry-run']);
        expect(result.flags.dryRun).toBe(true);
    });

    test('parses --skip-update-check flag', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--skip-update-check']);
        expect(result.flags.skipUpdateCheck).toBe(true);
    });

    test('parses --path=<value> flag', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--path=./my-app']);
        expect(result.flags.path).toBe('./my-app');
    });

    test('parses --path <value> flag (space separated)', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--path', './my-app']);
        expect(result.flags.path).toBe('./my-app');
    });

    test('ignores unknown flags gracefully', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--unknown-flag']);
        expect(result.command).toBe('init');
        // Unknown flags don't throw, just get silently ignored
        expect(result.flags.unknownFlag).toBeUndefined();
    });

    test('multiple flags together', () => {
        const result = parseArgs(['node', 'tribunal-kit.js', 'init', '--force', '--quiet', '--dry-run']);
        expect(result.flags.force).toBe(true);
        expect(result.flags.quiet).toBe(true);
        expect(result.flags.dryRun).toBe(true);
    });
});
