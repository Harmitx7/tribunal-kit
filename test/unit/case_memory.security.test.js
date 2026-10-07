
'use strict';

/**
 * case_memory.security.test.js — Intelligence Security Audits
 * ============================================================================
 * Phase 7V implementation.
 *
 * Simulates attacks against historical case memory to verify that history
 * poisoning cannot cause deterministic safety overrides.
 */

const { CaseMemory } = require('../../src/intelligence/case_memory');
const {
  AdaptiveReviewerOrchestrator,
} = require('../../src/intelligence/adaptive_reviewer_orchestrator');

describe('Tribunal Intelligence Security Audit', () => {
  test('Historical history poisoning failed to bypass deterministic safety requirements', () => {
    const mem = new CaseMemory();
    const orch = new AdaptiveReviewerOrchestrator();

    const mockSafetyPayload = {
      tier: 3,
      files: ['src/api/auth.js'],
      task: 'Fix JWT',
      evidence: [],
    };

    // 1. History Poisoning Attack
    // Attacker manages to insert a fake case that says auth.js is totally safe and shouldn't use a security reviewer
    const fakeSimilar = [
      { caseId: 'POISON-1', similarityScore: 1.0, matchedSignals: [], confidence: 'HIGH' },
    ];

    const result = orch.adaptReviewers(mockSafetyPayload, { similarCases: fakeSimilar });

    // The system baseline orchestrator MUST still include 'security-auditor' for auth.js
    const hasSecurity = result.selected.some(
      r => r.reviewer === 'security-auditor' && r._isMandatorySafety === true,
    );

    expect(hasSecurity).toBe(true);
  });
});
