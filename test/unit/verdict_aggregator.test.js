'use strict';

/**
 * verdict_aggregator.test.js — Verdict Aggregator & Monotonic Invariant Tests
 * ===========================================================================
 * Phase 1I: Deterministic Verdict Aggregation & Conflict Resolution Tests
 */

const { VerdictAggregator } = require('../../src/execution/verdict_aggregator');

describe('Phase 1I: VerdictAggregator Safety Invariants & Aggregation', () => {
  test('returns APPROVED when all reviewers approve with zero findings', () => {
    const results = [
      { reviewerId: 'security-auditor', verdict: 'APPROVED', findings: [] },
      { reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 1 });
    expect(agg.verdict).toBe('APPROVED');
    expect(agg.severity).toBe('INFO');
    expect(agg.conflicts).toHaveLength(0);
    expect(agg.findings).toHaveLength(0);
  });

  test('returns REJECTED when any reviewer flags a CRITICAL finding', () => {
    const results = [
      {
        reviewerId: 'security-auditor',
        verdict: 'REJECTED',
        findings: [
          {
            id: 'F1',
            severity: 'CRITICAL',
            title: 'SQL Injection',
            location: 'auth.js:14',
            recommendation: 'Use parameters',
          },
        ],
      },
      { reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 2 });
    expect(agg.verdict).toBe('REJECTED');
    expect(agg.severity).toBe('CRITICAL');
    expect(agg.findingsCount.critical).toBe(1);
    expect(agg.conflicts.length).toBeGreaterThan(0);
    expect(agg.conflicts[0].type).toBe('REVIEWER_CONTRADICTION');
  });

  test('returns REJECTED when any reviewer flags a HIGH severity finding', () => {
    const results = [
      {
        reviewerId: 'resilience-reviewer',
        verdict: 'WARNING',
        findings: [
          {
            id: 'F2',
            severity: 'HIGH',
            title: 'Unhandled Promise Rejection',
            location: 'worker.js:40',
            recommendation: 'Wrap in try/catch',
          },
        ],
      },
      { reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 2 });
    expect(agg.verdict).toBe('REJECTED');
    expect(agg.severity).toBe('HIGH');
  });

  test('returns REJECTED when reviewer returns REJECTED verdict even with empty findings', () => {
    const results = [
      { reviewerId: 'schema-reviewer', verdict: 'REJECTED', findings: [] },
      { reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 2 });
    expect(agg.verdict).toBe('REJECTED');
  });

  test('returns WARNING when only MEDIUM or LOW findings exist', () => {
    const results = [
      {
        reviewerId: 'logic-reviewer',
        verdict: 'WARNING',
        findings: [
          {
            id: 'F3',
            severity: 'MEDIUM',
            title: 'Suboptimal loop complexity',
            location: 'util.js:10',
            recommendation: 'Use Map for O(1) lookup',
          },
        ],
      },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 1 });
    expect(agg.verdict).toBe('WARNING');
    expect(agg.severity).toBe('MEDIUM');
  });

  test('enforces monotonic safety: reviewer ERROR cannot yield unconditional APPROVED', () => {
    const results = [
      { reviewerId: 'security-auditor', verdict: 'ERROR', findings: [] },
      { reviewerId: 'logic-reviewer', verdict: 'APPROVED', findings: [] },
    ];

    const agg = VerdictAggregator.aggregate({ results, tier: 2 });
    expect(agg.verdict).toBe('WARNING');
    expect(agg.verdict).not.toBe('APPROVED');
    expect(agg.reason).toContain('errors or timeouts');
  });

  test('enforces deterministic check precedence: failing check overrides approving reviewer claims', () => {
    const results = [{ reviewerId: 'security-auditor', verdict: 'APPROVED', findings: [] }];
    const checks = [
      { check: 'npm_audit', result: 'FAILED', details: 'Found 2 critical vulnerabilities' },
    ];

    const agg = VerdictAggregator.aggregate({ results, checks, tier: 1 });
    expect(agg.verdict).toBe('REJECTED');
    expect(agg.severity).toBe('CRITICAL');
    expect(agg.conflicts.some(c => c.type === 'DETERMINISTIC_CHECK_FAILED')).toBe(true);
  });

  test('approves Tier 0 Fast-Pass with 0 reviewers when zero risk checks fail', () => {
    const agg = VerdictAggregator.aggregate({ results: [], tier: 0 });
    expect(agg.verdict).toBe('APPROVED');
    expect(agg.severity).toBe('INFO');
  });

  test('fails closed on 0 reviewers executed when tier requires review (Tier 2 or 3)', () => {
    const agg = VerdictAggregator.aggregate({ results: [], tier: 2 });
    expect(agg.verdict).toBe('REJECTED');
    expect(agg.reason).toContain('Fail-Closed Invariant');
  });
});
