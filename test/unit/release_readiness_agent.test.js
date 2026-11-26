'use strict';

/**
 * release_readiness_agent.test.js — Stage 3.6: Release Readiness Agent Implementation
 * ===================================================================================
 * Verifies the canonical specialist persona, release readiness contracts, fail-closed
 * gate enforcement, adversarial verification cases, and runtime integration.
 */

const fs = require('fs');
const path = require('path');
const {
  resolveAgent,
  listAllAgents,
  getRegistrySummary: _getRegistrySummary,
} = require('../../src/execution/canonical_registry');
const {
  RELEASE_READINESS_CATEGORIES,
  RELEASE_GATE_STATUSES: _RELEASE_GATE_STATUSES,
  RELEASE_VERDICTS,
  RELEASE_FINDING_STATUSES: _RELEASE_FINDING_STATUSES,
  ReleaseReadinessFindingSchema: _ReleaseReadinessFindingSchema,
  ReleaseReadinessReportSchema: _ReleaseReadinessReportSchema,
  validateReleaseReadinessFinding,
  safeValidateReleaseReadinessFinding,
  validateReleaseReadinessReport,
  safeValidateReleaseReadinessReport,
  AgentResultSchema,
  parseRawAgentOutput,
} = require('../../src/execution/agent_contracts');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.agent', 'agents');

describe('Stage 3.6: Release Readiness Agent & Release Gate Certification', () => {
  const sampleValidFinding = {
    findingId: 'RRF-TEST-001',
    category: 'TEST_INTEGRITY',
    severity: 'MEDIUM',
    status: 'NON_BLOCKING',
    title: 'Flaky test detected under sustained load',
    description: 'Test suite exhibited timing sensitivity during concurrent execution.',
    evidence: 'Jest execution log task-2881 showed 2125ms runtime variation.',
    gate: 'AUTOMATED_TEST_SUITE',
    remediation: 'Isolate module state and eliminate shared require cache.',
    component: 'test/unit/token_budget_broker.test.js',
    lineOrLocation: 'line 42',
    detectedAt: new Date().toISOString(),
    metadata: { flakinessRate: 0.05 },
  };

  const sampleValidReport = {
    reportId: 'RRR-REL-940',
    targetPackage: 'tribunal-kit',
    targetVersion: '9.4.0',
    commitHash: '8f94987baca74a12a8c340531045e6b8132ef8d1',
    branch: 'main',
    evaluationTimestamp: new Date().toISOString(),
    evaluator: 'release-readiness-agent',
    verdict: 'READY',
    confidence: 'HIGH',
    findings: [],
    gatesEvaluated: [
      { gateName: 'TEST_SUITE', status: 'PASSED', mandatory: true, evidenceRef: 'jest-run-349' },
      { gateName: 'DEPENDENCY_AUDIT', status: 'PASSED', mandatory: true, evidenceRef: 'audit-001' },
      {
        gateName: 'PACKAGE_VALIDATION',
        status: 'PASSED',
        mandatory: true,
        evidenceRef: 'pack-dry',
      },
    ],
    testsSummary: {
      totalSuites: 349,
      passedSuites: 349,
      failedSuites: 0,
      totalTests: 5160,
      passedTests: 5160,
      failedTests: 0,
      durationMs: 45000,
    },
    workingTreeState: {
      isClean: true,
      branch: 'main',
      headCommit: '8f94987baca74a12a8c340531045e6b8132ef8d1',
      modifiedCount: 0,
      untrackedCount: 0,
    },
    dependenciesSummary: {
      productionDependencies: 1,
      allowedDependencies: ['zod'],
      pass: true,
    },
    packageValidation: {
      name: 'tribunal-kit',
      version: '9.4.0',
      filesIncluded: 420,
      packSuccess: true,
    },
    blockingFindingsCount: 0,
    limitations: [],
    certificationSignature: 'SIG-VERIFIED-RELEASE-READINESS-940',
    evidenceReferences: ['test-run-log-349', 'pack-dry-run-manifest'],
    metadata: { env: 'ci' },
  };

  describe('Part 1 — Core Scenarios (25 Tests)', () => {
    test('1. Valid ReleaseReadinessFindingSchema parsing', () => {
      const parsed = validateReleaseReadinessFinding(sampleValidFinding);
      expect(parsed.findingId).toBe('RRF-TEST-001');
      expect(parsed.category).toBe('TEST_INTEGRITY');
    });

    test('2. Reject invalid findingId pattern (must match ^RRF-[A-Z0-9_-]+$)', () => {
      expect(() => {
        validateReleaseReadinessFinding({
          ...sampleValidFinding,
          findingId: 'INVALID_ID',
        });
      }).toThrow(/pattern RRF-/);
    });

    test('3. Valid category enum (all 15 categories permitted)', () => {
      expect(RELEASE_READINESS_CATEGORIES.length).toBe(15);
      for (const cat of RELEASE_READINESS_CATEGORIES) {
        const finding = { ...sampleValidFinding, category: cat };
        expect(() => validateReleaseReadinessFinding(finding)).not.toThrow();
      }
    });

    test('4. Reject invalid category outside enum', () => {
      expect(() => {
        validateReleaseReadinessFinding({
          ...sampleValidFinding,
          category: 'UNKNOWN_CATEGORY',
        });
      }).toThrow();
    });

    test('5. Valid severity and status enums', () => {
      const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
      const validStatuses = ['BLOCKING', 'NON_BLOCKING', 'WAIVED', 'RESOLVED'];

      for (const sev of validSeverities) {
        expect(() =>
          validateReleaseReadinessFinding({ ...sampleValidFinding, severity: sev }),
        ).not.toThrow();
      }
      for (const stat of validStatuses) {
        expect(() =>
          validateReleaseReadinessFinding({ ...sampleValidFinding, status: stat }),
        ).not.toThrow();
      }
    });

    test('6. Field constraints on title, description, and evidence', () => {
      // Short title
      expect(() =>
        validateReleaseReadinessFinding({ ...sampleValidFinding, title: 'Bad' }),
      ).toThrow(/at least 5 characters/);

      // Short description
      expect(() =>
        validateReleaseReadinessFinding({ ...sampleValidFinding, description: 'Too short' }),
      ).toThrow(/at least 10 characters/);

      // Short evidence
      expect(() =>
        validateReleaseReadinessFinding({ ...sampleValidFinding, evidence: 'No' }),
      ).toThrow(/at least 5 characters/);
    });

    test('7. Valid ReleaseReadinessReportSchema with all 20 fields', () => {
      const parsed = validateReleaseReadinessReport(sampleValidReport);
      expect(parsed.reportId).toBe('RRR-REL-940');
      expect(parsed.verdict).toBe('READY');
      expect(parsed.gatesEvaluated.length).toBe(3);
    });

    test('8. Reject invalid reportId pattern (must match ^RRR-[A-Z0-9_-]+$)', () => {
      expect(() => {
        validateReleaseReadinessReport({
          ...sampleValidReport,
          reportId: 'BAD_REPORT_ID',
        });
      }).toThrow(/pattern RRR-/);
    });

    test('9. Valid verdict enums (all 4 states permitted under valid conditions)', () => {
      expect(RELEASE_VERDICTS).toEqual([
        'READY',
        'READY_WITH_LIMITATIONS',
        'BLOCKED',
        'INSUFFICIENT_EVIDENCE',
      ]);

      // BLOCKED verdict is valid
      const blockedReport = {
        ...sampleValidReport,
        reportId: 'RRR-BLOCKED-01',
        verdict: 'BLOCKED',
        blockingFindingsCount: 1,
        findings: [{ ...sampleValidFinding, status: 'BLOCKING', severity: 'CRITICAL' }],
      };
      expect(() => validateReleaseReadinessReport(blockedReport)).not.toThrow();

      // INSUFFICIENT_EVIDENCE verdict is valid
      const insufficientReport = {
        ...sampleValidReport,
        reportId: 'RRR-INSUFF-01',
        verdict: 'INSUFFICIENT_EVIDENCE',
        confidence: 'LOW',
      };
      expect(() => validateReleaseReadinessReport(insufficientReport)).not.toThrow();
    });

    test('10. Valid confidence enums (HIGH, MEDIUM, LOW)', () => {
      for (const conf of ['HIGH', 'MEDIUM', 'LOW']) {
        const r = { ...sampleValidReport, reportId: `RRR-${conf}`, confidence: conf };
        expect(() => validateReleaseReadinessReport(r)).not.toThrow();
      }
    });

    test('11. Valid gatesEvaluated structure with mandatory flag', () => {
      const report = {
        ...sampleValidReport,
        gatesEvaluated: [
          { gateName: 'SECURITY', status: 'PASSED', mandatory: true },
          { gateName: 'OPTIONAL_BENCHMARK', status: 'SKIPPED', mandatory: false },
        ],
      };
      const parsed = validateReleaseReadinessReport(report);
      expect(parsed.gatesEvaluated[1].mandatory).toBe(false);
    });

    test('12. Valid testsSummary structure with suite and test counts', () => {
      const parsed = validateReleaseReadinessReport(sampleValidReport);
      expect(parsed.testsSummary.totalSuites).toBe(349);
      expect(parsed.testsSummary.passedSuites).toBe(349);
      expect(parsed.testsSummary.failedSuites).toBe(0);
    });

    test('13. Valid workingTreeState structure', () => {
      const parsed = validateReleaseReadinessReport(sampleValidReport);
      expect(parsed.workingTreeState.isClean).toBe(true);
      expect(parsed.workingTreeState.branch).toBe('main');
    });

    test('14. Valid dependenciesSummary structure verifying Zod sole dependency invariant', () => {
      const parsed = validateReleaseReadinessReport(sampleValidReport);
      expect(parsed.dependenciesSummary.productionDependencies).toBe(1);
      expect(parsed.dependenciesSummary.allowedDependencies).toEqual(['zod']);
      expect(parsed.dependenciesSummary.pass).toBe(true);
    });

    test('15. Valid packageValidation structure verifying packSuccess', () => {
      const parsed = validateReleaseReadinessReport(sampleValidReport);
      expect(parsed.packageValidation.packSuccess).toBe(true);
      expect(parsed.packageValidation.version).toBe('9.4.0');
    });

    test('16. safeValidateReleaseReadinessReport returns { success: true, data } on valid input', () => {
      const res = safeValidateReleaseReadinessReport(sampleValidReport);
      expect(res.success).toBe(true);
      expect(res.data.reportId).toBe('RRR-REL-940');
    });

    test('17. safeValidateReleaseReadinessReport returns { success: false, error } without throwing on invalid input', () => {
      const res = safeValidateReleaseReadinessReport({ invalid: 'data' });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    test('18. safeValidateReleaseReadinessFinding returns { success: true, data } on valid finding', () => {
      const res = safeValidateReleaseReadinessFinding(sampleValidFinding);
      expect(res.success).toBe(true);
      expect(res.data.findingId).toBe('RRF-TEST-001');
    });

    test('19. safeValidateReleaseReadinessFinding returns { success: false, error } on invalid finding', () => {
      const res = safeValidateReleaseReadinessFinding({ findingId: 123 });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    test('20. Persona metadata: release-readiness-agent.md exists and contains required frontmatter', () => {
      const mdPath = path.join(AGENTS_DIR, 'release-readiness-agent.md');
      expect(fs.existsSync(mdPath)).toBe(true);
      const content = fs.readFileSync(mdPath, 'utf8');
      expect(content).toContain('name: release-readiness-agent');
      expect(content).toContain('status: production');
      expect(content).toContain('type: specialist');
    });

    test('21. Persona metadata: release-readiness-agent is registered in specialist-registry.json as production', () => {
      const all = listAllAgents(REPO_ROOT);
      const agent = all.find(a => a.name === 'release-readiness-agent');
      expect(agent).toBeDefined();
      expect(agent.status).toBe('production');
      expect(agent.type).toBe('specialist');
    });

    test('22. Canonical resolution: resolveAgent("release-readiness-agent") returns specialist metadata', () => {
      const resolved = resolveAgent('release-readiness-agent', {}, REPO_ROOT);
      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe('release-readiness-agent');
      expect(resolved.domain).toContain('release-engineering');
    });

    test('23. Result integration: AgentResultSchema parses and includes releaseFindings and releaseReadinessReports', () => {
      const agentResult = {
        taskId: 'task_rel_01',
        agentId: 'release-readiness-agent',
        status: 'SUCCESS',
        summary: 'Release readiness evaluation completed.',
        findings: [],
        proposals: [],
        refactoringProposals: [],
        concurrencyFindings: [],
        releaseFindings: [sampleValidFinding],
        releaseReadinessReports: [sampleValidReport],
        writeProposals: [],
        evidence: ['audit-trail'],
        artifacts: [],
        recommendations: ['Tag release v9.4.0 upon human sign-off'],
        errors: [],
        provenance: {
          inputHash: 'hash-in',
          outputHash: 'hash-out',
          provider: 'mock',
          model: 'claude-3-5-sonnet',
          durationMs: 1200,
          timestamp: Date.now(),
        },
        durationMs: 1200,
      };

      const parsed = AgentResultSchema.parse(agentResult);
      expect(parsed.releaseFindings.length).toBe(1);
      expect(parsed.releaseReadinessReports.length).toBe(1);
      expect(parsed.releaseReadinessReports[0].reportId).toBe('RRR-REL-940');
    });

    test('24. Output parsing: parseRawAgentOutput correctly parses and normalizes raw JSON containing release readiness findings and report', () => {
      const rawPayload = JSON.stringify({
        taskId: 'task_raw_01',
        agentId: 'release-readiness-agent',
        status: 'SUCCESS',
        summary: 'Parsed readiness summary',
        releaseFindings: [sampleValidFinding],
        releaseReadinessReport: sampleValidReport,
      });

      const parsed = parseRawAgentOutput(rawPayload, {
        taskId: 'task_raw_01',
        agentId: 'release-readiness-agent',
      });
      expect(parsed.status).toBe('SUCCESS');
      expect(parsed.releaseFindings.length).toBe(1);
      expect(parsed.releaseReadinessReports.length).toBe(1);
      expect(parsed.releaseReadinessReports[0].verdict).toBe('READY');
    });

    test('25. Report verdict: Valid READY_WITH_LIMITATIONS report requires non-empty limitations array', () => {
      const limitedReport = {
        ...sampleValidReport,
        reportId: 'RRR-LIMITED-01',
        verdict: 'READY_WITH_LIMITATIONS',
        limitations: ['Windows CLI child_process.spawn shell delimiter difference documented.'],
      };
      const parsed = validateReleaseReadinessReport(limitedReport);
      expect(parsed.verdict).toBe('READY_WITH_LIMITATIONS');
      expect(parsed.limitations.length).toBe(1);
    });
  });

  describe('Part 2 — Adversarial Verification Cases (9 Tests)', () => {
    test('Adv 1: Attempting verdict READY when a mandatory gate has status FAILED throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-01',
        verdict: 'READY',
        gatesEvaluated: [
          { gateName: 'SECURITY_AUDIT', status: 'FAILED', mandatory: true },
          { gateName: 'TESTS', status: 'PASSED', mandatory: true },
        ],
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /verdict of READY is strictly prohibited when mandatory gates fail/,
      );
    });

    test('Adv 2: Attempting verdict READY when findings contains a finding with status BLOCKING throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-02',
        verdict: 'READY',
        findings: [{ ...sampleValidFinding, status: 'BLOCKING', severity: 'CRITICAL' }],
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /blocking findings exist/,
      );
    });

    test('Adv 3: Attempting verdict READY when blockingFindingsCount > 0 throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-03',
        verdict: 'READY',
        blockingFindingsCount: 2,
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /blocking findings exist/,
      );
    });

    test('Adv 4: Attempting verdict READY when testsSummary.failedSuites > 0 throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-04',
        verdict: 'READY',
        testsSummary: {
          ...sampleValidReport.testsSummary,
          failedSuites: 1,
        },
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(/tests fail/);
    });

    test('Adv 5: Attempting verdict READY when testsSummary.failedTests > 0 throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-05',
        verdict: 'READY',
        testsSummary: {
          ...sampleValidReport.testsSummary,
          failedTests: 5,
        },
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(/tests fail/);
    });

    test('Adv 6: Attempting verdict READY when dependenciesSummary.pass is false throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-06',
        verdict: 'READY',
        dependenciesSummary: {
          productionDependencies: 2,
          allowedDependencies: ['zod'],
          pass: false,
        },
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /dependency invariants are breached/,
      );
    });

    test('Adv 7: Attempting verdict READY when packageValidation.packSuccess is false throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-07',
        verdict: 'READY',
        packageValidation: {
          ...sampleValidReport.packageValidation,
          packSuccess: false,
        },
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /package validation fails/,
      );
    });

    test('Adv 8: Attempting verdict READY when evidenceReferences is empty throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-08',
        verdict: 'READY',
        evidenceReferences: [],
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /evidence references are missing/,
      );
    });

    test('Adv 9: Attempting verdict READY_WITH_LIMITATIONS with an empty limitations array throws validation error', () => {
      const adversarialReport = {
        ...sampleValidReport,
        reportId: 'RRR-ADV-09',
        verdict: 'READY_WITH_LIMITATIONS',
        limitations: [],
      };
      expect(() => validateReleaseReadinessReport(adversarialReport)).toThrow(
        /requires at least one documented limitation/,
      );
    });
  });
});
