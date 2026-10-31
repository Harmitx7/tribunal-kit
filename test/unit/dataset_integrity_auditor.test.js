'use strict';

const {
  auditDatasetIntegrity,
  checkPartitionLeakage,
  tokenize,
  jaccardSimilarity,
} = require('../../src/evaluation/dataset_integrity_auditor');

describe('Dataset Integrity Auditor & Benchmark Leakage Detector', () => {
  describe('tokenize & jaccardSimilarity primitives', () => {
    it('tokenizes text by stripping punctuation and filtering short words', () => {
      const tokens = tokenize('Hello, World! Testing 123.');
      expect(tokens.has('hello')).toBe(true);
      expect(tokens.has('world')).toBe(true);
      expect(tokens.has('testing')).toBe(true);
      expect(tokens.has('123')).toBe(true);
    });

    it('computes exact Jaccard similarity', () => {
      const setA = new Set(['audit', 'sql', 'injection']);
      const setB = new Set(['audit', 'sql', 'injection']);
      expect(jaccardSimilarity(setA, setB)).toBe(1.0);

      const setC = new Set(['audit', 'performance']);
      // intersection: {audit} (1), union: {audit, sql, injection, performance} (4) -> 0.25
      expect(jaccardSimilarity(setA, setC)).toBe(0.25);

      expect(jaccardSimilarity(new Set(), new Set())).toBe(1.0);
    });
  });

  describe('auditDatasetIntegrity', () => {
    const validBaseDataset = {
      schemaVersion: '1.0.0',
      datasetId: 'dataset-alpha',
      version: '1.0.0',
      name: 'Dataset Alpha',
      description: 'Audit dataset',
      split: 'held_out_eval',
      cases: [
        {
          id: 'CASE-01',
          schemaVersion: '1.0.0',
          suiteId: 'suite-1',
          category: 'Security',
          taskDescription: 'Check for sql injection vulnerability',
          inputFixture: { prompt: 'Audit user auth in src/auth.js' },
          expected: { groundTruthLabel: 'VULNERABLE', labelProvenance: 'CVE-2023-1111' },
          severity: 'HIGH',
          determinism: 'DETERMINISTIC',
          timeoutMs: 5000,
        },
        {
          id: 'CASE-02',
          schemaVersion: '1.0.0',
          suiteId: 'suite-1',
          category: 'Performance',
          taskDescription: 'Check memory buffer allocation',
          inputFixture: { prompt: 'Audit buffer pooling in src/net.js' },
          expected: { groundTruthLabel: 'SAFE', labelProvenance: 'NodeJS core doc' },
          severity: 'LOW',
          determinism: 'DETERMINISTIC',
          timeoutMs: 5000,
        },
      ],
    };

    it('approves a clean, unique dataset', () => {
      const report = auditDatasetIntegrity(validBaseDataset);
      expect(report.valid).toBe(true);
      expect(report.violations).toHaveLength(0);
    });

    it('catches duplicate case IDs as critical violations', () => {
      const duplicateIdDataset = {
        ...validBaseDataset,
        cases: [
          validBaseDataset.cases[0],
          { ...validBaseDataset.cases[1], id: 'CASE-01' }, // Duplicate ID
        ],
      };
      const report = auditDatasetIntegrity(duplicateIdDataset);
      expect(report.valid).toBe(false);
      expect(report.violations.some(v => v.includes('DUPLICATE_CASE_ID'))).toBe(true);
    });

    it('detects missing or trivial label provenance', () => {
      const missingProvenanceDataset = {
        ...validBaseDataset,
        cases: [
          {
            ...validBaseDataset.cases[0],
            expected: { groundTruthLabel: 'VULNERABLE', labelProvenance: '  ' },
          },
        ],
      };
      const report = auditDatasetIntegrity(missingProvenanceDataset);
      expect(report.valid).toBe(false);
      expect(report.violations.some(v => v.includes('MISSING_LABEL_PROVENANCE'))).toBe(true);
    });

    it('flags contradictory near-duplicates with conflicting labels', () => {
      const contradictoryDataset = {
        ...validBaseDataset,
        cases: [
          {
            id: 'CASE-01',
            schemaVersion: '1.0.0',
            suiteId: 'suite-1',
            category: 'Security',
            taskDescription: 'Audit query string parameter sanitization in checkout handler',
            inputFixture: { prompt: 'Audit query string parameter sanitization in checkout handler' },
            expected: { groundTruthLabel: 'VULNERABLE', labelProvenance: 'Human review' },
            severity: 'HIGH',
            determinism: 'DETERMINISTIC',
            timeoutMs: 5000,
          },
          {
            id: 'CASE-02',
            schemaVersion: '1.0.0',
            suiteId: 'suite-1',
            category: 'Security',
            taskDescription: 'Audit query string parameter sanitization in checkout handler',
            inputFixture: { prompt: 'Audit query string parameter sanitization in checkout handler' },
            expected: { groundTruthLabel: 'SAFE', labelProvenance: 'Conflicting review' },
            severity: 'HIGH',
            determinism: 'DETERMINISTIC',
            timeoutMs: 5000,
          },
        ],
      };
      const report = auditDatasetIntegrity(contradictoryDataset);
      expect(report.valid).toBe(false);
      expect(report.violations.some(v => v.includes('CONTRADICTORY_NEAR_DUPLICATE'))).toBe(true);
    });

    it('warns on severe class imbalance (> 4:1 ratio)', () => {
      const imbalancedCases = [
        ...Array(10).fill(null).map((_, i) => ({
          ...validBaseDataset.cases[0],
          id: `CASE-POS-${i}`,
          inputFixture: { prompt: `Unique positive prompt ${i}` },
        })),
        {
          ...validBaseDataset.cases[1],
          id: 'CASE-NEG-01',
          inputFixture: { prompt: 'Unique negative prompt single' },
        },
      ];
      const imbalancedDataset = { ...validBaseDataset, cases: imbalancedCases };
      const report = auditDatasetIntegrity(imbalancedDataset);
      expect(report.warnings.some(w => w.includes('SEVERE_CLASS_IMBALANCE'))).toBe(true);
    });
  });

  describe('checkPartitionLeakage (Train/Eval Contamination)', () => {
    it('detects benchmark leakage when eval case duplicates training fixture', () => {
      const trainDataset = {
        cases: [
          {
            id: 'TRAIN-101',
            taskDescription: 'Audit database connection pool timeout setting',
            inputFixture: { prompt: 'Review maxPoolSize setting in postgres database configuration' },
          },
        ],
      };

      const evalDataset = {
        cases: [
          {
            id: 'EVAL-201',
            taskDescription: 'Audit database connection pool timeout setting',
            inputFixture: { prompt: 'Review maxPoolSize setting in postgres database configuration' },
          },
        ],
      };

      const result = checkPartitionLeakage(evalDataset, trainDataset, 0.85);
      expect(result.leaked).toBe(true);
      expect(result.violations[0]).toContain('BENCHMARK_LEAKAGE');
      expect(result.violations[0]).toContain('EVAL-201');
      expect(result.violations[0]).toContain('TRAIN-101');
    });

    it('passes cleanly when partitions are disjoint', () => {
      const trainDataset = {
        cases: [
          {
            id: 'TRAIN-101',
            taskDescription: 'Audit CSS color contrast',
            inputFixture: { prompt: 'Inspect typography readability on light background' },
          },
        ],
      };

      const evalDataset = {
        cases: [
          {
            id: 'EVAL-201',
            taskDescription: 'Audit SQL injection in authentication API',
            inputFixture: { prompt: 'Inspect SQL query concatenation in login endpoint' },
          },
        ],
      };

      const result = checkPartitionLeakage(evalDataset, trainDataset, 0.85);
      expect(result.leaked).toBe(false);
      expect(result.violations).toHaveLength(0);
    });
  });
});
