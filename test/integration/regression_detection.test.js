'use strict';

const {
  compareCertificationSnapshots,
  CERTIFICATION_LEVELS,
} = require('../../.agent/scripts/skill_certification_engine');

describe('Regression Detection Integration Tests', () => {
  it('1. Detects and reports certification degradation regressions', () => {
    const baselineSnapshot = {
      skills: {
        'geo-fundamentals': { status: CERTIFICATION_LEVELS.HIGH_CONFIDENCE, coverage: 85 },
        'webapp-testing': { status: CERTIFICATION_LEVELS.PARTIAL, coverage: 60 },
      },
    };

    const degradedSnapshot = {
      skills: {
        'geo-fundamentals': { status: CERTIFICATION_LEVELS.PARTIAL, coverage: 50 },
        'webapp-testing': { status: 'REVOKED', reason: 'Security failure', coverage: 0 },
      },
    };

    const { diff, regressions } = compareCertificationSnapshots(baselineSnapshot, degradedSnapshot);

    expect(diff.DEGRADED).toContain('geo-fundamentals');
    expect(diff.REVOKED).toContain('webapp-testing');

    expect(regressions.length).toBe(2);
    const geoReg = regressions.find(r => r.skill === 'geo-fundamentals');
    expect(geoReg.previous_state).toBe(CERTIFICATION_LEVELS.HIGH_CONFIDENCE);
    expect(geoReg.current_state).toBe(CERTIFICATION_LEVELS.PARTIAL);

    const webappReg = regressions.find(r => r.skill === 'webapp-testing');
    expect(webappReg.previous_state).toBe(CERTIFICATION_LEVELS.PARTIAL);
    expect(webappReg.current_state).toBe('REVOKED');
  });
});
