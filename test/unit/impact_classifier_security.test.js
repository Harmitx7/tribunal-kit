'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const { classifyImpact } = require('../../.agent/scripts/impact_classifier');

const SCRIPT_PATH = path.resolve(__dirname, '../../.agent/scripts/impact_classifier.js');

describe('TK-SEC-002: Impact Classifier Security & CLI Governance', () => {
  describe('CLI Flag Parsing & Fail-Closed Behavior', () => {
    it('accurately parses --files, --task, --lines and classifies auth/security to Tier 3 via CLI', () => {
      const output = execFileSync(
        process.execPath,
        [
          SCRIPT_PATH,
          '--files',
          'src/auth/payment.js',
          '--task',
          'security auth migration',
          '--lines',
          '500',
          '--json',
        ],
        { encoding: 'utf8' },
      );
      const parsed = JSON.parse(output);
      expect(parsed.tier).toBe(3);
      expect(parsed.requireGate).toBe(true);
      expect(parsed.maxReviewers).toBeGreaterThanOrEqual(8);
      expect(parsed.fastPass).toBe(false);
    });

    it('fails closed to Tier 3 when invoked with no CLI arguments', () => {
      const output = execFileSync(process.execPath, [SCRIPT_PATH, '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(output);
      expect(parsed.tier).toBe(3);
      expect(parsed.requireGate).toBe(true);
      expect(parsed.fastPass).toBe(false);
      expect(parsed.reasoning.some(r => r.includes('Fail-closed'))).toBe(true);
    });

    it('accurately classifies benign markdown edit via CLI', () => {
      const output = execFileSync(
        process.execPath,
        [SCRIPT_PATH, '--files', 'docs/readme.md', '--task', 'typo fix', '--lines', '2', '--json'],
        { encoding: 'utf8' },
      );
      const parsed = JSON.parse(output);
      expect(parsed.tier).toBe(0);
      expect(parsed.fastPass).toBe(true);
      expect(parsed.requireGate).toBe(false);
    });
  });

  describe('Programmatic API Governance Enforcement', () => {
    it('forces Tier 3 for package.json even with <= 10 lines diff', () => {
      const result = classifyImpact({
        files: ['package.json'],
        diff: '+ "postinstall": "evil"',
        lineCount: 2,
      });
      expect(result.tier).toBe(3);
      expect(result.requireGate).toBe(true);
      expect(result.fastPass).toBe(false);
    });

    it('forces Tier 3 for .github/workflows/*.yml even with small diff', () => {
      const result = classifyImpact({
        files: ['.github/workflows/ci.yml'],
        diff: '+ run: echo pwned',
        lineCount: 1,
      });
      expect(result.tier).toBe(3);
      expect(result.requireGate).toBe(true);
      expect(result.fastPass).toBe(false);
    });

    it('forces Tier 3 for .agent/ governance and script changes', () => {
      const result = classifyImpact({
        files: ['.agent/scripts/impact_classifier.js'],
        diff: '+ // modify',
        lineCount: 1,
      });
      expect(result.tier).toBe(3);
      expect(result.requireGate).toBe(true);
    });

    it('does not allow .json extension to bypass as fast-pass asset', () => {
      const result = classifyImpact({
        files: ['config/credentials.json'],
        diff: '{ "key": "val" }',
        lineCount: 3,
      });
      // Even if not explicitly auth, .json is not in FAST_PASS_EXTENSIONS
      expect(result.fastPass).toBe(false);
    });

    it('allows benign CSS typo fix to pass as Tier 0', () => {
      const result = classifyImpact({
        files: ['src/styles/theme.css'],
        diff: '- color: red;\n+ color: blue;',
        task: 'fix color typo in style',
        lineCount: 2,
      });
      expect(result.tier).toBe(0);
      expect(result.fastPass).toBe(true);
      expect(result.requireGate).toBe(false);
    });
  });
});
