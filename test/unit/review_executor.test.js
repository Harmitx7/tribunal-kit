'use strict';

/**
 * review_executor.test.js — Review Executor Core Unit Tests
 * =========================================================
 * Phase 1B, 1G, 1H, 1J: Tests for Execution, Retries, Timeouts, and Bounded Parallelism
 */

const {
  ReviewExecutor,
  runWithBoundedConcurrency,
} = require('../../src/execution/review_executor');
const { ProviderAdapter } = require('../../src/execution/provider_adapter');
const { parseAndValidateReviewerOutput } = require('../../src/execution/schemas');

describe('Phase 1B & 1G: ReviewExecutor Unit Tests', () => {
  test('executes single reviewer and parses valid response schema', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        verdict: 'APPROVED',
        confidence: 0.95,
        findings: [],
        recommendations: ['Code adheres to standards.'],
        inputTokens: 400,
        outputTokens: 30,
      }),
    });

    const executor = new ReviewExecutor({ provider });
    const res = await executor.executeReviewer({
      reviewerId: 'security-auditor',
      task: 'Verify token generation',
      diff: '+ const token = crypto.randomBytes(32).toString("hex");',
    });

    expect(res.reviewerId).toBe('security-auditor');
    expect(res.verdict).toBe('APPROVED');
    expect(res.confidence).toBe(0.95);
    expect(res.findings).toEqual([]);
    expect(res.recommendations).toContain('Code adheres to standards.');
    expect(res.usage.input_tokens).toBe(400);
    expect(res.usage.output_tokens).toBe(30);
    expect(res.provenance).toBeDefined();
    expect(res.provenance.inputHash).toHaveLength(64);
    expect(res.provenance.outputHash).toHaveLength(64);
  });

  test('coerces malformed JSON model output to ERROR verdict', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({
        text: 'This is not JSON text at all, but looks like an approval!',
      }),
    });

    const executor = new ReviewExecutor({ provider, maxRetries: 0 });
    const res = await executor.executeReviewer({
      reviewerId: 'logic-reviewer',
      task: 'Check logic',
      diff: '+ const a = 1;',
    });

    expect(res.verdict).toBe('ERROR');
    expect(res.confidence).toBe(0.0);
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0].severity).toBe('CRITICAL');
    expect(res.error).toContain('JSON_PARSE_ERROR');
  });

  test('coerces contradictory model output (APPROVED with CRITICAL findings) to REJECTED', () => {
    const raw = JSON.stringify({
      verdict: 'APPROVED',
      confidence: 0.9,
      findings: [
        {
          id: 'F1',
          severity: 'CRITICAL',
          title: 'Remote Code Execution',
          description: 'exec() called with user input',
          location: 'server.js:10',
          recommendation: 'Use execFile with whitelist',
        },
      ],
    });

    const parsed = parseAndValidateReviewerOutput(raw, 'security-auditor');
    expect(parsed.isValid).toBe(true);
    expect(parsed.verdict).toBe('REJECTED');
  });

  test('handles provider timeout fail-closed with ERROR verdict', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => {
        await new Promise(r => setTimeout(r, 60));
        return { verdict: 'APPROVED' };
      },
    });

    const executor = new ReviewExecutor({
      provider,
      timeoutMs: 15,
      maxRetries: 0,
    });

    const res = await executor.executeReviewer({
      reviewerId: 'security-auditor',
      task: 'Timeout test',
      diff: '+ const a = 1;',
    });

    expect(res.verdict).toBe('ERROR');
    expect(res.error).toContain('LLM_TIMEOUT');
    expect(res.findings[0].severity).toBe('CRITICAL');
  });

  test('handles provider network/500 error fail-closed', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => {
        throw new Error('PROVIDER_500: Server unavailable');
      },
    });

    const executor = new ReviewExecutor({ provider, maxRetries: 0 });
    const res = await executor.executeReviewer({
      reviewerId: 'resilience-reviewer',
      task: 'Error test',
      diff: '+ const a = 1;',
    });

    expect(res.verdict).toBe('ERROR');
    expect(res.error).toContain('PROVIDER_500');
  });

  test('handles empty model response fail-closed', async () => {
    const provider = new ProviderAdapter({
      mockHandler: async () => ({ text: '' }),
    });

    const executor = new ReviewExecutor({ provider, maxRetries: 0 });
    const res = await executor.executeReviewer({
      reviewerId: 'schema-reviewer',
      task: 'Empty test',
      diff: '+ const a = 1;',
    });

    expect(res.verdict).toBe('ERROR');
    expect(res.error).toContain('EMPTY_PAYLOAD');
  });

  test('retries on transient failure and recovers if second attempt succeeds', async () => {
    let callCount = 0;
    const provider = new ProviderAdapter({
      mockHandler: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient rate limit 429');
        }
        return {
          verdict: 'APPROVED',
          confidence: 0.9,
          findings: [],
        };
      },
    });

    const executor = new ReviewExecutor({ provider, maxRetries: 1 });
    const res = await executor.executeReviewer({
      reviewerId: 'logic-reviewer',
      task: 'Retry test',
      diff: '+ const a = 1;',
    });

    expect(callCount).toBe(2);
    expect(res.verdict).toBe('APPROVED');
    expect(res.provenance.attempts).toBe(2);
  });

  test('executes multiple reviewers concurrently within bounded pool limit', async () => {
    let activeWorkers = 0;
    let maxActiveWorkers = 0;

    const provider = new ProviderAdapter({
      mockHandler: async () => {
        activeWorkers++;
        maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
        await new Promise(r => setTimeout(r, 20));
        activeWorkers--;
        return {
          verdict: 'APPROVED',
          confidence: 0.95,
          findings: [],
        };
      },
    });

    const executor = new ReviewExecutor({
      provider,
      maxConcurrency: 2, // Concurrency capped at 2
    });

    const execRes = await executor.executeReview({
      reviewers: ['security-auditor', 'logic-reviewer', 'sql-reviewer', 'schema-reviewer'],
      code: '+ const a = 1;',
      task: 'Concurrency test',
    });

    expect(execRes.results.length).toBe(4);
    expect(maxActiveWorkers).toBeLessThanOrEqual(2);
    expect(execRes.telemetry.reviewerCount).toBe(4);
    expect(execRes.telemetry.concurrencyLimit).toBe(2);
  });
});
