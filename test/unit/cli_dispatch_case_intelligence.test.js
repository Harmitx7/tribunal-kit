'use strict';

describe('CLI dispatch for case vs intelligence', () => {
  let originalArgv;
  let mockCmdCase;
  let mockCmdIntelligence;

  beforeEach(() => {
    originalArgv = process.argv;
    mockCmdCase = jest.fn().mockResolvedValue(true);
    mockCmdIntelligence = jest.fn().mockResolvedValue(true);

    // Mock modules
    jest.doMock('../../src/commands/case', () => ({
      cmdCase: mockCmdCase,
    }));
    jest.doMock('../../src/commands/intelligence', () => ({
      cmdIntelligence: mockCmdIntelligence,
    }));
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('dispatches "tk case" to cmdCase and NOT cmdIntelligence', async () => {
    process.argv = ['node', 'tk', 'case', 'list', '--quiet'];
    const freshCli = require('../../src/cli');
    await freshCli.main();

    expect(mockCmdCase).toHaveBeenCalledTimes(1);
    expect(mockCmdIntelligence).not.toHaveBeenCalled();
    const [flags, argv, quiet] = mockCmdCase.mock.calls[0];
    expect(flags.quiet).toBe(true);
    expect(argv).toEqual(['node', 'tk', 'case', 'list', '--quiet']);
    expect(quiet).toBe(true);
  });

  test('dispatches "tk intelligence" with subcommand to cmdIntelligence', async () => {
    process.argv = ['node', 'tk', 'intelligence', 'similar', 'test-query'];
    const freshCli = require('../../src/cli');
    await freshCli.main();

    expect(mockCmdIntelligence).toHaveBeenCalledTimes(1);
    expect(mockCmdCase).not.toHaveBeenCalled();
    expect(mockCmdIntelligence).toHaveBeenCalledWith('similar', ['test-query']);
  });

  test('dispatches direct intelligence aliases (e.g. "tk cases") to cmdIntelligence', async () => {
    process.argv = ['node', 'tk', 'cases'];
    const freshCli = require('../../src/cli');
    await freshCli.main();

    expect(mockCmdIntelligence).toHaveBeenCalledTimes(1);
    expect(mockCmdCase).not.toHaveBeenCalled();
    expect(mockCmdIntelligence).toHaveBeenCalledWith('cases', []);
  });

  test('dispatches "tk intelligence" without subcommand to default "cases"', async () => {
    process.argv = ['node', 'tk', 'intelligence'];
    const freshCli = require('../../src/cli');
    await freshCli.main();

    expect(mockCmdIntelligence).toHaveBeenCalledTimes(1);
    expect(mockCmdCase).not.toHaveBeenCalled();
    expect(mockCmdIntelligence).toHaveBeenCalledWith('cases', []);
  });
});
