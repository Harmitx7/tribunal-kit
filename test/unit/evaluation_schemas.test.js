'use strict';

const {
  validateEvaluationCase,
  validateEvaluationResult,
  validateEvaluationDataset,
  SUPPORTED_SCHEMA_VERSIONS,
} = require('../../src/evaluation/evaluation_schemas');

describe('Evaluation Schemas & Contract Validation', () => {
  describe('SUPPORTED_SCHEMA_VERSIONS', () => {
    it('defines 1.0.0 as supported schema version', () => {
      expect(SUPPORTED_SCHEMA_VERSIONS).toContain('1.0.0');
    });
  });

  describe('validateEvaluationCase', () => {
    const validCase = {
      id: 'CASE-001',
      schemaVersion: '1.0.0',
      suiteId: 'suite-alpha',
      category: 'Security',
      taskDescription: 'Audit JWT validation',
      inputFixture: {
        prompt: 'Check token validity',
        targetFile: 'src/auth/jwt.js',
      },
      expected: {
        groundTruthLabel: 'VULNERABLE',
        labelProvenance: 'CVE-2024-TEST',
        requiredProperties: ['ALGORITHM_NONE'],
      },
      severity: 'CRITICAL',
      determinism: 'DETERMINISTIC',
      timeoutMs: 5000,
    };

    it('validates a complete, compliant evaluation case', () => {
      const res = validateEvaluationCase(validCase);
      expect(res.valid).toBe(true);
      expect(res.data.id).toBe('CASE-001');
      expect(res.data.severity).toBe('CRITICAL');
    });

    it('rejects unsupported schema version', () => {
      const res = validateEvaluationCase({ ...validCase, schemaVersion: '9.9.9' });
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'schemaVersion')).toBe(true);
    });

    it('rejects case missing mandatory fields (e.g. id, suiteId, category)', () => {
      const res = validateEvaluationCase({ ...validCase, id: '' });
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'id')).toBe(true);
    });

    it('strictly rejects unallowed extra properties', () => {
      const res = validateEvaluationCase({ ...validCase, unexpectedExtraField: 123 });
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.message.includes('unexpectedExtraField') || e.message.includes('Unrecognized key'))).toBe(true);
    });
  });

  describe('validateEvaluationResult & Secret Redaction', () => {
    const validResult = {
      caseId: 'CASE-001',
      candidateId: 'reviewer-security-v2',
      schemaVersion: '1.0.0',
      timestamp: '2026-10-30T12:00:00Z',
      status: 'COMPLETED',
      verdict: 'PASS',
      metrics: {
        durationMs: 142,
        confidence: 0.95,
      },
      evidence: [
        {
          type: 'DETERMINISTIC_CHECK',
          source: 'src/auth/jwt.js:12',
          verified: true,
        },
      ],
    };

    it('validates compliant evaluation result', () => {
      const res = validateEvaluationResult(validResult);
      expect(res.valid).toBe(true);
      expect(res.data.status).toBe('COMPLETED');
      expect(res.data.verdict).toBe('PASS');
    });

    it('automatically sanitizes secrets in failureDetails', () => {
      const resultWithSecret = {
        ...validResult,
        status: 'CRASHED',
        verdict: 'FAIL',
        failureDetails: {
          category: 'AUTH_CRASH',
          reason: 'Failed authenticating with token Bearer sk-ant-api03-abcdef1234567890abcdef1234567890 to database postgres://user:secret123@localhost/db',
          sanitizedStack: 'Error at connect(apiKey: "sk-proj-999888777666555444333")',
        },
      };

      const res = validateEvaluationResult(resultWithSecret);
      expect(res.valid).toBe(true);
      expect(res.data.failureDetails.reason).not.toContain('secret123');
      expect(res.data.failureDetails.reason).not.toContain('sk-ant-api03-abcdef1234567890abcdef1234567890');
      expect(res.data.failureDetails.reason).toContain('[REDACTED_');
      expect(res.data.failureDetails.sanitizedStack).not.toContain('sk-proj-999888777666555444333');
    });

    it('rejects invalid status or verdict enums', () => {
      const invalidStatus = { ...validResult, status: 'NOT_A_STATUS' };
      const invalidVerdict = { ...validResult, verdict: 'MAYBE' };

      expect(validateEvaluationResult(invalidStatus).valid).toBe(false);
      expect(validateEvaluationResult(invalidVerdict).valid).toBe(false);
    });
  });

  describe('validateEvaluationDataset', () => {
    it('validates compliant dataset object', () => {
      const dataset = {
        schemaVersion: '1.0.0',
        datasetId: 'dataset-test-1',
        version: '1.0.0',
        name: 'Test Benchmark',
        description: 'Test description',
        split: 'held_out_eval',
        cases: [
          {
            id: 'CASE-01',
            schemaVersion: '1.0.0',
            suiteId: 'suite-1',
            category: 'Testing',
            taskDescription: 'Test task',
            inputFixture: {},
            expected: {
              groundTruthLabel: 'SAFE',
              labelProvenance: 'Verified unit test',
            },
            severity: 'LOW',
            determinism: 'DETERMINISTIC',
            timeoutMs: 1000,
          },
        ],
      };

      const res = validateEvaluationDataset(dataset);
      expect(res.valid).toBe(true);
      expect(res.data.cases).toHaveLength(1);
    });

    it('rejects dataset with empty cases array', () => {
      const dataset = {
        schemaVersion: '1.0.0',
        datasetId: 'dataset-test-empty',
        version: '1.0.0',
        name: 'Empty Dataset',
        description: 'Empty',
        split: 'held_out_eval',
        cases: [],
      };

      const res = validateEvaluationDataset(dataset);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'cases')).toBe(true);
    });
  });
});
