'use strict';

const discovery = require('../../src/browser/discovery');
const { extractPositionalArgs } = require('../../src/utils/helpers');
const { cmdBrowse } = require('../../src/commands/browse');
const { cmdHeal } = require('../../src/commands/heal');
const { cmdAuditWeb } = require('../../src/commands/audit-web');
const { cmdCompareWeb } = require('../../src/commands/compare-web');
const { cmdDeconstruct } = require('../../src/commands/deconstruct');
const sentinel = require('../../src/browser/sentinel');

describe('Phase 2 (#20 & #21) — Browser Hardening & Positional Arg Extraction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('extractPositionalArgs helper', () => {
    test('extracts URL when flags precede it', () => {
      const argv = ['node', 'tk', 'browse', '--json', 'https://example.com'];
      const positionals = extractPositionalArgs(argv, 'browse');
      expect(positionals).toEqual(['https://example.com']);
    });

    test('extracts multiple URLs when flags with values precede them', () => {
      const argv = [
        'node',
        'tk',
        'compare-web',
        '--max-diff',
        '2.5',
        'https://site1.com',
        'https://site2.com',
      ];
      const positionals = extractPositionalArgs(argv, 'compare-web', ['--max-diff']);
      expect(positionals).toEqual(['https://site1.com', 'https://site2.com']);
    });

    test('extracts positional argument when flags follow it', () => {
      const argv = ['node', 'tk', 'browse', 'https://example.com', '--quiet', '--json'];
      const positionals = extractPositionalArgs(argv, 'browse');
      expect(positionals).toEqual(['https://example.com']);
    });
  });

  describe('Missing Browser Guard', () => {
    beforeEach(() => {
      jest.spyOn(discovery, 'findBrowser').mockReturnValue(null);
    });

    test('ensureBrowserAvailable throws clear actionable error when browser missing', () => {
      expect(() => {
        discovery.ensureBrowserAvailable();
      }).toThrow(/No compatible Chromium browser found/i);
    });

    test('cmdBrowse fails fast with actionable message when browser missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdBrowse({}, ['node', 'tk', 'browse', 'https://example.com'], true),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(c => c[0].includes('Browser unavailable'));
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('cmdHeal fails fast with actionable message when browser missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdHeal({}, ['node', 'tk', 'heal', 'http://localhost:3000'], true),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(c => c[0].includes('Browser unavailable'));
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('cmdAuditWeb fails fast with actionable message when browser missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdAuditWeb({}, ['node', 'tk', 'audit-web', 'https://example.com'], true),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(c => c[0].includes('Browser unavailable'));
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('cmdCompareWeb fails fast with actionable message when browser missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdCompareWeb({}, ['node', 'tk', 'compare-web', 'https://a.com', 'https://b.com'], true),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(c => c[0].includes('Browser unavailable'));
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('cmdDeconstruct fails fast with actionable message when browser missing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdDeconstruct(
          { selector: '.btn' },
          ['node', 'tk', 'deconstruct', 'https://example.com'],
          true,
        ),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(c => c[0].includes('Browser unavailable'));
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('cmdHeal URL defaulting & connection refusal (#21)', () => {
    test('warns user when defaulting to http://localhost:3000', async () => {
      jest
        .spyOn(discovery, 'findBrowser')
        .mockReturnValue({ path: '/mock/chrome', type: 'chrome' });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(sentinel, 'captureRuntimeErrors').mockResolvedValue({ healthy: true });

      await cmdHeal({}, ['node', 'tk', 'heal'], false);

      expect(warnSpy).toHaveBeenCalled();
      const warnCall = warnSpy.mock.calls.find(
        c => c[0].includes('Defaulting to') && c[0].includes('http://localhost:3000'),
      );
      expect(warnCall).toBeDefined();
    });

    test('logs clear connection refused diagnostic when nothing is listening', async () => {
      jest
        .spyOn(discovery, 'findBrowser')
        .mockReturnValue({ path: '/mock/chrome', type: 'chrome' });
      jest
        .spyOn(sentinel, 'captureRuntimeErrors')
        .mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED at http://localhost:3000'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => {
        throw new Error(`process.exit: ${code}`);
      });

      await expect(
        cmdHeal({}, ['node', 'tk', 'heal', 'http://localhost:3000'], true),
      ).rejects.toThrow('process.exit: 1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errCall = consoleErrorSpy.mock.calls.find(
        c => c[0].includes('Connection refused') && c[0].includes('http://localhost:3000'),
      );
      expect(errCall).toBeDefined();

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
