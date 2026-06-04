'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { cmdMarathon } = require('../../bin/tribunal-kit');

jest.mock('fs');
jest.mock('child_process');

describe('cmdMarathon', () => {
    let mockExit;
    let mockConsoleError;
    let mockConsoleLog;

    beforeEach(() => {
        mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.clearAllMocks();
    });

    afterEach(() => {
        mockExit.mockRestore();
        mockConsoleError.mockRestore();
        mockConsoleLog.mockRestore();
    });

    test('exits if .agent/ is not found', () => {
        fs.existsSync.mockReturnValue(false);
        const flags = { path: './dummy' };
        
        cmdMarathon(flags);

        expect(fs.existsSync).toHaveBeenCalled();
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('.agent/ not found'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('prints help when args are empty', () => {
        fs.existsSync.mockReturnValue(true);
        const originalArgv = process.argv;
        process.argv = ['node', 'tribunal-kit.js', 'marathon']; // no extra args
        
        const flags = { path: './dummy' };
        cmdMarathon(flags);

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Marathon — Long-Running Agent Harness'));
        expect(execSync).not.toHaveBeenCalled();
        
        process.argv = originalArgv;
    });

    test('executes marathon_harness.js with provided args', () => {
        fs.existsSync.mockReturnValue(true);
        const originalArgv = process.argv;
        process.argv = ['node', 'tribunal-kit.js', 'marathon', 'status'];
        
        const flags = { path: './dummy' };
        cmdMarathon(flags);

        expect(execSync).toHaveBeenCalledWith(
            expect.stringContaining('marathon_harness.js" status'),
            expect.any(Object)
        );
        expect(mockExit).not.toHaveBeenCalled();
        
        process.argv = originalArgv;
    });

    test('catches execution errors gracefully and exits 1', () => {
        fs.existsSync.mockReturnValue(true);
        execSync.mockImplementation(() => {
            throw new Error('Script failed');
        });
        const originalArgv = process.argv;
        process.argv = ['node', 'tribunal-kit.js', 'marathon', 'status'];
        
        const flags = { path: './dummy' };
        cmdMarathon(flags);

        expect(execSync).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
    });
});
