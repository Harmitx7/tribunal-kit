'use strict';

const logger = require('../../src/utils/logger');

describe('src/utils/logger', () => {
  let logSpy;
  let errSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.setLogLevels(false, false);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    logger.setLogLevels(false, false);
  });

  test('colors and formatting functions return correct ANSI-wrapped strings', () => {
    expect(logger.colorize('red', 'hello')).toBe('\x1b[91mhello\x1b[0m');
    expect(logger.c('green', 'world')).toBe('\x1b[92mworld\x1b[0m');
    expect(logger.bold('bold text')).toBe('\x1b[1mbold text\x1b[0m');
    expect(logger.C.reset).toBe('\x1b[0m');
  });

  test('log, ok, warn, dim log to console.log when not quiet', () => {
    logger.log('standard message');
    expect(logSpy).toHaveBeenCalledWith('standard message');

    logger.ok('success message');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('success message'));

    logger.warn('warning message');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('warning message'));

    logger.dim('dim message');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('dim message'));
  });

  test('log, ok, warn, dim suppress output when quiet is true', () => {
    logger.setLogLevels(true, false);

    logger.log('should be suppressed');
    logger.ok('should be suppressed');
    logger.warn('should be suppressed');
    logger.dim('should be suppressed');

    expect(logSpy).not.toHaveBeenCalled();
  });

  test('err always logs to console.error regardless of quiet setting', () => {
    logger.setLogLevels(true, false);
    logger.err('fatal error');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('fatal error'));
  });

  test('dbg only logs when verbose is true', () => {
    logger.setLogLevels(false, false);
    logger.dbg('debug info');
    expect(logSpy).not.toHaveBeenCalled();

    logger.setLogLevels(false, true);
    logger.dbg('debug info');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('debug info'));
  });
});
