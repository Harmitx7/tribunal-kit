'use strict';

const orch = require('../../.agent/scripts/corpus_certification_orchestrator');

describe('Phase 25 — Priority Scoring Unit Tests', () => {
  test('calculatePriorityScore computes exact weights matching ASD-STD 100.25 Section 11', () => {
    const fullSecurityRecord = {
      security_class: true,
      behavior_class: 'EXECUTABLE',
      contract_status: 'VALID',
      has_external_tests: true,
      routing_usage: 10,
      routing_importance: 6,
      strong_contract: true,
      human_boundary: false,
    };

    const scoring = orch.calculatePriorityScore(fullSecurityRecord);
    // 40 + 30 + 25 + 20 + 15 + 10 + 10 = 150
    expect(scoring.raw_score).toBe(150);
    expect(scoring.breakdown.security_criticality).toBe(40);
    expect(scoring.breakdown.executable_evidence).toBe(30);
    expect(scoring.breakdown.contract_executable).toBe(25);
    expect(scoring.breakdown.existing_external_tests).toBe(20);
    expect(scoring.breakdown.high_usage).toBe(15);
    expect(scoring.breakdown.high_routing_importance).toBe(10);
    expect(scoring.breakdown.strong_contract).toBe(10);
  });

  test('reference-only and human-boundary penalties correctly suppress non-executable skills', () => {
    const refRecord = {
      security_class: false,
      behavior_class: 'REFERENCE_ONLY',
      contract_status: 'MISSING',
      human_boundary: false,
    };

    const scoringRef = orch.calculatePriorityScore(refRecord);
    expect(scoringRef.raw_score).toBe(-100);
    expect(scoringRef.breakdown.reference_only).toBe(-100);

    const humanRecord = {
      security_class: false,
      behavior_class: 'HUMAN_REQUIRED',
      contract_status: 'MISSING',
      human_boundary: true,
    };

    const scoringHuman = orch.calculatePriorityScore(humanRecord);
    expect(scoringHuman.raw_score).toBe(-50);
    expect(scoringHuman.breakdown.human_boundary).toBe(-50);
  });
});
