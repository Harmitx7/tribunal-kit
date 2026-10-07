'use strict';

const crypto = require('crypto');

/**
 * Phase 6I, 6J: Evidence Aggregator
 * Collects evidence from multiple sources and ensures independence.
 */
class EvidenceAggregator {
  constructor() {
    this.evidence = new Map();
  }

  addEvidence(evidenceItem) {
    if (!evidenceItem.type || !evidenceItem.source || !evidenceItem.status) {
      throw new Error('Invalid evidence schema');
    }

    const evidenceId = evidenceItem.evidenceId || crypto.randomUUID();

    // Grouping to ensure independence (e.g. don't count two test runners as two separate signals if they are wrappers)
    const independenceKey = `${evidenceItem.type}:${evidenceItem.source}`;

    this.evidence.set(independenceKey, {
      ...evidenceItem,
      evidenceId,
      timestamp: new Date().toISOString(),
    });

    return evidenceId;
  }

  getEvidenceByType(type) {
    return Array.from(this.evidence.values()).filter(e => e.type === type);
  }

  getAllEvidence() {
    return Array.from(this.evidence.values());
  }

  hasPassingEvidence(type) {
    const items = this.getEvidenceByType(type);
    return items.some(e => e.status === 'PASSED' || e.status === 'VERIFIED');
  }

  hasFailingEvidence(type) {
    const items = this.getEvidenceByType(type);
    return items.some(
      e => e.status === 'FAILED' || e.status === 'REJECTED' || e.status === 'CRASHED',
    );
  }
}

module.exports = { EvidenceAggregator };
