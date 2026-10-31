'use strict';

const fs = require('fs');
const path = require('path');
const {
  VerificationCaseSchema,
  VerificationResultSchema,
  InvariantRecordSchema,
  RequirementTraceSchema,
  validateVerificationCase,
  validateVerificationResult,
  validateInvariantRecord,
  validateRequirementTrace,
} = require('../../src/verification');

describe('Software Verification Schemas & Contracts', () => {
  const sampleCase = {
    id: 'VERIF-001',
    schemaVersion: '1.0.0',
    requirementId: 'REQ-01',
    component: 'math_utils',
    method: 'CONTRACT',
    description: 'Verify safe division preconditions',
    preconditions: ['Denominator must be non-zero'],
    expectedProperty: 'Returns finite number or throws ContractViolationError',
    severity: 'HIGH',
    timeoutMs: 5000,
  };

  test('validates VerificationCaseSchema correctly', () => {
    const parsed = validateVerificationCase(sampleCase);
    expect(parsed.id).toBe('VERIF-001');
    expect(parsed.method).toBe('CONTRACT');
    expect(parsed.severity).toBe('HIGH');
  });

  test('validates VerificationResultSchema with 6-state taxonomy', () => {
    const statuses = ['PASS', 'FAIL', 'INCONCLUSIVE', 'BLOCKED', 'NOT_RUN', 'NOT_APPLICABLE'];

    for (const st of statuses) {
      const res = {
        caseId: 'VERIF-001',
        testedRevision: 'commit-abc1234',
        timestamp: '2026-10-30T12:00:00Z',
        status: st,
        durationMs: 42,
        metrics: { runsCount: 100 },
        evidence: [
          {
            type: 'DETERMINISTIC_CHECK',
            source: 'contract_engine.js',
            verified: st === 'PASS',
          },
        ],
      };

      const parsed = validateVerificationResult(res);
      expect(parsed.status).toBe(st);
      expect(parsed.caseId).toBe('VERIF-001');
    }
  });

  test('validates InvariantRecordSchema correctly', () => {
    const inv = {
      invariantId: 'INV-01',
      name: 'NonNegativeBalance',
      expression: 'account.balance >= 0',
      category: 'DATA_INTEGRITY',
      enforcement: 'RUNTIME_ASSERTION',
      active: true,
      failureConsequence: 'Account ledger enters inconsistent overdraft state.',
    };

    const parsed = validateInvariantRecord(inv);
    expect(parsed.invariantId).toBe('INV-01');
    expect(parsed.category).toBe('DATA_INTEGRITY');
  });

  test('validates RequirementTraceSchema correctly', () => {
    const trace = {
      requirementId: 'REQ-01',
      title: 'Safe Mathematical Operations',
      category: 'FUNCTIONAL',
      invariantIds: ['INV-01'],
      implementationFiles: ['src/math/divide.js'],
      verificationCaseIds: ['VERIF-001'],
      status: 'VERIFIED',
      uncoveredAcceptanceCriteria: [],
    };

    const parsed = validateRequirementTrace(trace);
    expect(parsed.requirementId).toBe('REQ-01');
    expect(parsed.status).toBe('VERIFIED');
  });

  test('validates verification_cases_dataset_v1.json fixture against schema', () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/software_verification/verification_cases_dataset_v1.json');
    const dataset = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(dataset.cases.length).toBe(12);
    for (const c of dataset.cases) {
      const parsed = validateVerificationCase(c);
      expect(parsed.id).toMatch(/^VERIF-CASE-\d{2}$/);
    }
  });
});
