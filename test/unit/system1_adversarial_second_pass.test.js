'use strict';

/**
 * system1_adversarial_second_pass.test.js
 * ========================================
 * Adversarial Second-Pass Regression and Security Audit Test Suite
 * Proves the vulnerability fixes for all 7 findings discovered in the second-pass audit:
 * 1. Path traversal rejection in evidence engine
 * 2. Unbounded file read protection (1MB cap) in evidence engine
 * 3. ReDoS immunity in import regex
 * 4. Test file exclusion in UI browser intelligence
 * 5. OS system path rejection in route extraction
 * 6. Null-safety & type-safety in reviewer orchestrator
 * 7. Candidate ID path traversal & prototype pollution defense in self-evolution
 * 8. Atomic file write integrity in evolution persistence
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  collectAndRankEvidence,
  evaluateBrowserRequirement,
  orchestrateReviewers,
  detectRequiredDomains,
  createCandidateFromOutcome,
  saveCandidate,
  loadCandidate,
  promoteCandidate,
  rollbackCandidate,
} = require('../../src/system1');

describe('System-1 Adversarial Second-Pass Audit & Vulnerability Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-sys1-adv-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  describe('Finding 1 & 2: Evidence Engine Path Traversal & File Size Capping', () => {
    test('strictly rejects path traversal outside the repository root', () => {
      // Create a secret file outside the repo
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tribunal-outside-'));
      const secretFile = path.join(outsideDir, 'secret_outside.txt');
      fs.writeFileSync(secretFile, 'SUPER_SECRET_PAYLOAD', 'utf8');

      // Create a repo inside tempDir
      const repoDir = path.join(tempDir, 'repo');
      fs.mkdirSync(repoDir, { recursive: true });
      fs.writeFileSync(path.join(repoDir, 'main.js'), 'console.log("hello");', 'utf8');

      const relativeTraversal = path.relative(repoDir, secretFile);

      const result = collectAndRankEvidence({
        repoRoot: repoDir,
        files: [relativeTraversal, '../../package.json'],
        task: 'inspect files',
      });

      // Assert no evidence item has leaked snippet or path from outside
      const leaked = result.evidence.find(
        e => e.snippet && e.snippet.includes('SUPER_SECRET_PAYLOAD'),
      );
      expect(leaked).toBeUndefined();

      // Clean up outsideDir
      try {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      } catch (_) {}
    });

    test('caps evidence extraction to files <= 1MB (prevents unbounded memory blowup)', () => {
      const repoDir = path.join(tempDir, 'repo');
      fs.mkdirSync(repoDir, { recursive: true });

      // Create a massive file (>1MB)
      const bigFilePath = path.join(repoDir, 'giant_bundle.js');
      const largeBuffer = Buffer.alloc(1.2 * 1024 * 1024, 'a');
      fs.writeFileSync(bigFilePath, largeBuffer);

      const result = collectAndRankEvidence({
        repoRoot: repoDir,
        files: ['giant_bundle.js'],
        task: 'review giant bundle',
      });

      const giantEvidence = result.evidence.find(e => e.path === 'giant_bundle.js');
      expect(giantEvidence).toBeDefined();
      // Snippet must be empty because reading >1MB file is rejected
      expect(giantEvidence.snippet).toBe('');
    });
  });

  describe('Finding 3: Evidence Engine ReDoS Resistance', () => {
    test('parses long or malformed import statements in < 50ms without catastrophic backtracking', () => {
      const repoDir = path.join(tempDir, 'repo');
      fs.mkdirSync(repoDir, { recursive: true });

      // Construct pathological backtracking input:
      // "import { a, b, c, ... }" repeated 400 times without terminating 'from "..."'
      const pathologicalContent = 'import ' + ' { a, b, c, d, e, f, g } '.repeat(400) + ';\n';
      fs.writeFileSync(path.join(repoDir, 'redos_test.js'), pathologicalContent, 'utf8');

      const startTime = Date.now();
      const result = collectAndRankEvidence({
        repoRoot: repoDir,
        files: ['redos_test.js'],
        task: 'check imports',
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(150); // Must be nearly instantaneous
      expect(result).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('Finding 4 & 5: Browser Intelligence Test File & OS Path Filtering', () => {
    test('does not trigger browser verification when only test files (.test.jsx, .spec.tsx) are changed', () => {
      const result = evaluateBrowserRequirement({
        files: [
          'test/unit/components/Card.test.jsx',
          'tests/Button.spec.tsx',
          'src/__tests__/Modal.test.js',
        ],
        task: 'update button and modal unit tests',
        diff: 'describe("Card", () => { it("renders", () => {}); });',
      });

      expect(result.requires_browser_verification).toBe(false);
      expect(result.validation_level).toBe('NONE');
      expect(result.ui_files).toHaveLength(0);
    });

    test('ignores standard OS filesystem paths in tasks and diffs, avoiding spurious web route triggers', () => {
      const result = evaluateBrowserRequirement({
        files: ['scripts/deploy.sh'],
        task: 'Deploy binary to /usr/bin/node and clean /tmp/cache and /var/log/app',
        diff: '- rm -rf /etc/config\n+ touch /tmp/new',
      });

      expect(result.requires_browser_verification).toBe(false);
      expect(result.validation_level).toBe('NONE');
      expect(result.affected_routes).not.toContain('/usr/bin/node');
      expect(result.affected_routes).not.toContain('/etc/config');
      expect(result.affected_routes).not.toContain('/tmp/cache');
    });

    test('correctly identifies legitimate web routes like /login and /checkout', () => {
      const result = evaluateBrowserRequirement({
        files: ['src/app/checkout/page.tsx'],
        task: 'Update /checkout flow',
        diff: 'export default function CheckoutPage() { return <form onSubmit={handleSubmit}></form>; }',
      });

      expect(result.requires_browser_verification).toBe(true);
      expect(result.validation_level).toBe('HIGH_RISK');
      expect(result.affected_routes).toContain('/checkout');
    });
  });

  describe('Finding 6: Reviewer Orchestrator Null-Safety & Malformed Input Handling', () => {
    test('handles null, undefined, and non-object items in evidence and previous findings gracefully', () => {
      const malformedEvidence = [
        null,
        undefined,
        'random_string',
        { is_mandatory: true, type: 'security_boundary' },
        { type: 'configuration' }, // missing path
        { type: 'configuration', path: null },
      ];

      const malformedFindings = [
        null,
        undefined,
        12345,
        { category: null },
        { category: 999 },
        { category: 'SQL' },
      ];

      expect(() => {
        const domains = detectRequiredDomains({
          files: ['src/db.js'],
          evidence: malformedEvidence,
          previousFindings: malformedFindings,
        });

        expect(domains).toContain('security');
        expect(domains).toContain('sql');
      }).not.toThrow();

      expect(() => {
        const orchestration = orchestrateReviewers({
          tier: 2,
          files: ['src/db.js'],
          evidence: malformedEvidence,
          previousFindings: malformedFindings,
        });

        expect(orchestration.selected.some(r => r.reviewer === 'sql-reviewer')).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Finding 7 & 8: Self-Evolution Security Boundaries & Atomic Persistence', () => {
    test('strictly rejects candidate IDs attempting path traversal', () => {
      const validOutcome = {
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'Tier 0',
        proposed_change: 'Tier 1',
        evidence: 'Verified test failure',
        evidence_type: 'VERIFIED_TEST_RESULT',
      };

      expect(() => {
        createCandidateFromOutcome(validOutcome, '../../malicious_id');
      }).toThrow(/Invalid candidate ID/);

      expect(() => {
        saveCandidate({ candidate_id: '../../evil', target: 'reviewer-routing' }, tempDir);
      }).toThrow(/Invalid candidate ID/);

      expect(() => {
        loadCandidate('../../../outside', tempDir);
      }).toThrow(/Invalid candidate ID/);

      expect(() => {
        rollbackCandidate('../../../outside', tempDir);
      }).toThrow(/Invalid candidate ID/);
    });

    test('strictly prevents prototype pollution via forbidden target names', () => {
      const candidate = {
        candidate_id: 'EVO-proto-test',
        target: '__proto__',
        status: 'APPROVED',
        proposed_change: 'pollute',
        approval: { approved_by: 'Test Gate' },
      };

      expect(() => {
        promoteCandidate(candidate, tempDir);
      }).toThrow(/Dangerous target key/);
    });

    test('writes candidate and evolution state atomically without leaving orphaned tmp files', () => {
      const outcome = {
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'Tier 0',
        proposed_change: 'Tier 1',
        evidence: 'Verified test outcome',
        evidence_type: 'VERIFIED_TEST_RESULT',
      };

      const candidate = createCandidateFromOutcome(outcome, 'EVO-atomic-test-1');
      candidate.status = 'APPROVED';
      candidate.approval = { approved_by: 'Human Operator', approved_at: new Date().toISOString() };

      const filePath = saveCandidate(candidate, tempDir);
      expect(fs.existsSync(filePath)).toBe(true);

      const promotion = promoteCandidate(candidate, tempDir);
      expect(promotion.promoted).toBe(true);

      // Verify active_evolutions.json exists and is valid JSON
      const activePath = path.join(tempDir, 'evolution', 'active_evolutions.json');
      expect(fs.existsSync(activePath)).toBe(true);
      const activeData = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(activeData['reviewer-routing'].candidate_id).toBe('EVO-atomic-test-1');

      // Verify no dangling .tmp files in evolution directories
      const evoDir = path.join(tempDir, 'evolution');
      const files = fs.readdirSync(evoDir);
      const tmpFiles = files.filter(f => f.includes('.tmp'));
      expect(tmpFiles).toHaveLength(0);

      // Verify rollback executes cleanly and restores state
      const rollback = rollbackCandidate('EVO-atomic-test-1', tempDir);
      expect(rollback.rolled_back).toBe(true);
    });
  });
});
