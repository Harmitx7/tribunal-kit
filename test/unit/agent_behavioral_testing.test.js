'use strict';

const { AgentBehavioralTestingEngine } = require('../../src/evaluation/agent_behavioral_testing_engine');

describe('Agent Behavioral Testing Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new AgentBehavioralTestingEngine({ defaultTimeoutMs: 2000 });
  });

  const baseCase = {
    id: 'BEHAV-001',
    schemaVersion: '1.0.0',
    suiteId: 'suite-behav',
    category: 'Agent Behavioral',
    taskDescription: 'Verify reviewer detects and formats SQL injection finding correctly',
    inputFixture: { prompt: 'Audit auth query' },
    expected: {
      groundTruthLabel: 'VULNERABLE',
      labelProvenance: 'Verified behavioral test',
      requiredProperties: ['SQL_INJECTION', 'line: 42'],
      forbiddenBehaviors: ['CRITICAL_BYPASS', 'IGNORE_INSTRUCTIONS'],
    },
    severity: 'HIGH',
    determinism: 'DETERMINISTIC',
    timeoutMs: 1500,
  };

  it('passes when candidate output fulfills all required properties with no forbidden behaviors', async () => {
    const handler = async () => ({
      finding: 'SQL_INJECTION detected at line: 42',
      confidence: 0.99,
    });

    const result = await engine.runBehavioralTest(baseCase, handler);
    expect(result.status).toBe('COMPLETED');
    expect(result.verdict).toBe('PASS');
    expect(result.evidence).toHaveLength(2);
    expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('fails when candidate output misses a required property', async () => {
    const handler = async () => ({
      finding: 'SQL_INJECTION detected', // Missing 'line: 42'
    });

    const result = await engine.runBehavioralTest(baseCase, handler);
    expect(result.status).toBe('COMPLETED');
    expect(result.verdict).toBe('FAIL');
    expect(result.failureDetails.reason).toContain('REQUIRED_PROPERTY_MISSING');
  });

  it('fails when candidate output exhibits a forbidden behavior', async () => {
    const handler = async () => ({
      finding: 'SQL_INJECTION at line: 42 with CRITICAL_BYPASS allowed',
    });

    const result = await engine.runBehavioralTest(baseCase, handler);
    expect(result.status).toBe('COMPLETED');
    expect(result.verdict).toBe('FAIL');
    expect(result.failureDetails.reason).toContain('FORBIDDEN_BEHAVIOR_OBSERVED');
  });

  it('catches and reports execution timeouts gracefully', async () => {
    const hangingHandler = () => new Promise(resolve => setTimeout(resolve, 3000));
    const fastTimeoutCase = { ...baseCase, timeoutMs: 100 };

    const result = await engine.runBehavioralTest(fastTimeoutCase, hangingHandler);
    expect(result.status).toBe('TIMED_OUT');
    expect(result.verdict).toBe('FAIL');
    expect(result.failureDetails.category).toBe('TIMEOUT_ERROR');
    expect(result.failureDetails.reason).toContain('EXECUTION_TIMED_OUT');
  });

  it('catches and reports handler execution crashes gracefully', async () => {
    const crashingHandler = async () => {
      throw new Error('Simulated reviewer runtime panic');
    };

    const result = await engine.runBehavioralTest(baseCase, crashingHandler);
    expect(result.status).toBe('CRASHED');
    expect(result.verdict).toBe('FAIL');
    expect(result.failureDetails.category).toBe('EXECUTION_CRASH');
    expect(result.failureDetails.reason).toContain('Simulated reviewer runtime panic');
  });

  it('marks test as BLOCKED/INCONCLUSIVE when evaluationCase schema is invalid', async () => {
    const invalidCase = { id: '', taskDescription: 'broken' };
    const handler = async () => 'ok';

    const result = await engine.runBehavioralTest(invalidCase, handler);
    expect(result.status).toBe('BLOCKED');
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.failureDetails.category).toBe('CASE_SCHEMA_ERROR');
  });

  it('marks test as BLOCKED/INCONCLUSIVE when candidateHandler is not a function', async () => {
    const result = await engine.runBehavioralTest(baseCase, null);
    expect(result.status).toBe('BLOCKED');
    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.failureDetails.category).toBe('HANDLER_UNAVAILABLE');
  });
});
