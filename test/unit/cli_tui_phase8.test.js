'use strict';

/**
 * Phase 8 CLI & TUI Integration Test Suite
 *
 * Verifies terminal experience modernization:
 * 1. String visible column calculation across ANSI, CJK ideographs, emojis, zero-width chars.
 * 2. Terminal sanitization defense (control codes, carriage-return spoofing, secrets, length bounds).
 * 3. Box panel framing alignment, multi-line splitting, and responsive width containment.
 * 4. Authoritative execution telemetry integration in progress bars (indeterminate & 99% guards).
 * 5. Logger capability detection (NO_COLOR, glyph fallbacks).
 * 6. Machine-readable JSON separation without ANSI or decorative banner contamination.
 */

const {
  visibleWidth,
  visibleLength,
  sanitizeTerminal,
  stripAnsi,
  renderPanel,
  renderProgressBar,
  renderReviewerGrid,
  GLYPHS,
  RGB,
} = require('../../src/tui');

const logger = require('../../src/utils/logger');
const { cmdValidate } = require('../../src/commands/validate');
const path = require('path');
const fs = require('fs');

describe('Phase 8: CLI & TUI Modernization & Terminal Experience', () => {
  let logSpy;
  let errSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    delete process.env.NO_COLOR;
  });

  describe('1. Visible Width Column Calculation', () => {
    test('accurately calculates column width for standard ASCII', () => {
      expect(visibleWidth('hello')).toBe(5);
      expect(visibleWidth('tribunal-kit')).toBe(12);
      expect(visibleLength('hello')).toBe(5);
    });

    test('ignores ANSI escape sequences in column width calculation', () => {
      const colored = '\x1b[38;2;255;51;0mFlame Text\x1b[0m';
      expect(visibleWidth(colored)).toBe(10);
      const boldCyan = '\x1b[1m\x1b[96mStatus\x1b[0m';
      expect(visibleWidth(boldCyan)).toBe(6);
    });

    test('counts CJK full-width ideographs as 2 columns each', () => {
      // 架构 = 2 CJK characters = 4 columns
      expect(visibleWidth('架构')).toBe(4);
      // Mixed ASCII and CJK: "Code 架构" = 5 ASCII + 4 CJK = 9 columns
      expect(visibleWidth('Code 架构')).toBe(9);
    });

    test('counts emoji surrogate pairs as 2 columns each', () => {
      // 🚀 Rocket emoji
      expect(visibleWidth('🚀')).toBe(2);
      // 🔥 Fire emoji
      expect(visibleWidth('🔥')).toBe(2);
      // Emoji with text: "Deploy 🚀 now" = 7 (Deploy ) + 2 (🚀) + 4 ( now) = 13
      expect(visibleWidth('Deploy 🚀 now')).toBe(13);
    });

    test('counts zero-width characters and combining marks as 0 columns', () => {
      // Zero-width space (\u200B)
      expect(visibleWidth('test\u200B')).toBe(4);
      // BOM (\uFEFF)
      expect(visibleWidth('\uFEFFhello')).toBe(5);
      // Zero-width joiner (\u200D)
      expect(visibleWidth('a\u200Db')).toBe(2);
    });
  });

  describe('2. Terminal Control Character & Injection Defense', () => {
    test('strips destructive terminal control codes', () => {
      // Bell (\x07), Backspace (\x08), Form Feed (\x0C), Escape (\x1B) when not ANSI
      const nasty = 'clean\x07beep\x08back\x0Cff';
      const sanitized = sanitizeTerminal(nasty);
      expect(sanitized).toBe('cleanbeepbackff');
    });

    test('neutralizes standalone carriage returns to prevent log line spoofing', () => {
      // Log line spoofing attack: "Progress: 10%\rProgress: 100% SUCCESS\r"
      const spoofed = 'Scanning...\r[MALICIOUS OVERWRITE] All checks passed!';
      const sanitized = sanitizeTerminal(spoofed);
      expect(sanitized).not.toContain('\r');
      expect(sanitized).toBe('Scanning... [MALICIOUS OVERWRITE] All checks passed!');
    });

    test('strips OSC terminal window title escape sequences', () => {
      const oscAttack = '\x1b]0;Pwned Title\x07Normal log output';
      const sanitized = sanitizeTerminal(oscAttack);
      expect(sanitized).toBe('Normal log output');
    });

    test('redacts sensitive credentials (Bearer, JWT, API keys, private keys)', () => {
      const withBearer = 'Authorized with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID';
      const sanitizedBearer = sanitizeTerminal(withBearer);
      expect(sanitizedBearer).toContain('[REDACTED_TOKEN]');
      expect(sanitizedBearer).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

      const withApiKey = 'Config key=sk-proj-abc1234567890abcdef1234567890';
      const sanitizedKey = sanitizeTerminal(withApiKey);
      expect(sanitizedKey).toContain('[REDACTED_API_KEY]');
      expect(sanitizedKey).not.toContain('sk-proj-abc1234567890abcdef1234567890');

      const withPrivKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
      const sanitizedPriv = sanitizeTerminal(withPrivKey);
      expect(sanitizedPriv).toContain('[REDACTED_PRIVATE_KEY]');
      expect(sanitizedPriv).not.toContain('BEGIN RSA PRIVATE KEY');
    });

    test('enforces length bounding when maxLength is specified', () => {
      const longInput = 'A'.repeat(500);
      const bounded = sanitizeTerminal(longInput, { maxLength: 50 });
      expect(bounded.length).toBe(50);
      expect(bounded.endsWith('...')).toBe(true);
    });
  });

  describe('3. Box Panel Geometry & Multi-Line Splitting', () => {
    test('renders panel with aligned borders using visibleWidth', () => {
      const lines = renderPanel(
        'Title',
        ['ASCII line', 'Colored: \x1b[92mGreen\x1b[0m line', 'Emoji 🚀 line'],
        { width: 40, returnLines: true },
      );

      // Top border (0), Title (1), Divider (2), 3 content lines (3..5), Bottom border (6)
      expect(lines.length).toBe(7);

      // Verify each content line starts with boxV (│ or |) and ends with boxV
      for (let i = 3; i <= 5; i++) {
        const rawLine = stripAnsi(lines[i].trim());
        expect(rawLine.startsWith(GLYPHS.boxV)).toBe(true);
        expect(rawLine.endsWith(GLYPHS.boxV)).toBe(true);
        // The visible width of the trimmed rendered line should equal the specified panel width
        expect(visibleWidth(lines[i].trim())).toBe(40);
      }

      // Verify console printing also succeeds
      renderPanel('Console', ['Printed line'], { width: 40 });
      expect(logSpy).toHaveBeenCalled();
    });

    test('splits embedded newlines into separate bordered rows', () => {
      const lines = renderPanel('MultiLine', ['First row\nSecond row\nThird row'], {
        width: 36,
        returnLines: true,
      });

      // Top border (0), Title (1), Divider (2), 3 split rows (3..5), Bottom border (6)
      expect(lines.length).toBe(7);

      expect(stripAnsi(lines[3])).toContain('First row');
      expect(stripAnsi(lines[4])).toContain('Second row');
      expect(stripAnsi(lines[5])).toContain('Third row');

      // Every line should maintain proper box boundary width
      expect(visibleWidth(lines[3].trim())).toBe(36);
      expect(visibleWidth(lines[4].trim())).toBe(36);
      expect(visibleWidth(lines[5].trim())).toBe(36);
    });

    test('truncates overflowing lines cleanly without breaking box layout', () => {
      const longText = 'This is an extremely long string that definitely exceeds the 30-column panel limit';
      const lines = renderPanel('Truncate', [longText], { width: 30, returnLines: true });

      // Content line is index 3
      const contentLine = lines[3];
      expect(stripAnsi(contentLine)).toContain('...');
      expect(visibleWidth(contentLine.trim())).toBe(30);
    });

    test('handles responsive narrow terminals without crashing or wrapping', () => {
      const lines = renderPanel('Title', ['Content'], { width: 20, returnLines: true });
      expect(lines.length).toBe(5); // Top, Title, Divider, Content, Bottom
      expect(visibleWidth(lines[3].trim())).toBe(20);
    });
  });

  describe('4. Authoritative Execution Telemetry Progress Reporting', () => {
    test('renders determinate progress bar with percentage and labels', () => {
      const output = renderProgressBar('Verification', 50, { width: 20 });
      const clean = stripAnsi(output);
      expect(clean).toContain('Verification');
      expect(clean).toContain('50%');
      expect(clean).toContain(GLYPHS.barFill);
      expect(clean).toContain(GLYPHS.barEmpty);
    });

    test('renders [unmetered] for indeterminate progress rather than false 0%', () => {
      const output = renderProgressBar('Indexing Files', null, { width: 20 });
      const clean = stripAnsi(output);
      expect(clean).toContain('Indexing Files');
      expect(clean).toContain('[unmetered]');
      expect(clean).not.toContain('0%');
    });

    test('caps progress at 99% when requireTerminalConfirmation is set', () => {
      // Until confirmed complete by an authoritative event, progress must not claim 100%
      const output = renderProgressBar('Running Tests', 100, {
        width: 20,
        requireTerminalConfirmation: true,
      });
      const clean = stripAnsi(output);
      expect(clean).toContain('99%');
      expect(clean).not.toContain('100%');
    });
  });

  describe('5. Logger Capability Detection & Sanitization', () => {
    test('strips ANSI formatting when NO_COLOR is active', () => {
      process.env.NO_COLOR = '1';
      const redText = logger.colorize('red', 'plain error');
      expect(redText).toBe('plain error');

      const boldText = logger.bold('plain bold');
      expect(boldText).toBe('plain bold');
    });

    test('sanitizes log outputs through sanitizeTerminal', () => {
      logger.log('Scan log with token Bearer secret12345\x07');
      expect(logSpy).toHaveBeenCalled();
      const logged = logSpy.mock.calls[0][0];
      expect(logged).not.toContain('secret12345');
      expect(logged).not.toContain('\x07');
    });
  });

  describe('6. Machine-Readable JSON Output Separation', () => {
    test('cmdValidate emits clean, parseable JSON with --json flag', async () => {
      const fixtureJsonPath = path.resolve(__dirname, '../fixtures/cli_sample.json');
      fs.mkdirSync(path.dirname(fixtureJsonPath), { recursive: true });
      fs.writeFileSync(fixtureJsonPath, JSON.stringify({ name: 'tribunal-kit', status: 'ok' }));

      try {
        await cmdValidate({ file: fixtureJsonPath, json: true }, true);

        expect(logSpy).toHaveBeenCalled();
        const output = logSpy.mock.calls.map(c => c[0]).join('\n');

        // Output must be valid JSON without ANSI codes or boxes
        expect(output).not.toContain('\x1b[');
        expect(output).not.toContain('│');
        expect(output).not.toContain('┌');

        const parsed = JSON.parse(output);
        expect(parsed.valid).toBe(true);
        expect(parsed.format).toBe('json');
        expect(parsed.target).toBe(fixtureJsonPath);
      } finally {
        if (fs.existsSync(fixtureJsonPath)) {
          fs.unlinkSync(fixtureJsonPath);
        }
      }
    });

    test('cmdValidate structural validation emits JSON envelope on --json', async () => {
      const repoRoot = path.resolve(__dirname, '../..');
      await cmdValidate({ path: repoRoot, json: true }, true);

      expect(logSpy).toHaveBeenCalled();
      const output = logSpy.mock.calls.map(c => c[0]).join('\n');
      const parsed = JSON.parse(output);

      expect(parsed.valid).toBe(true);
      expect(parsed.reviewers).toBe(28);
      expect(Array.isArray(parsed.subdirectories)).toBe(true);
    });
  });
});
