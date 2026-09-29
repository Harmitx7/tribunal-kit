'use strict';

const {
  createImplementationCheck,
  createEvidenceClaim,
  synthesizeReviewResults,
} = require('../../src/synthesis/claim_check_separator');

describe('Capability 3: Implementation Checks vs Evidence Claims', () => {
  test('Scenario 1: Deterministic check passes but reviewer claims failure', () => {
    const check = createImplementationCheck({
      check: 'tests_passed',
      command: 'npm test',
      result: 'PASSED',
      timestamp: '2026-09-29T12:00:00Z',
      runId: 'run-101',
    });

    const claim = createEvidenceClaim({
      reviewer: 'logic-reviewer',
      assertion: 'Unit tests failed for user registration logic',
      category: 'test',
      file: 'test/auth.test.js',
      line: 42,
      confidence: 'L3',
    });

    const synthesis = synthesizeReviewResults({
      checks: [check],
      claims: [claim],
      runId: 'syn-test-1',
    });

    expect(synthesis.summary.verdict).toBe('CONFLICT');
    expect(synthesis.conflicts.length).toBeGreaterThanOrEqual(1);

    const conflict = synthesis.conflicts.find(c => c.type === 'CHECK_PASSED_CLAIM_FAILED');
    expect(conflict).toBeDefined();
    expect(conflict.resolution).toBe('DETERMINISTIC_CHECK_PRESERVED');

    // Claim was NOT promoted to VERIFIED
    const synthesizedClaim = synthesis.claimed_items.find(c => c.claim_id === claim.claim_id);
    expect(synthesizedClaim.status).not.toBe('VERIFIED');
    expect(synthesizedClaim.provenance.reviewer).toBe('logic-reviewer');
  });

  test('Scenario 2: Deterministic check fails but reviewer claims success', () => {
    const check = createImplementationCheck({
      check: 'security_scan_passed',
      command: 'node .agent/scripts/security_scan.js',
      result: 'FAILED',
      details: 'Hardcoded JWT secret detected at line 14',
    });

    const claim = createEvidenceClaim({
      reviewer: 'security-auditor',
      assertion: 'Security scan passed cleanly and approved for production',
      category: 'security',
      confidence: 'L2',
    });

    const synthesis = synthesizeReviewResults({
      checks: [check],
      claims: [claim],
    });

    expect(synthesis.summary.verdict).toBe('FAILED_CHECKS');
    expect(synthesis.summary.failed_checks).toBe(1);

    const conflict = synthesis.conflicts.find(c => c.type === 'CHECK_FAILED_CLAIM_PASSED');
    expect(conflict).toBeDefined();
    expect(conflict.resolution).toBe('CHECK_FAILURE_ENFORCED');

    // Reviewer approval CANNOT override failing check
    const synthesizedClaim = synthesis.claimed_items.find(c => c.claim_id === claim.claim_id);
    expect(synthesizedClaim.status).toBe('CLAIM_REJECTED_CHECK_FAILED');
  });

  test('Scenario 3: Both agree with passing execution proof', () => {
    const check = createImplementationCheck({
      check: 'hash_verified',
      command: 'crypto.createHash sha256',
      result: 'PASSED',
      details: 'Artifact matches expected SHA-256',
      runId: 'hash-run-99',
    });

    const synthesis = synthesizeReviewResults({
      checks: [check],
      claims: [],
    });

    expect(synthesis.summary.verdict).toBe('VERIFIED');
    expect(synthesis.verified_items.length).toBe(1);
    expect(synthesis.verified_items[0].item).toBe('hash_verified');
    expect(synthesis.verified_items[0].provenance.run_id).toBe('hash-run-99');
  });

  test('Scenario 4: No deterministic evidence exists (pure claim)', () => {
    const claim = createEvidenceClaim({
      reviewer: 'architecture-auditor',
      assertion: 'The service layer may introduce circular coupling with user cache',
      category: 'architecture',
      file: 'src/services/user.js',
      line: 88,
      // Confidence is not known objectively -> UNAVAILABLE
      confidence: 'UNAVAILABLE',
    });

    const synthesis = synthesizeReviewResults({
      checks: [],
      claims: [claim],
    });

    expect(synthesis.summary.verdict).toBe('CLAIMED');
    expect(synthesis.verified_items.length).toBe(0);
    expect(synthesis.claimed_items.length).toBe(1);

    const item = synthesis.claimed_items[0];
    expect(item.status).toBe('CLAIMED');
    expect(item.confidence).toBe('UNAVAILABLE'); // Never fabricated
    expect(item.provenance.reviewer).toBe('architecture-auditor');
    expect(item.provenance.file).toBe('src/services/user.js');
    expect(item.provenance.line).toBe(88);
  });

  test('Scenario 5: Conflicting reviewers make opposite claims', () => {
    const claimA = createEvidenceClaim({
      reviewer: 'security-auditor',
      assertion: 'Critical SQL injection vulnerability exists in raw query',
      category: 'security',
      file: 'src/db/query.js',
      line: 30,
    });

    const claimB = createEvidenceClaim({
      reviewer: 'database-architect',
      assertion: 'Query is safe from SQL injection because input is sanitized by ORM',
      category: 'security',
      file: 'src/db/query.js',
      line: 30,
    });

    const synthesis = synthesizeReviewResults({
      checks: [],
      claims: [claimA, claimB],
    });

    expect(synthesis.summary.verdict).toBe('CONFLICT');
    const reviewerConflict = synthesis.conflicts.find(c => c.type === 'REVIEWER_OPPOSITE_CLAIMS');
    expect(reviewerConflict).toBeDefined();
    expect(reviewerConflict.location).toBe('src/db/query.js:30');
    expect(reviewerConflict.claim_ids).toContain(claimA.claim_id);
    expect(reviewerConflict.claim_ids).toContain(claimB.claim_id);

    // Both claims retain their respective provenance
    const itemA = synthesis.claimed_items.find(c => c.claim_id === claimA.claim_id);
    const itemB = synthesis.claimed_items.find(c => c.claim_id === claimB.claim_id);

    expect(itemA.provenance.reviewer).toBe('security-auditor');
    expect(itemB.provenance.reviewer).toBe('database-architect');
    expect(itemA.status).not.toBe('VERIFIED');
    expect(itemB.status).not.toBe('VERIFIED');
  });

  test('Input validation: invalid check or missing reviewer throws error', () => {
    expect(() => createImplementationCheck({ check: '', result: 'PASSED' })).toThrow();
    expect(() => createImplementationCheck({ check: 'lint', result: 'MAYBE' })).toThrow();
    expect(() => createEvidenceClaim({ reviewer: '', assertion: 'foo' })).toThrow();
    expect(() => createEvidenceClaim({ reviewer: 'test', assertion: '' })).toThrow();
  });
});
