'use strict';

const path = require('path');
const {
  auditClaim,
  auditFindingsForHallucinations,
  KNOWN_GHOST_PACKAGES,
  INVENTED_STDLIB_METHODS,
} = require('../../src/evaluation/hallucination_detection_auditor');

const REPO_ROOT = path.resolve(__dirname, '../..');

describe('Hallucination Detection & Source Verification Auditor', () => {
  describe('auditClaim 5-State Epistemic Verdicts', () => {
    it('detects fabricated ghost package dependencies as CONTRADICTED', () => {
      const claim = {
        id: 'CLAIM-GHOST-01',
        title: 'Use ultravalidate to sanitize input',
        impact: 'Prevents XSS vulnerabilities',
        evidence: [{ location: 'package.json:1' }],
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('CONTRADICTED');
      expect(report.hallucinationType).toBe('GHOST_PACKAGE');
      expect(report.reason).toContain('ultravalidate');
    });

    it('detects invented standard library methods as CONTRADICTED', () => {
      const claim = {
        id: 'CLAIM-INVENTED-01',
        title: 'Refactor deduplication using Array.prototype.unique',
        evidence: [{ location: 'package.json:1' }],
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('CONTRADICTED');
      expect(report.hallucinationType).toBe('INVENTED_API');
    });

    it('detects fabricated non-existent source files as CONTRADICTED', () => {
      const claim = {
        id: 'CLAIM-MISSING-FILE',
        assertion: 'Vulnerability in auth router',
        evidence: [{ location: 'src/definitely_non_existent_file_xyz_123.js:42' }],
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('CONTRADICTED');
      expect(report.hallucinationType).toBe('MISSING_FILE');
    });

    it('detects stale line numbers exceeding file length as CONTRADICTED', () => {
      const claim = {
        id: 'CLAIM-STALE-LINE',
        assertion: 'Syntax error at line 99999 in package.json',
        evidence: [{ location: 'package.json:99999' }],
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('CONTRADICTED');
      expect(report.hallucinationType).toBe('STALE_LINE');
    });

    it('detects contradiction between claim of success and non-zero tool exit code', () => {
      const claim = {
        id: 'CLAIM-TOOL-CONTRADICTION',
        assertion: 'All test suites passed successfully without errors',
        evidence: [{ location: 'package.json:1' }],
        verification: { exit_code: 1, command: 'npm test' },
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('CONTRADICTED');
      expect(report.hallucinationType).toBe('TOOL_CONTRADICTION');
    });

    it('marks claim with zero evidence as UNSUPPORTED', () => {
      const claim = {
        id: 'CLAIM-BARE-ASSERTION',
        assertion: 'Severe security risk discovered in the database architecture',
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('UNSUPPORTED');
      expect(report.hallucinationType).toBe('UNSUPPORTED_ASSERTION');
    });

    it('verifies genuine disk location as SUPPORTED with 1.0 entailment', () => {
      const claim = {
        id: 'CLAIM-REAL-EVIDENCE',
        assertion: 'Project name is tribunal-kit',
        evidence: [{ location: 'package.json:2' }],
      };
      const report = auditClaim(claim, REPO_ROOT);
      expect(report.verdict).toBe('SUPPORTED');
      expect(report.entailmentScore).toBe(1.0);
    });

    it('marks partially verified evidence as PARTIALLY_SUPPORTED', () => {
      const claim = {
        id: 'CLAIM-PARTIAL',
        assertion: 'Configuration spans package.json and non-existent file',
        evidence: [
          { location: 'package.json:2' },
          { location: 'src/missing_file_001.js:1' },
        ],
      };
      // Notice: when a missing file is present in multi-evidence, missing file check catches it or flags partial
      const report = auditClaim(claim, REPO_ROOT);
      expect(['CONTRADICTED', 'PARTIALLY_SUPPORTED']).toContain(report.verdict);
    });
  });

  describe('auditFindingsForHallucinations Aggregate', () => {
    it('aggregates verdicts across multiple findings', () => {
      const findings = [
        {
          id: 'F1',
          assertion: 'Project name is tribunal-kit',
          evidence: [{ location: 'package.json:2' }],
        },
        {
          id: 'F2',
          assertion: 'Needs ultravalidate for security',
          evidence: [{ location: 'package.json:1' }],
        },
        {
          id: 'F3',
          assertion: 'General security warning without proof',
        },
      ];

      const aggregate = auditFindingsForHallucinations(findings, REPO_ROOT);
      expect(aggregate.totalFindings).toBe(3);
      expect(aggregate.verdictCounts.SUPPORTED).toBe(1);
      expect(aggregate.verdictCounts.CONTRADICTED).toBe(1);
      expect(aggregate.verdictCounts.UNSUPPORTED).toBe(1);
      expect(aggregate.hallucinationsDetected).toBe(2);
      expect(aggregate.hallucinationRate).toBeCloseTo(0.6667, 3);
    });
  });
});
