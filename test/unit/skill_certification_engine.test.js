'use strict';

const fs = require('fs');
const path = require('path');
const {
  EVIDENCE_TRUST_LEVELS,
  CLAIM_STATUS,
  CERTIFICATION_LEVELS,
  REPEATABILITY,
  appendLedgerEvent,
  readLedgerEvents,
  checkSourceFreshness,
  LEDGER_PATH,
} = require('../../.agent/scripts/skill_certification_engine');

describe('skill_certification_engine Unit Tests', () => {
  it('1. Verifies evidence trust hierarchy invariants', () => {
    expect(EVIDENCE_TRUST_LEVELS.E0.certifiable).toBe(false);
    expect(EVIDENCE_TRUST_LEVELS.E1.certifiable).toBe(false);
    expect(EVIDENCE_TRUST_LEVELS.E2.certifiable).toBe(true);
    expect(EVIDENCE_TRUST_LEVELS.E3.certifiable).toBe(false); // implementation is never certifying
    expect(EVIDENCE_TRUST_LEVELS.E3.independent).toBe(false);
    expect(EVIDENCE_TRUST_LEVELS.E4.certifiable).toBe(true);
    expect(EVIDENCE_TRUST_LEVELS.E5.certifiable).toBe(true);
  });

  it('2. Appends immutable events to certification ledger and reads them', () => {
    const event = appendLedgerEvent({
      event: 'TEST_APPROVED',
      skill_id: 'unit-test-skill',
      reviewer: 'Senior QA',
    });

    expect(event.event_id).toBeDefined();
    expect(event.timestamp).toBeDefined();

    const events = readLedgerEvents('unit-test-skill');
    expect(events.length).toBeGreaterThan(0);
    const found = events.find(e => e.event_id === event.event_id);
    expect(found).toBeDefined();
    expect(found.reviewer).toBe('Senior QA');
  });

  it('3. Detects source freshness and detects stale source drift', () => {
    const testSpec = {
      skill_id: 'api-patterns',
      evidence_sources: [
        {
          source_hash: 'INVALID_OR_DRIFTED_HASH_0000000000000000000',
        },
      ],
    };

    const freshness = checkSourceFreshness(testSpec);
    expect(freshness.fresh).toBe(false);
    expect(freshness.reason).toContain('SOURCE_STALE');
  });
});
