/**
 * test/unit/stress.test.js — Tribunal-Kit Stress & Performance Unit Test
 */

'use strict';

const _path = require('path');
const { runStressSuite } = require('../../scripts/stress_benchmark');

describe('Tribunal-Kit Governance Stress Suite', () => {
  let stressResults;

  beforeAll(async () => {
    // Run stress suite in memory
    stressResults = await runStressSuite();
  }, 30000); // 30s timeout for heavy stress run

  test('Concurrency stress test passes with high throughput', () => {
    expect(stressResults.concurrency).toBeDefined();
    expect(stressResults.concurrency.all_passed).toBe(true);
    expect(stressResults.concurrency.ops_per_sec).toBeGreaterThan(0);
  });

  test('Scale stress test handles 10,000 LOC within budget', () => {
    expect(stressResults.scale).toBeDefined();
    expect(stressResults.scale.lines_of_code).toBeGreaterThanOrEqual(10000);
    expect(stressResults.scale.parse_time_ms).toBeLessThan(5000);
  });

  test('Token compression achieves token savings', () => {
    expect(stressResults.token_compression).toBeDefined();
    expect(stressResults.token_compression.savings_percent).toBeGreaterThan(0);
  });

  test('Anti-hallucination barrier catches 100% of malicious security payloads', () => {
    expect(stressResults.anti_hallucination).toBeDefined();
    expect(stressResults.anti_hallucination.detection_rate_percent).toBe(100);
    expect(stressResults.anti_hallucination.caught_swarm_hallucination).toBe(true);
  });
});
