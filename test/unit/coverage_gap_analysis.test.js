'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../../.agent/scripts/skill_coverage_expansion_engine');

describe('Phase 24 — Coverage Gap Analysis Unit Tests', () => {
  test('analyzeCoverageGaps identifies untested applicable claims accurately', () => {
    const gapAnalysis = engine.analyzeCoverageGaps('api-patterns');

    expect(gapAnalysis.skill_id).toBe('api-patterns');
    expect(gapAnalysis.total_claims).toBe(7);
    expect(gapAnalysis.applicable_claims).toBe(7);
    expect(gapAnalysis.remaining_applicable_claims).toBeGreaterThan(0);
    expect(gapAnalysis.coverage).toBe(0); // with empty inventory
  });

  test('analyzeCoverageGaps calculates coverage strictly from verified claims, never test count', () => {
    const dummyInventory = [
      { skill_id: 'api-patterns', claim_id: 'CLM-api-patterns-INP-task', test_id: 'T1' },
      { skill_id: 'api-patterns', claim_id: 'CLM-api-patterns-INP-task', test_id: 'T2' },
      { skill_id: 'api-patterns', claim_id: 'CLM-api-patterns-INP-task', test_id: 'T3' },
    ];

    const mockReviewPackages = {
      T1: {
        review_decision: 'APPROVED',
        reviewer: 'QA Reviewer',
        source_evidence: [{ source: 'contract.inputs', trust_level: 'E2' }],
        independence_analysis: {
          verified: true,
          expectation_source: 'contract.inputs',
          implementation_source: 'skill.runtime_execution',
        },
      },
      T2: {
        review_decision: 'APPROVED',
        reviewer: 'QA Reviewer',
        source_evidence: [{ source: 'contract.inputs', trust_level: 'E2' }],
        independence_analysis: {
          verified: true,
          expectation_source: 'contract.inputs',
          implementation_source: 'skill.runtime_execution',
        },
      },
      T3: {
        review_decision: 'APPROVED',
        reviewer: 'QA Reviewer',
        source_evidence: [{ source: 'contract.inputs', trust_level: 'E2' }],
        independence_analysis: {
          verified: true,
          expectation_source: 'contract.inputs',
          implementation_source: 'skill.runtime_execution',
        },
      },
    };

    const mockExecutionResults = {
      T1: { status: 'PASS', repeatability: { classification: 'DETERMINISTIC', runs: 3 } },
      T2: { status: 'PASS', repeatability: { classification: 'DETERMINISTIC', runs: 3 } },
      T3: { status: 'PASS', repeatability: { classification: 'DETERMINISTIC', runs: 3 } },
    };

    const analysis = engine.analyzeCoverageGaps('api-patterns', dummyInventory, {
      reviewPackages: mockReviewPackages,
      executionResults: mockExecutionResults,
      allowAnySourceHash: true,
    });

    // 3 tests targeting the same single claim must yield verified_claims === 1, not 3!
    expect(analysis.verified_claims).toBe(1);
    expect(analysis.applicable_claims).toBe(7);
    expect(analysis.coverage).toBe(Math.round((1 / 7) * 100)); // 14%
  });
});
