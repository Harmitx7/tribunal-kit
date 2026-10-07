'use strict';

/**
 * review_executor.js — Independent, Parallel, Schema-Enforced Review Execution
 * =============================================================================
 * Phase 1B, 1G, 1H, 1J, 1K: Production Review Executor
 *
 * Guarantees:
 * 1. Bounded parallel execution across independent reviewers.
 * 2. Strict timeout and cancellation support per reviewer.
 * 3. Schema validation with fail-closed ERROR coercion on malformed output.
 * 4. Full cryptographic provenance (runId, reviewerRunId, input/output SHA256).
 * 5. Accurate token and latency telemetry.
 */

const crypto = require('crypto');
const { ProviderAdapter } = require('./provider_adapter');
const { buildIsolatedReviewerPrompt } = require('./prompt_isolator');
const { parseAndValidateReviewerOutput } = require('./schemas');
const { resolveReviewerSpec } = require('./reviewer_registry');

function computeSha256(text) {
  if (typeof text !== 'string') text = '';
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Executes async tasks with a bounded concurrency pool.
 * @template T
 * @param {Array<() => Promise<T>>} taskFns
 * @param {number} concurrencyLimit
 * @returns {Promise<Array<T>>}
 */
async function runWithBoundedConcurrency(taskFns, concurrencyLimit = 3) {
  const results = new Array(taskFns.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < taskFns.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await taskFns[currentIndex]();
    }
  }

  const workerCount = Math.min(concurrencyLimit, taskFns.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

class ReviewExecutor {
  /**
   * @param {Object} [options]
   * @param {ProviderAdapter} [options.provider]
   * @param {number} [options.timeoutMs=30000]
   * @param {number} [options.maxConcurrency=3]
   * @param {number} [options.maxRetries=1]
   * @param {string} [options.repoRoot]
   */
  constructor(options = {}) {
    this.provider = options.provider || new ProviderAdapter();
    this.timeoutMs = options.timeoutMs || 30000;
    this.maxConcurrency = options.maxConcurrency || 3;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 1;
    this.repoRoot = options.repoRoot || process.cwd();
  }

  /**
   * Executes a single reviewer against the change.
   * Handles prompt generation, provider dispatch, retry on failure,
   * schema validation, and provenance tracking.
   *
   * @param {Object} params
   * @param {string} params.reviewerId
   * @param {string} params.task
   * @param {string} params.diff
   * @param {Array<Object>} [params.evidence]
   * @param {string} [params.decisionId]
   * @param {string} [params.reviewRunId]
   * @param {AbortSignal} [params.signal]
   * @returns {Promise<Object>} ReviewerResult
   */
  async executeReviewer(params) {
    const start = Date.now();
    const reviewerId = params.reviewerId;
    const reviewRunId =
      params.reviewRunId || `rev_run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const reviewerRunId = `rr_${reviewerId}_${crypto.randomBytes(4).toString('hex')}`;
    const decisionId = params.decisionId || `dec_${Date.now()}`;

    // 1. Resolve reviewer spec and build isolated prompt
    const spec = resolveReviewerSpec(reviewerId, this.repoRoot);
    const prompt = buildIsolatedReviewerPrompt({
      reviewerId: spec.id,
      reviewerName: spec.name,
      instructions: spec.instructions,
      task: params.task,
      diff: params.diff,
      evidence: params.evidence || [],
      constraints: params.constraints || [],
    });

    const inputHash = computeSha256(prompt);

    // 2. Dispatch with retry loop
    let lastError = null;
    let providerRes = null;
    let validated = null;
    let attempts = 0;
    const maxAttempts = 1 + this.maxRetries;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        providerRes = await this.provider.sendReviewPrompt({
          prompt,
          timeoutMs: this.timeoutMs,
          signal: params.signal,
        });

        if (providerRes.error) {
          lastError = providerRes.error;
          // If error is timeout or abort, do not retry
          if (providerRes.error.includes('TIMEOUT') || providerRes.error.includes('ABORTED')) {
            break;
          }
          continue;
        }

        // Validate response schema
        validated = parseAndValidateReviewerOutput(providerRes.text, reviewerId);
        if (validated.isValid) {
          lastError = null;
          break;
        } else {
          lastError = validated.error || 'INVALID_SCHEMA';
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    const durationMs = Date.now() - start;
    const outputText = providerRes?.text || '';
    const outputHash = computeSha256(outputText);

    // 3. Fallback on persistent error: construct fail-closed ERROR result
    if (!validated || !validated.isValid || lastError) {
      return {
        reviewerId: spec.id,
        verdict: 'ERROR',
        confidence: 0.0,
        findings: [
          {
            id: `ERR-${spec.id}-1`,
            severity: 'CRITICAL',
            title: `Reviewer Execution Failed: ${spec.name}`,
            description: `Reviewer failed to execute or return valid schema after ${attempts} attempt(s): ${lastError}`,
            evidence: outputText.slice(0, 300),
            location: 'review_executor',
            recommendation: 'Verify LLM provider connectivity, API keys, or timeout thresholds.',
          },
        ],
        evidence: [],
        recommendations: ['Investigate reviewer execution error before proceeding.'],
        model: providerRes?.model || 'unknown',
        provider: providerRes?.provider || this.provider.provider,
        durationMs,
        usage: {
          input_tokens: providerRes?.inputTokens ?? 'UNAVAILABLE',
          output_tokens: providerRes?.outputTokens ?? 'UNAVAILABLE',
          total_tokens: providerRes?.totalTokens ?? 'UNAVAILABLE',
        },
        provenance: {
          reviewRunId,
          reviewerRunId,
          decisionId,
          reviewer: spec.id,
          inputHash,
          outputHash,
          attempts,
          timestamp: new Date().toISOString(),
        },
        error: lastError,
      };
    }

    // 4. Return valid ReviewerResult
    return {
      reviewerId: spec.id,
      verdict: validated.verdict,
      confidence: validated.confidence,
      findings: validated.findings,
      evidence: params.evidence ? params.evidence.map(e => e.id || e.path || '') : [],
      recommendations: validated.recommendations,
      model: providerRes.model,
      provider: providerRes.provider,
      durationMs,
      usage: {
        input_tokens: providerRes.inputTokens,
        output_tokens: providerRes.outputTokens,
        total_tokens: providerRes.totalTokens,
      },
      provenance: {
        reviewRunId,
        reviewerRunId,
        decisionId,
        reviewer: spec.id,
        inputHash,
        outputHash,
        attempts,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Executes a complete review across all selected reviewers in parallel.
   *
   * @param {Object} request - ReviewExecutionRequest
   * @param {Object} [request.decision] - DecisionPayload from DecisionEngine
   * @param {Array<Object>} [request.evidence] - Evidence items
   * @param {string|Array<string>} [request.reviewers] - Reviewer IDs to run
   * @param {string} request.code - Code or diff under review
   * @param {string} request.task - Task description
   * @param {Object} [request.metadata] - Extra metadata
   * @param {AbortSignal} [request.signal] - Cancellation signal
   * @returns {Promise<{
   *   reviewRunId: string,
   *   decisionId: string,
   *   results: Array<Object>,
   *   durationMs: number,
   *   telemetry: Object
   * }>}
   */
  async executeReview(request = {}) {
    const start = Date.now();
    const reviewRunId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const decision = request.decision || {};
    const decisionId = decision.decision_id || `dec_${Date.now()}`;
    const diff = request.code || request.diff || '';
    const task = request.task || 'Review proposed code change';
    const evidence = request.evidence || decision.evidence || [];

    // Determine reviewers to run:
    // 1. Explicit request.reviewers
    // 2. Decision payload selected reviewers
    // 3. Fallback default
    let reviewerIds = [];
    if (Array.isArray(request.reviewers)) {
      reviewerIds = request.reviewers;
    } else if (typeof request.reviewers === 'string') {
      reviewerIds = request.reviewers
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    } else if (decision.reviewers && Array.isArray(decision.reviewers.selected)) {
      reviewerIds = decision.reviewers.selected.map(r =>
        typeof r === 'string' ? r : r.reviewer || r.name,
      );
    }

    if (reviewerIds.length === 0) {
      // Default to logic-reviewer and security-auditor if non-doc diff
      reviewerIds = ['security-auditor', 'logic-reviewer'];
    }

    // Prepare bounded execution functions
    const taskFns = reviewerIds.map(
      reviewerId => () =>
        this.executeReviewer({
          reviewerId,
          task,
          diff,
          evidence,
          decisionId,
          reviewRunId,
          signal: request.signal,
        }),
    );

    const results = await runWithBoundedConcurrency(taskFns, this.maxConcurrency);
    const durationMs = Date.now() - start;

    // Aggregate token and execution telemetry
    let totalIn = 0;
    let totalOut = 0;
    let tokensAvailable = true;
    let successCount = 0;
    let failureCount = 0;

    for (const r of results) {
      if (r.verdict === 'ERROR') {
        failureCount++;
      } else {
        successCount++;
      }
      if (
        r.usage &&
        typeof r.usage.input_tokens === 'number' &&
        typeof r.usage.output_tokens === 'number'
      ) {
        totalIn += r.usage.input_tokens;
        totalOut += r.usage.output_tokens;
      } else {
        tokensAvailable = false;
      }
    }

    const telemetry = {
      reviewerCount: results.length,
      successCount,
      failureCount,
      durationMs,
      inputTokens: tokensAvailable ? totalIn : 'UNAVAILABLE',
      outputTokens: tokensAvailable ? totalOut : 'UNAVAILABLE',
      totalTokens: tokensAvailable ? totalIn + totalOut : 'UNAVAILABLE',
      concurrencyLimit: this.maxConcurrency,
    };

    return {
      reviewRunId,
      decisionId,
      results,
      durationMs,
      telemetry,
    };
  }
}

module.exports = {
  ReviewExecutor,
  runWithBoundedConcurrency,
  computeSha256,
};
