'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  loadCandidate,
  getActiveEvolutionsPath,
} = require('../../src/system1/evolution_pipeline');

describe('System-1 Capability 4: Controlled Self-Evolution Pipeline', () => {
  let tmpAgentDir;

  beforeEach(() => {
    tmpAgentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-sys1-evo-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpAgentDir)) {
      fs.rmSync(tmpAgentDir, { recursive: true, force: true });
    }
  });

  describe('Anti-Self-Poisoning & Ingestion Gates', () => {
    test('Rejects raw LLM speculation and unverified user text', () => {
      expect(() => {
        createCandidateFromOutcome({
          source: 'RAW_LLM_SPECULATION', // Invalid source
          target: 'context-weights',
          current_behavior: 'Standard weight 0.25',
          proposed_change: 'Lower to 0.1',
          evidence: 'An LLM hallucinated that this would be better',
          evidence_type: 'REVIEWER_CLAIM',
        });
      }).toThrow('Self-evolution strictly rejects unverified speculation');
    });

    test('Strictly blocks candidates targeting protected security boundaries', () => {
      expect(() => {
        createCandidateFromOutcome({
          source: 'HUMAN_GATE',
          target: 'security-boundaries', // Protected forbidden target
          current_behavior: 'Block arbitrary execution',
          proposed_change: 'Allow shell bypass',
          evidence: 'Verified test run',
          evidence_type: 'VERIFIED_TEST_RESULT',
        });
      }).toThrow('protected security boundary');
    });

    test('Anti-Self-Poisoning: Rejects REVIEWER_CLAIM evidence type', () => {
      expect(() => {
        createCandidateFromOutcome({
          source: 'REVIEWER_FINDING',
          target: 'reviewer-routing',
          current_behavior: 'Standard reviewers',
          proposed_change: 'Skip security reviewer',
          evidence: 'Reviewer thinks this is fine',
          evidence_type: 'REVIEWER_CLAIM', // L1 claim
        });
      }).toThrow('Anti-Self-Poisoning violation');
    });

    test('Accepts candidate backed by verified outcome and deterministic telemetry', () => {
      const candidate = createCandidateFromOutcome({
        source: 'FP_CORRECTION',
        target: 'reviewer-routing',
        current_behavior: 'Dispatches 7 reviewers on pure markdown files',
        proposed_change: 'Fast-Pass Markdown documentation changes',
        evidence: 'Verified test run demonstrated 0 findings across 200 doc changes',
        evidence_type: 'VERIFIED_TEST_RESULT',
        previous_state: { default_reviewers: 7 },
      });

      expect(candidate.candidate_id).toMatch(/^EVO-/);
      expect(candidate.status).toBe('PROPOSED');
      expect(candidate.confidence).toBe('L1');
      expect(candidate.rollback_data.previous_state).toEqual({ default_reviewers: 7 });
    });
  });

  describe('Regression Testing, Human Gate Approval & Promotion Lifecycle', () => {
    test('Controlled fixture: candidate testing, rejection on failure, approval and promotion on success', async () => {
      const candidate = createCandidateFromOutcome({
        source: 'SYSTEM1_CLASSIFICATION',
        target: 'context-weights',
        current_behavior: 'Doc weight 0.25',
        proposed_change: { doc_weight: 0.1 },
        evidence: 'Telemetry recorded 45% token overhead on code-only edits',
        evidence_type: 'DETERMINISTIC_TELEMETRY',
        previous_state: { doc_weight: 0.25 },
      });

      // 1. Test failing regression corpus -> candidate is REJECTED
      const failingSuite = [
        { name: 'baseline_token_test', run: async () => true },
        {
          name: 'security_regression_test',
          run: async () => ({ passed: false, reason: 'Security boundary altered' }),
        },
      ];

      const failResult = await validateCandidateAgainstCorpus(candidate, failingSuite);
      expect(failResult.valid).toBe(false);
      expect(candidate.status).toBe('REJECTED');
      expect(candidate.rejection.reason).toContain('Regression validation failed');

      // 2. Unapproved / rejected candidate CANNOT be promoted
      expect(() => {
        promoteCandidate(candidate, tmpAgentDir);
      }).toThrow('Only APPROVED candidates');

      // 3. Create fresh candidate and test passing corpus -> candidate is VALIDATING
      const validCandidate = createCandidateFromOutcome({
        source: 'SYSTEM1_CLASSIFICATION',
        target: 'context-weights',
        current_behavior: 'Doc weight 0.25',
        proposed_change: { doc_weight: 0.15 },
        evidence: 'Telemetry recorded 30% speedup without missing dependencies',
        evidence_type: 'VERIFIED_TEST_RESULT',
        previous_state: { doc_weight: 0.25 },
      });

      const passingSuite = [
        { name: 'baseline_tests_pass', run: async () => true },
        { name: 'adversarial_evasion_check', run: async () => true, isAdversarial: true },
      ];

      const passResult = await validateCandidateAgainstCorpus(validCandidate, passingSuite);
      expect(passResult.valid).toBe(true);
      expect(validCandidate.status).toBe('VALIDATING');
      expect(validCandidate.candidate_score).toBe(1.0);

      // 4. Human Gate Approval
      approveCandidate(validCandidate, 'Lead Architect (Harmit)', tmpAgentDir);
      expect(validCandidate.status).toBe('APPROVED');
      expect(validCandidate.approval.approved_by).toBe('Lead Architect (Harmit)');
      expect(validCandidate.approval.human_gate_cleared).toBe(true);

      // 5. Promotion
      const promoResult = promoteCandidate(validCandidate, tmpAgentDir);
      expect(promoResult.promoted).toBe(true);
      expect(validCandidate.status).toBe('PROMOTED');

      // Verify active evolutions file exists and contains candidate
      const activePath = getActiveEvolutionsPath(tmpAgentDir);
      expect(fs.existsSync(activePath)).toBe(true);
      const active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(active['context-weights'].candidate_id).toBe(validCandidate.candidate_id);
      expect(active['context-weights'].proposed_change).toEqual({ doc_weight: 0.15 });

      // 6. Rollback cleanly restores previous state
      const rollbackResult = rollbackCandidate(validCandidate.candidate_id, tmpAgentDir);
      expect(rollbackResult.rolled_back).toBe(true);
      expect(rollbackResult.restored_state).toEqual({ doc_weight: 0.25 });

      const activeAfterRollback = JSON.parse(fs.readFileSync(activePath, 'utf8'));
      expect(activeAfterRollback['context-weights']).toEqual({ doc_weight: 0.25 });

      const reloadedCandidate = loadCandidate(validCandidate.candidate_id, tmpAgentDir);
      expect(reloadedCandidate.status).toBe('ROLLED_BACK');
    });
  });
});
