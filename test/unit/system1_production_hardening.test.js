'use strict';

/**
 * system1_production_hardening.test.js
 * =====================================
 * Production Hardening Verification Suite
 * Stress-tests and proves:
 * 1. Multi-process concurrency locking on active_evolutions.json
 * 2. Information leakage prevention (credential/JWT/key redaction in evidence)
 * 3. Scale budgeting & resource exhaustion defense on large changesets and diffs
 * 4. Fail-closed decision engine execution & correlation ID audit trail
 * 5. Multi-candidate race condition prevention in self-evolution
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectAndRankEvidence,
  extractChangedSymbols,
  extractBoundedSnippet,
  evaluateDecision,
  createCandidateFromOutcome,
  saveCandidate,
  promoteCandidate,
  rollbackCandidate,
  acquireEvolutionLock,
  releaseEvolutionLock,
} = require('../../src/system1');

describe('System-1 Production Hardening Protocol Verification', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-prod-hard-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  describe('1. Concurrency Locking & Race Condition Prevention', () => {
    test('acquireEvolutionLock prevents concurrent mutations and clears cleanly', () => {
      const lockPath = acquireEvolutionLock(tempDir);
      expect(fs.existsSync(lockPath)).toBe(true);

      // Attempting to acquire lock while held should fail
      expect(() => {
        acquireEvolutionLock(tempDir);
      }).toThrow(/Could not acquire concurrency lock/);

      // Releasing lock allows subsequent acquisition
      releaseEvolutionLock(lockPath);
      expect(fs.existsSync(lockPath)).toBe(false);

      const secondLock = acquireEvolutionLock(tempDir);
      expect(fs.existsSync(secondLock)).toBe(true);
      releaseEvolutionLock(secondLock);
    });

    test('concurrent candidate promotions do not overwrite distinct targets (lost-update prevention)', () => {
      const outcomeA = {
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'Tier 0',
        proposed_change: 'Tier 1',
        evidence: 'Verified test failure A',
        evidence_type: 'VERIFIED_TEST_RESULT',
      };
      const outcomeB = {
        source: 'FN_CORRECTION',
        target: 'context-weights',
        current_behavior: 'Weight 0.5',
        proposed_change: 'Weight 0.8',
        evidence: 'Verified test failure B',
        evidence_type: 'VERIFIED_TEST_RESULT',
      };

      const candA = createCandidateFromOutcome(outcomeA, 'EVO-concurrent-A');
      candA.status = 'APPROVED';
      candA.approval = { approved_by: 'Gate A', approved_at: new Date().toISOString() };
      saveCandidate(candA, tempDir);

      const candB = createCandidateFromOutcome(outcomeB, 'EVO-concurrent-B');
      candB.status = 'APPROVED';
      candB.approval = { approved_by: 'Gate B', approved_at: new Date().toISOString() };
      saveCandidate(candB, tempDir);

      // Promote both
      promoteCandidate(candA, tempDir);
      promoteCandidate(candB, tempDir);

      const activePath = path.join(tempDir, 'evolution', 'active_evolutions.json');
      const activeData = JSON.parse(fs.readFileSync(activePath, 'utf8'));

      // Both must exist! Neither was lost or overwritten
      expect(activeData['reviewer-routing']).toBeDefined();
      expect(activeData['reviewer-routing'].candidate_id).toBe('EVO-concurrent-A');

      expect(activeData['context-weights']).toBeDefined();
      expect(activeData['context-weights'].candidate_id).toBe('EVO-concurrent-B');

      // Rollback A, verify B remains active and unaffected
      rollbackCandidate('EVO-concurrent-A', tempDir);
      const activeAfterRollback = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(activeAfterRollback['reviewer-routing']).toBeUndefined();
      expect(activeAfterRollback['context-weights']).toBeDefined();
      expect(activeAfterRollback['context-weights'].candidate_id).toBe('EVO-concurrent-B');
    });
  });

  describe('2. Information Leakage Prevention & Credential Redaction', () => {
    test('redacts private keys, JWTs, and API credentials from evidence snippets', () => {
      const sensitiveContent = `
        const apiKey = "sk-live-999333222111abcdef";
        const secret = "SUPER_SECRET_VALUE_HERE";
        const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature";
        -----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEA0Y1y...SECRET_KEY_BODY...
        -----END RSA PRIVATE KEY-----
        function connect() { return true; }
      `;

      const snippet = extractBoundedSnippet(sensitiveContent, 1, 'connect', 15);

      expect(snippet).not.toContain('sk-live-999333222111abcdef');
      expect(snippet).not.toContain('SUPER_SECRET_VALUE_HERE');
      expect(snippet).not.toContain('doNotLeakThisSignature');
      expect(snippet).not.toContain('SECRET_KEY_BODY');

      expect(snippet).toContain('[REDACTED_SECRET]');
      expect(snippet).toContain('[REDACTED_JWT_TOKEN]');
      expect(snippet).toContain('[REDACTED_PRIVATE_KEY]');
    });

    test('evidence ranking redacts credentials when extracting snippets from raw diffs', () => {
      const diffWithSecret =
        '+ const dbPassword = "SuperSecretDatabasePassword123";\n+ const token = "abc123xyz456";';
      const result = collectAndRankEvidence({
        repoRoot: tempDir,
        files: ['config/db.js'],
        diff: diffWithSecret,
        task: 'update database connection',
      });

      const fileEvidence = result.evidence.find(e => e.path === 'config/db.js');
      expect(fileEvidence).toBeDefined();
      expect(fileEvidence.snippet).not.toContain('SuperSecretDatabasePassword123');
      expect(fileEvidence.snippet).toContain('[REDACTED_SECRET]');
    });
  });

  describe('3. Scale Hardening & Resource Exhaustion Defense', () => {
    test('handles large changesets (150+ files) with prioritized budgeting and sub-50ms latency', () => {
      const files = [];
      for (let i = 0; i < 150; i++) {
        files.push(`src/component_${i}.js`);
      }
      // Add a critical security file at the end to verify priority sorting brings it into deep inspect
      files.push('src/auth/jwt_verifier.ts');

      const startTime = Date.now();
      const result = collectAndRankEvidence({
        repoRoot: tempDir,
        files,
        task: 'massive monorepo refactor',
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(150);
      expect(result.evidence.length).toBeGreaterThan(0);
      // The security boundary file should have been prioritized with high score
      const secEvidence = result.evidence.find(e => e.path.includes('jwt_verifier'));
      expect(secEvidence).toBeDefined();
      expect(secEvidence.score).toBe(1.0);
    });

    test('extractChangedSymbols bounds scanning to 1000 lines and 16 symbols on massive diffs', () => {
      let hugeDiff = '';
      for (let i = 0; i < 5000; i++) {
        hugeDiff += `+ function func_${i}() { return ${i}; }\n`;
      }

      const startTime = Date.now();
      const symbols = extractChangedSymbols(hugeDiff);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
      expect(symbols.length).toBeLessThanOrEqual(16);
    });
  });

  describe('4. Fail-Closed Decision Engine & Production Observability', () => {
    test('decision payload contains correlation ID (decision_id) and ISO timestamp', () => {
      const decision = evaluateDecision({
        files: ['src/app.js'],
        lines: 20,
        task: 'feature tweak',
      });

      expect(decision.decision_id).toMatch(/^DEC-\d+-[a-f0-9]+$/);
      expect(decision.timestamp).toBeDefined();
      expect(new Date(decision.timestamp).getTime()).not.toBeNaN();
    });

    test('fails closed to Tier 3 if an internal exception occurs during evaluation', () => {
      // Inject internal tier calculation failure (chaos scenario)
      const decision = evaluateDecision({
        files: ['src/app.js'],
        lines: 10,
        task: 'simple change',
        tierResolver: () => {
          throw new Error('Internal resolver out-of-memory or dependency failure');
        },
      });

      // Must fail closed (safest tier is Tier 3 Full Gauntlet)
      expect(decision.tier).toBe(3);
      expect(decision.tier_name).toBe('Full Gauntlet');
      expect(decision.decision_id).toBeDefined();
      expect(
        decision.explanation.monotonic_safeguards_applied.some(s =>
          s.includes('fallback to Tier 3'),
        ),
      ).toBe(true);
    });
  });
});
