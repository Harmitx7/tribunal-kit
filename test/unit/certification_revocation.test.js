'use strict';

const {
  revokeCertification,
  readLedgerEvents,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Certification Revocation Unit Tests', () => {
  it('1. Appends an immutable revocation event to the ledger without deleting prior history', () => {
    const skillId = 'revocation-target-skill';
    const reason = 'Critical security flaw discovered in runtime container dependency';
    const reviewer = 'Tribunal Lead Auditor';

    const result = revokeCertification(skillId, reason, reviewer);
    expect(result.success).toBe(true);
    expect(result.revocation.event).toBe('CERTIFICATION_REVOKED');
    expect(result.revocation.skill_id).toBe(skillId);
    expect(result.revocation.reason).toBe(reason);

    // Read ledger to confirm record persisted
    const events = readLedgerEvents(skillId);
    const revEvent = events.find(e => e.event === 'CERTIFICATION_REVOKED' && e.skill_id === skillId);
    expect(revEvent).toBeDefined();
    expect(revEvent.revoked_by).toBe(reviewer);
  });
});
