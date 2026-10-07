'use strict';

const { EvidenceAggregator } = require('../../src/execution/evidence_aggregator');
const { ResolutionPolicy } = require('../../src/execution/resolution_policy');

describe('EvidenceAggregator & ResolutionPolicy', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new EvidenceAggregator();
  });

  it('aggregates evidence independently (groups by source)', () => {
    // Add two test runners (e.g. jest and a wrapper around jest)
    aggregator.addEvidence({ type: 'EXECUTION', source: 'jest', status: 'PASSED' });
    aggregator.addEvidence({ type: 'EXECUTION', source: 'jest', status: 'FAILED' }); // Overwrites the same source

    expect(aggregator.getAllEvidence().length).toBe(1);
    expect(aggregator.hasFailingEvidence('EXECUTION')).toBe(true);
  });

  it('detects conflicts and fails closed', () => {
    aggregator.addEvidence({ type: 'EXECUTION', source: 'unit_tests', status: 'FAILED' });
    aggregator.addEvidence({ type: 'REVIEW', source: 'reviewer_1', status: 'PASSED' });

    const result = ResolutionPolicy.evaluate('Correctness', aggregator);

    // The failing test MUST override the passing review
    expect(result.status).toBe('UNRESOLVED');
    expect(result.reason).toContain('Failing deterministic evidence overrides');
  });

  it('resolves when all mandatory evidence passes', () => {
    aggregator.addEvidence({ type: 'EXECUTION', source: 'unit_tests', status: 'PASSED' });
    aggregator.addEvidence({ type: 'REVIEW', source: 'reviewer_1', status: 'PASSED' });

    const result = ResolutionPolicy.evaluate('Correctness', aggregator);

    expect(result.status).toBe('RESOLVED');
  });

  it('escalates when mandatory evidence is missing', () => {
    // Only have REVIEW, but SECURITY needs STATIC and REPRODUCTION too
    aggregator.addEvidence({ type: 'REVIEW', source: 'reviewer_1', status: 'PASSED' });

    const result = ResolutionPolicy.evaluate('Security', aggregator);

    expect(result.status).toBe('ESCALATED');
    expect(result.reason).toContain('Missing mandatory evidence');
  });
});
