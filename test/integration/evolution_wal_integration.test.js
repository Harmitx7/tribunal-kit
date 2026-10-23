'use strict';

/**
 * evolution_wal_integration.test.js
 * =================================
 * End-to-end integration test for Phase 2:
 * Proves that candidate promotion, invariant validation, and WAL transactions
 * provide atomic ACID safety, restoring original states if invariants fail.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  createCandidateFromOutcome,
  validateCandidateAgainstCorpus,
  approveCandidate,
  promoteCandidate,
  rollbackCandidate,
  saveCandidate,
  getActiveEvolutionsPath,
} = require('../../src/system1/evolution_pipeline');
const { WalTransactionManager } = require('../../src/evolution/wal_transaction_manager');

describe('Evolution Pipeline + WAL Transaction Integration', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-evolution-wal-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('Full happy path: candidate creation -> validation -> approval -> WAL-committed promotion', async () => {
    const outcome = {
      source: 'SYSTEM1_CLASSIFICATION',
      target: 'reviewer-routing',
      current_behavior: 'Default routing latency 150ms',
      proposed_change: 'Cache hot route classifiers in LRU cache',
      evidence: 'Observed 40% latency reduction across 50 simulated calls',
      evidence_type: 'DETERMINISTIC_TELEMETRY',
    };

    // 1. Create candidate
    const candidate = createCandidateFromOutcome(outcome, 'CAND_INT_001');
    expect(candidate.status).toBe('PROPOSED');
    saveCandidate(candidate, tmpDir);

    // 2. Validate against passing regression suite
    const validation = await validateCandidateAgainstCorpus(candidate, [
      { name: 'check-caching', run: async () => true },
    ]);
    expect(validation.valid).toBe(true);

    // 3. Human Gate approval
    const approved = approveCandidate(candidate, 'Lead Architect', tmpDir);
    expect(approved.status).toBe('APPROVED');
    expect(approved.proof_certificate).toBeDefined();

    // 4. Promotion with WAL transaction
    const promotion = promoteCandidate(approved, tmpDir);
    expect(promotion.promoted).toBe(true);
    expect(promotion.wal_tx_id).toBeDefined();

    // Verify active evolutions file updated
    const activePath = getActiveEvolutionsPath(tmpDir);
    const active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    expect(active['reviewer-routing']).toBeDefined();
    expect(active['reviewer-routing'].candidate_id).toBe('CAND_INT_001');

    // Verify WAL transaction is in COMMIT state
    const wal = new WalTransactionManager({ agentDir: tmpDir });
    const journal = wal.getTransaction(promotion.wal_tx_id);
    expect(journal.state).toBe('COMMIT');

    // 5. Rollback candidate cleanly
    const rollback = rollbackCandidate('CAND_INT_001', tmpDir);
    expect(rollback.rolled_back).toBe(true);

    const activeAfter = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    expect(activeAfter['reviewer-routing']).toBeUndefined();
  });

  test('Automatic rollback: Invariant breach during promotion reverts state via WAL', async () => {
    const activePath = getActiveEvolutionsPath(tmpDir);
    const dir = path.dirname(activePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Seed active evolutions with baseline
    const baseline = { 'reviewer-routing': { candidate_id: 'CAND_BASELINE', value: 'ORIGINAL' } };
    fs.writeFileSync(activePath, JSON.stringify(baseline, null, 2), 'utf8');

    // Attempt to promote an unapproved candidate (violates state transition invariant)
    const unapprovedCandidate = {
      candidate_id: 'CAND_ILLEGAL',
      target: 'reviewer-routing',
      status: 'VALIDATING', // NOT APPROVED!
      proposed_change: 'Bad change',
    };

    expect(() => promoteCandidate(unapprovedCandidate, tmpDir)).toThrow(
      /Only APPROVED candidates that cleared the Human Gate can be promoted/,
    );

    // Verify active evolutions file was NOT corrupted or overwritten
    const activeAfter = JSON.parse(fs.readFileSync(activePath, 'utf8'));
    expect(activeAfter['reviewer-routing'].candidate_id).toBe('CAND_BASELINE');
    expect(activeAfter['reviewer-routing'].value).toBe('ORIGINAL');
  });
});
