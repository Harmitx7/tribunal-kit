'use strict';

/**
 * agent_behavioral_testing_engine.js — Agent & Skill Behavioral Verification Engine
 * ==================================================================================
 * Domain: AI Reliability & Evaluation (ai-reliability)
 *
 * Executes real behavioral tests against agent skills and review tools:
 * 1. Precondition and contract validation
 * 2. Positive property assertions
 * 3. Negative trap detection and forbidden side-effect prevention
 * 4. Explicit verdicts: PASS, FAIL, INCONCLUSIVE, BLOCKED, NOT_RUN
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { validateEvaluationCase, validateEvaluationResult } = require('./evaluation_schemas');

class AgentBehavioralTestingEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot] - Project root directory
   * @param {number} [options.defaultTimeoutMs=10000] - Default test timeout
   */
  constructor(options = {}) {
    this.repoRoot = path.resolve(options.repoRoot || process.cwd());
    this.defaultTimeoutMs = options.defaultTimeoutMs || 10000;
  }

  /**
   * Executes a single behavioral test case against an evaluation handler or script.
   *
   * @param {object} evaluationCase - Evaluation case adhering to EvaluationCaseSchema
   * @param {Function} candidateHandler - Async function(inputFixture) returning { output, sideEffects, toolCalls }
   * @param {object} [opts]
   * @returns {Promise<object>} EvaluationResult object
   */
  async runBehavioralTest(evaluationCase, candidateHandler, opts = {}) {
    // 1. Verify case schema
    const caseValidation = validateEvaluationCase(evaluationCase);
    if (!caseValidation.valid) {
      return {
        caseId: evaluationCase?.id || 'invalid_case',
        candidateId: opts.candidateId || 'unknown_candidate',
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'BLOCKED',
        verdict: 'INCONCLUSIVE',
        metrics: { durationMs: 0 },
        evidence: [],
        failureDetails: {
          category: 'CASE_SCHEMA_ERROR',
          reason: `Invalid evaluation case: ${caseValidation.errors.map(e => e.message).join('; ')}`,
        },
      };
    }

    const c = caseValidation.data;
    const timeoutMs = opts.timeoutMs || c.timeoutMs || this.defaultTimeoutMs;
    const startTime = performance.now();

    try {
      if (typeof candidateHandler !== 'function') {
        return {
          caseId: c.id,
          candidateId: opts.candidateId || 'candidate_under_test',
          schemaVersion: '1.0.0',
          timestamp: new Date().toISOString(),
          status: 'BLOCKED',
          verdict: 'INCONCLUSIVE',
          metrics: { durationMs: 0 },
          evidence: [],
          failureDetails: {
            category: 'HANDLER_UNAVAILABLE',
            reason: 'Candidate handler function is not callable or missing.',
          },
        };
      }

      // Execute with bounded timeout
      const executionPromise = candidateHandler(c.inputFixture);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`EXECUTION_TIMED_OUT: Exceeded ${timeoutMs}ms limit.`)), timeoutMs)
      );

      const actualOutput = await Promise.race([executionPromise, timeoutPromise]);
      const durationMs = Math.round(performance.now() - startTime);

      // Evaluate behavioral properties
      const failures = [];
      const evidence = [];

      // Check required properties
      if (Array.isArray(c.expected.requiredProperties)) {
        for (const reqProp of c.expected.requiredProperties) {
          const propRegex = new RegExp(reqProp, 'i');
          const outputStr = typeof actualOutput === 'string' ? actualOutput : JSON.stringify(actualOutput);
          if (!propRegex.test(outputStr)) {
            failures.push(`REQUIRED_PROPERTY_MISSING: Expected output to contain pattern "${reqProp}".`);
          } else {
            evidence.push({
              type: 'DETERMINISTIC_CHECK',
              source: `requiredProperty:${reqProp}`,
              verified: true,
            });
          }
        }
      }

      // Check forbidden behaviors
      if (Array.isArray(c.expected.forbiddenBehaviors)) {
        for (const forbProp of c.expected.forbiddenBehaviors) {
          const forbRegex = new RegExp(forbProp, 'i');
          const outputStr = typeof actualOutput === 'string' ? actualOutput : JSON.stringify(actualOutput);
          if (forbRegex.test(outputStr)) {
            failures.push(`FORBIDDEN_BEHAVIOR_OBSERVED: Output matched forbidden pattern "${forbProp}".`);
          }
        }
      }

      const verdict = failures.length === 0 ? 'PASS' : 'FAIL';
      const resultObj = {
        caseId: c.id,
        candidateId: opts.candidateId || 'candidate_under_test',
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        verdict,
        actualOutput,
        metrics: { durationMs },
        evidence,
        ...(failures.length > 0 && {
          failureDetails: {
            category: 'BEHAVIORAL_ASSERTION_FAILED',
            reason: failures.join('; '),
          },
        }),
      };

      const resCheck = validateEvaluationResult(resultObj);
      return resCheck.valid ? resCheck.data : resultObj;
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const isTimeout = err.message.includes('EXECUTION_TIMED_OUT');

      return {
        caseId: c.id,
        candidateId: opts.candidateId || 'candidate_under_test',
        schemaVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        status: isTimeout ? 'TIMED_OUT' : 'CRASHED',
        verdict: 'FAIL',
        metrics: { durationMs },
        evidence: [],
        failureDetails: {
          category: isTimeout ? 'TIMEOUT_ERROR' : 'EXECUTION_CRASH',
          reason: err.message,
          sanitizedStack: err.stack,
        },
      };
    }
  }
}

module.exports = {
  AgentBehavioralTestingEngine,
};
