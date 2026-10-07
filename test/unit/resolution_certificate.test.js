'use strict';

const { ResolutionCertificate } = require('../../src/execution/resolution_certificate');
const { EvidenceAggregator } = require('../../src/execution/evidence_aggregator');

describe('ResolutionCertificate', () => {
  it('generates a valid certificate', () => {
    const aggregator = new EvidenceAggregator();
    aggregator.addEvidence({ type: 'EXECUTION', source: 'unit_tests', status: 'PASSED' });

    const params = {
      runId: 'run-1',
      findingFingerprint: 'f-123',
      originalRepositoryFingerprint: 'repo-hash-1',
      correctedRepositoryFingerprint: 'repo-hash-2',
      proposalHash: 'prop-1',
      reviewHash: 'rev-1',
      transactionHash: 'tx-1',
      aggregator,
      diff: {},
      finalVerdict: 'RESOLVED',
    };

    const cert = ResolutionCertificate.generate(params);

    expect(cert.certificateId).toMatch(/^CERT-/);
    expect(cert.certificateHash).toBeDefined();
    expect(cert.confidence).toBe('HIGH');
    expect(cert.evidence.length).toBe(1);
  });

  it('fails if provenance chain is broken', () => {
    const aggregator = new EvidenceAggregator();
    const params = {
      proposalHash: null, // broken chain
      transactionHash: 'tx-1',
      aggregator,
    };

    const cert = ResolutionCertificate.generate(params);
    expect(cert.status).toBe('PROVENANCE_INVALID');
  });
});
