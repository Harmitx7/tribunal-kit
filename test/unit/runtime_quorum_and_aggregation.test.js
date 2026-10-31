'use strict';

const { QuorumAndAggregationEngine } = require('../../src/runtime_reliability');

describe('Multi-Agent Quorum & Partial Failure Engine', () => {
  const policyStrict = {
    policyType: 'ALL_REQUIRED',
    requiredAgents: ['security-auditor', 'logic-reviewer'],
    optionalAgents: ['docs-reviewer'],
    minSuccessThreshold: 1.0,
    allowPartialResults: false,
  };

  test('All required reviewers succeed -> SUCCEEDED verdict', () => {
    const engine = new QuorumAndAggregationEngine(policyStrict);
    const results = [
      { agentId: 'security-auditor', status: 'SUCCEEDED', findings: [] },
      { agentId: 'logic-reviewer', status: 'SUCCEEDED', findings: [] },
      { agentId: 'docs-reviewer', status: 'SUCCEEDED', findings: [] },
    ];

    const evalResult = engine.evaluateResults(results);
    expect(evalResult.status).toBe('SUCCEEDED');
    expect(evalResult.quorumSatisfied).toBe(true);
    expect(evalResult.findings.length).toBe(0);
  });

  test('Required reviewer fails -> FAILED verdict (Non-Masking Invariant)', () => {
    const engine = new QuorumAndAggregationEngine(policyStrict);
    const results = [
      { agentId: 'security-auditor', status: 'FAILED', error: 'Model timeout' },
      { agentId: 'logic-reviewer', status: 'SUCCEEDED', findings: [] },
    ];

    const evalResult = engine.evaluateResults(results);
    expect(evalResult.status).toBe('FAILED');
    expect(evalResult.quorumSatisfied).toBe(false);
    expect(evalResult.findings.length).toBeGreaterThan(0);
    expect(evalResult.findings[0].category).toBe('QUORUM_FAILURE');
    expect(evalResult.findings[0].severity).toBe('CRITICAL');
  });

  test('Required reviewer fails with allowPartialResults: true -> PARTIAL verdict', () => {
    const engine = new QuorumAndAggregationEngine({
      ...policyStrict,
      allowPartialResults: true,
    });
    const results = [
      { agentId: 'security-auditor', status: 'SUCCEEDED', findings: [] },
      { agentId: 'logic-reviewer', status: 'FAILED', error: 'Provider crash' },
    ];

    const evalResult = engine.evaluateResults(results);
    expect(evalResult.status).toBe('PARTIAL');
    expect(evalResult.quorumSatisfied).toBe(false);
  });

  test('Optional reviewer fails but required succeed and threshold met -> SUCCEEDED', () => {
    const engine = new QuorumAndAggregationEngine({
      policyType: 'THRESHOLD_QUORUM',
      requiredAgents: ['security-auditor'],
      optionalAgents: ['docs-reviewer', 'style-reviewer'],
      minSuccessThreshold: 0.66,
      allowPartialResults: false,
    });

    const results = [
      { agentId: 'security-auditor', status: 'SUCCEEDED' },
      { agentId: 'docs-reviewer', status: 'SUCCEEDED' },
      { agentId: 'style-reviewer', status: 'FAILED' },
    ];

    const evalResult = engine.evaluateResults(results);
    expect(evalResult.status).toBe('SUCCEEDED');
    expect(evalResult.quorumSatisfied).toBe(true);
    expect(evalResult.totalObservedSuccesses).toBe(2);
  });

  test('Detects duplicate result submissions from the same reviewer', () => {
    const engine = new QuorumAndAggregationEngine(policyStrict);
    const results = [
      { agentId: 'security-auditor', status: 'SUCCEEDED' },
      { agentId: 'security-auditor', status: 'FAILED' }, // Duplicate
      { agentId: 'logic-reviewer', status: 'SUCCEEDED' },
    ];

    const evalResult = engine.evaluateResults(results);
    const dupFinding = evalResult.findings.find((f) => f.title.includes('Duplicate agent'));
    expect(dupFinding).toBeDefined();
    expect(dupFinding.category).toBe('QUORUM_FAILURE');
  });
});
