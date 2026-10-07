'use strict';

const {
  compareCertificationSnapshots,
  CERTIFICATION_LEVELS,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Certification Diff & Snapshot Comparison Unit Tests', () => {
  it('1. Detects newly certified skills and upgrades', () => {
    const prevSnapshot = {
      skills: {
        'skill-a': { status: CERTIFICATION_LEVELS.PARTIAL },
        'skill-b': { status: CERTIFICATION_LEVELS.PARTIAL },
      },
    };

    const currSnapshot = {
      skills: {
        'skill-a': { status: CERTIFICATION_LEVELS.BEHAVIORALLY_CERTIFIED },
        'skill-b': { status: CERTIFICATION_LEVELS.HIGH_CONFIDENCE },
      },
    };

    const { diff, regressions } = compareCertificationSnapshots(prevSnapshot, currSnapshot);
    expect(diff.NEWLY_CERTIFIED).toContain('skill-a');
    expect(diff.UPGRADED).toContain('skill-b');
    expect(regressions.length).toBe(0);
  });

  it('2. Detects degradations, revocations, and regressions', () => {
    const prevSnapshot = {
      skills: {
        'skill-c': { status: CERTIFICATION_LEVELS.HIGH_CONFIDENCE },
        'skill-d': { status: CERTIFICATION_LEVELS.PARTIAL },
      },
    };

    const currSnapshot = {
      skills: {
        'skill-c': { status: CERTIFICATION_LEVELS.PARTIAL },
        'skill-d': { status: 'REVOKED', reason: 'Security violation' },
      },
    };

    const { diff, regressions } = compareCertificationSnapshots(prevSnapshot, currSnapshot);
    expect(diff.DEGRADED).toContain('skill-c');
    expect(diff.REVOKED).toContain('skill-d');
    expect(regressions.length).toBe(2);
    expect(regressions[0].skill).toBe('skill-c');
    expect(regressions[1].skill).toBe('skill-d');
  });

  it('3. Reports UNCHANGED and zero regressions on identical snapshots', () => {
    const snapshot = {
      skills: {
        'skill-e': { status: CERTIFICATION_LEVELS.PARTIAL },
      },
    };

    const { diff, regressions } = compareCertificationSnapshots(snapshot, snapshot);
    expect(diff.UNCHANGED).toContain('skill-e');
    expect(regressions.length).toBe(0);
  });
});
