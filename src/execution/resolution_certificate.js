'use strict';

const crypto = require('crypto');

/**
 * Phase 6N, 6O: Resolution Certificate
 * Cryptographically ties all evidence and provenance.
 */
class ResolutionCertificate {
  static generate(params) {
    const {
      runId,
      findingFingerprint,
      originalRepositoryFingerprint,
      correctedRepositoryFingerprint,
      proposalHash,
      reviewHash,
      transactionHash,
      aggregator,
      diff,
      finalVerdict,
    } = params;

    // Validate Provenance Chain (Phase 6O)
    if (!proposalHash || !transactionHash) {
      return { status: 'PROVENANCE_INVALID', reason: 'Missing link in provenance chain' };
    }

    const payload = {
      certificateId: `CERT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      runId,
      timestamp: new Date().toISOString(),
      findingFingerprint,
      originalRepositoryFingerprint,
      correctedRepositoryFingerprint,
      proposalHash,
      reviewHash,
      transactionHash,
      evidence: aggregator.getAllEvidence(),
      diff,
      finalVerdict,
      confidence: finalVerdict === 'RESOLVED' ? 'HIGH' : 'LOW',
    };

    payload.certificateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    return payload;
  }
}

module.exports = { ResolutionCertificate };
