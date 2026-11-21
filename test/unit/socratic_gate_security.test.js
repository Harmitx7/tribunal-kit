'use strict';

const path = require('path');
const { execFileSync } = require('child_process');
const { evaluateSocraticGate } = require('../../.agent/scripts/socratic_gate_policy');

const SCRIPT_PATH = path.resolve(__dirname, '../../.agent/scripts/socratic_gate_policy.js');

describe('TK-SEC-002: Socratic Gate Policy Security & Gate Bypass Defense', () => {
  describe('CLI Flag Parsing & Fail-Closed Behavior', () => {
    it('accurately parses --tier 3 and blocks execution via CLI', () => {
      const output = execFileSync(process.execPath, [SCRIPT_PATH, '--tier', '3', '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(output);
      expect(parsed.shouldBlock).toBe(true);
      expect(parsed.reason).toContain('Tier 3');
    });

    it('fails closed when --tier is omitted from CLI invocation', () => {
      const output = execFileSync(process.execPath, [SCRIPT_PATH, '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(output);
      expect(parsed.shouldBlock).toBe(true);
      expect(parsed.reason).toContain('Fail-closed: missing --tier');
    });

    it('accurately parses --tier 0 via CLI and allows bypass', () => {
      const output = execFileSync(process.execPath, [SCRIPT_PATH, '--tier', '0', '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(output);
      expect(parsed.shouldBlock).toBe(false);
      expect(parsed.reason).toContain('Tier 0');
    });
  });

  describe('Programmatic Gate Bypass Prevention', () => {
    it('blocks Tier 3 even when unauthenticated --no-gate or express flags are passed', () => {
      const result = evaluateSocraticGate({
        tier: 3,
        flags: { 'no-gate': true, express: true, force: true },
      });
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toContain('Tier 3');
    });

    it('allows Tier 3 ONLY with verified human approval token', () => {
      const result = evaluateSocraticGate({
        tier: 3,
        humanApprovalToken: 'HUMAN-APPROVED-SEC-2026',
      });
      expect(result.shouldBlock).toBe(false);
      expect(result.reason).toContain('Authenticated human approval token');
    });

    it('fails closed when tier is missing or invalid in API options', () => {
      expect(evaluateSocraticGate({}).shouldBlock).toBe(true);
      expect(evaluateSocraticGate({ tier: 'invalid' }).shouldBlock).toBe(true);
      expect(evaluateSocraticGate({ tier: 99 }).shouldBlock).toBe(true);
      expect(evaluateSocraticGate(null).shouldBlock).toBe(true);
    });

    it('blocks Tier 2 when ambiguity score > 0.5', () => {
      const result = evaluateSocraticGate({
        tier: 2,
        ambiguityScore: 0.8,
      });
      expect(result.shouldBlock).toBe(true);
      expect(result.reason).toContain('exceeds threshold');
    });

    it('allows Tier 2 when ambiguity score <= 0.5', () => {
      const result = evaluateSocraticGate({
        tier: 2,
        ambiguityScore: 0.3,
      });
      expect(result.shouldBlock).toBe(false);
    });
  });
});
